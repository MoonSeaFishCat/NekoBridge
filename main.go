package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"nekobridge/internal/config"
	"nekobridge/internal/database"
	"nekobridge/internal/handlers"
	"nekobridge/internal/websocket"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

//go:embed all:web/dist
var staticFiles embed.FS

func main() {
	// 打印启动横幅
	printStartupBanner()

	// 检查并初始化数据库
	initializeDatabase()

	// 检查并初始化系统配置
	initializeSystemConfig()

	// 加载配置
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("❌ 配置加载失败: %v", err)
	}

	// 从数据库同步密钥到配置
	if err := syncSecretsFromDatabase(cfg); err != nil {
		log.Printf("⚠️  密钥同步失败: %v", err)
	}

	// 设置Gin模式 - 默认使用发布模式以隐藏调试信息
	gin.SetMode(gin.ReleaseMode)

	// 创建Gin引擎
	r := gin.New()

	// 添加必要的中间件（不使用Default()以避免默认日志）
	r.Use(gin.Recovery())

	// 添加自定义日志中间件（只记录重要请求）
	r.Use(customLogger())

	// 配置CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.Server.CORS.Origins
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(corsConfig))

	// 设置受信任的代理（解决GIN警告）
	r.SetTrustedProxies([]string{"127.0.0.1", "::1"})

	// 初始化WebSocket管理器
	wsManager := websocket.NewManager()
	wsManager.SetConfig(cfg)
	wsManager.StartHeartbeat()

	// 初始化处理器
	handlers.Init(r, cfg, wsManager, staticFiles)

	// 打印服务信息
	printServiceInfo(cfg)

	// 配置 HTTP 服务器
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: r,
	}

	// 在 goroutine 中启动服务器，这样它就不会阻塞关闭信号的监听
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ 服务器启动失败: %v", err)
		}
	}()

	// 等待中断信号以优雅地关闭服务器（设置 5 秒的超时时间）
	quit := make(chan os.Signal, 1)
	// kill (no param) default send syscall.SIGTERM
	// kill -2 is syscall.SIGINT
	// kill -9 is syscall.SIGKILL but can't be caught, so no need to add it
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("🔄 正在关闭服务器...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("❌ 服务器强制关闭: ", err)
	}

	log.Println("✅ 服务器已成功退出")
}

// syncSecretsFromDatabase 从数据库同步密钥到配置
func syncSecretsFromDatabase(cfg *config.Config) error {
	secretService := &database.SecretService{}
	dbSecrets, err := secretService.GetSecrets()
	if err != nil {
		return err
	}

	// 将数据库中的密钥同步到配置
	for _, dbSecret := range dbSecrets {
		secretConfig := config.SecretConfig{
			Description:    dbSecret.Description,
			Enabled:        dbSecret.Enabled,
			MaxConnections: dbSecret.MaxConnections,
			CreatedAt:      dbSecret.CreatedAt,
			LastUsed:       nil, // 如果需要，可以从数据库加载
		}
		cfg.AddSecret(dbSecret.Secret, secretConfig)
	}

	log.Printf("✅ 从数据库同步了 %d 个密钥到配置", len(dbSecrets))
	return nil
}

// initializeDatabase 检查并初始化数据库
func initializeDatabase() {
	// 检查数据库文件是否存在
	dbPath := "data/webhook_pro.db"
	dbExists := false

	if _, err := os.Stat(dbPath); err == nil {
		dbExists = true
		fmt.Printf("📁 发现数据库文件: %s\n", dbPath)
	} else {
		fmt.Printf("🔄 数据库文件不存在，开始创建: %s\n", dbPath)
		// 确保数据目录存在
		if err := os.MkdirAll("data", 0755); err != nil {
			log.Fatalf("❌ 创建数据目录失败: %v", err)
		}
	}

	// 初始化数据库（这将创建表结构，如果已存在则跳过）
	if err := database.InitDatabase(); err != nil {
		log.Fatalf("❌ 数据库初始化失败: %v", err)
	}

	if dbExists {
		fmt.Println("✅ 数据库连接成功")
	} else {
		fmt.Println("✅ 数据库初始化完成")
	}
}

// initializeSystemConfig 检查并初始化系统配置
func initializeSystemConfig() {
	// 检查配置文件是否存在
	configPath := "configs/config.yaml"
	configExists := false

	if _, err := os.Stat(configPath); err == nil {
		configExists = true
		fmt.Printf("📁 发现配置文件: %s\n", configPath)
	} else {
		fmt.Printf("🔄 配置文件不存在，将创建默认配置: %s\n", configPath)
		// 确保配置目录存在
		if err := os.MkdirAll("configs", 0755); err != nil {
			log.Fatalf("❌ 创建配置目录失败: %v", err)
		}
	}

	// 检查数据库中的系统配置
	configInitializer := database.NewConfigInitializer()
	if err := configInitializer.InitializeDefaultConfigs(); err != nil {
		log.Printf("⚠️  系统配置检查失败: %v", err)
	} else {
		if configExists {
			fmt.Println("✅ 系统配置检查完成")
		} else {
			fmt.Println("✅ 系统配置初始化完成")
		}
	}
}

// printStartupBanner 打印启动横幅
func printStartupBanner() {
	fmt.Println("╔══════════════════════════════════════════════════════════╗")
	fmt.Println("║                    🐱 NekoBridge                        ║")
	fmt.Println("║                  QQ Webhook Pro 2.0                     ║")
	fmt.Println("║              高性能 QQ 机器人消息中转服务                    ║")
	fmt.Println("╚══════════════════════════════════════════════════════════╝")
	fmt.Println()
}

// printServiceInfo 打印服务信息
func printServiceInfo(cfg *config.Config) {
	fmt.Println("🚀 服务启动成功！")
	fmt.Println()
	fmt.Println("📋 服务信息:")
	fmt.Printf("   🌐 Web管理界面: http://localhost:%s\n", cfg.Server.Port)
	fmt.Printf("   🪝 Webhook接口: http://localhost:%s/api/webhook?secret=YOUR_SECRET\n", cfg.Server.Port)
	fmt.Printf("   📡 WebSocket地址: ws://localhost:%s/ws/YOUR_SECRET\n", cfg.Server.Port)
	fmt.Println()
	fmt.Println("🔧 配置信息:")

	webConsoleStatus := "禁用"
	if cfg.UI.EnableWebConsole {
		webConsoleStatus = "启用"
	}
	fmt.Printf("   🖥️  Web控制台: %s\n", webConsoleStatus)

	signatureStatus := "禁用"
	if cfg.Security.EnableSignatureValidation {
		signatureStatus = "启用"
	}
	fmt.Printf("   🔐 签名验证: %s\n", signatureStatus)
	fmt.Printf("   📊 最大连接数: %d\n", cfg.Security.MaxConnectionsPerSecret)
	fmt.Printf("   🗝️  已配置密钥: %d 个\n", len(cfg.Secrets))
	fmt.Println()
	fmt.Printf("✨ 服务器正在监听端口 %s...\n", cfg.Server.Port)
}

// customLogger 自定义日志中间件
func customLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 跳过静态文件和健康检查的日志
		urlPath := c.Request.URL.Path
		if strings.HasPrefix(urlPath, "/assets/") ||
			strings.HasPrefix(urlPath, "/favicon.ico") ||
			strings.HasPrefix(urlPath, "/vite.svg") ||
			urlPath == "/health" {
			c.Next()
			return
		}

		start := time.Now()

		// 如果是 WebSocket 请求，先打印一条开始日志
		if strings.HasPrefix(urlPath, "/ws/") {
			fmt.Printf("[🆕] 🔗 WebSocket 握手请求: %s %s\n", c.Request.Method, urlPath)
		}

		c.Next()
		end := time.Now()
		latency := end.Sub(start)

		// 只记录重要的请求（API调用、WebSocket等）
		if strings.HasPrefix(urlPath, "/api/") || strings.HasPrefix(urlPath, "/ws/") || urlPath == "/" {
			statusColor := getStatusColor(c.Writer.Status())
			methodColor := getMethodColor(c.Request.Method)

			fmt.Printf("[%s] %s %s %v %s\n",
				statusColor,
				methodColor,
				urlPath,
				latency,
				c.ClientIP(),
			)
		}
	}
}

// getStatusColor 根据状态码获取颜色
func getStatusColor(statusCode int) string {
	switch {
	case statusCode >= 200 && statusCode < 300:
		return "✅"
	case statusCode >= 300 && statusCode < 400:
		return "🔄"
	case statusCode >= 400 && statusCode < 500:
		return "⚠️"
	case statusCode >= 500:
		return "❌"
	default:
		return "❓"
	}
}

// getMethodColor 根据HTTP方法获取颜色标识
func getMethodColor(method string) string {
	switch method {
	case "GET":
		return "📥"
	case "POST":
		return "📤"
	case "PUT":
		return "✏️"
	case "DELETE":
		return "🗑️"
	default:
		return "📋"
	}
}
