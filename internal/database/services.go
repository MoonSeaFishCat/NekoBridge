package database

import (
	"encoding/json"
	"fmt"
	"time"
	"errors"
	"strconv"
	"strings"
	"gorm.io/gorm"
)

// SecretService 密钥服务
type SecretService struct{}

// CreateSecret 创建密钥
func (s *SecretService) CreateSecret(secret *Secret) error {
	return DB.Create(secret).Error
}

// GetSecret 获取密钥
func (s *SecretService) GetSecret(secret string) (*Secret, error) {
	var sct Secret
	err := DB.Where("secret = ?", secret).First(&sct).Error
	if err != nil {
		return nil, err
	}
	return &sct, nil
}

// GetSecrets 获取所有密钥
func (s *SecretService) GetSecrets() ([]Secret, error) {
	var secrets []Secret
	err := DB.Find(&secrets).Error
	return secrets, err
}

// UpdateSecret 更新密钥
func (s *SecretService) UpdateSecret(secret *Secret) error {
	return DB.Save(secret).Error
}

// DeleteSecret 删除密钥
func (s *SecretService) DeleteSecret(secret string) error {
	return DB.Where("secret = ?", secret).Delete(&Secret{}).Error
}

// EnableSecret 启用密钥
func (s *SecretService) EnableSecret(secret string) error {
	return DB.Model(&Secret{}).Where("secret = ?", secret).Update("enabled", true).Error
}

// DisableSecret 禁用密钥
func (s *SecretService) DisableSecret(secret string) error {
	return DB.Model(&Secret{}).Where("secret = ?", secret).Update("enabled", false).Error
}

// BanService 封禁服务
type BanService struct{}

// CreateBanRecord 创建封禁记录
func (s *BanService) CreateBanRecord(ban *BanRecord) error {
	return DB.Create(ban).Error
}

// GetActiveBans 获取活跃的封禁记录
func (s *BanService) GetActiveBans() ([]BanRecord, error) {
	var bans []BanRecord
	err := DB.Where("is_active = ?", true).Find(&bans).Error
	return bans, err
}

// GetBanHistory 获取封禁历史
func (s *BanService) GetBanHistory(secret string) ([]BanRecord, error) {
	var bans []BanRecord
	err := DB.Where("secret = ?", secret).Order("created_at DESC").Find(&bans).Error
	return bans, err
}

// UnbanSecret 解封密钥
func (s *BanService) UnbanSecret(secret, unbannedBy string) error {
	now := time.Now()
	return DB.Model(&BanRecord{}).
		Where("secret = ? AND is_active = ?", secret, true).
		Updates(map[string]interface{}{
			"is_active":    false,
			"unbanned_at":  &now,
			"unbanned_by":  &unbannedBy,
			"updated_at":   now,
		}).Error
}

// GetBanRecords 获取所有封禁记录
func (s *BanService) GetBanRecords() ([]*BanRecord, error) {
	var records []*BanRecord
	err := DB.Find(&records).Error
	return records, err
}

// GetBanRecord 根据ID获取封禁记录
func (s *BanService) GetBanRecord(id uint) (*BanRecord, error) {
	var record BanRecord
	err := DB.First(&record, id).Error
	return &record, err
}

// UpdateBanRecord 更新封禁记录
func (s *BanService) UpdateBanRecord(record *BanRecord) error {
	return DB.Save(record).Error
}

// DeleteBanRecord 删除封禁记录
func (s *BanService) DeleteBanRecord(id uint) error {
	return DB.Delete(&BanRecord{}, id).Error
}

// ConfigService 配置服务
type ConfigService struct{}

// GetConfig 获取配置
func (s *ConfigService) GetConfig(key string) (*SystemConfig, error) {
	var config SystemConfig
	err := DB.Where("key = ?", key).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// SetConfig 设置配置
func (s *ConfigService) SetConfig(key, value, configType string) error {
	return s.SetConfigWithCategory(key, value, configType, "", "")
}

// SetConfigWithCategory 设置配置（带分类和描述）
func (s *ConfigService) SetConfigWithCategory(key, value, configType, category, description string) error {
	// 首先查找是否存在
	var existingConfig SystemConfig
	err := DB.Where("key = ?", key).First(&existingConfig).Error
	
	if err != nil {
		// 不存在，创建新记录
		if errors.Is(err, gorm.ErrRecordNotFound) {
			config := &SystemConfig{
				Key:         key,
				Value:       value,
				Type:        configType,
				Category:    category,
				Description: description,
			}
			return DB.Create(config).Error
		}
		return err
	}
	
	// 存在，更新记录
	existingConfig.Value = value
	existingConfig.Type = configType
	if category != "" {
		existingConfig.Category = category
	}
	if description != "" {
		existingConfig.Description = description
	}
	return DB.Save(&existingConfig).Error
}

// SetConfigWithValidation 设置配置（带验证）
func (s *ConfigService) SetConfigWithValidation(key, value, configType, category, description string, isRequired, isReadOnly bool, minValue, maxValue, options *string) error {
	// 验证配置值
	if err := s.validateConfigValue(key, value, configType, minValue, maxValue, options); err != nil {
		return err
	}
	
	// 首先查找是否存在
	var existingConfig SystemConfig
	err := DB.Where("key = ?", key).First(&existingConfig).Error
	
	if err != nil {
		// 不存在，创建新记录
		if errors.Is(err, gorm.ErrRecordNotFound) {
			config := &SystemConfig{
				Key:         key,
				Value:       value,
				Type:        configType,
				Category:    category,
				Description: description,
				IsRequired:  isRequired,
				IsReadOnly:  isReadOnly,
				MinValue:    minValue,
				MaxValue:    maxValue,
				Options:     options,
			}
			return DB.Create(config).Error
		}
		return err
	}
	
	// 检查是否只读
	if existingConfig.IsReadOnly {
		return errors.New("配置项为只读，无法修改")
	}
	
	// 存在，更新记录
	existingConfig.Value = value
	existingConfig.Type = configType
	if category != "" {
		existingConfig.Category = category
	}
	if description != "" {
		existingConfig.Description = description
	}
	existingConfig.IsRequired = isRequired
	existingConfig.IsReadOnly = isReadOnly
	existingConfig.MinValue = minValue
	existingConfig.MaxValue = maxValue
	existingConfig.Options = options
	return DB.Save(&existingConfig).Error
}

// validateConfigValue 验证配置值
func (s *ConfigService) validateConfigValue(key, value, configType string, minValue, maxValue, options *string) error {
	// 检查必填项
	if value == "" {
		// 检查是否为必填项
		var config SystemConfig
		if err := DB.Where("key = ?", key).First(&config).Error; err == nil && config.IsRequired {
			return errors.New("必填配置项不能为空")
		}
	}
	
	// 根据类型验证值
	switch configType {
	case "int":
		if value != "" {
			if _, err := strconv.Atoi(value); err != nil {
				return errors.New("配置值必须是整数")
			}
		}
	case "float":
		if value != "" {
			if _, err := strconv.ParseFloat(value, 64); err != nil {
				return errors.New("配置值必须是数字")
			}
		}
	case "bool":
		if value != "" && value != "true" && value != "false" {
			return errors.New("配置值必须是 true 或 false")
		}
	}
	
	// 验证范围
	if minValue != nil && value != "" {
		if configType == "int" {
			val, _ := strconv.Atoi(value)
			min, _ := strconv.Atoi(*minValue)
			if val < min {
				return errors.New(fmt.Sprintf("配置值不能小于 %s", *minValue))
			}
		} else if configType == "float" {
			val, _ := strconv.ParseFloat(value, 64)
			min, _ := strconv.ParseFloat(*minValue, 64)
			if val < min {
				return errors.New(fmt.Sprintf("配置值不能小于 %s", *minValue))
			}
		}
	}
	
	if maxValue != nil && value != "" {
		if configType == "int" {
			val, _ := strconv.Atoi(value)
			max, _ := strconv.Atoi(*maxValue)
			if val > max {
				return errors.New(fmt.Sprintf("配置值不能大于 %s", *maxValue))
			}
		} else if configType == "float" {
			val, _ := strconv.ParseFloat(value, 64)
			max, _ := strconv.ParseFloat(*maxValue, 64)
			if val > max {
				return errors.New(fmt.Sprintf("配置值不能大于 %s", *maxValue))
			}
		}
	}
	
	// 验证选项
	if options != nil && value != "" {
		var optionList []string
		if err := json.Unmarshal([]byte(*options), &optionList); err == nil {
			found := false
			for _, option := range optionList {
				if option == value {
					found = true
					break
				}
			}
			if !found {
				return errors.New(fmt.Sprintf("配置值必须是以下选项之一: %s", *options))
			}
		}
	}
	
	return nil
}

// GetAllConfigs 获取所有配置
func (s *ConfigService) GetAllConfigs() (map[string]interface{}, error) {
	var configs []SystemConfig
	err := DB.Find(&configs).Error
	if err != nil {
		return nil, err
	}

	result := make(map[string]interface{})
	for _, config := range configs {
		var value interface{}
		switch config.Type {
		case "bool":
			value = config.Value == "true"
		case "int":
			var intVal int
			if _, err := fmt.Sscanf(config.Value, "%d", &intVal); err == nil {
				value = intVal
			} else {
				value = config.Value
			}
		case "float":
			var floatVal float64
			if _, err := strconv.ParseFloat(config.Value, 64); err == nil {
				value = floatVal
			} else {
				value = config.Value
			}
		case "json":
			var jsonVal interface{}
			if err := json.Unmarshal([]byte(config.Value), &jsonVal); err == nil {
				value = jsonVal
			} else {
				value = config.Value
			}
		default:
			value = config.Value
		}
		result[config.Key] = value
	}
	return result, nil
}

// GetConfigsByCategory 根据分类获取配置
func (s *ConfigService) GetConfigsByCategory(category string) ([]SystemConfig, error) {
	var configs []SystemConfig
	err := DB.Where("category = ?", category).Find(&configs).Error
	return configs, err
}

// GetConfigSchema 获取配置架构（用于前端表单生成）
func (s *ConfigService) GetConfigSchema() (map[string]interface{}, error) {
	var configs []SystemConfig
	err := DB.Find(&configs).Error
	if err != nil {
		return nil, err
	}

	// 按分类组织配置
	categories := make(map[string][]SystemConfig)
	for _, config := range configs {
		categories[config.Category] = append(categories[config.Category], config)
	}

	// 生成前端需要的架构
	schema := make(map[string]interface{})
	for category, configs := range categories {
		categorySchema := make(map[string]interface{})
		for _, config := range configs {
			fieldSchema := map[string]interface{}{
				"type":        config.Type,
				"description": config.Description,
				"required":    config.IsRequired,
				"readOnly":    config.IsReadOnly,
			}
			
			if config.MinValue != nil {
				fieldSchema["minValue"] = *config.MinValue
			}
			if config.MaxValue != nil {
				fieldSchema["maxValue"] = *config.MaxValue
			}
			if config.Options != nil {
				var options []string
				if err := json.Unmarshal([]byte(*config.Options), &options); err == nil {
					fieldSchema["options"] = options
				}
			}
			
			categorySchema[config.Key] = fieldSchema
		}
		schema[category] = categorySchema
	}

	return schema, nil
}

// DeleteConfig 删除配置
func (s *ConfigService) DeleteConfig(key string) error {
	return DB.Where("key = ?", key).Delete(&SystemConfig{}).Error
}

// ResetConfigToDefault 重置配置为默认值
func (s *ConfigService) ResetConfigToDefault(key string) error {
	// 这里应该从默认配置中获取值
	// 为了简化，这里只是删除配置项，让系统使用默认值
	return s.DeleteConfig(key)
}

// BatchUpdateConfigs 批量更新配置
func (s *ConfigService) BatchUpdateConfigs(updates map[string]interface{}) error {
	tx := DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for key, value := range updates {
		valueStr := fmt.Sprintf("%v", value)
		
		// 获取配置类型
		var config SystemConfig
		err := tx.Where("key = ?", key).First(&config).Error
		
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// 配置不存在，尝试创建默认配置
				// 根据key推断配置类型和分类
				configType, category := s.inferConfigTypeAndCategory(key)
				
				// 创建新配置
				config = SystemConfig{
					Key:         key,
					Value:       valueStr,
					Type:        configType,
					Category:    category,
					Description: s.getConfigDescription(key),
					IsRequired:  false,
					IsReadOnly:  false,
				}
				
				if err := tx.Create(&config).Error; err != nil {
					tx.Rollback()
					return fmt.Errorf("创建配置项 %s 失败: %v", key, err)
				}
			} else {
				tx.Rollback()
				return fmt.Errorf("获取配置项 %s 失败: %v", key, err)
			}
		} else {
			// 验证值
			if err := s.validateConfigValue(key, valueStr, config.Type, config.MinValue, config.MaxValue, config.Options); err != nil {
				tx.Rollback()
				return fmt.Errorf("配置项 %s 验证失败: %v", key, err)
			}
			
			// 更新值
			if err := tx.Model(&config).Update("value", valueStr).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit().Error
}

// inferConfigTypeAndCategory 根据key推断配置类型和分类
func (s *ConfigService) inferConfigTypeAndCategory(key string) (string, string) {
	// 根据key前缀确定分类
	var category string
	if strings.HasPrefix(key, "server.") {
		category = "server"
	} else if strings.HasPrefix(key, "security.") {
		category = "security"
	} else if strings.HasPrefix(key, "auth.") {
		category = "auth"
	} else if strings.HasPrefix(key, "ui.") {
		category = "ui"
	} else if strings.HasPrefix(key, "logging.") {
		category = "logging"
	} else if strings.HasPrefix(key, "websocket.") {
		category = "websocket"
	} else {
		category = "system"
	}
	
	// 根据key确定类型
	var configType string
	switch key {
	case "server.port", "security.max_connections_per_secret", "auth.session_timeout", "logging.max_log_entries", "websocket.heartbeat_interval", "websocket.heartbeat_timeout", "websocket.client_heartbeat_interval", "websocket.max_message_size", "websocket.read_timeout", "websocket.write_timeout":
		configType = "int"
	case "security.enable_signature_validation", "security.default_allow_new_connections", "security.require_manual_key_management", "logging.enable_file_logging", "ui.compact_mode", "websocket.enable_heartbeat":
		configType = "bool"
	case "server.cors.origins":
		configType = "json"
	default:
		configType = "string"
	}
	
	return configType, category
}

// getConfigDescription 获取配置描述
func (s *ConfigService) getConfigDescription(key string) string {
	descriptions := map[string]string{
		"server.port": "服务器端口号",
		"server.host": "服务器监听地址",
		"server.mode": "服务器运行模式",
		"server.cors.origins": "CORS允许的源",
		"security.enable_signature_validation": "启用签名验证",
		"security.default_allow_new_connections": "默认允许新连接",
		"security.max_connections_per_secret": "每个密钥的最大连接数",
		"security.require_manual_key_management": "要求手动管理密钥",
		"auth.username": "管理员用户名",
		"auth.password": "管理员密码",
		"auth.session_timeout": "会话超时时间（秒）",
		"auth.jwt_secret": "JWT密钥",
		"ui.theme": "主题模式",
		"ui.primary_color": "主色调",
		"ui.compact_mode": "紧凑模式",
		"ui.language": "界面语言",
		"logging.level": "日志级别",
		"logging.max_log_entries": "最大日志条目数",
		"logging.enable_file_logging": "启用文件日志",
		"logging.log_file_path": "日志文件路径",
		"websocket.enable_heartbeat": "启用心跳检测",
		"websocket.heartbeat_interval": "心跳间隔（毫秒）",
		"websocket.heartbeat_timeout": "心跳超时（毫秒）",
		"websocket.client_heartbeat_interval": "客户端心跳间隔（毫秒）",
		"websocket.max_message_size": "最大消息大小（字节）",
		"websocket.read_timeout": "读取超时（毫秒）",
		"websocket.write_timeout": "写入超时（毫秒）",
	}
	
	if desc, exists := descriptions[key]; exists {
		return desc
	}
	return "系统配置项"
}

// LogService 日志服务
type LogService struct{}

// CreateLog 创建日志
func (s *LogService) CreateLog(log *LogEntry) error {
	return DB.Create(log).Error
}

// GetLogs 获取日志
func (s *LogService) GetLogs(limit int, level string) ([]LogEntry, error) {
	var logs []LogEntry
	query := DB.Order("timestamp DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	if level != "" {
		query = query.Where("level = ?", level)
	}
	
	err := query.Find(&logs).Error
	return logs, err
}

// CleanOldLogs 清理旧日志
func (s *LogService) CleanOldLogs(olderThan time.Time) error {
	return DB.Where("timestamp < ?", olderThan).Delete(&LogEntry{}).Error
}

// ConnectionService 连接服务
type ConnectionService struct{}

// CreateConnection 创建连接记录
func (s *ConnectionService) CreateConnection(conn *Connection) error {
	return DB.Create(conn).Error
}

// GetActiveConnections 获取活跃连接
func (s *ConnectionService) GetActiveConnections() ([]Connection, error) {
	var connections []Connection
	err := DB.Where("connected = ?", true).Find(&connections).Error
	return connections, err
}

// UpdateConnectionStatus 更新连接状态
func (s *ConnectionService) UpdateConnectionStatus(secret string, connected bool) error {
	return DB.Model(&Connection{}).
		Where("secret = ?", secret).
		Updates(map[string]interface{}{
			"connected":  connected,
			"last_seen":  time.Now(),
			"updated_at": time.Now(),
		}).Error
}

// DisconnectAll 断开所有连接
func (s *ConnectionService) DisconnectAll() error {
	return DB.Model(&Connection{}).
		Where("connected = ?", true).
		Updates(map[string]interface{}{
			"connected":  false,
			"updated_at": time.Now(),
		}).Error
}
