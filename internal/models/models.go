package models

import (
	"encoding/json"
	"time"
)

// MemoryStats 内存统计
type MemoryStats struct {
	Alloc      uint64 `json:"alloc"`
	TotalAlloc uint64 `json:"total_alloc"`
	Sys        uint64 `json:"sys"`
	NumGC      uint32 `json:"num_gc"`
}

// LogEntry 日志条目
type LogEntry struct {
	ID        string    `json:"id"`
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Details   any       `json:"details,omitempty"`
}

// MarshalJSON 自定义 JSON 序列化，将纳秒精度改为毫秒，使 JavaScript 能正确解析
func (l LogEntry) MarshalJSON() ([]byte, error) {
	type Alias LogEntry
	return json.Marshal(&struct {
		Timestamp string `json:"timestamp"`
		*Alias
	}{
		Timestamp: l.Timestamp.Format("2006-01-02T15:04:05.000Z07:00"),
		Alias:     (*Alias)(&l),
	})
}

// Connection 连接信息
type Connection struct {
	Secret      string     `json:"secret"`
	Connected   bool       `json:"connected"`
	Enabled     bool       `json:"enabled"`
	Description string     `json:"description,omitempty"`
	CreatedAt   *time.Time `json:"created_at,omitempty"`
	LastUsed    *time.Time `json:"last_used,omitempty"`
	ConnectedAt time.Time  `json:"connected_at"`
}

// Secret 密钥信息
type Secret struct {
	Secret        string     `json:"secret"`
	Name          string     `json:"name,omitempty"`
	Enabled       bool       `json:"enabled"`
	Description   string     `json:"description,omitempty"`
	MaxConnections int       `json:"max_connections,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at,omitempty"`
	CreatedBy     string     `json:"created_by,omitempty"`
	LastUsed      *time.Time `json:"last_used,omitempty"`
}


// MessageFormat WebSocket消息格式
type MessageFormat string

const (
	MessageFormatJSON   MessageFormat = "json"   // JSON格式（默认）
	MessageFormatText   MessageFormat = "text"   // 纯文本格式
	MessageFormatBinary MessageFormat = "binary" // 二进制格式
)

// WebSocketMessage WebSocket消息
type WebSocketMessage struct {
	Type   string        `json:"type"`
	Data   any           `json:"data"`
	Format MessageFormat `json:"format,omitempty"` // 消息格式
	Raw    []byte        `json:"-"`                // 原始二进制数据（不序列化）
}

// APIResponse API响应
type APIResponse struct {
	Success bool   `json:"success,omitempty"`
	Error   string `json:"error,omitempty"`
	Data    any    `json:"data,omitempty"`
	Message string `json:"message,omitempty"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Success bool   `json:"success"`
	Token   string `json:"token,omitempty"`
	Message string `json:"message,omitempty"`
}

// AuthState 认证状态
type AuthState struct {
	IsAuthenticated bool   `json:"is_authenticated"`
	Token           string `json:"token,omitempty"`
}

// DashboardStats 仪表盘统计
type DashboardStats struct {
	Connections struct {
		Active int `json:"active"`
		Total  int `json:"total"`
	} `json:"connections"`
	Secrets struct {
		Total   int `json:"total"`
		Blocked int `json:"blocked"`
	} `json:"secrets"`
	Logs struct {
		Total    int `json:"total"`
		Errors   int `json:"error"`
		Warnings int `json:"warnings"`
	} `json:"logs"`
	System struct {
		Uptime    float64 `json:"uptime"`
		Memory    int     `json:"memory"`
		CPU       int     `json:"cpu"`
		CPUCores  int     `json:"cpu_cores"`
		CPUModel  string  `json:"cpu_model"`
		LoadAvg   []float64 `json:"load_average"`
	} `json:"system"`
}

// SecretStats 密钥统计
type SecretStats struct {
	Total        int `json:"total"`
	Enabled      int `json:"enabled"`
	Disabled     int `json:"disabled"`
	RecentlyUsed int `json:"recently_used"`
	NeverUsed    int `json:"never_used"`
}


// BatchOperationRequest 批量操作请求
type BatchOperationRequest struct {
	Action  string   `json:"action" binding:"required"`
	Secrets []string `json:"secrets" binding:"required"`
}

// BatchOperationResult 批量操作结果
type BatchOperationResult struct {
	Success int      `json:"success"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors"`
}

// ExportData 导出数据
type ExportData struct {
	Secrets  map[string]Secret `json:"secrets"`
	Metadata struct {
		ExportedAt   time.Time `json:"exported_at"`
		Version      string    `json:"version"`
		TotalSecrets int       `json:"total_secrets"`
	} `json:"metadata"`
}

// ImportData 导入数据
type ImportData struct {
	Secrets  map[string]Secret `json:"secrets"`
	Metadata map[string]any    `json:"metadata,omitempty"`
}

// ImportResult 导入结果
type ImportResult struct {
	Imported int      `json:"imported"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors"`
}

// WebhookRequest Webhook请求
type WebhookRequest struct {
	Type string `json:"type"`
	Data any    `json:"data"`
	D    struct {
		EventTs    string `json:"event_ts"`
		PlainToken string `json:"plain_token"`
	} `json:"d,omitempty"`
}

// SignatureResponse 签名响应
type SignatureResponse struct {
	PlainToken string `json:"plain_token"`
	Signature  string `json:"signature"`
}

// HealthResponse 健康检查响应
type HealthResponse struct {
	Status      string    `json:"status"`
	Timestamp   time.Time `json:"timestamp"`
	Uptime      float64   `json:"uptime"`
	Memory      struct {
		HeapUsed    uint64 `json:"heap_used"`
		HeapTotal   uint64 `json:"heap_total"`
		HeapSys     uint64 `json:"heap_sys"`
		HeapIdle    uint64 `json:"heap_idle"`
		HeapInuse   uint64 `json:"heap_inuse"`
		HeapReleased uint64 `json:"heap_released"`
		HeapObjects uint64 `json:"heap_objects"`
	} `json:"memory"`
	CPU struct {
		Usage int    `json:"usage"`
		Cores int    `json:"cores"`
		Model string `json:"model"`
		Speed int    `json:"speed"`
	} `json:"cpu"`
	Connections int       `json:"connections"`
	LoadAverage []float64 `json:"load_average"`
	Version     string    `json:"version"`
}

// ConfigUpdateRequest 配置更新请求
type ConfigUpdateRequest struct {
	Server    *ServerConfigUpdate    `json:"server,omitempty"`
	Security  *SecurityConfigUpdate  `json:"security,omitempty"`
	Auth      *AuthConfigUpdate      `json:"auth,omitempty"`
	Logging   *LoggingConfigUpdate   `json:"logging,omitempty"`
	WebSocket *WebSocketConfigUpdate `json:"websocket,omitempty"`
}

// ServerConfigUpdate 服务器配置更新
type ServerConfigUpdate struct {
	Port string             `json:"port,omitempty"`
	Host string             `json:"host,omitempty"`
	Mode string             `json:"mode,omitempty"`
	CORS *CORSConfigUpdate  `json:"cors,omitempty"`
}

// CORSConfigUpdate CORS配置更新
type CORSConfigUpdate struct {
	Origins []string `json:"origins,omitempty"`
}

// SecurityConfigUpdate 安全配置更新
type SecurityConfigUpdate struct {
	EnableSignatureValidation    bool `json:"enable_signature_validation"`
	DefaultAllowNewConnections   bool `json:"default_allow_new_connections"`
	MaxConnectionsPerSecret      int  `json:"max_connections_per_secret,omitempty"`
	RequireManualKeyManagement   bool `json:"require_manual_key_management"`
}

// AuthConfigUpdate 认证配置更新
type AuthConfigUpdate struct {
	Username       string `json:"username,omitempty"`
	Password       string `json:"password,omitempty"`
	SessionTimeout int64  `json:"session_timeout,omitempty"`
	JWTSecret      string `json:"jwt_secret,omitempty"`
}

// LoggingConfigUpdate 日志配置更新
type LoggingConfigUpdate struct {
	Level           string `json:"level,omitempty"`
	MaxLogEntries   int    `json:"max_log_entries,omitempty"`
	EnableLogToFile bool   `json:"enable_log_to_file"`
	LogFilePath     string `json:"log_file_path,omitempty"`
}

// WebSocketConfigUpdate WebSocket配置更新
type WebSocketConfigUpdate struct {
	EnableHeartbeat   bool `json:"enable_heartbeat"`
	HeartbeatInterval int  `json:"heartbeat_interval,omitempty"`
	MaxMessageSize    int  `json:"max_message_size,omitempty"`
	ReadTimeout       int  `json:"read_timeout,omitempty"`
	WriteTimeout      int  `json:"write_timeout,omitempty"`
}
