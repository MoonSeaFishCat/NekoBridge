package handlers

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"nekobridge/internal/config"
	"nekobridge/internal/database"
	"nekobridge/internal/models"
	"nekobridge/internal/monitor"
	"nekobridge/internal/utils"
	"nekobridge/internal/websocket"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	gorilla "github.com/gorilla/websocket"
)

// Handlers 处理器结构
type Handlers struct {
	config     *config.Config
	wsManager  *websocket.Manager
	logger     *utils.Logger
	jwtManager *utils.JWTManager
	signer     *utils.Ed25519Signer
	cpuMonitor *monitor.CpuMonitor
	startTime  time.Time
	staticFS   *embed.FS
}

// NewHandlers 创建新的处理器
func NewHandlers(cfg *config.Config, wsManager *websocket.Manager, staticFS ...embed.FS) *Handlers {
	logger := utils.NewLogger(cfg.Logging.MaxLogEntries, cfg.Logging.Level)
	jwtManager := utils.NewJWTManager(cfg.Auth.JWTSecret)
	signer, err := utils.NewEd25519Signer()
	if err != nil {
		log.Printf("⚠️  无法初始化 Ed25519 签名器: %v", err)
	}
	cpuMonitor := monitor.NewCpuMonitor()

	var fs *embed.FS
	if len(staticFS) > 0 {
		fs = &staticFS[0]
	}

	return &Handlers{
		config:     cfg,
		wsManager:  wsManager,
		logger:     logger,
		jwtManager: jwtManager,
		signer:     signer,
		cpuMonitor: cpuMonitor,
		startTime:  time.Now(),
		staticFS:   fs,
	}
}

// Init 初始化路由
func Init(r *gin.Engine, cfg *config.Config, wsManager *websocket.Manager, staticFS ...embed.FS) {
	h := NewHandlers(cfg, wsManager, staticFS...)
	wsManager.SetConfig(cfg)

	// 应用域名绑定中间件 (如果启用)
	r.Use(h.DomainMiddleware())

	// 静态文件服务
	if len(staticFS) > 0 {
		embeddedFS := staticFS[0]

		// 1. 为 /assets 路径提供服务
		assetsFS, err := fs.Sub(embeddedFS, "web/dist/assets")
		if err == nil {
			r.StaticFS("/assets", http.FS(assetsFS))
		}

		// 2. 为根目录下的特定文件提供服务
		distFS, err := fs.Sub(embeddedFS, "web/dist")
		if err == nil {
			staticHttpFS := http.FS(distFS)
			r.GET("/favicon.ico", func(c *gin.Context) {
				c.FileFromFS("favicon.ico", staticHttpFS)
			})
			r.GET("/vite.svg", func(c *gin.Context) {
				c.FileFromFS("vite.svg", staticHttpFS)
			})

			// 3. SPA 伪静态处理：任何不匹配 API 或 静态资源的路由都返回 index.html
			r.NoRoute(func(c *gin.Context) {
				// 如果是 API 请求或 WebSocket 请求，不要返回 index.html，而是返回 404
				path := c.Request.URL.Path
				if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/ws") {
					c.JSON(http.StatusNotFound, gin.H{"error": "Not Found"})
					return
				}
				// 否则返回 index.html
				c.FileFromFS("index.html", staticHttpFS)
			})
		}
	}

	// 使用外部文件系统作为备选
	if _, err := os.Stat("./web/dist/assets"); err == nil {
		r.Static("/static_assets", "./web/dist/assets")
	}

	// Web控制台页面（SPA 路由支持）
	r.GET("/", h.WebConsoleHandler)

	// 处理前端路由：如果找不到路由且不是 API 请求，则返回 index.html
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// 如果是 API 请求，返回 404
		if strings.HasPrefix(path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}

		// 如果是静态资源请求但没找到（通常带有点号），不应该返回 index.html
		// 否则会导致浏览器尝试将 HTML 解析为 JS (MIME type error)
		if strings.Contains(path, ".") || strings.HasPrefix(path, "/assets") {
			c.Status(http.StatusNotFound)
			return
		}

		// 否则调用 WebConsoleHandler 返回 index.html，让前端路由接管
		h.WebConsoleHandler(c)
	})

	api := r.Group("/api")
	{
		// 代理调试接口
		api.GET("/proxy-check", h.ProxyCheck)

		// 健康检查
		api.GET("/health", h.HealthCheck)
		api.GET("/", h.APIInfo)

		// Web控制台状态检查（不需要认证）
		api.GET("/web-console/status", h.GetWebConsoleStatus)

		// 认证路由
		auth := api.Group("/auth")
		{
			auth.POST("/login", h.Login)
			auth.POST("/logout", h.AuthMiddleware(), h.Logout)
			auth.GET("/verify", h.AuthMiddleware(), h.VerifyToken)
		}

		// 需要认证的路由
		authenticated := api.Group("")
		authenticated.Use(h.AuthMiddleware())
		{
			// 日志管理
			authenticated.GET("/logs", h.GetLogs)

			// 连接管理
			authenticated.GET("/connections", h.GetConnections)
			authenticated.POST("/connections/:secret/kick", h.KickConnection)

			// 密钥管理
			authenticated.GET("/secrets", h.GetSecrets)
			authenticated.POST("/secrets", h.AddSecret)
			authenticated.PUT("/secrets/:secret", h.UpdateSecret)
			authenticated.DELETE("/secrets/:secret", h.DeleteSecret)
			authenticated.POST("/secrets/:secret/block", h.BlockSecret)
			authenticated.POST("/secrets/:secret/unblock", h.UnblockSecret)
			authenticated.GET("/secrets/blocked", h.GetBlockedSecrets)
			authenticated.PUT("/bans/:id", h.UpdateBanRecord)
			authenticated.DELETE("/bans/:id", h.DeleteBanRecord)
			authenticated.GET("/secrets/export", h.ExportSecrets)
			authenticated.POST("/secrets/import", h.ImportSecrets)
			authenticated.GET("/secrets/stats", h.GetSecretStats)
			authenticated.POST("/secrets/batch", h.BatchOperateSecrets)

			// 配置管理
			authenticated.GET("/config", h.GetConfig)
			authenticated.PUT("/config", h.UpdateConfig)
			authenticated.GET("/config/websocket", h.GetWebSocketConfig)
			authenticated.PUT("/config/websocket", h.UpdateWebSocketConfig)
			authenticated.GET("/config/system", h.GetSystemConfig)
			authenticated.PUT("/config/system", h.UpdateSystemConfig)
			authenticated.GET("/config/system/schema", h.GetSystemConfigSchema)
			authenticated.POST("/config/system/initialize", h.InitializeSystemConfig)
			authenticated.DELETE("/config/system/:key", h.ResetSystemConfig)

			// 仪表盘统计
			authenticated.GET("/dashboard/stats", h.GetDashboardStats)
		}

		// Webhook端点（不需要认证）
		api.POST("/webhook", h.Webhook)
	}

	// 健康检查端点（不需要认证）
	r.GET("/health", h.GetHealth)

	// WebSocket端点
	r.GET("/ws/:secret", h.WebSocketHandler)
}

// DomainMiddleware 域名检查中间件
func (h *Handlers) DomainMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if h.config.Server.EnforceDomain && h.config.Server.Domain != "" {
			host := c.Request.Host
			// 移除端口号
			if strings.Contains(host, ":") {
				host = strings.Split(host, ":")[0]
			}

			if host != h.config.Server.Domain {
				h.logger.Log("warning", "非法域名访问被拦截", gin.H{
					"request_host": host,
					"bound_domain": h.config.Server.Domain,
					"path":         c.Request.URL.Path,
				})
				c.JSON(http.StatusForbidden, models.APIResponse{
					Success: false,
					Error:   "Access denied: domain mismatch",
				})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

// AuthMiddleware 认证中间件
func (h *Handlers) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, models.APIResponse{
				Success: false,
				Error:   "Access token required",
			})
			c.Abort()
			return
		}

		// 移除 "Bearer " 前缀
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}

		claims, err := h.jwtManager.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusForbidden, models.APIResponse{
				Success: false,
				Error:   "Invalid or expired token",
			})
			c.Abort()
			return
		}

		c.Set("user", claims)
		c.Next()
	}
}

// APIInfo API信息
func (h *Handlers) APIInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"name":    "QQ Webhook Pro",
		"msg":     "欢迎使用QQ机器人webhook服务",
		"status":  "running",
		"version": "2.0.0",
		"config": gin.H{
			"signature_validation": h.config.Security.EnableSignatureValidation,
			"max_connections":      h.config.Security.MaxConnectionsPerSecret,
		},
	})
}

// ProxyCheck 代理调试接口
func (h *Handlers) ProxyCheck(c *gin.Context) {
	headers := make(map[string]string)
	for k, v := range c.Request.Header {
		if len(v) > 0 {
			headers[k] = v[0]
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"client_ip":       c.ClientIP(),
		"remote_addr":     c.Request.RemoteAddr,
		"host":            c.Request.Host,
		"proto":           c.Request.Proto,
		"request_uri":     c.Request.RequestURI,
		"headers":         headers,
		"trusted_proxies": h.config.Server.TrustedProxies,
	})
}

// HealthCheck 健康检查
func (h *Handlers) HealthCheck(c *gin.Context) {
	// 获取系统信息
	memStats := getMemoryStats()
	cpuInfo := h.cpuMonitor.GetCpuInfo()

	response := models.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Uptime:    getUptime(),
		Memory: struct {
			HeapUsed     uint64 `json:"heap_used"`
			HeapTotal    uint64 `json:"heap_total"`
			HeapSys      uint64 `json:"heap_sys"`
			HeapIdle     uint64 `json:"heap_idle"`
			HeapInuse    uint64 `json:"heap_inuse"`
			HeapReleased uint64 `json:"heap_released"`
			HeapObjects  uint64 `json:"heap_objects"`
		}{
			HeapUsed:     memStats.Alloc,
			HeapTotal:    memStats.TotalAlloc,
			HeapSys:      memStats.Sys,
			HeapIdle:     0, // 简化实现
			HeapInuse:    memStats.Alloc,
			HeapReleased: 0, // 简化实现
			HeapObjects:  uint64(memStats.NumGC),
		},
		CPU: struct {
			Usage int    `json:"usage"`
			Cores int    `json:"cores"`
			Model string `json:"model"`
			Speed int    `json:"speed"`
		}{
			Usage: int(cpuInfo.Usage),
			Cores: cpuInfo.Cores,
			Model: cpuInfo.Model,
			Speed: int(cpuInfo.Speed),
		},
		Connections: h.wsManager.GetConnectionCount(),
		LoadAverage: getLoadAverage(),
	}

	c.JSON(http.StatusOK, response)
}

// Login 登录
func (h *Handlers) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.LoginResponse{
			Success: false,
			Message: "用户名和密码不能为空",
		})
		return
	}

	// 验证用户名和密码
	// 首先检查用户名
	if req.Username != h.config.Auth.Username {
		h.logger.Log("warning", "用户登录失败", gin.H{"username": req.Username, "reason": "invalid_username"})
		c.JSON(http.StatusUnauthorized, models.LoginResponse{
			Success: false,
			Message: "用户名或密码错误",
		})
		return
	}

	// 检查密码 - 支持明文和哈希密码
	var passwordValid bool
	// 如果配置中的密码以$2开头，说明是bcrypt哈希
	if strings.HasPrefix(h.config.Auth.Password, "$2") {
		passwordValid = utils.CheckPasswordHash(req.Password, h.config.Auth.Password)
	} else {
		// 兼容明文密码
		passwordValid = req.Password == h.config.Auth.Password
	}

	if !passwordValid {
		h.logger.Log("warning", "用户登录失败", gin.H{"username": req.Username, "reason": "invalid_password"})
		c.JSON(http.StatusUnauthorized, models.LoginResponse{
			Success: false,
			Message: "用户名或密码错误",
		})
		return
	}

	// 生成JWT令牌
	token, err := h.jwtManager.GenerateToken(req.Username)
	if err != nil {
		h.logger.Log("error", "生成JWT令牌失败", err)
		c.JSON(http.StatusInternalServerError, models.LoginResponse{
			Success: false,
			Message: "服务器错误",
		})
		return
	}

	h.logger.Log("info", "用户登录成功", gin.H{"username": req.Username})

	c.JSON(http.StatusOK, models.LoginResponse{
		Success: true,
		Token:   token,
		Message: "登录成功",
	})
}

// Logout 登出
func (h *Handlers) Logout(c *gin.Context) {
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)

	h.logger.Log("info", "用户登出", gin.H{"username": claims.Username})

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "登出成功",
	})
}

// VerifyToken 验证令牌
func (h *Handlers) VerifyToken(c *gin.Context) {
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user":  claims,
	})
}

// Webhook Webhook处理
func (h *Handlers) Webhook(c *gin.Context) {
	secret := c.Query("secret")
	if secret == "" {
		h.logger.Log("error", "Webhook请求缺少secret参数", nil)
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "Secret required",
		})
		return
	}

	// 读取原始 Body 以实现原样转发
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		h.logger.Log("error", "读取 Webhook 请求体失败", err)
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "Failed to read request body",
		})
		return
	}

	// 尝试解析为 JSON 结构以便日志记录和转发
	var payload interface{}
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		// 如果解析 JSON 失败，则作为原始字符串处理
		payload = string(bodyBytes)
	}

	// 解析用于签名校验的特定结构 (QQ Webhook 模式)
	var req models.WebhookRequest
	_ = json.Unmarshal(bodyBytes, &req)

	// 处理签名验证请求
	if req.D.EventTs != "" && req.D.PlainToken != "" {
		h.logger.Log("info", "收到签名校验请求", gin.H{"secret": secret, "payload": payload})

		if h.config.Security.EnableSignatureValidation {
			result, err := h.signer.GenerateSignature(secret, req.D.EventTs, req.D.PlainToken)
			if err != nil {
				h.logger.Log("error", "签名校验失败", gin.H{"secret": secret, "error": err, "payload": payload})
				c.JSON(http.StatusBadRequest, models.APIResponse{
					Error: "Signature validation failed",
				})
				return
			}

			h.logger.Log("info", "签名校验成功", gin.H{"secret": secret})

			// 自动添加密钥（如果启用）
			if !h.config.Security.RequireManualKeyManagement {
				// 检查密钥是否已存在于数据库
				secretService := &database.SecretService{}
				existingSecret, err := secretService.GetSecret(secret)
				if err != nil || existingSecret == nil {
					// 添加到数据库
					secretRecord := &database.Secret{
						Secret:         secret,
						Name:           "",
						Description:    "自动生成的密钥（签名验证通过）",
						Enabled:        true,
						MaxConnections: h.config.Security.MaxConnectionsPerSecret,
						CreatedBy:      "system",
					}

					if err := secretService.CreateSecret(secretRecord); err != nil {
						h.logger.Log("error", "自动添加密钥到数据库失败", gin.H{"secret": secret, "error": err.Error()})
					} else {
						h.logger.Log("info", "自动添加密钥到数据库成功", gin.H{"secret": secret})
					}
				}

				// 添加到内存配置
				h.config.AddSecret(secret, config.SecretConfig{
					Description:    "自动生成的密钥（签名验证通过）",
					Enabled:        true,
					MaxConnections: h.config.Security.MaxConnectionsPerSecret,
				})
				h.logger.Log("info", "签名验证通过，自动添加新密钥", gin.H{"secret": secret})

				// 广播密钥更新事件到管理界面
				h.broadcastSecretUpdate("secret_added", secret)
			}

			h.config.MarkSecretUsed(secret)
			c.JSON(http.StatusOK, result)
			return
		} else {
			h.logger.Log("warning", "签名验证已禁用，允许连接", gin.H{"secret": secret})

			// 如果启用自动模式且密钥不存在，自动添加
			if !h.config.Security.RequireManualKeyManagement {
				// 检查密钥是否已存在于数据库
				secretService := &database.SecretService{}
				existingSecret, err := secretService.GetSecret(secret)
				if err != nil || existingSecret == nil {
					// 添加到数据库
					secretRecord := &database.Secret{
						Secret:         secret,
						Name:           "",
						Description:    "自动生成的密钥（签名验证已禁用）",
						Enabled:        true,
						MaxConnections: h.config.Security.MaxConnectionsPerSecret,
						CreatedBy:      "system",
					}

					if err := secretService.CreateSecret(secretRecord); err != nil {
						h.logger.Log("error", "自动添加密钥到数据库失败", gin.H{"secret": secret, "error": err.Error()})
					} else {
						h.logger.Log("info", "自动添加密钥到数据库成功", gin.H{"secret": secret})
					}
				}

				// 添加到内存配置
				h.config.AddSecret(secret, config.SecretConfig{
					Description:    "自动生成的密钥（签名验证已禁用）",
					Enabled:        true,
					MaxConnections: h.config.Security.MaxConnectionsPerSecret,
				})
				h.logger.Log("info", "签名验证已禁用，自动添加新密钥", gin.H{"secret": secret})

				// 广播密钥更新事件到管理界面
				h.broadcastSecretUpdate("secret_added", secret)
			}

			c.JSON(http.StatusOK, gin.H{
				"plain_token": req.D.PlainToken,
				"signature":   "signature_disabled",
			})
			return
		}
	}

	// 检查密钥是否被允许连接
	if !h.config.IsSecretEnabled(secret) {
		h.logger.Log("warning", "密钥被禁用或不存在", gin.H{"secret": secret})
		c.JSON(http.StatusForbidden, models.APIResponse{
			Error: "Secret disabled or not found",
		})
		return
	}

	// 处理普通消息
	h.logger.Log("info", "收到Webhook消息", gin.H{"secret": secret, "payload": payload})

	// 发送到WebSocket连接 - 直接原样转发原始 Body 字节，不使用结构体包装
	if err := h.wsManager.SendTextMessage(secret, string(bodyBytes)); err != nil {
		h.logger.Log("warning", "消息推送失败：未找到活跃连接", gin.H{"secret": secret})
		c.JSON(http.StatusOK, gin.H{"status": "连接未就绪"})
		return
	}

	h.logger.Log("info", "消息推送成功", gin.H{"secret": secret, "payload": payload})
	h.config.MarkSecretUsed(secret)
	c.JSON(http.StatusOK, gin.H{"status": "推送成功"})
}

// broadcastSecretUpdate 广播密钥更新事件到管理界面
func (h *Handlers) broadcastSecretUpdate(eventType, secret string) {
	// 创建更新事件消息
	message := models.WebSocketMessage{
		Type: "admin_notification",
		Data: map[string]interface{}{
			"event_type": eventType,
			"secret":     secret,
			"timestamp":  time.Now().Format(time.RFC3339),
		},
	}

	// TODO: 广播到所有管理界面连接（需要扩展WebSocket管理器支持管理连接）
	// 暂时记录日志和消息，后续可以扩展实现
	h.logger.Log("info", "密钥更新事件", map[string]interface{}{
		"event_type": eventType,
		"secret":     secret,
		"message":    message,
	})
}

// WebSocketHandler WebSocket处理器
func (h *Handlers) WebSocketHandler(c *gin.Context) {
	secret := c.Param("secret")
	h.logger.Log("info", "收到 WebSocket 连接请求", gin.H{"secret": secret})

	if secret == "" {
		h.logger.Log("error", "WebSocket连接缺少密钥", nil)
		c.Abort()
		return
	}

	// 检查密钥是否被允许连接 (包含是否存在和是否启用的逻辑)
	enabled := h.config.IsSecretEnabled(secret)
	h.logger.Log("debug", "检查密钥启用状态", gin.H{"secret": secret, "enabled": enabled})

	if !enabled {
		h.logger.Log("warning", "WebSocket连接被拒绝：密钥不存在或被禁用", gin.H{"secret": secret})
		c.Abort()
		return
	}

	// 升级为WebSocket连接
	h.logger.Log("debug", "正在升级 WebSocket 连接", gin.H{
		"secret":         secret,
		"maxMessageSize": h.config.WebSocket.MaxMessageSize,
		"readTimeout":    h.config.WebSocket.ReadTimeout,
		"writeTimeout":   h.config.WebSocket.WriteTimeout,
	})

	// 确保缓冲区大小不为 0
	readBufferSize := h.config.WebSocket.MaxMessageSize
	if readBufferSize <= 0 {
		readBufferSize = 4096 // 默认 4KB
	}
	writeBufferSize := h.config.WebSocket.MaxMessageSize
	if writeBufferSize <= 0 {
		writeBufferSize = 4096 // 默认 4KB
	}

	upgrader := gorilla.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // 允许所有来源
		},
		ReadBufferSize:  readBufferSize,
		WriteBufferSize: writeBufferSize,
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Log("error", "WebSocket升级失败", gin.H{"secret": secret, "error": err.Error()})
		return
	}
	h.logger.Log("info", "WebSocket 升级成功", gin.H{"secret": secret})
	defer conn.Close()

	// 设置读写超时
	if h.config.WebSocket.ReadTimeout > 0 {
		conn.SetReadDeadline(time.Now().Add(time.Duration(h.config.WebSocket.ReadTimeout) * time.Millisecond))
	}
	if h.config.WebSocket.WriteTimeout > 0 {
		conn.SetWriteDeadline(time.Now().Add(time.Duration(h.config.WebSocket.WriteTimeout) * time.Millisecond))
	}

	// 添加到连接管理器
	h.logger.Log("debug", "正在将连接添加到管理器", gin.H{"secret": secret})
	if err := h.wsManager.AddConnection(secret, conn); err != nil {
		h.logger.Log("error", "添加WebSocket连接失败", gin.H{"secret": secret, "error": err.Error()})
		return
	}
	h.logger.Log("info", "WebSocket 连接已成功注册到管理器", gin.H{"secret": secret})
	defer func() {
		h.logger.Log("info", "正在从管理器移除 WebSocket 连接", gin.H{"secret": secret})
		h.wsManager.RemoveConnection(secret)
	}()

	// 处理WebSocket消息
	for {
		// 读取消息类型
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			if gorilla.IsUnexpectedCloseError(err, gorilla.CloseGoingAway, gorilla.CloseAbnormalClosure) {
				h.logger.Log("error", "WebSocket读取错误", gin.H{"secret": secret, "error": err.Error()})
			} else {
				h.logger.Log("info", "WebSocket 连接正常关闭", gin.H{"secret": secret, "error": err.Error()})
			}
			break
		}

		// 根据消息类型处理
		switch messageType {
		case gorilla.TextMessage:
			// 尝试解析为JSON
			var msg models.WebSocketMessage
			if err := json.Unmarshal(data, &msg); err != nil {
				// 如果解析失败，作为纯文本处理
				msg = models.WebSocketMessage{
					Type:   "text",
					Data:   string(data),
					Format: models.MessageFormatText,
				}
				h.logger.Log("info", "收到文本消息", gin.H{"secret": secret, "text": string(data)})
			} else {
				// 成功解析为JSON
				msg.Format = models.MessageFormatJSON
				h.logger.Log("info", "收到JSON消息", gin.H{"secret": secret, "data": msg})
			}

			// 处理心跳消息
			if msg.Type == "ping" {
				pongMsg := models.WebSocketMessage{
					Type:   "pong",
					Data:   gin.H{"timestamp": time.Now().Unix()},
					Format: models.MessageFormatJSON,
				}
				conn.WriteJSON(pongMsg)
				h.logger.Log("debug", "回复客户端心跳", gin.H{"secret": secret})
			}

		case gorilla.BinaryMessage:
			// 检查是否启用二进制消息
			if !h.config.WebSocket.EnableBinaryMessages {
				h.logger.Log("warning", "二进制消息被拒绝：未启用", gin.H{"secret": secret})
				continue
			}

			// 检查二进制消息大小
			if h.config.WebSocket.MaxBinarySize > 0 && len(data) > h.config.WebSocket.MaxBinarySize {
				h.logger.Log("warning", "二进制消息被拒绝：超过最大大小", gin.H{
					"secret":  secret,
					"size":    len(data),
					"maxSize": h.config.WebSocket.MaxBinarySize,
				})
				continue
			}

			// 处理二进制消息
			msg := models.WebSocketMessage{
				Type:   "binary",
				Data:   nil,
				Format: models.MessageFormatBinary,
				Raw:    data,
			}
			h.logger.Log("info", "收到二进制消息", gin.H{
				"secret": secret,
				"size":   len(data),
			})

			// 处理二进制数据的业务逻辑
			h.handleBinaryMessage(secret, msg, data, conn)

		case gorilla.PingMessage:
			// 自动回复Pong
			if err := conn.WriteMessage(gorilla.PongMessage, nil); err != nil {
				h.logger.Log("error", "发送Pong消息失败", err)
			}

		case gorilla.PongMessage:
			// 收到Pong响应
			h.logger.Log("debug", "收到Pong消息", gin.H{"secret": secret})

		default:
			h.logger.Log("warning", "未知的WebSocket消息类型", gin.H{
				"secret": secret,
				"type":   messageType,
			})
		}
	}
}

// handleBinaryMessage 处理二进制消息
func (h *Handlers) handleBinaryMessage(secret string, msg models.WebSocketMessage, data []byte, conn *gorilla.Conn) {
	// 根据数据内容或协议头判断处理方式
	if len(data) == 0 {
		h.logger.Log("warning", "收到空的二进制消息", gin.H{"secret": secret})
		return
	}

	// 示例处理逻辑：
	// 1. 如果是心跳包（特定字节序列）
	if len(data) >= 4 && string(data[:4]) == "PING" {
		// 回复PONG
		pongData := []byte("PONG")
		if err := conn.WriteMessage(gorilla.BinaryMessage, pongData); err != nil {
			h.logger.Log("error", "发送二进制PONG失败", err)
		} else {
			h.logger.Log("debug", "回复二进制心跳", gin.H{"secret": secret})
		}
		return
	}

	// 2. 如果是文件上传（以特定魔数开头）
	if len(data) >= 8 && string(data[:4]) == "FILE" {
		h.handleFileUpload(secret, data[4:], conn)
		return
	}

	// 3. 默认：回显二进制数据（用于测试）
	h.logger.Log("info", "回显二进制数据", gin.H{
		"secret":      secret,
		"size":        len(data),
		"first4bytes": fmt.Sprintf("%x", data[:min(4, len(data))]),
	})

	// 回显数据
	if err := conn.WriteMessage(gorilla.BinaryMessage, data); err != nil {
		h.logger.Log("error", "回显二进制数据失败", err)
	}
}

// handleFileUpload 处理文件上传
func (h *Handlers) handleFileUpload(secret string, fileData []byte, conn *gorilla.Conn) {
	// 创建data目录
	dataDir := "./data/uploads"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		h.logger.Log("error", "创建上传目录失败", err)
		return
	}

	// 生成文件名：时间戳_secret.bin
	filename := fmt.Sprintf("%d_%s.bin", time.Now().Unix(), secret)
	filepath := fmt.Sprintf("%s/%s", dataDir, filename)

	// 保存文件
	if err := os.WriteFile(filepath, fileData, 0644); err != nil {
		h.logger.Log("error", "保存上传文件失败", err)
		return
	}

	h.logger.Log("info", "文件上传成功", gin.H{
		"secret":   secret,
		"filename": filename,
		"size":     len(fileData),
		"path":     filepath,
	})

	// 回复上传成功消息（JSON格式）
	response := models.WebSocketMessage{
		Type: "file_uploaded",
		Data: gin.H{
			"filename": filename,
			"size":     len(fileData),
			"path":     filepath,
		},
		Format: models.MessageFormatJSON,
	}

	if err := conn.WriteJSON(response); err != nil {
		h.logger.Log("error", "发送文件上传响应失败", err)
	}
}

// min 返回两个整数中的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// 辅助函数
func getMemoryStats() models.MemoryStats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return models.MemoryStats{
		Alloc:      m.Alloc,
		TotalAlloc: m.TotalAlloc,
		Sys:        m.Sys,
		NumGC:      m.NumGC,
	}
}

func getUptime() float64 {
	// 这里应该返回实际的运行时间（秒）
	// 为了简化，返回一个固定值
	return 86400.0 // 24小时
}

func getLoadAverage() []float64 {
	// 这里应该返回实际的负载平均值
	// 为了简化，返回模拟值
	return []float64{0.5, 0.6, 0.7}
}
