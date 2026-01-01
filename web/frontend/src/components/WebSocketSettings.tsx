import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Switch,
  InputNumber,
  Button,
  Space,
  Divider,
  Typography,
  Alert,
} from 'tdesign-react';
import { SettingIcon, WifiIcon } from 'tdesign-icons-react';
import { useToast } from '../hooks/useToast';
import { useData } from '../contexts/DataContext';
import { useConfig } from '../hooks/useConfig';
import { configValidator } from '../utils/configValidation';

const { Title } = Typography;
const FormItem = Form.FormItem;

export function WebSocketSettings() {
  const { refreshData } = useData();
  const { success: showSuccess, error: showError } = useToast();
  const {
    config,
    loading,
    error,
    updateWebSocketConfig,
  } = useConfig();
  
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 设置表单初始值
  useEffect(() => {
    if (config?.websocket) {
      form.setFieldsValue(config.websocket);
    }
  }, [config?.websocket, form]);

  const handleSave = async (values: any) => {
    try {
      setSaving(true);
      
      // 验证配置
      const validationErrors = configValidator.validateWebSocketConfig(values);
      if (Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0];
        showError(`配置验证失败: ${firstError}`);
        return;
      }
      
      await updateWebSocketConfig(values);
      showSuccess('WebSocket配置已保存');
      refreshData();
    } catch (error) {
      console.error('保存WebSocket配置失败:', error);
      showError('保存WebSocket配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config?.websocket) {
      form.setFieldsValue(config.websocket);
    }
  };


  if (loading) {
    return <Card loading style={{ height: '400px' }} />;
  }

  if (error) {
    return (
      <Card>
        <Alert theme="error" message={`加载WebSocket配置失败: ${error}`} />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <WifiIcon />
          <span>WebSocket 配置</span>
        </Space>
      }
      actions={
        <Button
          variant="outline"
          icon={<SettingIcon />}
          onClick={handleReset}
        >
          重置默认值
        </Button>
      }
    >
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #bae6fd' }}>
        <Title level="h6" style={{ margin: '0 0 8px 0' }}>WebSocket 心跳配置</Title>
        <div style={{ color: '#0369a1', fontSize: 14 }}>
          心跳机制用于检测连接状态，防止长时间无数据传输时连接被中断。如果网络环境稳定，可以禁用心跳以减少开销。
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onSubmit={(context) => {
          const values = context.fields;
          handleSave(values);
        }}
      >
        <FormItem
          label="启用心跳检测"
          name="enable_heartbeat"
          help="是否启用WebSocket心跳检测机制"
        >
          <Switch
            label={['启用', '禁用']}
          />
        </FormItem>

        <Divider />
        <Title level="h6" style={{ margin: '16px 0' }}>
          心跳参数配置
        </Title>

        <FormItem
          label="服务器心跳间隔"
          name="heartbeat_interval"
          help="服务器发送心跳包的间隔时间（毫秒）"
          rules={[
            { required: true, message: '请输入心跳间隔' },
            { validator: (val) => {
              const num = Number(val);
              return num >= 5000 && num <= 300000;
            }, message: '心跳间隔应在5秒到5分钟之间' }
          ]}
        >
          <InputNumber
            placeholder="30000"
            min={5000}
            max={300000}
            step={1000}
            suffix="ms"
            style={{ width: '100%' }}
          />
        </FormItem>

        <FormItem
          label="心跳超时时间"
          name="heartbeat_timeout"
          help="等待心跳响应的超时时间（毫秒）"
          rules={[
            { required: true, message: '请输入超时时间' },
            { validator: (val) => {
              const num = Number(val);
              return num >= 1000 && num <= 30000;
            }, message: '超时时间应在1秒到30秒之间' }
          ]}
        >
          <InputNumber
            placeholder="5000"
            min={1000}
            max={30000}
            step={500}
            suffix="ms"
            style={{ width: '100%' }}
          />
        </FormItem>

        <FormItem
          label="客户端心跳间隔"
          name="client_heartbeat_interval"
          help="客户端发送心跳包的间隔时间（毫秒），建议比服务器心跳间隔稍短"
          rules={[
            { required: true, message: '请输入客户端心跳间隔' },
            { validator: (val) => {
              const num = Number(val);
              return num >= 5000 && num <= 300000;
            }, message: '心跳间隔应在5秒到5分钟之间' }
          ]}
        >
          <InputNumber
            placeholder="25000"
            min={5000}
            max={300000}
            step={1000}
            suffix="ms"
            style={{ width: '100%' }}
          />
        </FormItem>


        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fef3c7', borderRadius: 4, border: '1px solid #fbbf24' }}>
          <Title level="h6" style={{ margin: '0 0 8px 0', color: '#92400e' }}>配置建议</Title>
          <div style={{ color: '#92400e', fontSize: 14 }}>
            • 客户端心跳间隔应比服务器心跳间隔短5-10秒<br />
            • 网络环境良好时可适当增加心跳间隔以减少开销<br />
            • 修改配置后需要重新连接WebSocket才能生效
          </div>
        </div>

        <Divider />

        <FormItem>
          <Space>
            <Button
              theme="primary"
              type="submit"
              loading={saving}
            >
              保存配置
            </Button>
            <Button
              onClick={handleReset}
              disabled={saving}
            >
              重新加载
            </Button>
          </Space>
        </FormItem>
      </Form>
    </Card>
  );
}