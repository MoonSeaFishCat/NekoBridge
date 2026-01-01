import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
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
  PoweroffIcon,
  BookIcon,
  PaletteIcon,
  UserIcon,
  KeyIcon,
} from 'tdesign-icons-react';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { authManager } from '../services/api';

const { MenuItem } = Menu;

interface NavItem {
  key: string;
  icon: React.ReactElement;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', icon: <DashboardIcon />, label: '仪表盘', path: '/' },
  { key: 'secrets', icon: <KeyIcon />, label: '密钥管理', path: '/secrets' },
  { key: 'connections', icon: <LinkIcon />, label: '连接管理', path: '/connections' },
  { key: 'logs', icon: <HistoryIcon />, label: '日志查看', path: '/logs' },
  { key: 'bans', icon: <PoweroffIcon />, label: '封禁管理', path: '/bans' },
  { key: 'websocket', icon: <LinkIcon />, label: 'WebSocket设置', path: '/websocket' },
  { key: 'config', icon: <SettingIcon />, label: '系统配置', path: '/config' },
  { key: 'theme', icon: <PaletteIcon />, label: '主题设置', path: '/theme' },
  { key: 'docs', icon: <BookIcon />, label: 'API文档', path: '/docs' },
];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { toggleTheme, isDark } = useTheme();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    authManager.clearToken();
    navigate('/login');
    success('已退出登录', '感谢使用NekoBridge', 2000);
  };

  const currentKey = navItems.find(item => item.path === location.pathname)?.key || 'dashboard';

  return (
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
            value={currentKey}
            onChange={(val) => {
              const item = navItems.find(i => i.key === val);
              if (item) navigate(item.path);
            }}
            collapsed={collapsed}
            style={{ border: 'none', background: 'transparent' }}
          >
            {navItems.map((item) => (
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
              {navItems.find(item => item.path === location.pathname)?.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Space>
              <Switch
                label={isDark ? '深色' : '浅色'}
                value={isDark}
                onChange={() => {
                  toggleTheme();
                  const newMode = isDark ? '浅色模式' : '深色模式';
                  success('主题切换成功', `已切换到${newMode}`, 2000);
                }}
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
            <Outlet />
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
                {/* 这里可能需要全局状态管理或 Context 来获取数据 */}
                <Badge count={0} />
              </div>
            </Space>
          </Card>
        </Space>
      </Drawer>
    </div>
  );
};

export default MainLayout;
