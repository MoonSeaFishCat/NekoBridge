import React, { useState, useEffect } from 'react';
import { Card, Alert, Button, Space, Typography } from 'tdesign-react';
import { RefreshIcon, SettingIcon } from 'tdesign-icons-react';
import { apiService } from '../services/api';

const { Title, Paragraph } = Typography;

interface WebConsoleGuardProps {
  children: React.ReactNode;
}

const WebConsoleGuard: React.FC<WebConsoleGuardProps> = ({ children }) => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkWebConsoleStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getWebConsoleStatus();
      if (response.success && response.data) {
        setEnabled(response.data.enabled);
      } else {
        setEnabled(false);
      }
    } catch (err) {
      console.error('检查Web控制台状态失败:', err);
      setError('无法连接到服务器');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWebConsoleStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: '400px', textAlign: 'center' }}>
          <div style={{ padding: '40px 20px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #165DFF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <Title level="h4">正在检查Web控制台状态...</Title>
          </div>
        </Card>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: '500px', textAlign: 'center' }}>
          <div style={{ padding: '40px 20px' }}>
            <Alert theme="error" message="连接失败" />
            <Title level="h4" style={{ marginTop: '20px' }}>无法连接到服务器</Title>
            <Paragraph style={{ color: '#666', margin: '20px 0' }}>
              请检查服务器是否正在运行，或网络连接是否正常
            </Paragraph>
            <Button 
              theme="primary" 
              icon={<RefreshIcon />}
              onClick={checkWebConsoleStatus}
            >
              重试
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: '500px', textAlign: 'center' }}>
          <div style={{ padding: '40px 20px' }}>
            <div style={{ 
              fontSize: '64px', 
              color: '#ff6b6b', 
              marginBottom: '20px' 
            }}>
              🚫
            </div>
            <Title level="h3" style={{ color: '#ff6b6b' }}>Web控制台已禁用</Title>
            <Paragraph style={{ color: '#666', margin: '20px 0' }}>
              管理员已禁用Web控制台访问。请联系管理员启用Web控制台功能。
            </Paragraph>
            <Alert 
              theme="warning" 
              message="其他功能（如WebSocket连接、API接口等）仍然正常工作"
              style={{ margin: '20px 0' }}
            />
            <Space>
              <Button 
                icon={<RefreshIcon />}
                onClick={checkWebConsoleStatus}
              >
                重新检查
              </Button>
              <Button 
                variant="outline"
                icon={<SettingIcon />}
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>
            </Space>
          </div>
        </Card>
      </div>
    );
  }

  // 如果启用，显示子组件
  return <>{children}</>;
};

export default WebConsoleGuard;
