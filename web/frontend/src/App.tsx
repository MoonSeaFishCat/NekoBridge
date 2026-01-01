import React, { useState, useEffect } from 'react';
import {
  Menu,
  Button,
  Space,
  Switch,
  Drawer,
  Badge,
  Dropdown,
  Card,
  Typography,
} from 'tdesign-react';
import {
  DashboardIcon,
  SettingIcon,
  HistoryIcon,
  LinkIcon,
  RefreshIcon,
  PoweroffIcon,
  BookIcon,
  PaletteIcon,
  UserIcon,
  KeyIcon,
} from 'tdesign-icons-react';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { apiService } from './services/api';
import type { LogEntry, Connection } from './types';
import Toast from './components/ui/Toast';
import Login from './components/Login';
import EnhancedDashboard from './components/EnhancedDashboard';
import SecretManager from './components/SecretManager';
import ConnectionManager from './components/ConnectionManager';
import LogViewer from './components/LogViewer';
import ConfigManager from './components/ConfigManager';
import ThemeSettings from './components/ThemeSettings';
import BanManager from './components/BanManager';
import { WebSocketSettings } from './components/WebSocketSettings';
import ApiDocs from './components/ApiDocs';
import WebConsoleGuard from './components/WebConsoleGuard';

// 使用自定义布局，不需要Layout组件
const { MenuItem } = Menu;

interface MenuItem {
  key: string;
  icon: React.ReactElement;
  label: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', icon: <DashboardIcon />, label: '仪表盘' },
  { key: 'secrets', icon: <KeyIcon />, label: '密钥管理' },
  { key: 'connections', icon: <LinkIcon />, label: '连接管理' },
  { key: 'logs', icon: <HistoryIcon />, label: '日志查看' },
  { key: 'bans', icon: <PoweroffIcon />, label: '封禁管理' },
  { key: 'websocket', icon: <LinkIcon />, label: 'WebSocket设置' },
  { key: 'config', icon: <SettingIcon />, label: '系统配置' },
  { key: 'theme', icon: <PaletteIcon />, label: '主题设置' },
  { key: 'docs', icon: <BookIcon />, label: 'API文档' },
];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const { toggleTheme, isDark } = useTheme();
  const { toasts, removeToast, success } = useToast();

  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authState = await apiService.checkAuth();
        if (authState.isAuthenticated) {
          setIsAuthenticated(true);
          loadData();
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('认证检查失败:', error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const [logsData, connectionsData] = await Promise.all([
        apiService.getLogs(),
        apiService.getConnections(),
      ]);
      setLogs(logsData.logs || []);
      setConnections(connectionsData.connections || []);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理登录成功
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    loadData();
    success('登录成功', '欢迎使用NekoBridge', 3000);
  };

  // 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setCurrentTab('dashboard');
    success('已退出登录', '感谢使用NekoBridge', 2000);
  };

  // 渲染内容
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <EnhancedDashboard 
          logs={logs} 
          connections={connections} 
          blockedSecrets={[]} 
          isConnected={true}
          onRefresh={loadData} 
          loading={loading} 
          onNavigate={setCurrentTab} 
        />;
      case 'secrets':
        return <SecretManager onRefresh={loadData} />;
      case 'connections':
        return <ConnectionManager connections={connections} onRefresh={loadData} loading={loading} />;
      case 'logs':
        return <LogViewer logs={logs} onRefresh={loadData} loading={loading} />;
      case 'bans':
        return <BanManager onRefresh={loadData} />;
      case 'websocket':
        return <WebSocketSettings />;
      case 'config':
        return <ConfigManager onRefresh={loadData} />;
      case 'theme':
        return <ThemeSettings onRefresh={loadData} />;
      case 'docs':
        return <ApiDocs />;
      default:
        return <EnhancedDashboard 
          logs={logs} 
          connections={connections} 
          blockedSecrets={[]} 
          isConnected={true}
          onRefresh={loadData} 
          loading={loading} 
          onNavigate={setCurrentTab} 
        />;
    }
  };

  // 如果未认证，显示登录页面
  console.log('App render - isAuthenticated:', isAuthenticated, 'currentTab:', currentTab);
  if (!isAuthenticated) {
    console.log('Showing login page');
    return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <WebConsoleGuard>
      <div style={{ height: '100vh', display: 'flex', backgroundColor: 'var(--nb-bg-layout)' }}>
        {/* 侧边栏 */}
        <div
          className="glass-effect"
          style={{
            width: collapsed ? '64px' : '240px',
            background: 'var(--nb-bg-sidebar)',
            borderRight: '1px solid var(--nb-border-color)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
          }}
        >
          {/* Logo 区域 */}
          <div
            style={{
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              padding: collapsed ? '0' : '0 20px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderBottom: '1px solid var(--nb-border-color)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'var(--nb-primary)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: collapsed ? '0' : '12px',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 82, 217, 0.3)',
              }}
            >
              <span style={{ fontSize: '20px' }}>🐱</span>
            </div>
            {!collapsed && (
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'var(--nb-text-main)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px',
                }}
              >
                NekoBridge
              </span>
            )}
          </div>

          {/* 菜单区域 */}
          <div style={{ flex: 1, padding: '12px 0' }}>
            <Menu
              value={currentTab}
              onChange={(val) => setCurrentTab(val as string)}
              collapsed={collapsed}
              style={{ border: 'none', background: 'transparent' }}
            >
              {menuItems.map((item) => (
                <MenuItem
                  key={item.key}
                  value={item.key}
                  icon={item.icon}
                  style={{
                    borderRadius: '8px',
                    margin: '4px 12px',
                    height: '44px',
                  }}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </div>

          {/* 底部折叠按钮 */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid var(--nb-border-color)',
              display: 'flex',
              justifyContent: collapsed ? 'center' : 'flex-end',
            }}
          >
            <Button
              variant="text"
              shape="square"
              onClick={() => setCollapsed(!collapsed)}
              icon={collapsed ? <DashboardIcon /> : <SettingIcon />}
              style={{ color: 'var(--nb-text-secondary)' }}
            />
          </div>
        </div>

        {/* 主内容区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 顶部导航栏 */}
          <div
            className="glass-effect"
            style={{
              height: '64px',
              background: 'var(--nb-bg-card)',
              borderBottom: '1px solid var(--nb-border-color)',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 90,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--nb-text-main)' }}>
                {menuItems.find(item => item.key === currentTab)?.label}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Space>
                <Switch
                  value={isDark}
                  onChange={() => {
                    toggleTheme();
                    const newMode = isDark ? '浅色模式' : '深色模式';
                    success('主题切换成功', `已切换到${newMode}`, 2000);
                  }}
                  label="深色模式"
                />
                <div
                  style={{
                    height: '20px',
                    width: '1px',
                    background: 'var(--nb-border-color)',
                    margin: '0 8px',
                  }}
                />
                <Dropdown
                  options={[
                    { content: '个人设置', value: 'profile' },
                    { content: '系统设置', value: 'system' },
                    { content: '帮助文档', value: 'help' },
                    { content: '退出登录', value: 'logout', theme: 'error' },
                  ]}
                  onClick={(data) => {
                    if (data.value === 'logout') handleLogout();
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background 0.2s',
                    }}
                    className="card-hover"
                  >
                    <UserIcon />
                    <span style={{ fontSize: '14px', color: 'var(--nb-text-main)' }}>管理员</span>
                  </div>
                </Dropdown>
              </Space>
            </div>
          </div>

          {/* 内容展示区 */}
          <div
            className="animate-fade-in"
            style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              background: 'var(--nb-bg-layout)',
            }}
          >
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        header="快速操作"
        size="360px"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card>
            <Typography.Title level="h4">系统状态</Typography.Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>活跃连接</span>
                <Badge count={connections.filter(c => c.connected).length} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>总日志数</span>
                <Badge count={logs.length} />
              </div>
            </Space>
          </Card>

          <Card>
            <Typography.Title level="h4">快速操作</Typography.Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<RefreshIcon />}
                onClick={() => {
                  loadData();
                  setDrawerVisible(false);
                }}
              >
                刷新数据
              </Button>
              <Button
                block
                icon={<SettingIcon />}
                onClick={() => {
                  setCurrentTab('config');
                  setDrawerVisible(false);
                }}
              >
                系统配置
              </Button>
            </Space>
          </Card>
        </Space>
      </Drawer>

      {/* Toast 提示 */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </WebConsoleGuard>
  );
};

export default App; 