import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Space,
  Alert,
  Select,
  InputNumber,
  MessagePlugin,
} from 'tdesign-react';
import { SaveIcon, RefreshIcon } from 'tdesign-icons-react';
import { useConfig } from '../hooks/useConfig';
import { configValidator } from '../utils/configValidation';

interface ConfigManagerProps {
  onRefresh: () => void;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({ onRefresh }) => {
  const {
    config,
    loading,
    error,
    loadConfig,
    updateServerConfig,
    updateSecurityConfig,
    updateAuthConfig,
    updateLoggingConfig,
  } = useConfig();
  
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 设置表单初始值
  React.useEffect(() => {
    if (config) {
      form.setFieldsValue(config);
    }
  }, [config, form]);

  // 手动刷新配置（恢复默认设置）
  const handleRefresh = async () => {
    try {
      MessagePlugin.info('正在恢复默认设置...');
      await loadConfig();
      MessagePlugin.success('已恢复默认设置');
    } catch (error) {
      console.error('恢复默认设置失败:', error);
      MessagePlugin.error('恢复默认设置失败');
    }
  };

  // 保存配置
  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      
      console.log('保存配置数据:', values);
      
      // 验证配置
      const validationErrors = await configValidator.validateAllConfig(values);
      if (Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0];
        MessagePlugin.error(`配置验证失败: ${firstError}`);
        return;
      }
      
      // 分别更新各个配置分类
      const updatePromises = [];
      
      if (values.server) {
        updatePromises.push(updateServerConfig(values.server));
      }
      
      if (values.security) {
        updatePromises.push(updateSecurityConfig(values.security));
      }
      
      if (values.auth) {
        updatePromises.push(updateAuthConfig(values.auth));
      }
      
      if (values.logging) {
        updatePromises.push(updateLoggingConfig(values.logging));
      }
      
      // 并行执行所有更新
      await Promise.all(updatePromises);
      
      MessagePlugin.success('系统配置保存成功');
      onRefresh();
    } catch (error: any) {
      console.error('保存配置错误:', error);
      const errorMessage = error.message || '保存系统配置失败';
      MessagePlugin.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card loading style={{ height: '400px' }} />;
  }

  if (error) {
    return (
      <Card>
        <Alert theme="error" message={`加载配置失败: ${error}`} />
        <Button onClick={loadConfig} style={{ marginTop: 16 }}>
          重试
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <Alert
        theme="info"
        message="修改配置后需要重启服务才能生效"
        style={{ marginBottom: '16px' }}
      />

      <Card
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>系统配置</span>
            <Space>
              <Button
                icon={<RefreshIcon />}
                onClick={handleRefresh}
                loading={loading}
              >
                恢复默认
              </Button>
              <Button
                theme="primary"
                icon={<SaveIcon />}
                onClick={() => form.submit()}
                loading={saving}
              >
                保存
              </Button>
            </Space>
          </div>
        }
      >
        <Form
          form={form}
          onSubmit={(context) => {
            if (context.validateResult === true) {
              handleSave(context.fields);
            }
          }}
          labelWidth={120}
          layout="vertical"
        >
          {/* 服务器配置 */}
          <Card title="服务器配置" size="small" style={{ marginBottom: '16px' }}>
            <Form.FormItem
              name={['server', 'port']}
              label="端口"
              rules={[{ required: true, message: '请输入端口' }]}
            >
              <Input placeholder="请输入端口" />
            </Form.FormItem>
            <Form.FormItem
              name={['server', 'host']}
              label="绑定地址"
              rules={[{ required: true, message: '请输入绑定地址' }]}
            >
              <Input placeholder="请输入绑定地址" />
            </Form.FormItem>
            <Form.FormItem
              name={['server', 'mode']}
              label="运行模式"
            >
              <Select>
                <Select.Option value="debug">Debug</Select.Option>
                <Select.Option value="release">Release</Select.Option>
              </Select>
            </Form.FormItem>
          </Card>

          {/* 安全配置 */}
          <Card title="安全配置" size="small" style={{ marginBottom: '16px' }}>
            <Form.FormItem
              name={['security', 'enable_signature_validation']}
              label="启用签名验证"
            >
              <Switch />
            </Form.FormItem>
            <Form.FormItem
              name={['security', 'default_allow_new_connections']}
              label="默认允许新连接"
            >
              <Switch />
            </Form.FormItem>
            <Form.FormItem
              name={['security', 'max_connections_per_secret']}
              label="每个密钥最大连接数"
            >
              <InputNumber min={1} max={100} />
            </Form.FormItem>
            <Form.FormItem
              name={['security', 'require_manual_key_management']}
              label="需要手动管理密钥"
            >
              <Switch />
            </Form.FormItem>
          </Card>

          {/* 认证配置 */}
          <Card title="认证配置" size="small" style={{ marginBottom: '16px' }}>
            <Form.FormItem
              name={['auth', 'username']}
              label="管理员用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" />
            </Form.FormItem>
            <Form.FormItem
              name={['auth', 'password']}
              label="管理员密码"
              help="留空表示不修改当前密码"
            >
              <Input type="password" placeholder="留空表示不修改密码" />
            </Form.FormItem>
            <Form.FormItem
              name={['auth', 'session_timeout']}
              label="会话超时时间(秒)"
            >
              <InputNumber min={300} max={86400} />
            </Form.FormItem>
          </Card>

          {/* 日志配置 */}
          <Card title="日志配置" size="small" style={{ marginBottom: '16px' }}>
            <Form.FormItem
              name={['logging', 'level']}
              label="日志级别"
            >
              <Select>
                <Select.Option value="debug">Debug</Select.Option>
                <Select.Option value="info">Info</Select.Option>
                <Select.Option value="warning">Warning</Select.Option>
                <Select.Option value="error">Error</Select.Option>
              </Select>
            </Form.FormItem>
            <Form.FormItem
              name={['logging', 'max_log_entries']}
              label="最大日志条数"
            >
              <InputNumber min={100} max={10000} />
            </Form.FormItem>
            <Form.FormItem
              name={['logging', 'enable_log_to_file']}
              label="启用文件日志"
            >
              <Switch />
            </Form.FormItem>
            <Form.FormItem
              name={['logging', 'log_file_path']}
              label="日志文件路径"
            >
              <Input placeholder="请输入日志文件路径" />
            </Form.FormItem>
          </Card>

        </Form>
      </Card>
    </div>
  );
};

export default ConfigManager;