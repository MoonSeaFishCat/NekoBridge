package database

import (
	"fmt"
	"time"
)

// ConfigInitializer 配置初始化器
type ConfigInitializer struct {
	configService *ConfigService
}

// NewConfigInitializer 创建配置初始化器
func NewConfigInitializer() *ConfigInitializer {
	return &ConfigInitializer{
		configService: &ConfigService{},
	}
}

// InitializeDefaultConfigs 初始化默认配置
func (ci *ConfigInitializer) InitializeDefaultConfigs() error {
	// 定义默认配置项
	defaultConfigs := []struct {
		Key         string
		Value       string
		Type        string
		Category    string
		Description string
		IsRequired  bool
		IsReadOnly  bool
		MinValue    *string
		MaxValue    *string
		Options     *string
	}{
		// 服务器配置
		{
			Key:         "server.port",
			Value:       "3000",
			Type:        "string",
			Category:    "server",
			Description: "服务器端口号",
			IsRequired:  true,
			IsReadOnly:  false,
			MinValue:    stringPtr("1"),
			MaxValue:    stringPtr("65535"),
		},
		{
			Key:         "server.host",
			Value:       "0.0.0.0",
			Type:        "string",
			Category:    "server",
			Description: "服务器监听地址",
			IsRequired:  true,
			IsReadOnly:  false,
		},
		{
			Key:         "server.mode",
			Value:       "debug",
			Type:        "string",
			Category:    "server",
			Description: "服务器运行模式",
			IsRequired:  true,
			IsReadOnly:  false,
			Options:     stringPtr(`["debug", "release", "test"]`),
		},
		{
			Key:         "server.cors.origins",
			Value:       `["*"]`,
			Type:        "json",
			Category:    "server",
			Description: "CORS允许的源",
			IsRequired:  false,
			IsReadOnly:  false,
		},

		// 安全配置
		{
			Key:         "security.enable_signature_validation",
			Value:       "true",
			Type:        "bool",
			Category:    "security",
			Description: "启用签名验证",
			IsRequired:  false,
			IsReadOnly:  false,
		},
		{
			Key:         "security.default_allow_new_connections",
			Value:       "true",
			Type:        "bool",
			Category:    "security",
			Description: "默认允许新连接",
			IsRequired:  false,
			IsReadOnly:  false,
		},
		{
			Key:         "security.max_connections_per_secret",
			Value:       "5",
			Type:        "int",
			Category:    "security",
			Description: "每个密钥的最大连接数",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("1"),
			MaxValue:    stringPtr("100"),
		},
		{
			Key:         "security.require_manual_key_management",
			Value:       "false",
			Type:        "bool",
			Category:    "security",
			Description: "要求手动管理密钥",
			IsRequired:  false,
			IsReadOnly:  false,
		},

		// 认证配置
		{
			Key:         "auth.username",
			Value:       "admin",
			Type:        "string",
			Category:    "auth",
			Description: "管理员用户名",
			IsRequired:  true,
			IsReadOnly:  false,
		},
		{
			Key:         "auth.password",
			Value:       "admin123",
			Type:        "string",
			Category:    "auth",
			Description: "管理员密码",
			IsRequired:  true,
			IsReadOnly:  false,
		},
		{
			Key:         "auth.session_timeout",
			Value:       "86400",
			Type:        "int",
			Category:    "auth",
			Description: "会话超时时间（秒）",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("300"),
			MaxValue:    stringPtr("604800"),
		},
		{
			Key:         "auth.jwt_secret",
			Value:       "",
			Type:        "string",
			Category:    "auth",
			Description: "JWT密钥（自动生成）",
			IsRequired:  true,
			IsReadOnly:  true,
		},

		// UI配置
		{
			Key:         "ui.enable_web_console",
			Value:       "true",
			Type:        "bool",
			Category:    "ui",
			Description: "启用Web控制台",
			IsRequired:  false,
			IsReadOnly:  false,
		},
		{
			Key:         "ui.theme",
			Value:       "auto",
			Type:        "string",
			Category:    "ui",
			Description: "主题模式",
			IsRequired:  false,
			IsReadOnly:  false,
			Options:     stringPtr(`["auto", "light", "dark"]`),
		},
		{
			Key:         "ui.primary_color",
			Value:       "#165DFF",
			Type:        "string",
			Category:    "ui",
			Description: "主色调",
			IsRequired:  false,
			IsReadOnly:  false,
		},
		{
			Key:         "ui.compact_mode",
			Value:       "false",
			Type:        "bool",
			Category:    "ui",
			Description: "紧凑模式",
			IsRequired:  false,
			IsReadOnly:  false,
		},
		{
			Key:         "ui.language",
			Value:       "zh-CN",
			Type:        "string",
			Category:    "ui",
			Description: "界面语言",
			IsRequired:  false,
			IsReadOnly:  false,
			Options:     stringPtr(`["zh-CN", "en-US"]`),
		},

		// 日志配置
		{
			Key:         "logging.level",
			Value:       "info",
			Type:        "string",
			Category:    "logging",
			Description: "日志级别",
			IsRequired:  false,
			IsReadOnly:  false,
			Options:     stringPtr(`["debug", "info", "warn", "error"]`),
		},
		{
			Key:         "logging.max_log_entries",
			Value:       "1000",
			Type:        "int",
			Category:    "logging",
			Description: "最大日志条目数",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("100"),
			MaxValue:    stringPtr("10000"),
		},
		{
			Key:         "logging.enable_file_logging",
			Value:       "false",
			Type:        "bool",
			Category:    "logging",
			Description: "启用文件日志",
			IsRequired:  false,
			IsReadOnly:  false,
		},
		{
			Key:         "logging.log_file_path",
			Value:       "./logs/webhook.log",
			Type:        "string",
			Category:    "logging",
			Description: "日志文件路径",
			IsRequired:  false,
			IsReadOnly:  false,
		},

		// WebSocket配置
		{
			Key:         "websocket.enable_heartbeat",
			Value:       "false",
			Type:        "bool",
			Category:    "websocket",
			Description: "启用心跳检测",
			IsRequired:  false,
			IsReadOnly:  false,
		},
		{
			Key:         "websocket.heartbeat_interval",
			Value:       "30000",
			Type:        "int",
			Category:    "websocket",
			Description: "心跳间隔（毫秒）",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("1000"),
			MaxValue:    stringPtr("300000"),
		},
		{
			Key:         "websocket.heartbeat_timeout",
			Value:       "5000",
			Type:        "int",
			Category:    "websocket",
			Description: "心跳超时（毫秒）",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("1000"),
			MaxValue:    stringPtr("60000"),
		},
		{
			Key:         "websocket.client_heartbeat_interval",
			Value:       "25000",
			Type:        "int",
			Category:    "websocket",
			Description: "客户端心跳间隔（毫秒）",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("1000"),
			MaxValue:    stringPtr("300000"),
		},
		{
			Key:         "websocket.max_message_size",
			Value:       "1048576",
			Type:        "int",
			Category:    "websocket",
			Description: "最大消息大小（字节）",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("1024"),
			MaxValue:    stringPtr("10485760"),
		},
		{
			Key:         "websocket.read_timeout",
			Value:       "60000",
			Type:        "int",
			Category:    "websocket",
			Description: "读取超时（毫秒）",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("1000"),
			MaxValue:    stringPtr("300000"),
		},
		{
			Key:         "websocket.write_timeout",
			Value:       "60000",
			Type:        "int",
			Category:    "websocket",
			Description: "写入超时（毫秒）",
			IsRequired:  false,
			IsReadOnly:  false,
			MinValue:    stringPtr("1000"),
			MaxValue:    stringPtr("300000"),
		},
	}

	// 初始化配置项
	for _, config := range defaultConfigs {
		// 检查配置是否已存在
		existing, err := ci.configService.GetConfig(config.Key)
		if err == nil && existing != nil {
			// 配置已存在，跳过
			continue
		}

		// 特殊处理JWT密钥
		if config.Key == "auth.jwt_secret" {
			config.Value = generateRandomString(64)
		}

		// 创建配置项
		err = ci.configService.SetConfigWithValidation(
			config.Key,
			config.Value,
			config.Type,
			config.Category,
			config.Description,
			config.IsRequired,
			config.IsReadOnly,
			config.MinValue,
			config.MaxValue,
			config.Options,
		)
		if err != nil {
			return fmt.Errorf("初始化配置项 %s 失败: %v", config.Key, err)
		}
	}

	return nil
}

// stringPtr 创建字符串指针
func stringPtr(s string) *string {
	return &s
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

// GetConfigCategories 获取配置分类列表
func (ci *ConfigInitializer) GetConfigCategories() []string {
	return []string{
		"server",
		"security", 
		"auth",
		"ui",
		"logging",
		"websocket",
	}
}

// GetCategoryDisplayName 获取分类显示名称
func (ci *ConfigInitializer) GetCategoryDisplayName(category string) string {
	names := map[string]string{
		"server":    "服务器设置",
		"security":  "安全设置",
		"auth":      "认证设置",
		"ui":        "界面设置",
		"logging":   "日志设置",
		"websocket": "WebSocket设置",
	}
	if name, exists := names[category]; exists {
		return name
	}
	return category
}
