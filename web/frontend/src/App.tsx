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
  MoonIcon,
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
  icon: React.ReactNode;
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
  const { toggleTheme, isDark, clearThemeCache } = useTheme();
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
      <div style={{ height: '100vh', display: 'flex' }}>
        {/* 侧边栏 */}
        <div
          style={{
            width: collapsed ? '60px' : '240px',
            background: isDark ? '#1A1A1A' : '#f5f5f5',
            borderRight: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`,
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        <div
          style={{
            padding: '16px',
            borderBottom: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`,
            fontSize: '18px',
            fontWeight: 'bold',
            color: isDark ? '#FFFFFF' : '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textShadow: isDark ? '0 0 10px rgba(255,255,255,0.1)' : 'none',
          }}>
          <span>{collapsed ? '🐱' : '🐱 NekoBridge'}</span>
          {!collapsed && (
            <Button
              variant="text"
              icon={<MoonIcon />}
              onClick={() => setCollapsed(!collapsed)}
              size="small"
            />
          )}
        </div>
        
        <Menu
          value={currentTab}
          onChange={(value) => setCurrentTab(value as string)}
          style={{ border: 'none', flex: 1 }}
        >
          {menuItems.map((item) => (
            <MenuItem key={item.key} value={item.key}>
              <Space>
                {item.icon}
                {!collapsed && (
                  <span style={{ 
                    color: isDark ? '#E0E0E0' : '#333',
                    fontWeight: '500'
                  }}>
                    {item.label}
                  </span>
                )}
                {item.badge && item.badge > 0 && (
                  <Badge count={item.badge} size="small" />
                )}
              </Space>
            </MenuItem>
          ))}
        </Menu>
      </div>

      {/* 主内容区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部导航栏 */}
        <div
          style={{
            height: '60px',
            background: isDark ? '#1A1A1A' : '#fff',
            borderBottom: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="text"
              icon={<MoonIcon />}
              onClick={() => setDrawerVisible(true)}
              style={{ marginRight: '16px' }}
            />
            <Typography.Text style={{ 
              color: isDark ? '#FFFFFF' : '#666',
              fontWeight: '600',
              fontSize: '16px'
            }}>
              {menuItems.find(item => item.key === currentTab)?.label}
            </Typography.Text>
          </div>

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
            <Button
              variant="text"
              size="small"
              onClick={() => {
                clearThemeCache();
                success('缓存已清理', '主题已重置为默认浅色模式', 2000);
              }}
            >
              清理缓存
            </Button>
            <Dropdown
              trigger="click"
              options={[
                { content: '个人设置', value: 'profile' },
                { content: '系统设置', value: 'system' },
                { content: '帮助文档', value: 'help' },
              ]}
            >
              <Button variant="text" icon={<UserIcon />}>
                管理员
              </Button>
            </Dropdown>
            <Button
              variant="text"
              icon={<PoweroffIcon />}
              onClick={handleLogout}
            >
              退出
            </Button>
          </Space>
        </div>

        {/* 内容区域 */}
        <div
          style={{
            flex: 1,
            padding: '24px',
            background: isDark ? '#0D0D0D' : '#fafafa',
            overflow: 'auto',
          }}
        >
          {renderContent()}
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
       </div>
    </WebConsoleGuard>
  );
};

export default App; 