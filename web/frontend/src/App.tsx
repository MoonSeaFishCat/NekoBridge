import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useToast } from './hooks/useToast';
import { apiService } from './services/api';
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
import MainLayout from './components/MainLayout';
import { DataProvider } from './contexts/DataContext';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toasts, removeToast, success } = useToast();

  // 检查认证状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authState = await apiService.checkAuth();
        setIsAuthenticated(authState.isAuthenticated);
      } catch (error) {
        console.error('认证检查失败:', error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // 处理登录成功
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    success('登录成功', '欢迎使用NekoBridge', 3000);
  };

  // 如果还在检查认证状态，可以返回 loading 或 null
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <WebConsoleGuard>
      <BrowserRouter>
        <DataProvider>
          <Routes>
            {/* 登录路由 */}
            <Route 
              path="/login" 
              element={isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLoginSuccess} />} 
            />

            {/* 受保护路由 */}
            <Route 
              path="/" 
              element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}
            >
              <Route index element={<EnhancedDashboard />} />
              <Route path="secrets" element={<SecretManager />} />
              <Route path="connections" element={<ConnectionManager />} />
              <Route path="logs" element={<LogViewer />} />
              <Route path="bans" element={<BanManager />} />
              <Route path="websocket" element={<WebSocketSettings />} />
              <Route path="config" element={<ConfigManager />} />
              <Route path="theme" element={<ThemeSettings />} />
              <Route path="docs" element={<ApiDocs />} />
            </Route>

            {/* 通配符重定向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DataProvider>
      </BrowserRouter>
      
      {/* 全局 Toast */}
      {toasts.map((toast) => (
        <Toast
             key={toast.id}
             id={toast.id}
             type={toast.type}
             title={toast.title}
             content={toast.content}
             onClose={() => removeToast(toast.id)}
           />
      ))}
    </WebConsoleGuard>
  );
};

export default App;