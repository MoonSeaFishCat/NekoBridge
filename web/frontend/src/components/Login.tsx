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
  const [showPassword, setShowPassword] = useState(false);
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
          ? '#0F1115'
          : '#F4F7F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 动态背景装饰 */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: isDark 
            ? 'radial-gradient(circle, rgba(22, 93, 255, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(22, 93, 255, 0.05) 0%, transparent 70%)',
          top: '-200px',
          right: '-100px',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: isDark 
            ? 'radial-gradient(circle, rgba(118, 75, 162, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(118, 75, 162, 0.05) 0%, transparent 70%)',
          bottom: '-150px',
          left: '-100px',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      
      <Card
        style={{
          width: '100%',
          maxWidth: '440px',
          background: isDark 
            ? 'rgba(24, 26, 31, 0.8)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          border: isDark 
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '24px',
          boxShadow: isDark
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '48px 40px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 顶部 Logo 与 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #165DFF 0%, #0052D9 100%)',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 10px 20px -5px rgba(22, 93, 255, 0.3)',
            }}
          >
            <KeyIcon size="32px" color="white" />
          </div>
          <Title 
            level="h3" 
            style={{ 
              margin: '0 0 8px 0', 
              color: isDark ? '#FFFFFF' : '#1D2129',
              fontWeight: '700',
              fontSize: '28px',
              letterSpacing: '-0.5px',
            }}
          >
            NekoBridge
          </Title>
          <Text 
            style={{ 
              color: isDark ? '#86909C' : '#4E5969',
              fontSize: '14px',
            }}
          >
            现代化的 Webhook 桥接管理系统
          </Text>
        </div>

        {/* 模式切换 */}
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <Button
            variant="text"
            shape="circle"
            icon={isDark ? <MoonIcon /> : <MoonIcon style={{ color: '#4E5969' }} />}
            onClick={toggleTheme}
            style={{ 
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
            }}
          />
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
          requiredMark={false}
        >
          <FormItem
            name="username"
            label={
              <Text style={{ color: isDark ? '#C9CDD4' : '#4E5969', fontSize: '13px', fontWeight: '500' }}>
                管理员账号
              </Text>
            }
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input
              prefixIcon={<UserIcon style={{ color: '#86909C' }} />}
              placeholder="请输入管理员账号"
              size="large"
              style={{ 
                height: '52px',
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E6EB',
                color: isDark ? '#FFFFFF' : '#1D2129',
                borderRadius: '12px',
                transition: 'all 0.2s',
              }}
            />
          </FormItem>

          <FormItem
            name="password"
            label={
              <Text style={{ color: isDark ? '#C9CDD4' : '#4E5969', fontSize: '13px', fontWeight: '500' }}>
                访问密码
              </Text>
            }
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input
              type={showPassword ? 'text' : 'password'}
              prefixIcon={<LockOnIcon style={{ color: '#86909C' }} />}
              suffixIcon={
                <div 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <RefreshIcon style={{ color: '#86909C', transform: showPassword ? 'rotate(180deg)' : 'none', transition: 'all 0.3s' }} />
                </div>
              }
              placeholder="请输入登录密码"
              size="large"
              style={{ 
                height: '52px',
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E6EB',
                color: isDark ? '#FFFFFF' : '#1D2129',
                borderRadius: '12px',
                transition: 'all 0.2s',
              }}
            />
          </FormItem>

          <FormItem style={{ marginTop: '40px' }}>
            <Button
              theme="primary"
              size="large"
              block
              loading={loading}
              type="submit"
              style={{ 
                height: '52px', 
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #165DFF 0%, #0052D9 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(22, 93, 255, 0.25)',
              }}
            >
              {loading ? '身份验证中...' : '立即登录'}
            </Button>
          </FormItem>
        </Form>

        {/* 底部版权信息 */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '40px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ height: '1px', flex: 1, background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F2F3F5' }}></div>
            <Text style={{ color: isDark ? '#4E5969' : '#86909C', fontSize: '12px' }}>
              SECURE ACCESS
            </Text>
            <div style={{ height: '1px', flex: 1, background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F2F3F5' }}></div>
          </div>
          <Text style={{ 
            color: isDark ? '#4E5969' : '#86909C',
            fontSize: '12px',
            display: 'block',
          }}>
            © 2026 NekoBridge Team. All rights reserved.
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;