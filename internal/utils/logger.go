package utils

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"nekobridge/internal/models"
)

// Logger 日志记录器
type Logger struct {
	logs    []models.LogEntry
	mu      sync.RWMutex
	maxSize int
	level   string
}

// NewLogger 创建新的日志记录器
func NewLogger(maxSize int, level string) *Logger {
	// 设置标准日志库输出到 stdout，确保在宝塔等环境下能看到所有日志
	log.SetOutput(os.Stdout)
	return &Logger{
		logs:    make([]models.LogEntry, 0),
		maxSize: maxSize,
		level:   level,
	}
}

// Log 记录日志
func (l *Logger) Log(level, message string, details interface{}) {
	// 检查日志级别
	if !l.shouldLog(level) {
		return
	}

	entry := models.LogEntry{
		ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
		Timestamp: time.Now(),
		Level:     level,
		Message:   message,
		Details:   details,
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	// 添加日志条目
	l.logs = append(l.logs, entry)

	// 保持日志数量在限制内
	if len(l.logs) > l.maxSize {
		l.logs = l.logs[1:]
	}

	// 输出到控制台
	l.printToConsole(entry)
}

var logLevels = map[string]int{
	"debug":   0,
	"info":    1,
	"warning": 2,
	"error":   3,
}

// shouldLog 检查是否应该记录此级别的日志
func (l *Logger) shouldLog(level string) bool {
	currentLevel, exists := logLevels[l.level]
	if !exists {
		currentLevel = 1 // 默认为info级别
	}

	messageLevel, exists := logLevels[level]
	if !exists {
		messageLevel = 1 // 默认为info级别
	}

	return messageLevel >= currentLevel
}

// printToConsole 输出到控制台
func (l *Logger) printToConsole(entry models.LogEntry) {
	timestamp := entry.Timestamp.Format("2006-01-02 15:04:05")

	if entry.Details != nil {
		detailsJSON, _ := json.Marshal(entry.Details)
		log.Printf("[%s] %s %s %s", timestamp, entry.Level, entry.Message, string(detailsJSON))
	} else {
		log.Printf("[%s] %s %s", timestamp, entry.Level, entry.Message)
	}
}

// GetLogs 获取日志
func (l *Logger) GetLogs(limit int, level string) []models.LogEntry {
	l.mu.RLock()
	defer l.mu.RUnlock()

	logs := l.logs

	// 按级别过滤
	if level != "" {
		filtered := make([]models.LogEntry, 0)
		for _, log := range logs {
			if log.Level == level {
				filtered = append(filtered, log)
			}
		}
		logs = filtered
	}

	// 限制数量
	if limit > 0 && len(logs) > limit {
		logs = logs[len(logs)-limit:]
	}

	// 反转顺序，最新的在前
	reversed := make([]models.LogEntry, len(logs))
	for i, log := range logs {
		reversed[len(logs)-1-i] = log
	}

	return reversed
}

// GetLogCount 获取日志数量
func (l *Logger) GetLogCount() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.logs)
}

// GetErrorCount 获取错误数量
func (l *Logger) GetErrorCount() int {
	l.mu.RLock()
	defer l.mu.RUnlock()

	count := 0
	for _, log := range l.logs {
		if log.Level == "error" {
			count++
		}
	}
	return count
}

// GetWarningCount 获取警告数量
func (l *Logger) GetWarningCount() int {
	l.mu.RLock()
	defer l.mu.RUnlock()

	count := 0
	for _, log := range l.logs {
		if log.Level == "warning" {
			count++
		}
	}
	return count
}

// ClearLogs 清空日志
func (l *Logger) ClearLogs() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.logs = make([]models.LogEntry, 0)
}

// SaveToFile 保存日志到文件
func (l *Logger) SaveToFile(filename string) error {
	l.mu.RLock()
	defer l.mu.RUnlock()

	file, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	for _, entry := range l.logs {
		line := fmt.Sprintf("[%s] %s %s\n",
			entry.Timestamp.Format("2006-01-02 15:04:05"),
			entry.Level,
			entry.Message)

		if entry.Details != nil {
			detailsJSON, _ := json.Marshal(entry.Details)
			line += fmt.Sprintf("  Details: %s\n", string(detailsJSON))
		}

		file.WriteString(line)
	}

	return nil
}
