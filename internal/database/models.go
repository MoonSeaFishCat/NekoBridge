package database

import (
	"time"
)

// Secret 密钥模型
type Secret struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Secret        string    `gorm:"uniqueIndex;not null" json:"secret"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Enabled       bool      `gorm:"default:true" json:"enabled"`
	MaxConnections int      `gorm:"default:1" json:"maxConnections"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	CreatedBy     string    `json:"createdBy"`
}

// BanRecord 封禁记录模型
type BanRecord struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Secret    string    `gorm:"not null;index" json:"secret"`
	Reason    string    `json:"reason"`
	BannedAt  time.Time `json:"bannedAt"`
	BannedBy  string    `json:"bannedBy"`
	UnbannedAt *time.Time `json:"unbannedAt,omitempty"`
	UnbannedBy *string   `json:"unbannedBy,omitempty"`
	IsActive  bool      `gorm:"default:true" json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// SystemConfig 系统配置模型
type SystemConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"uniqueIndex;not null" json:"key"`
	Value       string    `json:"value"`
	Type        string    `json:"type"` // json, string, int, bool, float
	Category    string    `json:"category"` // server, security, auth, ui, logging, websocket
	Description string    `json:"description"`
	IsRequired  bool      `gorm:"default:false" json:"isRequired"`
	IsReadOnly  bool      `gorm:"default:false" json:"isReadOnly"`
	MinValue    *string   `json:"minValue,omitempty"`
	MaxValue    *string   `json:"maxValue,omitempty"`
	Options     *string   `json:"options,omitempty"` // JSON格式的选项列表
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// LogEntry 日志条目模型
type LogEntry struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Level     string    `gorm:"not null;index" json:"level"`
	Message   string    `gorm:"not null" json:"message"`
	Source    string    `json:"source"`
	Timestamp time.Time `gorm:"not null;index" json:"timestamp"`
	Data      string    `json:"data"` // JSON格式的额外数据
	CreatedAt time.Time `json:"createdAt"`
}

// Connection 连接记录模型
type Connection struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Secret    string    `gorm:"not null;index" json:"secret"`
	ClientIP  string    `json:"clientIP"`
	UserAgent string    `json:"userAgent"`
	Connected bool      `gorm:"default:true" json:"connected"`
	LastSeen  time.Time `json:"lastSeen"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
