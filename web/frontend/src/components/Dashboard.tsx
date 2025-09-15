import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Space,
  Button,
  Tag,
  Badge,
  Timeline,
  Alert,
  Divider,
} from 'tdesign-react';
import {
  LinkIcon,
  CityIcon,
  HistoryIcon,
  RefreshIcon,
  CheckCircleIcon,
  ErrorCircleIcon,
} from 'tdesign-icons-react';
import { apiService } from '../services/api';
import type { LogEntry, Connection, DashboardStats } from '../types';

interface DashboardProps {
  logs: LogEntry[];
  connections: Connection[];
  onRefresh: () => void;
  loading: boolean;
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  logs,
  connections,
  onRefresh,
  loading,
  onNavigate,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 加载统计数据
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const data = await apiService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, []);

  // 获取日志级别统计
  const getLogStats = () => {
    const errorCount = logs.filter(log => log.level === 'error').length;
    const warningCount = logs.filter(log => log.level === 'warning').length;
    const infoCount = logs.filter(log => log.level === 'info').length;
    return { errorCount, warningCount, infoCount };
  };

  const logStats = getLogStats();

  // 获取连接状态统计
  const getConnectionStats = () => {
    const activeCount = connections.filter(conn => conn.connected).length;
    const totalCount = connections.length;
    const enabledCount = connections.filter(conn => conn.enabled).length;
    return { activeCount, totalCount, enabledCount };
  };

  const connectionStats = getConnectionStats();

  // 获取最近的日志
  const recentLogs = logs.slice(0, 5);

  // 获取系统状态
  const getSystemStatus = () => {
    if (!stats) return 'unknown';
    if (stats.system.cpu > 80 || stats.system.memory > 90) return 'warning';
    if (stats.system.cpu > 95 || stats.system.memory > 95) return 'error';
    return 'normal';
  };

  const systemStatus = getSystemStatus();

  return (
    <div style={{ padding: '0' }}>
      {/* 状态概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃连接"
              value={connectionStats.activeCount}
              suffix={`/ ${connectionStats.totalCount}`}
              prefix={<LinkIcon />}
              loading={loading}
            />
            <div style={{ marginTop: '8px' }}>
              <Progress
                percentage={connectionStats.totalCount > 0 ? (connectionStats.activeCount / connectionStats.totalCount) * 100 : 0}
                size="small"
                color={connectionStats.activeCount > 0 ? '#00a870' : '#d54941'}
              />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="密钥总数"
              value={stats?.secrets?.total || 0}
              prefix={<CityIcon />}
              loading={statsLoading}
            />
            <div style={{ marginTop: '8px' }}>
              <Space size="small">
                <Tag theme="success" variant="light">
                  启用 {(stats?.secrets?.total || 0) - (stats?.secrets?.blocked || 0)}
                </Tag>
                <Tag theme="danger" variant="light">
                  禁用 {stats?.secrets?.blocked || 0}
                </Tag>
              </Space>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="系统日志"
              value={stats?.logs?.total || 0}
              prefix={<HistoryIcon />}
              loading={statsLoading}
            />
            <div style={{ marginTop: '8px' }}>
              <Space size="small">
                <Badge count={logStats.errorCount} size="small" />
                <span style={{ fontSize: '12px', color: '#d54941' }}>错误</span>
                <Badge count={logStats.warningCount} size="small" />
                <span style={{ fontSize: '12px', color: '#ed7b2f' }}>警告</span>
              </Space>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="系统状态"
              value={systemStatus === 'normal' ? 1 : systemStatus === 'warning' ? 2 : 3}
              prefix={
                systemStatus === 'normal' ? <CheckCircleIcon /> :
                systemStatus === 'warning' ? <ErrorCircleIcon /> : <ErrorCircleIcon />
              }
              loading={statsLoading}
            />
            <div style={{ marginTop: '8px' }}>
              <Space size="small">
                <span style={{ fontSize: '12px' }}>CPU: {stats?.system?.cpu || 0}%</span>
                <span style={{ fontSize: '12px' }}>内存: {stats?.system?.memory || 0}%</span>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 系统信息 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={12}>
            <Card title="系统资源" loading={statsLoading}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>CPU 使用率</span>
                    <span>{stats.system.cpu}%</span>
                  </div>
                  <Progress
                    percentage={stats.system.cpu}
                    color={stats.system.cpu > 80 ? '#d54941' : stats.system.cpu > 60 ? '#ed7b2f' : '#00a870'}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>内存使用率</span>
                    <span>{stats.system.memory}%</span>
                  </div>
                  <Progress
                    percentage={stats.system.memory}
                    color={stats.system.memory > 80 ? '#d54941' : stats.system.memory > 60 ? '#ed7b2f' : '#00a870'}
                  />
                </div>
                <Divider />
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <div>运行时间: {Math.floor(stats.system.uptime / 3600)} 小时</div>
                  <div>CPU 核心: {stats.system.cpu_cores} 核</div>
                  <div>CPU 型号: {stats.system.cpu_model}</div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="连接状态" loading={loading}>
              {connections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  暂无连接
                </div>
              ) : (
                <div>
                  {connections.slice(0, 5).map((conn) => (
                    <div
                      key={conn.secret}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--td-border-color)',
                      }}
                    >
                      <Space>
                        <Badge
                          dot
                        />
                        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {conn.secret.substring(0, 8)}...
                        </span>
                        {conn.description && (
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            {conn.description}
                          </span>
                        )}
                      </Space>
                      <Tag
                        theme={conn.connected ? 'success' : 'default'}
                        variant="light"
                        size="small"
                      >
                        {conn.connected ? '已连接' : '未连接'}
                      </Tag>
                    </div>
                  ))}
                  {connections.length > 5 && (
                    <div style={{ textAlign: 'center', marginTop: '8px' }}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onNavigate('connections')}
                      >
                        查看全部 ({connections.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* 最近日志 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>最近日志</span>
                <Space>
                  <Button
                    variant="text"
                    icon={<RefreshIcon />}
                    onClick={onRefresh}
                    loading={loading}
                  >
                    刷新
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => onNavigate('logs')}
                  >
                    查看全部
                  </Button>
                </Space>
              </div>
            }
            loading={loading}
          >
            {recentLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                暂无日志记录
              </div>
            ) : (
              <Timeline>
                {recentLogs.map((log) => (
                  <Timeline.Item
                    key={log.id}
                    label={new Date(log.timestamp).toLocaleTimeString()}
                    dot={
                      log.level === 'error' ? <ErrorCircleIcon style={{ color: '#d54941' }} /> :
                      log.level === 'warning' ? <ErrorCircleIcon style={{ color: '#ed7b2f' }} /> :
                      log.level === 'info' ? <CheckCircleIcon style={{ color: '#00a870' }} /> :
                      <CheckCircleIcon style={{ color: '#666' }} />
                    }
                  >
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                        {log.message}
                      </div>
                      {log.details && (
                        <div style={{
                          fontSize: '12px',
                          color: '#666',
                          fontFamily: 'monospace',
                          background: 'var(--td-bg-color-container)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          marginTop: '4px',
                        }}>
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Card>
        </Col>
      </Row>

      {/* 系统状态警告 */}
      {systemStatus !== 'normal' && (
        <Alert
          theme={systemStatus === 'error' ? 'error' : 'warning'}
          message={
            systemStatus === 'error' 
              ? '系统资源使用率过高，请检查系统状态'
              : '系统资源使用率较高，建议关注系统状态'
          }
          style={{ marginTop: '16px' }}
        />
      )}
    </div>
  );
};

export default Dashboard;