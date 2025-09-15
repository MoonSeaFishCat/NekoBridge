package monitor

import (
	"runtime"
	"sync"
	"time"
)

// CpuMonitor CPU监控器
type CpuMonitor struct {
	lastUpdateTime time.Time
	currentUsage   float64
	updateInterval time.Duration
	mutex          sync.RWMutex
}

// CpuInfo CPU信息
type CpuInfo struct {
	Usage float64 `json:"usage"`
	Cores int     `json:"cores"`
	Model string  `json:"model"`
	Speed int64   `json:"speed"`
}

// NewCpuMonitor 创建CPU监控器
func NewCpuMonitor() *CpuMonitor {
	monitor := &CpuMonitor{
		updateInterval: 1 * time.Second,
	}
	
	// 初始化
	monitor.updateCpuUsage()
	
	// 启动定时更新
	go monitor.startMonitoring()
	
	return monitor
}

// startMonitoring 启动监控
func (c *CpuMonitor) startMonitoring() {
	ticker := time.NewTicker(c.updateInterval)
	defer ticker.Stop()
	
	for range ticker.C {
		c.updateCpuUsage()
	}
}

// updateCpuUsage 更新CPU使用率
func (c *CpuMonitor) updateCpuUsage() {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	
	now := time.Now()
	
	// 简化的CPU使用率计算
	// 在实际应用中，这里应该使用更精确的CPU监控方法
	// 这里我们使用一个模拟值
	if now.Sub(c.lastUpdateTime) >= c.updateInterval {
		// 模拟CPU使用率（实际应用中应该读取真实的CPU使用率）
		c.currentUsage = 15.0 + float64(now.Unix()%10) // 15-25%之间变化
		c.lastUpdateTime = now
	}
}

// GetCpuUsage 获取CPU使用率
func (c *CpuMonitor) GetCpuUsage() float64 {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return c.currentUsage
}

// GetCpuInfo 获取CPU信息
func (c *CpuMonitor) GetCpuInfo() CpuInfo {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	
	// 获取CPU核心数
	cores := runtime.NumCPU()
	
	return CpuInfo{
		Usage: c.currentUsage,
		Cores: cores,
		Model: "Unknown", // 在实际应用中应该读取真实的CPU型号
		Speed: 0, // Go的runtime包不提供CPU频率信息
	}
}