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

	// 检查连接数限制 - 注意：这里检查的是 map 中的当前连接数
	// 因为只有一个 secret 可以连接一次（被新连接替代），所以不需要额外的全局限制

	// 关闭旧连接（如果存在）
	if oldConn, exists := m.connections[secret]; exists {
		log.Printf("WebSocket连接 [%s] 已存在，正在关闭旧连接", secret)
		// 发送关闭通知（不阻塞，使用 goroutine）
		go func() {
			oldConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseServiceRestart, "新连接已建立，关闭旧连接"))
			oldConn.Close()
		}()
		// 删除旧的写锁
		delete(m.writeMus, secret)
	}

	// 添加新连接和对应的写锁
	m.connections[secret] = conn
	m.writeMus[secret] = &sync.Mutex{}
	m.totalConnections++ // 增加累计连接数
	log.Printf("WebSocket连接已建立: %s (当前总连接数: %d, 累计连接数: %d)", secret, len(m.connections), m.totalConnections)

	// 发送连接确认（不阻塞，防止卡住 AddConnection）
	go func() {
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
	}()

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
	// 复制所有 secret 列表以避免在遍历时 map 被修改
	secrets := make([]string, 0, len(m.connections))
	for secret := range m.connections {
		secrets = append(secrets, secret)
	}
	m.mu.RUnlock()

	// 在持有锁之外进行实际的消息发送（异步）
	for _, secret := range secrets {
		go func(s string) {
			if err := m.SendMessage(s, message); err != nil {
				log.Printf("广播消息失败 [%s]: %v", s, err)
			}
		}(secret)
	}
}

// sendMessage 发送消息的内部方法
// 注意: 必须在持有管理器锁的情况下调用，或者在 RLock 后立即调用，但不能在 RUnlock 后访问 conn
func (m *Manager) sendMessage(secret string, message models.WebSocketMessage) error {
	// 这个方法在持有读锁的情况下被调用，但我们需要重新检查并获取写锁
	// 为了避免竞态条件，我们需要一个机制

	// 尝试获取写锁（如果不存在则返回错误）
	m.mu.RLock()
	conn, connExists := m.connections[secret]
	writeMu, muExists := m.writeMus[secret]
	m.mu.RUnlock()

	if !connExists || !muExists {
		return ErrConnectionNotFound
	}

	// 使用连接专用的写锁，确保同一连接的消息按顺序发送且不发生并发写冲突
	writeMu.Lock()
	defer writeMu.Unlock()

	// 在持有写锁后再次检查连接是否仍然存在（防止被其他 goroutine 删除）
	m.mu.RLock()
	currentConn, stillExists := m.connections[secret]
	m.mu.RUnlock()

	if !stillExists || currentConn != conn {
		return ErrConnectionNotFound
	}

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

// GetConnections 获取所有连接信息 (优化版本)
func (m *Manager) GetConnections(limit, offset int) ([]models.Connection, int) {
	// 输入验证和限制
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	m.mu.RLock()
	total := len(m.connections)

	// 如果没有连接，直接返回
	if total == 0 {
		m.mu.RUnlock()
		return []models.Connection{}, 0
	}

	// 快速路径：只提取需要的部分秘密（避免提取所有秘密）
	secrets := make([]string, 0, limit)
	idx := 0
	for secret := range m.connections {
		if idx >= offset && idx < offset+limit {
			secrets = append(secrets, secret)
		}
		idx++
		if idx >= offset+limit {
			break
		}
	}
	m.mu.RUnlock()

	// 获取配置快照（在管理器锁之外获取配置锁，避免死锁）
	var secretConfigs map[string]config.SecretConfig
	if m.config != nil {
		secretConfigs = m.config.GetSecrets()
	}

	// 构建连接对象列表
	connections := make([]models.Connection, 0, len(secrets))
	now := time.Now()

	m.mu.RLock()
	for _, secret := range secrets {
		conn, exists := m.connections[secret]
		if !exists {
			continue
		}

		connection := models.Connection{
			Secret:      secret,
			Connected:   conn != nil,
			ConnectedAt: now,
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
	m.mu.RUnlock()

	return connections, total
}

// BroadcastBinary 广播二进制消息到所有连接
func (m *Manager) BroadcastBinary(data []byte) {
	m.mu.RLock()
	// 复制所有 secret 列表以避免在遍历时 map 被修改
	secrets := make([]string, 0, len(m.connections))
	for secret := range m.connections {
		secrets = append(secrets, secret)
	}
	m.mu.RUnlock()

	// 在持有锁之外进行实际的消息发送
	for _, secret := range secrets {
		go func(s string) {
			if err := m.SendBinaryMessage(s, data); err != nil {
				log.Printf("广播二进制消息失败 [%s]: %v", s, err)
			}
		}(secret)
	}
}

// BroadcastText 广播文本消息到所有连接
func (m *Manager) BroadcastText(text string) {
	m.mu.RLock()
	// 复制所有 secret 列表以避免在遍历时 map 被修改
	secrets := make([]string, 0, len(m.connections))
	for secret := range m.connections {
		secrets = append(secrets, secret)
	}
	m.mu.RUnlock()

	// 在持有锁之外进行实际的消息发送
	for _, secret := range secrets {
		go func(s string) {
			if err := m.SendTextMessage(s, text); err != nil {
				log.Printf("广播文本消息失败 [%s]: %v", s, err)
			}
		}(secret)
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
		log.Println("WebSocket 心跳检测已禁用")
		return
	}

	interval := time.Duration(m.config.WebSocket.HeartbeatInterval) * time.Millisecond
	if interval <= 0 {
		interval = 30 * time.Second
	}

	// 心跳超时（收不到 Pong 响应后的等待时间）
	heartbeatTimeout := time.Duration(m.config.WebSocket.HeartbeatTimeout) * time.Millisecond
	if heartbeatTimeout <= 0 {
		heartbeatTimeout = 5 * time.Second
	}

	log.Printf("启动 WebSocket 心跳检测 (间隔: %v, 超时: %v)", interval, heartbeatTimeout)

	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
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

			// 对每个连接发送心跳
			for _, ci := range conns {
				go func(info connInfo) {
					info.writeMu.Lock()
					defer info.writeMu.Unlock()

					// 设置写入超时，确保心跳不会阻塞
					info.conn.SetWriteDeadline(time.Now().Add(heartbeatTimeout))
					if err := info.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
						log.Printf("心跳发送失败 [%s]: %v，移除连接", info.secret, err)
						// 异步移除，避免死锁
						go m.RemoveConnection(info.secret)
					} else {
						// 清除写超时，恢复正常操作
						info.conn.SetWriteDeadline(time.Time{})
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
