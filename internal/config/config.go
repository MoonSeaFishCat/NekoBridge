package config

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/spf13/viper"
)

// Config 应用配置结构
type Config struct {
	Server    ServerConfig            `mapstructure:"server"`
	Security  SecurityConfig          `mapstructure:"security"`
	Auth      AuthConfig              `mapstructure:"auth"`
	UI        UIConfig                `mapstructure:"ui"`
	Logging   LoggingConfig           `mapstructure:"logging"`
	WebSocket WebSocketConfig         `mapstructure:"websocket"`
	Secrets   map[string]SecretConfig `mapstructure:"secrets"`
	mu        sync.RWMutex
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port           string     `mapstructure:"port"`
	Host           string     `mapstructure:"host"`
	Domain         string     `mapstructure:"domain"`          // 绑定的域名
	EnforceDomain  bool       `mapstructure:"enforce_domain"`  // 是否强制检查域名访问
	TrustedProxies []string   `mapstructure:"trusted_proxies"` // 受信任的代理 IP 列表
	Mode           string     `mapstructure:"mode"`
	CORS           CORSConfig `mapstructure:"cors"`
	SSL            SSLConfig  `mapstructure:"ssl"`
}

// SSLConfig SSL配置
type SSLConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	Cert    string `mapstructure:"cert"`
	Key     string `mapstructure:"key"`
}

// CORSConfig CORS配置
type CORSConfig struct {
	Origins []string `mapstructure:"origins"`
}

// SecurityConfig 安全配置
type SecurityConfig struct {
	EnableSignatureValidation  bool `mapstructure:"enable_signature_validation"`
	DefaultAllowNewConnections bool `mapstructure:"default_allow_new_connections"`
	MaxConnectionsPerSecret    int  `mapstructure:"max_connections_per_secret"`
	RequireManualKeyManagement bool `mapstructure:"require_manual_key_management"`
}

// AuthConfig 认证配置
type AuthConfig struct {
	Username       string `mapstructure:"username"`
	Password       string `mapstructure:"password"`
	SessionTimeout int64  `mapstructure:"session_timeout"`
	JWTSecret      string `mapstructure:"jwt_secret"`
}

// UIConfig UI配置
type UIConfig struct {
	EnableWebConsole bool   `mapstructure:"enable_web_console"`
	Theme            string `mapstructure:"theme"`
	PrimaryColor     string `mapstructure:"primary_color"`
	CompactMode      bool   `mapstructure:"compact_mode"`
	Language         string `mapstructure:"language"`
	ShowBreadcrumb   bool   `mapstructure:"show_breadcrumb"`
	ShowFooter       bool   `mapstructure:"show_footer"`
	EnableAnimation  bool   `mapstructure:"enable_animation"`
}

// LoggingConfig 日志配置
type LoggingConfig struct {
	Level             string `mapstructure:"level"`
	MaxLogEntries     int    `mapstructure:"max_log_entries"`
	EnableFileLogging bool   `mapstructure:"enable_file_logging"`
	EnableLogToFile   bool   `mapstructure:"enable_log_to_file"`
	LogFilePath       string `mapstructure:"log_file_path"`
}

// WebSocketConfig WebSocket配置
type WebSocketConfig struct {
	EnableHeartbeat         bool     `mapstructure:"enable_heartbeat"`
	HeartbeatInterval       int      `mapstructure:"heartbeat_interval"`
	HeartbeatTimeout        int      `mapstructure:"heartbeat_timeout"`
	ClientHeartbeatInterval int      `mapstructure:"client_heartbeat_interval"`
	MaxMessageSize          int      `mapstructure:"max_message_size"`
	ReadTimeout             int      `mapstructure:"read_timeout"`
	WriteTimeout            int      `mapstructure:"write_timeout"`
	SupportedFormats        []string `mapstructure:"supported_formats"`      // 支持的消息格式: json, text, binary
	DefaultFormat           string   `mapstructure:"default_format"`         // 默认消息格式
	EnableBinaryMessages    bool     `mapstructure:"enable_binary_messages"` // 是否启用二进制消息
	MaxBinarySize           int      `mapstructure:"max_binary_size"`        // 最大二进制消息大小（字节）
}

// SecretConfig 密钥配置
type SecretConfig struct {
	Enabled        bool       `json:"enabled"`
	Description    string     `json:"description,omitempty"`
	MaxConnections int        `json:"max_connections,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	LastUsed       *time.Time `json:"last_used,omitempty"`
}

// 默认配置
var defaultConfig = Config{
	Server: ServerConfig{
		Port: "3000",
		Host: "0.0.0.0",
		Mode: "debug",
		CORS: CORSConfig{
			Origins: []string{"*"},
		},
	},
	Security: SecurityConfig{
		EnableSignatureValidation:  true,
		DefaultAllowNewConnections: true,
		MaxConnectionsPerSecret:    5,
		RequireManualKeyManagement: false,
	},
	Auth: AuthConfig{
		Username:       "admin",
		Password:       "admin123",
		SessionTimeout: 86400, // 24小时
		JWTSecret:      "",
	},
	UI: UIConfig{
		EnableWebConsole: true,
		Theme:            "auto",
		PrimaryColor:     "#165DFF",
		CompactMode:      false,
		Language:         "zh-CN",
		ShowBreadcrumb:   true,
		ShowFooter:       true,
		EnableAnimation:  true,
	},
	Logging: LoggingConfig{
		Level:             "info",
		MaxLogEntries:     1000,
		EnableFileLogging: false,
		LogFilePath:       "./logs/webhook.log",
	},
	WebSocket: WebSocketConfig{
		EnableHeartbeat:         false,
		HeartbeatInterval:       30000,
		HeartbeatTimeout:        5000,
		ClientHeartbeatInterval: 25000,
		MaxMessageSize:          65536, // 64KB
		ReadTimeout:             60000, // 60秒
		WriteTimeout:            10000, // 10秒
		SupportedFormats:        []string{"json", "text", "binary"},
		DefaultFormat:           "json",
		EnableBinaryMessages:    true,
		MaxBinarySize:           1048576, // 1MB
	},
	Secrets: make(map[string]SecretConfig),
}

// Load 加载配置
func Load() (*Config, error) {
	// 设置配置文件路径
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath("/etc/qq-webhook-pro")

	// 设置环境变量前缀
	viper.SetEnvPrefix("QQ_WEBHOOK")
	viper.AutomaticEnv()

	// 设置默认值
	setDefaults()

	// 读取配置文件
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// 配置文件不存在，使用默认配置
			fmt.Println("⚠️  配置文件不存在，使用默认配置")
		} else {
			return nil, fmt.Errorf("读取配置文件失败: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	// 验证和修复配置
	if err := validateAndRepairConfig(&config); err != nil {
		return nil, fmt.Errorf("配置验证失败: %w", err)
	}

	// 保存配置到文件
	if err := saveConfigToFile(&config); err != nil {
		fmt.Printf("⚠️  保存配置文件失败: %v\n", err)
	}

	fmt.Printf("✅ 配置加载成功\n")
	fmt.Printf("📊 已加载 %d 个密钥\n", len(config.Secrets))

	return &config, nil
}

// setDefaults 设置默认值
func setDefaults() {
	viper.SetDefault("server.port", defaultConfig.Server.Port)
	viper.SetDefault("server.host", defaultConfig.Server.Host)
	viper.SetDefault("server.domain", "")
	viper.SetDefault("server.enforce_domain", false)
	viper.SetDefault("server.trusted_proxies", []string{"127.0.0.1", "::1"})
	viper.SetDefault("server.mode", defaultConfig.Server.Mode)
	viper.SetDefault("server.cors.origins", defaultConfig.Server.CORS.Origins)
	viper.SetDefault("server.ssl.enabled", false)
	viper.SetDefault("server.ssl.cert", "")
	viper.SetDefault("server.ssl.key", "")

	viper.SetDefault("security.enable_signature_validation", defaultConfig.Security.EnableSignatureValidation)
	viper.SetDefault("security.default_allow_new_connections", defaultConfig.Security.DefaultAllowNewConnections)
	viper.SetDefault("security.max_connections_per_secret", defaultConfig.Security.MaxConnectionsPerSecret)
	viper.SetDefault("security.require_manual_key_management", defaultConfig.Security.RequireManualKeyManagement)

	viper.SetDefault("auth.username", defaultConfig.Auth.Username)
	viper.SetDefault("auth.password", defaultConfig.Auth.Password)
	viper.SetDefault("auth.session_timeout", defaultConfig.Auth.SessionTimeout)

	viper.SetDefault("ui.enable_web_console", defaultConfig.UI.EnableWebConsole)
	viper.SetDefault("ui.theme", defaultConfig.UI.Theme)
	viper.SetDefault("ui.primary_color", defaultConfig.UI.PrimaryColor)
	viper.SetDefault("ui.compact_mode", defaultConfig.UI.CompactMode)
	viper.SetDefault("ui.language", defaultConfig.UI.Language)
	viper.SetDefault("ui.show_breadcrumb", defaultConfig.UI.ShowBreadcrumb)
	viper.SetDefault("ui.show_footer", defaultConfig.UI.ShowFooter)
	viper.SetDefault("ui.enable_animation", defaultConfig.UI.EnableAnimation)

	viper.SetDefault("logging.level", defaultConfig.Logging.Level)
	viper.SetDefault("logging.max_log_entries", defaultConfig.Logging.MaxLogEntries)
	viper.SetDefault("logging.enable_file_logging", defaultConfig.Logging.EnableFileLogging)
	viper.SetDefault("logging.log_file_path", defaultConfig.Logging.LogFilePath)

	viper.SetDefault("websocket.enable_heartbeat", defaultConfig.WebSocket.EnableHeartbeat)
	viper.SetDefault("websocket.heartbeat_interval", defaultConfig.WebSocket.HeartbeatInterval)
	viper.SetDefault("websocket.heartbeat_timeout", defaultConfig.WebSocket.HeartbeatTimeout)
	viper.SetDefault("websocket.client_heartbeat_interval", defaultConfig.WebSocket.ClientHeartbeatInterval)
}

// validateAndRepairConfig 验证和修复配置
func validateAndRepairConfig(config *Config) error {
	// 确保JWT密钥存在
	if config.Auth.JWTSecret == "" {
		config.Auth.JWTSecret = generateRandomString(64)
	}

	// 确保所有密钥都有必要的字段
	for secret, secretConfig := range config.Secrets {
		if secretConfig.CreatedAt.IsZero() {
			secretConfig.CreatedAt = time.Now()
			config.Secrets[secret] = secretConfig
		}
	}

	return nil
}

// SaveConfig 保存配置到文件（公开函数）
func SaveConfig(config *Config) error {
	return saveConfigToFile(config)
}

// saveConfigToFile 保存配置到文件
func saveConfigToFile(config *Config) error {
	// 创建配置目录
	if err := os.MkdirAll("configs", 0755); err != nil {
		return err
	}

	// 使用 viper 保存为 YAML 格式
	viper.Set("server", config.Server)
	viper.Set("security", config.Security)
	viper.Set("auth", config.Auth)
	viper.Set("ui", config.UI)
	viper.Set("logging", config.Logging)
	viper.Set("websocket", config.WebSocket)
	viper.Set("secrets", config.Secrets)

	configFile := "configs/config.yaml"
	if err := viper.WriteConfigAs(configFile); err != nil {
		return err
	}

	fmt.Printf("💾 配置已保存: %s\n", configFile)
	return nil
}

// generateRandomString 生成随机字符串
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}

// IsSecretEnabled 检查密钥是否启用
func (c *Config) IsSecretEnabled(secret string) bool {
	c.mu.RLock()
	secretConfig, exists := c.Secrets[secret]
	c.mu.RUnlock()

	// 如果密钥已存在，直接返回其启用状态
	if exists {
		return secretConfig.Enabled
	}

	// 如果密钥不存在，根据管理模式决定
	if c.Security.RequireManualKeyManagement {
		// 手动模式：只允许手动添加的密钥
		return false
	} else {
		// 自动模式：允许新连接（根据默认配置）
		return c.Security.DefaultAllowNewConnections
	}
}

// Clone 创建配置的深拷贝（不包含互斥锁）
func (c *Config) Clone() *Config {
	c.mu.RLock()
	defer c.mu.RUnlock()

	clone := &Config{
		Server:    c.Server,
		Security:  c.Security,
		Auth:      c.Auth,
		UI:        c.UI,
		Logging:   c.Logging,
		WebSocket: c.WebSocket,
		Secrets:   make(map[string]SecretConfig, len(c.Secrets)),
	}

	for k, v := range c.Secrets {
		clone.Secrets[k] = v
	}

	return clone
}

// Restore 从另一个配置恢复数据
func (c *Config) Restore(other *Config) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.Server = other.Server
	c.Security = other.Security
	c.Auth = other.Auth
	c.UI = other.UI
	c.Logging = other.Logging
	c.WebSocket = other.WebSocket
	c.Secrets = make(map[string]SecretConfig, len(other.Secrets))
	for k, v := range other.Secrets {
		c.Secrets[k] = v
	}
}

// GetSecretConfig 获取密钥配置
func (c *Config) GetSecretConfig(secret string) (SecretConfig, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	config, exists := c.Secrets[secret]
	return config, exists
}

// GetSecrets 获取所有密钥配置的副本
func (c *Config) GetSecrets() map[string]SecretConfig {
	c.mu.RLock()
	defer c.mu.RUnlock()

	secrets := make(map[string]SecretConfig, len(c.Secrets))
	for k, v := range c.Secrets {
		secrets[k] = v
	}
	return secrets
}

// AddSecret 添加密钥
func (c *Config) AddSecret(secret string, options SecretConfig) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.Secrets == nil {
		c.Secrets = make(map[string]SecretConfig)
	}

	c.Secrets[secret] = SecretConfig{
		Enabled:        options.Enabled,
		Description:    options.Description,
		MaxConnections: options.MaxConnections,
		CreatedAt:      time.Now(),
	}
}

// UpdateSecret 更新密钥
func (c *Config) UpdateSecret(secret string, updates SecretConfig) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if existing, exists := c.Secrets[secret]; exists {
		if updates.Description != "" {
			existing.Description = updates.Description
		}
		if updates.MaxConnections > 0 {
			existing.MaxConnections = updates.MaxConnections
		}
		existing.Enabled = updates.Enabled
		c.Secrets[secret] = existing
	}
}

// RemoveSecret 删除密钥
func (c *Config) RemoveSecret(secret string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.Secrets, secret)
}

// MarkSecretUsed 标记密钥已使用
func (c *Config) MarkSecretUsed(secret string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if secretConfig, exists := c.Secrets[secret]; exists {
		now := time.Now()
		secretConfig.LastUsed = &now
		c.Secrets[secret] = secretConfig
	}
}
