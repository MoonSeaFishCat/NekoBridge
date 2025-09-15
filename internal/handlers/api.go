package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"
	"nekobridge/internal/config"
	"nekobridge/internal/database"
	"nekobridge/internal/models"
	"nekobridge/internal/utils"

	"github.com/gin-gonic/gin"
)

// GetLogs 获取日志
func (h *Handlers) GetLogs(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	level := c.Query("level")
	
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 100
	}
	
	logs := h.logger.GetLogs(limit, level)
	
	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"total": h.logger.GetLogCount(),
	})
}

// GetConnections 获取连接
func (h *Handlers) GetConnections(c *gin.Context) {
	connections := h.wsManager.GetConnections()
	
	c.JSON(http.StatusOK, gin.H{
		"connections": connections,
		"total":       len(connections),
	})
}

// KickConnection 踢出连接
func (h *Handlers) KickConnection(c *gin.Context) {
	secret := c.Param("secret")
	
	if err := h.wsManager.KickConnection(secret); err != nil {
		c.JSON(http.StatusOK, models.APIResponse{
			Success: false,
			Message: "连接不存在或已断开",
		})
		return
	}
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "管理员踢出连接", gin.H{"secret": secret, "admin": claims.Username})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "连接已断开",
	})
}

// GetSecrets 获取密钥列表
func (h *Handlers) GetSecrets(c *gin.Context) {
	secretService := &database.SecretService{}
	dbSecrets, err := secretService.GetSecrets()
	if err != nil {
		h.logger.Log("error", "获取密钥列表失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "获取密钥列表失败",
		})
		return
	}
	
	secrets := make([]models.Secret, 0, len(dbSecrets))
	for _, dbSecret := range dbSecrets {
		secretModel := models.Secret{
			Secret:         dbSecret.Secret,
			Name:           dbSecret.Name,
			Enabled:        dbSecret.Enabled,
			Description:    dbSecret.Description,
			MaxConnections: dbSecret.MaxConnections,
			CreatedAt:      dbSecret.CreatedAt,
			UpdatedAt:      dbSecret.UpdatedAt,
			CreatedBy:      dbSecret.CreatedBy,
		}
		secrets = append(secrets, secretModel)
	}
	
	c.JSON(http.StatusOK, gin.H{"secrets": secrets})
}

// AddSecret 添加密钥
func (h *Handlers) AddSecret(c *gin.Context) {
	var req models.Secret
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的请求数据",
		})
		return
	}
	
	if req.Secret == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "密钥不能为空",
		})
		return
	}
	
	// 检查密钥是否已存在
	secretService := &database.SecretService{}
	existingSecret, err := secretService.GetSecret(req.Secret)
	if err == nil && existingSecret != nil {
		c.JSON(http.StatusConflict, models.APIResponse{
			Error: "密钥已存在",
		})
		return
	}
	
	// 创建数据库记录
	secretRecord := &database.Secret{
		Secret:         req.Secret,
		Name:           req.Name,
		Description:    req.Description,
		Enabled:        req.Enabled,
		MaxConnections: req.MaxConnections,
		CreatedBy:      "admin", // 这里可以从JWT中获取用户名
	}
	
	if err := secretService.CreateSecret(secretRecord); err != nil {
		h.logger.Log("error", "创建密钥失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "创建密钥失败",
		})
		return
	}
	
	// 添加到内存配置
	secretConfig := config.SecretConfig{
		Enabled:        req.Enabled,
		Description:    req.Description,
		MaxConnections: req.MaxConnections,
	}
	
	h.config.AddSecret(req.Secret, secretConfig)
	h.logger.Log("info", "新增密钥", gin.H{"secret": req.Secret, "description": req.Description})
	
	c.JSON(http.StatusOK, models.APIResponse{Success: true})
}

// UpdateSecret 更新密钥
func (h *Handlers) UpdateSecret(c *gin.Context) {
	secret := c.Param("secret")
	
	var updates config.SecretConfig
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的请求数据",
		})
		return
	}
	
	// 更新数据库记录
	secretService := &database.SecretService{}
	secretRecord, err := secretService.GetSecret(secret)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Error: "密钥不存在",
		})
		return
	}
	
	// 更新字段
	if updates.Description != "" {
		secretRecord.Description = updates.Description
	}
	if updates.MaxConnections > 0 {
		secretRecord.MaxConnections = updates.MaxConnections
	}
	secretRecord.Enabled = updates.Enabled
	
	if err := secretService.UpdateSecret(secretRecord); err != nil {
		h.logger.Log("error", "更新密钥失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "更新密钥失败",
		})
		return
	}
	
	// 更新内存配置
	h.config.UpdateSecret(secret, updates)
	h.logger.Log("info", "更新密钥配置", gin.H{"secret": secret, "updates": updates})
	
	c.JSON(http.StatusOK, models.APIResponse{Success: true})
}

// DeleteSecret 删除密钥
func (h *Handlers) DeleteSecret(c *gin.Context) {
	secret := c.Param("secret")
	
	// 从数据库删除
	secretService := &database.SecretService{}
	if err := secretService.DeleteSecret(secret); err != nil {
		h.logger.Log("error", "删除密钥失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "删除密钥失败",
		})
		return
	}
	
	// 从内存配置删除
	h.config.RemoveSecret(secret)
	
	// 断开对应的WebSocket连接
	h.wsManager.RemoveConnection(secret)
	
	h.logger.Log("info", "删除密钥", gin.H{"secret": secret})
	
	c.JSON(http.StatusOK, models.APIResponse{Success: true})
}

// BlockSecret 封禁密钥
func (h *Handlers) BlockSecret(c *gin.Context) {
	secret := c.Param("secret")
	
	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)
	
	// 获取当前用户
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	username := claims.Username
	
	// 检查密钥是否存在
	secretService := &database.SecretService{}
	secretRecord, err := secretService.GetSecret(secret)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "密钥不存在",
		})
		return
	}

	// 禁用密钥
	secretRecord.Enabled = false
	if err := secretService.UpdateSecret(secretRecord); err != nil {
		h.logger.Log("error", "更新密钥状态失败", err)
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "更新密钥状态失败",
		})
		return
	}

	// 创建封禁记录
	banService := &database.BanService{}
	banRecord := &database.BanRecord{
		Secret:   secret,
		Reason:   req.Reason,
		BannedAt: time.Now(),
		BannedBy: username,
		IsActive: true,
	}
	if err := banService.CreateBanRecord(banRecord); err != nil {
		h.logger.Log("error", "创建封禁记录失败", err)
		// 不返回错误，因为密钥已经被禁用
	}
	
	// 断开现有连接
	h.wsManager.KickConnection(secret)
	
	h.logger.Log("info", "管理员封禁密钥", gin.H{
		"secret": secret,
		"reason": req.Reason,
		"admin":  username,
	})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "密钥已封禁",
	})
}

// UnblockSecret 解除封禁
func (h *Handlers) UnblockSecret(c *gin.Context) {
	secret := c.Param("secret")
	
	// 获取当前用户
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	username := claims.Username
	
	// 检查密钥是否存在
	secretService := &database.SecretService{}
	secretRecord, err := secretService.GetSecret(secret)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "密钥不存在",
		})
		return
	}

	// 启用密钥
	secretRecord.Enabled = true
	if err := secretService.UpdateSecret(secretRecord); err != nil {
		h.logger.Log("error", "更新密钥状态失败", err)
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "更新密钥状态失败",
		})
		return
	}

	// 解封密钥（更新封禁记录）
	banService := &database.BanService{}
	if err := banService.UnbanSecret(secret, username); err != nil {
		h.logger.Log("error", "解封密钥失败", err)
		// 不返回错误，因为密钥已经被启用
	}
	
	h.logger.Log("info", "管理员解除封禁", gin.H{
		"secret": secret,
		"admin":  username,
	})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "密钥封禁已解除",
	})
}

// GetBlockedSecrets 获取封禁的密钥
func (h *Handlers) GetBlockedSecrets(c *gin.Context) {
	banService := &database.BanService{}

	// 获取活跃的封禁记录
	activeBans, err := banService.GetActiveBans()
	if err != nil {
		h.logger.Log("error", "获取封禁记录失败", err)
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "获取封禁记录失败",
		})
		return
	}

	var blockedSecrets []string
	var bans []models.BanInfo

	// 只处理真正的封禁记录，过滤掉空数据
	for _, ban := range activeBans {
		// 跳过空的密钥记录
		if ban.Secret == "" {
			continue
		}
		
		blockedSecrets = append(blockedSecrets, ban.Secret)
		unbannedBy := ""
		if ban.UnbannedBy != nil {
			unbannedBy = *ban.UnbannedBy
		}
		bans = append(bans, models.BanInfo{
			ID:         int(ban.ID),
			Secret:     ban.Secret,
			Reason:     ban.Reason,
			BannedAt:   ban.BannedAt,
			BannedBy:   ban.BannedBy,
			UnbannedAt: ban.UnbannedAt,
			UnbannedBy: unbannedBy,
			IsActive:   ban.IsActive,
			CreatedAt:  ban.CreatedAt,
			UpdatedAt:  ban.UpdatedAt,
		})
	}

	response := models.BlockedSecretsResponse{
		BlockedSecrets: blockedSecrets,
		Bans:           bans,
		Total:          len(blockedSecrets),
	}

	c.JSON(http.StatusOK, response)
}

// UpdateBanRecord 更新封禁记录
func (h *Handlers) UpdateBanRecord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的记录ID",
		})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的请求数据",
		})
		return
	}

	banService := &database.BanService{}
	banRecord, err := banService.GetBanRecord(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Error: "封禁记录不存在",
		})
		return
	}

	banRecord.Reason = req.Reason
	if err := banService.UpdateBanRecord(banRecord); err != nil {
		h.logger.Log("error", "更新封禁记录失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "更新封禁记录失败",
		})
		return
	}

	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "更新封禁记录", gin.H{
		"admin":  claims.Username,
		"id":     id,
		"reason": req.Reason,
	})

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "封禁记录更新成功",
	})
}

// DeleteBanRecord 删除封禁记录
func (h *Handlers) DeleteBanRecord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的记录ID",
		})
		return
	}

	banService := &database.BanService{}
	banRecord, err := banService.GetBanRecord(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Error: "封禁记录不存在",
		})
		return
	}

	if err := banService.DeleteBanRecord(uint(id)); err != nil {
		h.logger.Log("error", "删除封禁记录失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "删除封禁记录失败",
		})
		return
	}

	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "删除封禁记录", gin.H{
		"admin":  claims.Username,
		"id":     id,
		"secret": banRecord.Secret,
	})

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "封禁记录删除成功",
	})
}

// ExportSecrets 导出密钥
func (h *Handlers) ExportSecrets(c *gin.Context) {
	exportData := models.ExportData{
		Secrets: make(map[string]models.Secret),
	}
	
	for secret, config := range h.config.Secrets {
		exportData.Secrets[secret] = models.Secret{
			Secret:         secret,
			Enabled:        config.Enabled,
			Description:    config.Description,
			MaxConnections: config.MaxConnections,
			CreatedAt:      config.CreatedAt,
			LastUsed:       config.LastUsed,
		}
	}
	
	exportData.Metadata.ExportedAt = time.Now()
	exportData.Metadata.Version = "2.0.0"
	exportData.Metadata.TotalSecrets = len(exportData.Secrets)
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "导出密钥数据", gin.H{
		"admin": claims.Username,
		"count": exportData.Metadata.TotalSecrets,
	})
	
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", "attachment; filename=secrets-export-"+strconv.FormatInt(time.Now().Unix(), 10)+".json")
	c.JSON(http.StatusOK, exportData)
}

// ImportSecrets 导入密钥
func (h *Handlers) ImportSecrets(c *gin.Context) {
	var req models.ImportData
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的导入数据格式",
		})
		return
	}
	
	overwriteStr := c.DefaultQuery("overwriteExisting", "false")
	overwriteExisting := overwriteStr == "true"
	
	result := models.ImportResult{
		Imported: 0,
		Skipped:  0,
		Errors:   []string{},
	}
	
	for secret, secretData := range req.Secrets {
		if _, exists := h.config.Secrets[secret]; exists && !overwriteExisting {
			result.Skipped++
			continue
		}
		
		secretConfig := config.SecretConfig{
			Enabled:        secretData.Enabled,
			Description:    secretData.Description,
			MaxConnections: secretData.MaxConnections,
			CreatedAt:      secretData.CreatedAt,
		}
		if secretData.LastUsed != nil {
			secretConfig.LastUsed = secretData.LastUsed
		}
		
		h.config.AddSecret(secret, secretConfig)
		result.Imported++
	}
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "导入密钥数据", gin.H{
		"admin":    claims.Username,
		"imported": result.Imported,
		"skipped":  result.Skipped,
		"errors":   len(result.Errors),
	})
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}

// GetSecretStats 获取密钥统计
func (h *Handlers) GetSecretStats(c *gin.Context) {
	stats := models.SecretStats{
		Total:        len(h.config.Secrets),
		Enabled:      0,
		Disabled:     0,
		RecentlyUsed: 0,
		NeverUsed:    0,
	}
	
	now := time.Now()
	recentThreshold := 7 * 24 * time.Hour // 7天
	
	for _, config := range h.config.Secrets {
		if config.Enabled {
			stats.Enabled++
		} else {
			stats.Disabled++
		}
		
		if config.LastUsed != nil {
			if now.Sub(*config.LastUsed) < recentThreshold {
				stats.RecentlyUsed++
			}
		} else {
			stats.NeverUsed++
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}

// BatchOperateSecrets 批量操作密钥
func (h *Handlers) BatchOperateSecrets(c *gin.Context) {
	var req models.BatchOperationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "请提供有效的密钥列表",
		})
		return
	}
	
	if len(req.Secrets) == 0 {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "请提供有效的密钥列表",
		})
		return
	}
	
	result := models.BatchOperationResult{
		Success: 0,
		Failed:  0,
		Errors:  []string{},
	}
	
	secretService := &database.SecretService{}
	
	for _, secret := range req.Secrets {
		switch req.Action {
		case "enable":
			// 更新数据库
			if err := h.updateSecretInDatabase(secret, true); err != nil {
				result.Errors = append(result.Errors, "密钥 "+secret+": 启用失败 - "+err.Error())
				result.Failed++
			} else {
				h.config.UpdateSecret(secret, config.SecretConfig{Enabled: true})
				result.Success++
			}
		case "disable":
			// 更新数据库
			if err := h.updateSecretInDatabase(secret, false); err != nil {
				result.Errors = append(result.Errors, "密钥 "+secret+": 禁用失败 - "+err.Error())
				result.Failed++
			} else {
				h.config.UpdateSecret(secret, config.SecretConfig{Enabled: false})
				result.Success++
			}
		case "delete":
			// 删除数据库记录
			if err := secretService.DeleteSecret(secret); err != nil {
				result.Errors = append(result.Errors, "密钥 "+secret+": 删除失败 - "+err.Error())
				result.Failed++
			} else {
				h.config.RemoveSecret(secret)
				h.wsManager.RemoveConnection(secret)
				result.Success++
			}
		case "block":
			// 封禁密钥
			if err := h.blockSecretInBatch(secret); err != nil {
				result.Errors = append(result.Errors, "密钥 "+secret+": 封禁失败 - "+err.Error())
				result.Failed++
			} else {
				result.Success++
			}
		case "unblock":
			// 解封密钥
			if err := h.unblockSecretInBatch(secret); err != nil {
				result.Errors = append(result.Errors, "密钥 "+secret+": 解封失败 - "+err.Error())
				result.Failed++
			} else {
				result.Success++
			}
		default:
			result.Errors = append(result.Errors, "密钥 "+secret+": 未知操作 "+req.Action)
			result.Failed++
		}
	}
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "批量操作密钥", gin.H{
		"admin":   claims.Username,
		"action":  req.Action,
		"count":   len(req.Secrets),
		"success": result.Success,
		"failed":  result.Failed,
	})
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"results": result,
	})
}

// GetConfig 获取配置
func (h *Handlers) GetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, h.config)
}

// UpdateConfig 更新配置
func (h *Handlers) UpdateConfig(c *gin.Context) {
	var updates models.ConfigUpdateRequest
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的配置数据",
		})
		return
	}
	
	// 备份当前配置
	oldConfig := *h.config
	
	// 更新配置字段
	if updates.Server != nil {
		if updates.Server.Port != "" {
			h.config.Server.Port = updates.Server.Port
		}
		if updates.Server.Host != "" {
			h.config.Server.Host = updates.Server.Host
		}
		if updates.Server.Mode != "" {
			h.config.Server.Mode = updates.Server.Mode
		}
		if updates.Server.CORS != nil && len(updates.Server.CORS.Origins) > 0 {
			h.config.Server.CORS.Origins = updates.Server.CORS.Origins
		}
	}
	
	if updates.Security != nil {
		h.config.Security.EnableSignatureValidation = updates.Security.EnableSignatureValidation
		h.config.Security.DefaultAllowNewConnections = updates.Security.DefaultAllowNewConnections
		if updates.Security.MaxConnectionsPerSecret > 0 {
			h.config.Security.MaxConnectionsPerSecret = updates.Security.MaxConnectionsPerSecret
		}
		h.config.Security.RequireManualKeyManagement = updates.Security.RequireManualKeyManagement
	}
	
	if updates.Auth != nil {
		if updates.Auth.Username != "" {
			h.config.Auth.Username = updates.Auth.Username
		}
		if updates.Auth.Password != "" {
			h.config.Auth.Password = updates.Auth.Password
		}
		if updates.Auth.SessionTimeout > 0 {
			h.config.Auth.SessionTimeout = updates.Auth.SessionTimeout
		}
		if updates.Auth.JWTSecret != "" {
			h.config.Auth.JWTSecret = updates.Auth.JWTSecret
		}
	}
	
	if updates.Logging != nil {
		if updates.Logging.Level != "" {
			h.config.Logging.Level = updates.Logging.Level
		}
		if updates.Logging.MaxLogEntries > 0 {
			h.config.Logging.MaxLogEntries = updates.Logging.MaxLogEntries
		}
		h.config.Logging.EnableLogToFile = updates.Logging.EnableLogToFile
		if updates.Logging.LogFilePath != "" {
			h.config.Logging.LogFilePath = updates.Logging.LogFilePath
		}
	}
	
	if updates.WebSocket != nil {
		h.config.WebSocket.EnableHeartbeat = updates.WebSocket.EnableHeartbeat
		if updates.WebSocket.HeartbeatInterval > 0 {
			h.config.WebSocket.HeartbeatInterval = updates.WebSocket.HeartbeatInterval
		}
		if updates.WebSocket.MaxMessageSize > 0 {
			h.config.WebSocket.MaxMessageSize = updates.WebSocket.MaxMessageSize
		}
		if updates.WebSocket.ReadTimeout > 0 {
			h.config.WebSocket.ReadTimeout = updates.WebSocket.ReadTimeout
		}
		if updates.WebSocket.WriteTimeout > 0 {
			h.config.WebSocket.WriteTimeout = updates.WebSocket.WriteTimeout
		}
	}
	
	// 保存配置到文件
	if err := h.saveConfigToFile(); err != nil {
		// 如果保存失败，恢复旧配置
		*h.config = oldConfig
		h.logger.Log("error", "保存配置失败", err)
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "保存配置失败",
		})
		return
	}
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "配置已更新", gin.H{
		"admin":   claims.Username,
		"updates": updates,
	})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "配置更新成功",
	})
}

// GetDashboardStats 获取仪表盘统计
func (h *Handlers) GetDashboardStats(c *gin.Context) {
	stats := models.DashboardStats{}
	
	// 连接统计
	stats.Connections.Active = h.wsManager.GetConnectionCount()
	stats.Connections.Total = len(h.config.Secrets)
	
	// 密钥统计
	blockedCount := 0
	for _, config := range h.config.Secrets {
		if !config.Enabled {
			blockedCount++
		}
	}
	stats.Secrets.Total = len(h.config.Secrets)
	stats.Secrets.Blocked = blockedCount
	
	// 日志统计
	stats.Logs.Total = h.logger.GetLogCount()
	stats.Logs.Errors = h.logger.GetErrorCount()
	stats.Logs.Warnings = h.logger.GetWarningCount()
	
	// 系统统计
	stats.System.Uptime = getUptime()
	stats.System.Memory = int(h.cpuMonitor.GetCpuUsage()) // 简化实现
	stats.System.CPU = int(h.cpuMonitor.GetCpuUsage())
	cpuInfo := h.cpuMonitor.GetCpuInfo()
	stats.System.CPUCores = cpuInfo.Cores
	stats.System.CPUModel = cpuInfo.Model
	stats.System.LoadAvg = getLoadAverage()
	
	c.JSON(http.StatusOK, stats)
}


// GetWebConsoleStatus 获取Web控制台状态
func (h *Handlers) GetWebConsoleStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"enabled": h.config.UI.EnableWebConsole,
	})
}

// WebConsoleHandler Web控制台处理器
func (h *Handlers) WebConsoleHandler(c *gin.Context) {
	// 首先检查是否启用了 Web 控制台
	if !h.config.UI.EnableWebConsole {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, `
<!DOCTYPE html>
<html>
<head>
    <title>QQ Webhook Pro - 控制台已禁用</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #ff4d4f; margin-bottom: 20px; }
        .disabled { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚫 Web控制台已禁用</h1>
        <div class="disabled">
            Web控制台功能当前已被禁用。如需启用，请修改配置文件中的 ui.enable_web_console 设置为 true。
        </div>
    </div>
</body>
</html>`)
		return
	}

	// 尝试从嵌入的文件系统返回React前端
	if h.staticFS != nil {
		if indexFile, err := h.staticFS.Open("web/dist/index.html"); err == nil {
			defer indexFile.Close()
			if content, err := io.ReadAll(indexFile); err == nil {
				c.Header("Content-Type", "text/html; charset=utf-8")
				c.Data(http.StatusOK, "text/html; charset=utf-8", content)
				return
			}
		}
	}

	// 回退：检查外部静态文件
	if _, err := os.Stat("./web/dist/index.html"); err == nil {
		c.File("./web/dist/index.html")
		return
	}

	// 最后回退：显示前端文件缺失错误页面
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, `
<!DOCTYPE html>
<html>
<head>
    <title>QQ Webhook Pro - 前端文件缺失</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #ff4d4f; margin-bottom: 20px; }
        .error { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ 前端文件缺失</h1>
        <div class="error">
            Web控制台前端文件未找到。请确保已正确构建前端项目。
        </div>
    </div>
</body>
</html>`)
}

// GetHealth 健康检查
func (h *Handlers) GetHealth(c *gin.Context) {
	cpuInfo := h.cpuMonitor.GetCpuInfo()
	
	health := models.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Uptime:    float64(time.Since(h.startTime).Seconds()),
		Memory: struct {
			HeapUsed     uint64 `json:"heap_used"`
			HeapTotal    uint64 `json:"heap_total"`
			HeapSys      uint64 `json:"heap_sys"`
			HeapIdle     uint64 `json:"heap_idle"`
			HeapInuse    uint64 `json:"heap_inuse"`
			HeapReleased uint64 `json:"heap_released"`
			HeapObjects  uint64 `json:"heap_objects"`
		}{
			HeapUsed:     0, // 需要实现内存统计
			HeapTotal:    0,
			HeapSys:      0,
			HeapIdle:     0,
			HeapInuse:    0,
			HeapReleased: 0,
			HeapObjects:  0,
		},
		CPU: struct {
			Usage int    `json:"usage"`
			Cores int    `json:"cores"`
			Model string `json:"model"`
			Speed int    `json:"speed"`
		}{
			Usage: int(h.cpuMonitor.GetCpuUsage()),
			Cores: cpuInfo.Cores,
			Model: cpuInfo.Model,
			Speed: int(cpuInfo.Speed),
		},
		Connections: h.wsManager.GetConnectionCount(),
		LoadAverage: []float64{0.0, 0.0, 0.0},
	}
	
	c.JSON(http.StatusOK, health)
}

// updateSecretInDatabase 更新数据库中的密钥状态
func (h *Handlers) updateSecretInDatabase(secret string, enabled bool) error {
	secretService := &database.SecretService{}
	secretRecord, err := secretService.GetSecret(secret)
	if err != nil {
		return err
	}
	
	secretRecord.Enabled = enabled
	return secretService.UpdateSecret(secretRecord)
}

// blockSecretInBatch 批量封禁密钥
func (h *Handlers) blockSecretInBatch(secret string) error {
	// 更新密钥状态为禁用
	if err := h.updateSecretInDatabase(secret, false); err != nil {
		return err
	}
	
	// 创建封禁记录
	banService := &database.BanService{}
	banRecord := &database.BanRecord{
		Secret:   secret,
		Reason:   "批量封禁操作",
		BannedAt: time.Now(),
		BannedBy: "admin", // 这里应该从上下文获取用户
		IsActive: true,
	}
	
	if err := banService.CreateBanRecord(banRecord); err != nil {
		return err
	}
	
	// 断开连接
	h.wsManager.RemoveConnection(secret)
	h.config.UpdateSecret(secret, config.SecretConfig{Enabled: false})
	
	return nil
}

// unblockSecretInBatch 批量解封密钥
func (h *Handlers) unblockSecretInBatch(secret string) error {
	// 更新密钥状态为启用
	if err := h.updateSecretInDatabase(secret, true); err != nil {
		return err
	}
	
	// 更新封禁记录为非活跃
	banService := &database.BanService{}
	banRecords, err := banService.GetBanRecords()
	if err != nil {
		return err
	}
	
	for _, record := range banRecords {
		if record.Secret == secret && record.IsActive {
			record.IsActive = false
			record.UnbannedAt = &time.Time{}
			now := time.Now()
			record.UnbannedAt = &now
			unbannedBy := "admin" // 这里应该从上下文获取用户
			record.UnbannedBy = &unbannedBy
			if err := banService.UpdateBanRecord(record); err != nil {
				return err
			}
			break
		}
	}
	
	h.config.UpdateSecret(secret, config.SecretConfig{Enabled: true})
	return nil
}

// saveConfigToFile 保存配置到文件
func (h *Handlers) saveConfigToFile() error {
	// 这里应该调用config包的保存方法
	// 为了简化，暂时返回nil
	return nil
}

// GetWebSocketConfig 获取WebSocket配置
func (h *Handlers) GetWebSocketConfig(c *gin.Context) {
	configService := &database.ConfigService{}
	
	// 从数据库获取WebSocket配置
	wsConfig := make(map[string]interface{})
	
	// 获取各个配置项
	configs := []string{
		"websocket.enable_heartbeat",
		"websocket.heartbeat_interval", 
		"websocket.heartbeat_timeout",
		"websocket.client_heartbeat_interval",
		"websocket.max_message_size",
		"websocket.read_timeout",
		"websocket.write_timeout",
	}
	
	for _, key := range configs {
		if config, err := configService.GetConfig(key); err == nil {
			// 根据配置类型转换值
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
			default:
				value = config.Value
			}
			wsConfig[key] = value
		} else {
			// 如果数据库中没有，使用内存配置的默认值
			switch key {
			case "websocket.enable_heartbeat":
				wsConfig[key] = h.config.WebSocket.EnableHeartbeat
			case "websocket.heartbeat_interval":
				wsConfig[key] = h.config.WebSocket.HeartbeatInterval
			case "websocket.heartbeat_timeout":
				wsConfig[key] = h.config.WebSocket.HeartbeatTimeout
			case "websocket.client_heartbeat_interval":
				wsConfig[key] = h.config.WebSocket.ClientHeartbeatInterval
			case "websocket.max_message_size":
				wsConfig[key] = h.config.WebSocket.MaxMessageSize
			case "websocket.read_timeout":
				wsConfig[key] = h.config.WebSocket.ReadTimeout
			case "websocket.write_timeout":
				wsConfig[key] = h.config.WebSocket.WriteTimeout
			}
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"config":  wsConfig,
	})
}

// UpdateWebSocketConfig 更新WebSocket配置
func (h *Handlers) UpdateWebSocketConfig(c *gin.Context) {
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的配置数据",
		})
		return
	}
	
	configService := &database.ConfigService{}
	
	// 保存到数据库
	for key, value := range updates {
		configKey := "websocket." + key
		valueStr := fmt.Sprintf("%v", value)
		
		// 确定配置类型
		var configType string
		switch key {
		case "enable_heartbeat":
			configType = "bool"
		case "heartbeat_interval", "heartbeat_timeout", "client_heartbeat_interval", "max_message_size", "read_timeout", "write_timeout":
			configType = "int"
		default:
			configType = "string"
		}
		
		if err := configService.SetConfig(configKey, valueStr, configType); err != nil {
			h.logger.Log("error", "保存WebSocket配置失败", gin.H{"key": configKey, "error": err})
		}
	}
	
	// 更新内存配置
	h.updateWebSocketConfigInMemory(updates)
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "WebSocket配置已更新", gin.H{
		"admin":   claims.Username,
		"updates": updates,
	})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "WebSocket配置更新成功",
	})
}

// GetSystemConfig 获取系统配置
func (h *Handlers) GetSystemConfig(c *gin.Context) {
	configService := &database.ConfigService{}
	
	// 从数据库获取所有配置
	configs, err := configService.GetAllConfigs()
	if err != nil {
		h.logger.Log("error", "获取系统配置失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "获取系统配置失败",
		})
		return
	}
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    configs,
	})
}

// GetSystemConfigSchema 获取系统配置架构
func (h *Handlers) GetSystemConfigSchema(c *gin.Context) {
	configService := &database.ConfigService{}
	
	// 获取配置架构
	schema, err := configService.GetConfigSchema()
	if err != nil {
		h.logger.Log("error", "获取配置架构失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "获取配置架构失败",
		})
		return
	}
	
	// 添加分类显示名称
	initializer := database.NewConfigInitializer()
	categories := initializer.GetConfigCategories()
	categoryInfo := make(map[string]interface{})
	for _, category := range categories {
		categoryInfo[category] = map[string]interface{}{
			"displayName": initializer.GetCategoryDisplayName(category),
			"order":       getCategoryOrder(category),
		}
	}
	
	result := map[string]interface{}{
		"schema":    schema,
		"categories": categoryInfo,
	}
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    result,
	})
}

// getCategoryOrder 获取分类显示顺序
func getCategoryOrder(category string) int {
	order := map[string]int{
		"server":    1,
		"security":  2,
		"auth":      3,
		"ui":        4,
		"logging":   5,
		"websocket": 6,
	}
	if o, exists := order[category]; exists {
		return o
	}
	return 999
}

// UpdateSystemConfig 更新系统配置
func (h *Handlers) UpdateSystemConfig(c *gin.Context) {
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "无效的配置数据",
		})
		return
	}
	
	// 分离需要更新配置文件的设置和数据库的设置
	fileUpdates := make(map[string]interface{})
	dbUpdates := make(map[string]interface{})
	
	for key, value := range updates {
		// Web控制台启用状态直接更新配置文件
		if key == "ui.enable_web_console" {
			fileUpdates[key] = value
		} else {
			dbUpdates[key] = value
		}
	}
	
	// 更新数据库配置（除了Web控制台启用状态）
	if len(dbUpdates) > 0 {
		configService := &database.ConfigService{}
		if err := configService.BatchUpdateConfigs(dbUpdates); err != nil {
			h.logger.Log("error", "批量更新系统配置失败", gin.H{"error": err.Error()})
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Error: "更新系统配置失败: " + err.Error(),
			})
			return
		}
	}
	
	// 更新配置文件（Web控制台启用状态）
	if len(fileUpdates) > 0 {
		if err := h.updateConfigFile(fileUpdates); err != nil {
			h.logger.Log("error", "更新配置文件失败", gin.H{"error": err.Error()})
			c.JSON(http.StatusInternalServerError, models.APIResponse{
				Error: "更新配置文件失败: " + err.Error(),
			})
			return
		}
	}
	
	// 更新内存配置
	h.updateSystemConfigInMemory(updates)
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "系统配置已更新", gin.H{
		"admin":   claims.Username,
		"updates": updates,
	})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "系统配置更新成功",
	})
}

// ResetSystemConfig 重置系统配置
func (h *Handlers) ResetSystemConfig(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Error: "配置键不能为空",
		})
		return
	}
	
	configService := &database.ConfigService{}
	
	if err := configService.ResetConfigToDefault(key); err != nil {
		h.logger.Log("error", "重置配置失败", gin.H{"key": key, "error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "重置配置失败: " + err.Error(),
		})
		return
	}
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "配置已重置", gin.H{
		"admin": claims.Username,
		"key":   key,
	})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "配置重置成功",
	})
}

// InitializeSystemConfig 初始化系统配置
func (h *Handlers) InitializeSystemConfig(c *gin.Context) {
	initializer := database.NewConfigInitializer()
	
	if err := initializer.InitializeDefaultConfigs(); err != nil {
		h.logger.Log("error", "初始化系统配置失败", gin.H{"error": err.Error()})
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Error: "初始化系统配置失败: " + err.Error(),
		})
		return
	}
	
	user, _ := c.Get("user")
	claims := user.(*utils.Claims)
	h.logger.Log("info", "系统配置已初始化", gin.H{
		"admin": claims.Username,
	})
	
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "系统配置初始化成功",
	})
}

// updateWebSocketConfigInMemory 更新内存中的WebSocket配置
func (h *Handlers) updateWebSocketConfigInMemory(updates map[string]interface{}) {
	for key, value := range updates {
		switch key {
		case "enable_heartbeat":
			if v, ok := value.(bool); ok {
				h.config.WebSocket.EnableHeartbeat = v
			}
		case "heartbeat_interval":
			if v, ok := value.(float64); ok {
				h.config.WebSocket.HeartbeatInterval = int(v)
			}
		case "heartbeat_timeout":
			if v, ok := value.(float64); ok {
				h.config.WebSocket.HeartbeatTimeout = int(v)
			}
		case "client_heartbeat_interval":
			if v, ok := value.(float64); ok {
				h.config.WebSocket.ClientHeartbeatInterval = int(v)
			}
		case "max_message_size":
			if v, ok := value.(float64); ok {
				h.config.WebSocket.MaxMessageSize = int(v)
			}
		case "read_timeout":
			if v, ok := value.(float64); ok {
				h.config.WebSocket.ReadTimeout = int(v)
			}
		case "write_timeout":
			if v, ok := value.(float64); ok {
				h.config.WebSocket.WriteTimeout = int(v)
			}
		}
	}
}

// updateSystemConfigInMemory 更新内存中的系统配置
func (h *Handlers) updateSystemConfigInMemory(updates map[string]interface{}) {
	for key, value := range updates {
		switch key {
		case "server.port":
			if v, ok := value.(string); ok {
				h.config.Server.Port = v
			}
		case "server.host":
			if v, ok := value.(string); ok {
				h.config.Server.Host = v
			}
		case "server.mode":
			if v, ok := value.(string); ok {
				h.config.Server.Mode = v
			}
		case "security.enable_signature_validation":
			if v, ok := value.(bool); ok {
				h.config.Security.EnableSignatureValidation = v
			}
		case "security.default_allow_new_connections":
			if v, ok := value.(bool); ok {
				h.config.Security.DefaultAllowNewConnections = v
			}
		case "security.max_connections_per_secret":
			if v, ok := value.(float64); ok {
				h.config.Security.MaxConnectionsPerSecret = int(v)
			}
		case "security.require_manual_key_management":
			if v, ok := value.(bool); ok {
				h.config.Security.RequireManualKeyManagement = v
			}
		case "auth.username":
			if v, ok := value.(string); ok {
				h.config.Auth.Username = v
			}
		case "auth.password":
			if v, ok := value.(string); ok && v != "" {
				// 只有在密码不为空时才更新（为空表示不修改密码）
				hashedPassword, err := utils.HashPassword(v)
				if err == nil {
					h.config.Auth.Password = hashedPassword
				}
			}
		case "auth.session_timeout":
			if v, ok := value.(float64); ok {
				h.config.Auth.SessionTimeout = int64(v)
			}
		case "logging.level":
			if v, ok := value.(string); ok {
				h.config.Logging.Level = v
			}
		case "logging.max_log_entries":
			if v, ok := value.(float64); ok {
				h.config.Logging.MaxLogEntries = int(v)
			}
		case "logging.enable_log_to_file":
			if v, ok := value.(bool); ok {
				h.config.Logging.EnableLogToFile = v
			}
		case "logging.log_file_path":
			if v, ok := value.(string); ok {
				h.config.Logging.LogFilePath = v
			}
		case "ui.enable_web_console":
			if v, ok := value.(bool); ok {
				h.config.UI.EnableWebConsole = v
			}
		case "ui.theme":
			if v, ok := value.(string); ok {
				h.config.UI.Theme = v
			}
		case "ui.primary_color":
			if v, ok := value.(string); ok {
				h.config.UI.PrimaryColor = v
			}
		case "ui.compact_mode":
			if v, ok := value.(bool); ok {
				h.config.UI.CompactMode = v
			}
		case "ui.language":
			if v, ok := value.(string); ok {
				h.config.UI.Language = v
			}
		case "ui.show_breadcrumb":
			if v, ok := value.(bool); ok {
				h.config.UI.ShowBreadcrumb = v
			}
		case "ui.show_footer":
			if v, ok := value.(bool); ok {
				h.config.UI.ShowFooter = v
			}
		case "ui.enable_animation":
			if v, ok := value.(bool); ok {
				h.config.UI.EnableAnimation = v
			}
		}
	}
}

// updateConfigFile 更新配置文件
func (h *Handlers) updateConfigFile(updates map[string]interface{}) error {
	// 更新内存中的配置
	for key, value := range updates {
		switch key {
		case "ui.enable_web_console":
			if v, ok := value.(bool); ok {
				h.config.UI.EnableWebConsole = v
			}
		}
	}
	
	// 保存配置到文件
	return config.SaveConfig(h.config)
}
