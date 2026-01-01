import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Space,
  Button,
  Switch,
  Select,
  Alert,
  ColorPicker,
} from 'tdesign-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../hooks/useToast';
import { useConfig } from '../hooks/useConfig';
import { configValidator } from '../utils/configValidation';

const ThemeSettings: React.FC = () => {
  const { refreshData } = useData();
  const { success: showSuccess, error: showError } = useToast();
  const {
    config,
    loading,
    error,
    updateUIConfig,
  } = useConfig();
  
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // 设置表单初始值
  useEffect(() => {
    if (config?.ui) {
      form.setFieldsValue(config.ui);
    }
  }, [config?.ui, form]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue(true);
      
      // 验证配置
      const validationErrors = configValidator.validateUIConfig(values);
      if (Object.keys(validationErrors).length > 0) {
        const firstError = Object.values(validationErrors)[0];
        showError(`配置验证失败: ${firstError}`);
        return;
      }
      
      await updateUIConfig(values);
      showSuccess('主题设置已保存');
      refreshData();
    } catch (error) {
      console.error('保存主题设置失败:', error);
      showError('保存主题设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config?.ui) {
      form.setFieldsValue(config.ui);
    }
  };

  if (loading) {
    return <Card loading style={{ height: '400px' }} />;
  }

  if (error) {
    return (
      <Card>
        <Alert theme="error" message={`加载主题配置失败: ${error}`} />
      </Card>
    );
  }

  return (
    <div>
      <Card
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>主题设置</span>
            <Space>
              <Button onClick={handleReset} loading={saving}>
                重置
              </Button>
              <Button theme="primary" onClick={handleSave} loading={saving}>
                保存
              </Button>
            </Space>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
        >
          {/* Web控制台设置 */}
          <Form.FormItem
            name="enableWebConsole"
            label="启用Web控制台"
            help="禁用后将无法访问Web管理界面，但其他功能（WebSocket、API等）仍正常工作"
          >
            <Switch />
          </Form.FormItem>

          {/* 主题模式 */}
          <Form.FormItem
            name="theme"
            label="主题模式"
          >
            <Select>
              <Select.Option value="light">浅色模式</Select.Option>
              <Select.Option value="dark">深色模式</Select.Option>
              <Select.Option value="auto">跟随系统</Select.Option>
            </Select>
          </Form.FormItem>

          {/* 主色调 */}
          <Form.FormItem
            name="primaryColor"
            label="主色调"
          >
            <ColorPicker />
          </Form.FormItem>

          {/* 紧凑模式 */}
          <Form.FormItem
            name="compact"
            label="紧凑模式"
          >
            <Switch />
          </Form.FormItem>

          {/* 语言设置 */}
          <Form.FormItem
            name="language"
            label="语言"
          >
            <Select>
              <Select.Option value="zh-CN">简体中文</Select.Option>
              <Select.Option value="en-US">English</Select.Option>
            </Select>
          </Form.FormItem>

          {/* 其他设置 */}
          <Form.FormItem
            name="showBreadcrumb"
            label="显示面包屑"
          >
            <Switch />
          </Form.FormItem>

          <Form.FormItem
            name="showFooter"
            label="显示页脚"
          >
            <Switch />
          </Form.FormItem>

          <Form.FormItem
            name="enableAnimation"
            label="启用动画"
          >
            <Switch />
          </Form.FormItem>
        </Form>
      </Card>
    </div>
  );
};

export default ThemeSettings;