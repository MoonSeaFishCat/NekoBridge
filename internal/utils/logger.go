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
	// 添加日志条目
	l.logs = append(l.logs, entry)

	// 保持日志数量在限制内 - 使用更高效的环形缓冲区策略
	// 当超过限制时，删除最旧的日志
	if len(l.logs) > l.maxSize {
		// 删除最旧的日志，保留最新的 maxSize 条
		l.logs = l.logs[len(l.logs)-l.maxSize:]
	}
	l.mu.Unlock()

	// 输出到控制台（在锁外执行）
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
func (l *Logger) GetLogs(limit, offset int, level string) []models.LogEntry {
	l.mu.RLock()
	// 先获取当前日志的副本引用，尽快释放读锁
	allLogs := l.logs
	l.mu.RUnlock()

	// 按级别过滤
	var filtered []models.LogEntry
	if level != "" {
		filtered = make([]models.LogEntry, 0)
		skip := offset
		for i := len(allLogs) - 1; i >= 0; i-- {
			if allLogs[i].Level == level {
				if skip > 0 {
					skip--
					continue
				}
				filtered = append(filtered, allLogs[i])
				if limit > 0 && len(filtered) >= limit {
					break
				}
			}
		}
		return filtered
	}

	// 如果没有级别过滤
	count := len(allLogs)
	start := count - 1 - offset
	if start < 0 {
		return []models.LogEntry{}
	}

	end := start - limit + 1
	if end < 0 {
		end = 0
	}

	actualCount := start - end + 1
	result := make([]models.LogEntry, actualCount)
	for i := 0; i < actualCount; i++ {
		result[i] = allLogs[start-i]
	}

	return result
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
