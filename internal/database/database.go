package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDatabase 初始化数据库
func InitDatabase() error {
	// 确保数据目录存在
	dataDir := "./data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("创建数据目录失败: %v", err)
	}

	// 数据库文件路径
	dbPath := filepath.Join(dataDir, "webhook_pro.db")

	// 配置GORM - 禁用详细日志输出
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	// 连接数据库
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), config)
	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}

	// 自动迁移
	if err := autoMigrate(); err != nil {
		return fmt.Errorf("数据库迁移失败: %v", err)
	}

	// 初始化默认数据
	if err := initDefaultData(); err != nil {
		return fmt.Errorf("初始化默认数据失败: %v", err)
	}

	// 配置连接池
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	log.Println("数据库初始化成功")
	return nil
}

// autoMigrate 自动迁移数据库表
func autoMigrate() error {
	return DB.AutoMigrate(
		&Secret{},
		&BanRecord{},
		&SystemConfig{},
		&LogEntry{},
		&Connection{},
	)
}

// initDefaultData 初始化默认数据
func initDefaultData() error {
	// 检查是否已有配置
	var count int64
	DB.Model(&SystemConfig{}).Count(&count)
	if count > 0 {
		return nil // 已有数据，跳过初始化
	}

	// 初始化默认系统配置
	defaultConfigs := []SystemConfig{
		{Key: "server.port", Value: "3000", Type: "string"},
		{Key: "server.host", Value: "0.0.0.0", Type: "string"},
		{Key: "server.mode", Value: "debug", Type: "string"},
		{Key: "auth.username", Value: "admin", Type: "string"},
		{Key: "auth.password", Value: "admin123", Type: "string"},
		{Key: "auth.jwt_secret", Value: "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", Type: "string"},
		{Key: "security.enable_signature_validation", Value: "true", Type: "bool"},
		{Key: "security.max_connections_per_secret", Value: "5", Type: "int"},
		{Key: "websocket.enable_heartbeat", Value: "false", Type: "bool"},
		{Key: "websocket.heartbeat_interval", Value: "30000", Type: "int"},
		{Key: "websocket.heartbeat_timeout", Value: "5000", Type: "int"},
		{Key: "websocket.client_heartbeat_interval", Value: "25000", Type: "int"},
		{Key: "ui.theme", Value: "auto", Type: "string"},
		{Key: "ui.primary_color", Value: "#165DFF", Type: "string"},
		{Key: "ui.language", Value: "zh-CN", Type: "string"},
		{Key: "logging.level", Value: "info", Type: "string"},
		{Key: "logging.max_log_entries", Value: "1000", Type: "int"},
	}

	for _, config := range defaultConfigs {
		if err := DB.Create(&config).Error; err != nil {
			return fmt.Errorf("创建默认配置失败: %v", err)
		}
	}

	// 创建默认密钥
	defaultSecret := Secret{
		Secret:      "default-webhook-secret-12345678",
		Name:        "默认密钥",
		Description: "系统自动生成的默认密钥",
		Enabled:     true,
		CreatedBy:   "system",
	}

	if err := DB.Create(&defaultSecret).Error; err != nil {
		return fmt.Errorf("创建默认密钥失败: %v", err)
	}

	log.Println("默认数据初始化完成")
	return nil
}

// GetDB 获取数据库实例
func GetDB() *gorm.DB {
	return DB
}
