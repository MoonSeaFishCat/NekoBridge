import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Divider,
  Progress,
} from 'tdesign-react';
import {
  RefreshIcon,
  LinkIcon,
  LockOnIcon,
  HistoryIcon,
  TimeIcon,
  DesktopIcon,
  ErrorCircleIcon,
} from 'tdesign-icons-react';
import { apiService } from '../services/api';
import { useData } from '../contexts/DataContext';
import type { DashboardStats } from '../types';

const { Text } = Typography;

export default function EnhancedDashboard() {
  const { logs, connections, loading, refreshData } = useData();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await apiService.getHealth();
      // 这里需要根据实际后端返回的 health 接口调整数据映射
      // 假设 apiService.getHealth() 返回的数据包含我们需要的信息
      if (response.success && response.data) {
        const health = response.data;
        const memUsage = health.memory.heap_sys > 0 
          ? (health.memory.heap_used / health.memory.heap_sys) * 100 
          : 0;

        setStats({
          system: {
            cpu: health.cpu.usage,
            memory: memUsage,
            uptime: health.uptime,
            cpu_cores: health.cpu.cores,
            cpu_model: health.cpu.model,
            load_average: health.load_average
          },
          secrets: {
            total: 0, // Will be updated by refreshData -> connections
            blocked: 0
          },
          connections: {
            active: health.connections,
            total: health.connections
          },
          logs: {
            total: logs.length,
            error: logs.filter(l => l.level === 'error').length,
            warnings: logs.filter(l => l.level === 'warning').length
          }
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const getMemoryColor = (usage: number) => {
    if (usage > 80) return 'var(--nb-error)';
    if (usage > 60) return 'var(--nb-warning)';
    return 'var(--nb-success)';
  };

  const getCpuColor = (usage: number) => {
    if (usage > 80) return 'var(--nb-error)';
    if (usage > 60) return 'var(--nb-warning)';
    return 'var(--nb-success)';
  };

  // 计算活跃连接数
  const activeConnections = connections.filter(c => c.connected).length;
  const totalConnections = connections.length;
  const connectionRate = totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 0;

  // 计算日志统计
  const errorLogs = logs.filter(log => log.level === 'error').length;
  const warningLogs = logs.filter(log => log.level === 'warning').length;
  const totalLogs = logs.length;

  const isConnected = true; // 暂时写死，后续可以从全局 WebSocket 状态获取

  return (
    <div className="animate-fade-in">
      {/* 系统状态卡片 */}
      <Card
        className="glass-effect"
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                padding: '8px', 
                background: 'var(--nb-primary-light)', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <DesktopIcon style={{ color: 'var(--nb-primary)' }} />
              </div>
              <span style={{ fontWeight: 600 }}>系统概览</span>
            </div>
            <Space size="small">
              <Tag
                theme={isConnected ? 'success' : 'danger'}
                variant="light"
                shape="round"
              >
                {isConnected ? 'WebSocket 正常' : 'WebSocket 断开'}
              </Tag>
              <Button
                size="small"
                variant="outline"
                icon={<RefreshIcon />}
                onClick={() => { refreshData(); loadStats(); }}
                loading={loading || statsLoading}
              >
                刷新
              </Button>
            </Space>
          </div>
        }
        bordered={false}
        style={{ marginBottom: '24px', boxShadow: 'var(--nb-shadow)' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {/* 连接统计 */}
          <Card 
            className="card-hover" 
            size="small" 
            style={{ 
              height: '140px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              background: 'var(--nb-bg-layout)',
              border: '1px solid var(--nb-border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <LinkIcon style={{ color: 'var(--nb-primary)', marginRight: '8px' }} />
              <Text strong style={{ color: 'var(--nb-text-secondary)' }}>活跃连接</Text>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: 'var(--nb-text-main)' }}>
              {activeConnections} <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--nb-text-secondary)' }}>/ {totalConnections}</span>
            </div>
            <Progress
              percentage={connectionRate}
              size="small"
              color="var(--nb-primary)"
              label={false}
            />
          </Card>

          {/* 密钥统计 */}
          <Card 
            className="card-hover" 
            size="small" 
            style={{ 
              height: '140px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              background: 'var(--nb-bg-layout)',
              border: '1px solid var(--nb-border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <LockOnIcon style={{ color: 'var(--nb-error)', marginRight: '8px' }} />
              <Text strong style={{ color: 'var(--nb-text-secondary)' }}>密钥管理</Text>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: 'var(--nb-text-main)' }}>
              {stats?.secrets?.total || 0}
            </div>
            <Tag theme="danger" variant="light" size="small" style={{ width: 'fit-content' }}>
              封禁管理
            </Tag>
          </Card>

          {/* 日志统计 */}
          <Card 
            className="card-hover" 
            size="small" 
            style={{ 
              height: '140px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              background: 'var(--nb-bg-layout)',
              border: '1px solid var(--nb-border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <ErrorCircleIcon style={{ color: 'var(--nb-warning)', marginRight: '8px' }} />
              <Text strong style={{ color: 'var(--nb-text-secondary)' }}>运行状态</Text>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: 'var(--nb-text-main)' }}>
              {totalLogs}
            </div>
            <Space size="small">
              <Tag theme="warning" variant="light" size="small">{warningLogs} 警告</Tag>
              <Tag theme="danger" variant="light" size="small">{errorLogs} 错误</Tag>
            </Space>
          </Card>

          {/* 运行时间 */}
          <Card 
            className="card-hover" 
            size="small" 
            style={{ 
              height: '140px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center',
              background: 'var(--nb-bg-layout)',
              border: '1px solid var(--nb-border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <TimeIcon style={{ color: 'var(--nb-success)', marginRight: '8px' }} />
              <Text strong style={{ color: 'var(--nb-text-secondary)' }}>在线时长</Text>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--nb-text-main)' }}>
              {stats?.system?.uptime ? formatUptime(stats.system.uptime) : '获取中...'}
            </div>
          </Card>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 系统性能 */}
        <Card 
          className="glass-effect"
          title={<span style={{ fontWeight: 600 }}>系统性能</span>} 
          bordered={false}
          style={{ boxShadow: 'var(--nb-shadow)' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <Text style={{ color: 'var(--nb-text-secondary)' }}>内存使用率</Text>
                <Text strong style={{ color: getMemoryColor(stats?.system?.memory || 0) }}>
                  {stats?.system?.memory || 0}%
                </Text>
              </div>
              <Progress
                percentage={stats?.system?.memory || 0}
                color={getMemoryColor(stats?.system?.memory || 0)}
                size="small"
                label={false}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <Text style={{ color: 'var(--nb-text-secondary)' }}>CPU 使用率</Text>
                <Text strong style={{ color: getCpuColor(stats?.system?.cpu || 0) }}>
                  {stats?.system?.cpu || 0}%
                </Text>
              </div>
              <Progress
                percentage={stats?.system?.cpu || 0}
                color={getCpuColor(stats?.system?.cpu || 0)}
                size="small"
                label={false}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'var(--nb-text-secondary)', fontSize: '13px' }}>服务器版本</Text>
                <Tag variant="light" size="small">v1.2.0</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'var(--nb-text-secondary)', fontSize: '13px' }}>CPU 核心数</Text>
                <Text strong style={{ fontSize: '13px' }}>{stats?.system?.cpu_cores || '--'}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'var(--nb-text-secondary)', fontSize: '13px' }}>运行环境</Text>
                <Text strong style={{ fontSize: '13px' }}>Go 1.21.0 / Linux</Text>
              </div>
            </div>
          </Space>
        </Card>

        {/* 最近日志 */}
        <Card
          className="glass-effect"
          title={<span style={{ fontWeight: 600 }}>最近动态</span>}
          bordered={false}
          style={{ boxShadow: 'var(--nb-shadow)' }}
          actions={
            <Button 
              size="small" 
              variant="text"
              onClick={() => navigate('/logs')}
              style={{ color: 'var(--nb-primary)' }}
            >
              查看更多
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.slice(0, 5).map((log, index) => (
              <div 
                key={index} 
                style={{ 
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--nb-bg-layout)',
                  border: '1px solid var(--nb-border-color)',
                  borderLeft: `4px solid ${log.level === 'error' ? 'var(--nb-error)' : log.level === 'warning' ? 'var(--nb-warning)' : 'var(--nb-success)'}`,
                  transition: 'all 0.2s'
                }}
                className="card-hover"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <Tag 
                    theme={log.level === 'error' ? 'danger' : log.level === 'warning' ? 'warning' : 'success'}
                    variant="light"
                    size="small"
                  >
                    {log.level.toUpperCase()}
                  </Tag>
                  <Text style={{ fontSize: '11px', color: 'var(--nb-text-secondary)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                </div>
                <Text style={{ fontSize: '13px', color: 'var(--nb-text-main)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.message}
                </Text>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--nb-text-secondary)' }}>
                暂无最新动态
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 快捷导航 */}
      <Card 
        className="glass-effect"
        title={<span style={{ fontWeight: 600 }}>快捷导航</span>} 
        bordered={false} 
        style={{ marginTop: '24px', boxShadow: 'var(--nb-shadow)' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: '连接管理', icon: <LinkIcon />, path: '/connections', color: 'var(--nb-primary)' },
            { label: '密钥管理', icon: <LockOnIcon />, path: '/secrets', color: 'var(--nb-error)' },
            { label: '日志查询', icon: <HistoryIcon />, path: '/logs', color: 'var(--nb-warning)' },
            { label: '封禁列表', icon: <ErrorCircleIcon />, path: '/bans', color: 'var(--nb-info)' },
          ].map((item) => (
            <Button 
              key={item.path}
              variant="outline" 
              className="card-hover"
              style={{ 
                height: '50px', 
                borderRadius: '10px',
                border: '1px solid var(--nb-border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={() => navigate(item.path)}
            >
              <div style={{ color: item.color, display: 'flex' }}>{item.icon}</div>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}