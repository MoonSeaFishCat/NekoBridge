package websocket

import "errors"

var (
	// ErrConnectionNotFound 连接未找到
	ErrConnectionNotFound = errors.New("connection not found")
	
	// ErrMaxConnectionsReached 达到最大连接数
	ErrMaxConnectionsReached = errors.New("max connections reached")
	
	// ErrConnectionClosed 连接已关闭
	ErrConnectionClosed = errors.New("connection closed")
	
	// ErrInvalidMessage 无效消息
	ErrInvalidMessage = errors.New("invalid message")
)
