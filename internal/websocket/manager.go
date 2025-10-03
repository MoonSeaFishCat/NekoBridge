package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"nekobridge/internal/config"
	"nekobridge/internal/models"
)

// Manager WebSocket连接管理器
type Manager struct {
	connections map[string]*websocket.Conn
	mu          sync.RWMutex
	config      *config.Config
}

// NewManager 创建新的WebSocket管理器
func NewManager() *Manager {
	return &Manager{
		connections: make(map[string]*websocket.Conn),
	}
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
	if len(m.connections) >= m.config.Security.MaxConnectionsPerSecret {
		return ErrMaxConnectionsReached
	}

	// 关闭旧连接
	if oldConn, exists := m.connections[secret]; exists {
		oldConn.Close()
	}

	m.connections[secret] = conn
	log.Printf("WebSocket连接已建立: %s", secret)

	// 发送连接确认
	message := models.WebSocketMessage{
		Type: "connected",
		Data: map[string]interface{}{
			"secret":    secret,
			"timestamp": time.Now().Format(time.RFC3339),
		},
	}

	return m.sendMessage(secret, message)
}

// RemoveConnection 移除连接
func (m *Manager) RemoveConnection(secret string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if conn, exists := m.connections[secret]; exists {
		conn.Close()
		delete(m.connections, secret)
		log.Printf("WebSocket连接已关闭: %s", secret)
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
	conn, exists := m.connections[secret]
	if !exists {
		return ErrConnectionNotFound
	}

	// 根据消息格式选择发送方式
	switch message.Format {
	case models.MessageFormatBinary:
		// 发送二进制数据
		if message.Raw != nil {
			return conn.WriteMessage(websocket.BinaryMessage, message.Raw)
		}
		return conn.WriteMessage(websocket.BinaryMessage, []byte{})

	case models.MessageFormatText:
		// 发送纯文本数据
		if message.Data != nil {
			if text, ok := message.Data.(string); ok {
				return conn.WriteMessage(websocket.TextMessage, []byte(text))
			}
		}
		return conn.WriteMessage(websocket.TextMessage, []byte{})

	case models.MessageFormatJSON:
		fallthrough
	default:
		// 默认使用JSON格式
		data, err := json.Marshal(message)
		if err != nil {
			return err
		}
		return conn.WriteMessage(websocket.TextMessage, data)
	}
}

// SendBinaryMessage 发送二进制消息
func (m *Manager) SendBinaryMessage(secret string, data []byte) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	conn, exists := m.connections[secret]
	if !exists {
		return ErrConnectionNotFound
	}

	return conn.WriteMessage(websocket.BinaryMessage, data)
}

// SendTextMessage 发送文本消息
func (m *Manager) SendTextMessage(secret string, text string) error {
	m.mu.RLock()
	defer m.mu.RUnlock()

	conn, exists := m.connections[secret]
	if !exists {
		return ErrConnectionNotFound
	}

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
	for secret, conn := range m.connections {
		connection := models.Connection{
			Secret:      secret,
			Connected:   conn != nil,
			ConnectedAt: time.Now(),
		}

		// 从配置中获取更多信息
		if secretConfig, exists := m.config.Secrets[secret]; exists {
			connection.Enabled = secretConfig.Enabled
			connection.Description = secretConfig.Description
			connection.CreatedAt = &secretConfig.CreatedAt
			connection.LastUsed = secretConfig.LastUsed
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
	if !m.config.WebSocket.EnableHeartbeat {
		return
	}

	ticker := time.NewTicker(time.Duration(m.config.WebSocket.HeartbeatInterval) * time.Millisecond)
	go func() {
		for range ticker.C {
			m.mu.RLock()
			for secret, conn := range m.connections {
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Printf("心跳发送失败 [%s]: %v", secret, err)
					// 连接可能已断开，在下一次清理时移除
				}
			}
			m.mu.RUnlock()
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
