package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"nekobridge/internal/config"
	"nekobridge/internal/models"

	"github.com/gorilla/websocket"
)

// Manager WebSocket连接管理器
type Manager struct {
	connections      map[string]*websocket.Conn
	mu               sync.RWMutex
	writeMus         map[string]*sync.Mutex // 每个连接独立的写锁，防止并发写导致连接关闭或消息丢失
	config           *config.Config
	totalConnections int64 // 累计连接总数
}

// NewManager 创建新的WebSocket管理器
func NewManager() *Manager {
	m := &Manager{
		connections:      make(map[string]*websocket.Conn),
		writeMus:         make(map[string]*sync.Mutex),
		totalConnections: 0,
	}
	return m
}

// SetConfig 设置配置
func (m *Manager) SetConfig(cfg *config.Config) {
	m.config = cfg
}

// AddConnection 添加连接
func (m *Manager) AddConnection(secret string, conn *websocket.Conn) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 检查连接数限制
	currentCount := len(m.connections)
	if currentCount >= m.config.Security.MaxConnectionsPerSecret {
		log.Printf("WebSocket连接拒绝 [%s]: 达到最大连接数限制 (%d/%d)", secret, currentCount, m.config.Security.MaxConnectionsPerSecret)
		return ErrMaxConnectionsReached
	}

	// 关闭旧连接
	if oldConn, exists := m.connections[secret]; exists {
		log.Printf("WebSocket连接 [%s] 已存在，正在关闭旧连接", secret)
		oldConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseServiceRestart, "新连接已建立，关闭旧连接"))
		oldConn.Close()
	}

	m.connections[secret] = conn
	m.writeMus[secret] = &sync.Mutex{}
	m.totalConnections++ // 增加累计连接数
	log.Printf("WebSocket连接已建立: %s (当前总连接数: %d, 累计连接数: %d)", secret, len(m.connections), m.totalConnections)

	// 发送连接确认
	message := models.WebSocketMessage{
		Type: "connected",
		Data: map[string]interface{}{
			"secret":    secret,
			"timestamp": time.Now().Format(time.RFC3339),
		},
	}

	if err := m.sendMessage(secret, message); err != nil {
		log.Printf("发送连接确认消息失败 [%s]: %v", secret, err)
	}

	return nil
}

// RemoveConnection 移除连接
func (m *Manager) RemoveConnection(secret string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if conn, exists := m.connections[secret]; exists {
		conn.Close()
		delete(m.connections, secret)
		delete(m.writeMus, secret)
		log.Printf("WebSocket连接已从管理器移除: %s (剩余连接数: %d)", secret, len(m.connections))
	} else {
		log.Printf("尝试移除不存在的WebSocket连接: %s", secret)
	}
}

// SendMessage 发送消息到指定连接
func (m *Manager) SendMessage(secret string, message models.WebSocketMessage) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	_, exists := m.connections[secret]
	if !exists {
		return ErrConnectionNotFound
	}

	return m.sendMessage(secret, message)
}

// Broadcast 广播消息到所有连接
func (m *Manager) Broadcast(message models.WebSocketMessage) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for secret := range m.connections {
		if err := m.sendMessage(secret, message); err != nil {
			log.Printf("广播消息失败 [%s]: %v", secret, err)
		}
	}
}

// sendMessage 发送消息的内部方法
func (m *Manager) sendMessage(secret string, message models.WebSocketMessage) error {
	m.mu.RLock()
	conn, exists := m.connections[secret]
	writeMu, muExists := m.writeMus[secret]
	m.mu.RUnlock()

	if !exists || !muExists {
		return ErrConnectionNotFound
	}

	// 使用连接专用的写锁，确保同一连接的消息按顺序发送且不发生并发写冲突
	writeMu.Lock()
	defer writeMu.Unlock()

	var err error
	// 根据消息格式选择发送方式
	switch message.Format {
	case models.MessageFormatBinary:
		// 发送二进制数据
		if message.Raw != nil {
			err = conn.WriteMessage(websocket.BinaryMessage, message.Raw)
		} else {
			err = conn.WriteMessage(websocket.BinaryMessage, []byte{})
		}

	case models.MessageFormatText:
		// 发送纯文本数据
		if message.Data != nil {
			if text, ok := message.Data.(string); ok {
				err = conn.WriteMessage(websocket.TextMessage, []byte(text))
			} else {
				err = conn.WriteMessage(websocket.TextMessage, []byte{})
			}
		} else {
			err = conn.WriteMessage(websocket.TextMessage, []byte{})
		}

	case models.MessageFormatJSON:
		fallthrough
	default:
		// 默认使用JSON格式
		data, errMarshal := json.Marshal(message)
		if errMarshal != nil {
			log.Printf("JSON序列化失败 [%s]: %v", secret, errMarshal)
			return errMarshal
		}
		err = conn.WriteMessage(websocket.TextMessage, data)
	}

	if err != nil {
		log.Printf("消息发送失败 [%s] (类型: %s, 格式: %s): %v", secret, message.Type, message.Format, err)
		// 如果发送失败，尝试移除失效连接
		go m.RemoveConnection(secret)
		return err
	}

	return nil
}

// SendBinaryMessage 发送二进制消息
func (m *Manager) SendBinaryMessage(secret string, data []byte) error {
	m.mu.RLock()
	conn, exists := m.connections[secret]
	writeMu, muExists := m.writeMus[secret]
	m.mu.RUnlock()

	if !exists || !muExists {
		return ErrConnectionNotFound
	}

	writeMu.Lock()
	defer writeMu.Unlock()
	return conn.WriteMessage(websocket.BinaryMessage, data)
}

// SendTextMessage 发送文本消息
func (m *Manager) SendTextMessage(secret string, text string) error {
	m.mu.RLock()
	conn, exists := m.connections[secret]
	writeMu, muExists := m.writeMus[secret]
	m.mu.RUnlock()

	if !exists || !muExists {
		return ErrConnectionNotFound
	}

	writeMu.Lock()
	defer writeMu.Unlock()
	return conn.WriteMessage(websocket.TextMessage, []byte(text))
}

// GetConnection 获取连接
func (m *Manager) GetConnection(secret string) (*websocket.Conn, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	conn, exists := m.connections[secret]
	return conn, exists
}

// GetConnections 获取所有连接信息
func (m *Manager) GetConnections() []models.Connection {
	m.mu.RLock()
	defer m.mu.RUnlock()

	connections := make([]models.Connection, 0, len(m.connections))
	
	// 预先获取所有密钥配置，避免在循环中重复加锁
	var secretConfigs map[string]config.SecretConfig
	if m.config != nil {
		secretConfigs = m.config.GetSecrets()
	}
	
	for secret, conn := range m.connections {
		connection := models.Connection{
			Secret:      secret,
			Connected:   conn != nil,
			ConnectedAt: time.Now(),
		}

		// 从预加载的配置中获取更多信息
		if secretCfg, exists := secretConfigs[secret]; exists {
			connection.Enabled = secretCfg.Enabled
			connection.Description = secretCfg.Description
			connection.CreatedAt = &secretCfg.CreatedAt
			connection.LastUsed = secretCfg.LastUsed
		}

		connections = append(connections, connection)
	}

	return connections
}

// BroadcastBinary 广播二进制消息到所有连接
func (m *Manager) BroadcastBinary(data []byte) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for secret, conn := range m.connections {
		if err := conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
			log.Printf("广播二进制消息失败 [%s]: %v", secret, err)
		}
	}
}

// BroadcastText 广播文本消息到所有连接
func (m *Manager) BroadcastText(text string) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for secret, conn := range m.connections {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(text)); err != nil {
			log.Printf("广播文本消息失败 [%s]: %v", secret, err)
		}
	}
}

// GetConnectionCount 获取连接数
func (m *Manager) GetConnectionCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return len(m.connections)
}

// GetTotalConnections 获取累计连接总数
func (m *Manager) GetTotalConnections() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return int(m.totalConnections)
}

// KickConnection 踢出连接
func (m *Manager) KickConnection(secret string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	conn, exists := m.connections[secret]
	if !exists {
		return ErrConnectionNotFound
	}

	// 发送关闭消息
	closeMessage := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "管理员主动断开连接")
	conn.WriteMessage(websocket.CloseMessage, closeMessage)
	conn.Close()

	delete(m.connections, secret)
	log.Printf("连接已被踢出: %s", secret)

	return nil
}

// IsConnected 检查连接是否存在
func (m *Manager) IsConnected(secret string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	conn, exists := m.connections[secret]
	return exists && conn != nil
}

// StartHeartbeat 启动心跳检测
func (m *Manager) StartHeartbeat() {
	if m.config == nil || !m.config.WebSocket.EnableHeartbeat {
		return
	}

	interval := time.Duration(m.config.WebSocket.HeartbeatInterval) * time.Millisecond
	if interval <= 0 {
		interval = 30 * time.Second
	}

	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			m.mu.RLock()
			// 复制连接列表以避免长时间持有读锁
			type connInfo struct {
				secret  string
				conn    *websocket.Conn
				writeMu *sync.Mutex
			}
			var conns []connInfo
			for secret, conn := range m.connections {
				conns = append(conns, connInfo{
					secret:  secret,
					conn:    conn,
					writeMu: m.writeMus[secret],
				})
			}
			m.mu.RUnlock()

			for _, ci := range conns {
				go func(info connInfo) {
					info.writeMu.Lock()
					defer info.writeMu.Unlock()
					
					// 设置写入超时
					info.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
					if err := info.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
						log.Printf("心跳发送失败，关闭连接 [%s]: %v", info.secret, err)
						m.RemoveConnection(info.secret)
					}
				}(ci)
			}
		}
	}()
}

// CleanupDeadConnections 清理死连接
func (m *Manager) CleanupDeadConnections() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for secret, conn := range m.connections {
		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			log.Printf("清理死连接: %s", secret)
			conn.Close()
			delete(m.connections, secret)
		}
	}
}
