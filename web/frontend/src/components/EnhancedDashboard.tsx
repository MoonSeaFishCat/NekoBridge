import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Badge,
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
import api from '../services/api';
import type { LogEntry, Connection, DashboardStats } from '../types';

const { Text } = Typography;

interface EnhancedDashboardProps {
  logs: LogEntry[];
  connections: Connection[];
  blockedSecrets: string[];
  isConnected: boolean;
  onRefresh: () => void;
  loading: boolean;
  onNavigate?: (tab: string) => void;
}

export default function EnhancedDashboard({
  logs,
  connections,
  blockedSecrets,
  isConnected,
  onRefresh,
  loading,
  onNavigate
}: EnhancedDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await api.getDashboardStats();
      setStats(response);
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
    if (usage > 80) return '#ff4d4f';
    if (usage > 60) return '#faad14';
    return '#52c41a';
  };

  const getCpuColor = (usage: number) => {
    if (usage > 80) return '#ff4d4f';
    if (usage > 60) return '#faad14';
    return '#52c41a';
  };

  // 计算活跃连接数
  const activeConnections = connections.filter(c => c.connected).length;
  const totalConnections = connections.length;
  const connectionRate = totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 0;

  // 计算日志统计
  const errorLogs = logs.filter(log => log.level === 'error').length;
  const warningLogs = logs.filter(log => log.level === 'warning').length;
  const totalLogs = logs.length;

  return (
    <div>
      {/* 系统状态卡片 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DesktopIcon />
              <span>系统概览</span>
            </div>
            <Space>
              <Badge
                color={isConnected ? 'green' : 'red'}
              >
                {isConnected ? 'WebSocket 已连接' : 'WebSocket 断开'}
              </Badge>
              <Button
                size="small"
                icon={<RefreshIcon />}
                onClick={() => { onRefresh(); loadStats(); }}
                loading={loading || statsLoading}
              >
                刷新
              </Button>
            </Space>
          </div>
        }
        bordered={false}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
          {/* 连接统计 */}
          <div style={{ textAlign: 'center' }}>
            <Card size="small" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <LinkIcon style={{ color: '#1890ff', marginRight: '8px' }} />
                <Text strong>活跃连接</Text>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {activeConnections} / {totalConnections}
              </div>
              <Progress
                percentage={connectionRate}
                size="small"
                color="#1890ff"
              />
            </Card>
          </div>

          {/* 密钥统计 */}
          <div style={{ textAlign: 'center' }}>
            <Card size="small" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <LockOnIcon style={{ color: '#ff4d4f', marginRight: '8px' }} />
                <Text strong>封禁密钥</Text>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {blockedSecrets.length}
                {stats?.secrets?.total && ` / ${stats.secrets.total}`}
              </div>
              <Tag theme="danger" size="small">
                {blockedSecrets.length} 个被封禁
              </Tag>
            </Card>
          </div>

          {/* 日志统计 */}
          <div style={{ textAlign: 'center' }}>
            <Card size="small" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <ErrorCircleIcon style={{ color: '#faad14', marginRight: '8px' }} />
                <Text strong>错误日志</Text>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {errorLogs} / {totalLogs}
              </div>
              <Space size="small">
                <Tag theme="warning" size="small">{warningLogs} 警告</Tag>
                <Tag theme="danger" size="small">{errorLogs} 错误</Tag>
              </Space>
            </Card>
          </div>

          {/* 运行时间 */}
          <div style={{ textAlign: 'center' }}>
            <Card size="small" style={{ height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <TimeIcon style={{ color: '#52c41a', marginRight: '8px' }} />
                <Text strong>运行时间</Text>
              </div>
              <Text style={{ fontSize: '12px', color: '#666' }}>
                {stats?.system?.uptime ? formatUptime(stats.system.uptime) : '--'}
              </Text>
            </Card>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 系统性能 */}
        <Card title="系统性能" bordered={false}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text>内存使用率</Text>
                <Text strong style={{ color: getMemoryColor(stats?.system?.memory || 0) }}>
                  {stats?.system?.memory || 0}%
                </Text>
              </div>
              <Progress
                percentage={stats?.system?.memory || 0}
                color={getMemoryColor(stats?.system?.memory || 0)}
                size="small"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <Text>CPU 使用率</Text>
                <Text strong style={{ color: getCpuColor(stats?.system?.cpu || 0) }}>
                  {stats?.system?.cpu || 0}%
                </Text>
              </div>
              <Progress
                percentage={stats?.system?.cpu || 0}
                color={getCpuColor(stats?.system?.cpu || 0)}
                size="small"
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: '#666' }}>服务器端口</Text>
              <Text code>3000</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ color: '#666' }}>WebSocket 状态</Text>
              <Badge
                color={isConnected ? 'green' : 'red'}
              >
                {isConnected ? '正常' : '断开'}
              </Badge>
            </div>
            {stats?.system?.cpu_cores && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#666' }}>CPU 核心数</Text>
                <Text code>{stats.system.cpu_cores}</Text>
              </div>
            )}
            {stats?.system?.cpu_model && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ color: '#666' }}>CPU 型号</Text>
                <Text code>{stats.system.cpu_model}</Text>
              </div>
            )}
          </Space>
        </Card>

        {/* 最近日志 */}
        <Card
          title="最近日志"
          bordered={false}
          actions={
            <Button 
              size="small" 
              variant="text"
              onClick={() => onNavigate?.('logs')}
            >
              查看全部
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {logs.slice(0, 5).map((log, index) => (
              <Card key={index} size="small" style={{ 
                borderLeft: `3px solid ${log.level === 'error' ? '#ff4d4f' : log.level === 'warning' ? '#faad14' : '#52c41a'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <Badge 
                        color={log.level === 'error' ? 'red' : log.level === 'warning' ? 'orange' : 'green'}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <Text style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </Text>
                    </div>
                    <Text style={{ fontSize: '13px' }}>{log.message}</Text>
                  </div>
                </div>
              </Card>
            ))}
            {logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                暂无日志记录
              </div>
            )}
          </Space>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card title="快速操作" bordered={false} style={{ marginTop: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <Button 
            variant="outline" 
            icon={<LinkIcon />}
            onClick={() => onNavigate?.('connections')}
          >
            连接管理
          </Button>
          <Button 
            variant="outline" 
            icon={<LockOnIcon />}
            onClick={() => onNavigate?.('secrets')}
          >
            密钥管理
          </Button>
          <Button 
            variant="outline" 
            icon={<HistoryIcon />}
            onClick={() => onNavigate?.('logs')}
          >
            日志查看
          </Button>
          <Button 
            variant="outline" 
            icon={<ErrorCircleIcon />}
            onClick={() => onNavigate?.('bans')}
          >
            封禁管理
          </Button>
        </div>
      </Card>
    </div>
  );
}