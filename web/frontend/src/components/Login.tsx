import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  MessagePlugin,
  Space,
} from 'tdesign-react';
import { 
  KeyIcon, 
  UserIcon, 
  LockOnIcon,
  MoonIcon,
  RefreshIcon
} from 'tdesign-icons-react';
import { apiService } from '../services/api';
import { useTheme } from '../hooks/useTheme';

const { Title, Text } = Typography;
const FormItem = Form.FormItem;

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { isDark, toggleTheme } = useTheme();

  // 处理登录
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // 确保数据格式正确
      const loginData = {
        username: values.username?.trim(),
        password: values.password,
      };
      
      console.log('发送登录请求:', loginData);
      
      const response = await apiService.login(loginData);
      
      if (response.success) {
        MessagePlugin.success('登录成功');
        onLogin(response.token || '');
      } else {
        MessagePlugin.error(response.message || '登录失败');
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      let errorMessage = '登录失败';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      MessagePlugin.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isDark 
          ? 'linear-gradient(135deg, #0F1419 0%, #1A1F3A 50%, #2D3748 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDark 
            ? 'radial-gradient(circle at 20% 50%, rgba(91, 143, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.1) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />
      
      <Card
        style={{
          width: '100%',
          maxWidth: '420px',
          background: isDark 
            ? '#1A1A1A'
            : '#FFFFFF',
          border: isDark 
            ? '1px solid #404040'
            : '1px solid #e0e0e0',
          borderRadius: '12px',
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 8px 32px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          position: 'relative',
        }}
      >
        {/* 顶部工具栏 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: isDark 
                  ? 'linear-gradient(135deg, #5B8FFF 0%, #4A7FFF 100%)'
                  : 'linear-gradient(135deg, #165DFF 0%, #0052D9 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyIcon size="20px" color="white" />
            </div>
            <div>
              <Title 
                level="h4" 
                style={{ 
                  margin: 0, 
                  color: isDark ? '#FFFFFF' : '#1A1A1A',
                  fontWeight: '600',
                }}
              >
                NekoBridge
              </Title>
              <Text 
                style={{ 
                  color: isDark ? '#A0A0A0' : '#666666',
                  fontSize: '12px',
                }}
              >
                企业级管理平台
              </Text>
            </div>
          </div>
          
          <Space>
            <Button
              variant="text"
              icon={<MoonIcon />}
              onClick={toggleTheme}
              size="small"
              style={{ color: isDark ? '#5B8FFF' : '#165DFF' }}
              title={isDark ? '切换到浅色模式' : '切换到深色模式'}
            />
            <Button
              variant="text"
              icon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              size="small"
              style={{ color: isDark ? '#A0A0A0' : '#666666' }}
              title="刷新页面"
            />
          </Space>
        </div>

        {/* 登录表单 */}
        <Form
          form={form}
          layout="vertical"
          onSubmit={(context) => {
            if (context.validateResult === true) {
              handleSubmit(context.fields);
            }
          }}
          colon={false}
        >
          <FormItem
            name="username"
            label={
              <Space size="small" style={{ color: isDark ? '#E0E0E0' : '#333333', fontWeight: '500' }}>
                <UserIcon size="16px" />
                <span>用户名</span>
              </Space>
            }
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="请输入用户名"
              size="large"
              style={{ 
                height: '48px',
                background: isDark ? '#2A2A2A' : '#FFFFFF',
                borderColor: isDark ? '#404040' : '#e0e0e0',
                color: isDark ? '#FFFFFF' : '#333333',
                borderRadius: '8px',
              }}
            />
          </FormItem>

          <FormItem
            name="password"
            label={
              <Space size="small" style={{ color: isDark ? '#E0E0E0' : '#333333', fontWeight: '500' }}>
                <LockOnIcon size="16px" />
                <span>密码</span>
              </Space>
            }
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input
              type="password"
              placeholder="请输入密码"
              size="large"
              style={{ 
                height: '48px',
                background: isDark ? '#2A2A2A' : '#FFFFFF',
                borderColor: isDark ? '#404040' : '#e0e0e0',
                color: isDark ? '#FFFFFF' : '#333333',
                borderRadius: '8px',
              }}
            />
          </FormItem>

          <FormItem style={{ marginTop: '32px' }}>
            <Button
              theme="primary"
              size="large"
              block
              loading={loading}
              type="submit"
              style={{ 
                height: '48px', 
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
              }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </FormItem>
        </Form>

        {/* 底部信息 */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: `1px solid ${isDark ? '#404040' : '#E5E5E5'}`,
        }}>
          <Text style={{ 
            color: isDark ? '#888888' : '#999999',
            fontSize: '12px',
            lineHeight: '1.5',
          }}>
            🔒 安全登录 • 数据加密 • 企业级保护
            <br />
            <span style={{ fontSize: '11px', color: isDark ? '#666666' : '#CCCCCC' }}>
              © 2024 NekoBridge. 保留所有权利。
            </span>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;