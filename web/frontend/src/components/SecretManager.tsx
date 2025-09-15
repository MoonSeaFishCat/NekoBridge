import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Form,
  Input,
  Switch,
  InputNumber,
  Upload,
  Row,
  Col,
  Statistic,
  Dialog,
  Checkbox,
  MessagePlugin,
  Select,
  Typography,
} from 'tdesign-react';
import {
  AddIcon,
  EditIcon,
  DeleteIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  RefreshIcon,
  BookIcon,
} from 'tdesign-icons-react';
import { apiService } from '../services/api';
import type { Secret, SecretStats } from '../types';

interface SecretManagerProps {
  onRefresh: () => void;
}

const SecretManager: React.FC<SecretManagerProps> = ({ onRefresh }) => {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [stats, setStats] = useState<SecretStats>({
    total: 0,
    enabled: 0,
    disabled: 0,
    recently_used: 0,
    never_used: 0,
  });
  const [loading, setLoading] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [selectedSecrets, setSelectedSecrets] = useState<string[]>([]);
  const [batchVisible, setBatchVisible] = useState(false);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [batchForm] = Form.useForm();

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const [secretsData, statsData] = await Promise.all([
        apiService.getSecrets(),
        apiService.getSecretStats(),
      ]);
      setSecrets(secretsData.secrets || []);
      setStats(statsData.stats || stats);
    } catch (error) {
      console.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 添加密钥
  const handleAdd = async (values: Secret) => {
    try {
      // 确保必需字段有默认值
      const secretData = {
        ...values,
        enabled: values.enabled !== undefined ? values.enabled : true,
        max_connections: values.max_connections || 5,
        name: values.name || '',
        description: values.description || ''
      };
      
      await apiService.addSecret(secretData);
      MessagePlugin.success('密钥添加成功');
      setAddVisible(false);
      addForm.reset();
      loadData();
      onRefresh();
    } catch (error: any) {
      console.error('添加密钥错误:', error);
      MessagePlugin.error(error.response?.data?.error || '添加失败');
    }
  };

  // 编辑密钥
  const handleEdit = async (values: Partial<Secret>) => {
    if (!editingSecret) return;
    
    try {
      await apiService.updateSecret(editingSecret.secret, values);
      MessagePlugin.success('密钥更新成功');
      setEditVisible(false);
      setEditingSecret(null);
      editForm.reset();
      loadData();
      onRefresh();
    } catch (error: any) {
      MessagePlugin.error(error.response?.data?.error || '更新失败');
    }
  };

  // 删除密钥
  const handleDelete = async (secret: string) => {
    try {
      await apiService.deleteSecret(secret);
      MessagePlugin.success('密钥删除成功');
      loadData();
      onRefresh();
    } catch (error: any) {
      MessagePlugin.error('删除失败');
    }
  };

  // 封禁/解封密钥
  const handleToggleBlock = async (secret: string) => {
    try {
      const secretData = secrets.find(s => s.secret === secret);
      if (secretData?.enabled) {
        await apiService.blockSecret(secret);
        MessagePlugin.success('密钥已封禁');
      } else {
        await apiService.unblockSecret(secret);
        MessagePlugin.success('密钥已解封');
      }
      loadData();
      onRefresh();
    } catch (error: any) {
      MessagePlugin.error('操作失败');
    }
  };

  // 复制密钥
  const handleCopy = (secret: string) => {
    navigator.clipboard.writeText(secret);
    MessagePlugin.success('已复制到剪贴板');
  };

  // 导出密钥
  const handleExport = async () => {
    try {
      const data = secrets.map(secret => ({
        secret: secret.secret,
        enabled: secret.enabled,
        description: secret.description || '',
        max_connections: secret.max_connections || 1,
        created_at: secret.created_at,
      }));

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `secrets-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      MessagePlugin.success('导出成功');
    } catch (error) {
      MessagePlugin.error('导出失败');
    }
  };

  // 导入密钥
  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await apiService.importSecrets(data);
      MessagePlugin.success(`导入成功: ${result.result.imported} 个，跳过: ${result.result.skipped} 个`);
      loadData();
      onRefresh();
    } catch (error) {
      MessagePlugin.error('导入失败');
    }
  };

  // 批量操作
  const handleBatchOperation = async (values: { operation: string; enabled?: boolean }) => {
    if (selectedSecrets.length === 0) {
      MessagePlugin.warning('请选择要操作的密钥');
      return;
    }

    try {
      const promises = selectedSecrets.map(secret => {
        switch (values.operation) {
          case 'enable':
            return apiService.updateSecret(secret, { enabled: true });
          case 'disable':
            return apiService.updateSecret(secret, { enabled: false });
          case 'delete':
            return apiService.deleteSecret(secret);
          case 'block':
            return apiService.blockSecret(secret);
          case 'unblock':
            return apiService.unblockSecret(secret);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      const operationMap: Record<string, string> = {
        enable: '启用',
        disable: '禁用',
        block: '封禁',
        unblock: '解封',
        delete: '删除'
      };
      MessagePlugin.success(`批量${operationMap[values.operation] || values.operation}操作完成`);
      setBatchVisible(false);
      setSelectedSecrets([]);
      batchForm.reset();
      loadData();
      onRefresh();
    } catch (error) {
      MessagePlugin.error('批量操作失败');
    }
  };

  // 打开编辑对话框
  const openEdit = (secret: Secret) => {
    setEditingSecret(secret);
    editForm.setFieldsValue(secret);
    setEditVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '批量选择',
      colKey: 'select',
      width: 60,
      ellipsis: true,
      cell: (props: any) => (
        <Checkbox
          checked={selectedSecrets.includes(props.row.secret)}
          onChange={(checked) => {
            if (checked) {
              setSelectedSecrets([...selectedSecrets, props.row.secret]);
            } else {
              setSelectedSecrets(selectedSecrets.filter(s => s !== props.row.secret));
            }
          }}
        />
      ),
    },
    {
      title: 'Webhook密钥',
      colKey: 'secret',
      width: 200,
      ellipsis: true,
      cell: (props: any) => (
        <code style={{ fontSize: '12px' }}>{props.row.secret}</code>
      ),
    },
    {
      title: '密钥别名',
      colKey: 'name',
      width: 150,
      ellipsis: true,
      cell: (props: any) => props.row.name || '-',
    },
    {
      title: '密钥用途描述',
      colKey: 'description',
      ellipsis: true,
      cell: (props: any) => props.row.description || '-',
    },
    {
      title: '启用状态',
      colKey: 'enabled',
      width: 100,
      ellipsis: true,
      cell: (props: any) => (
        <Tag
          theme={props.row.enabled ? 'success' : 'danger'}
          variant="light"
        >
          {props.row.enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '允许的最大连接数',
      colKey: 'max_connections',
      width: 140,
      ellipsis: true,
      cell: (props: any) => props.row.max_connections || 1,
    },
    {
      title: '密钥创建时间',
      colKey: 'created_at',
      width: 180,
      ellipsis: true,
      cell: (props: any) => new Date(props.row.created_at).toLocaleString(),
    },
    {
      title: '管理操作',
      colKey: 'actions',
      width: 200,
      fixed: 'right' as const,
      cell: (props: any) => (
        <Space>
          <Button
            variant="text"
            icon={<CopyIcon />}
            size="small"
            onClick={() => handleCopy(props.row.secret)}
          >
            复制
          </Button>
          <Button
            variant="text"
            icon={<EditIcon />}
            size="small"
            onClick={() => openEdit(props.row)}
          >
            编辑
          </Button>
          <Button
            variant="text"
            icon={props.row.enabled ? <BookIcon /> : <EditIcon />}
            size="small"
            theme={props.row.enabled ? 'danger' : 'success'}
            onClick={() => handleToggleBlock(props.row.secret)}
          >
            {props.row.enabled ? '封禁' : '解封'}
          </Button>
          <Popconfirm
            content="确定要删除这个密钥吗？"
            onConfirm={() => handleDelete(props.row.secret)}
          >
            <Button
              variant="text"
              icon={<DeleteIcon />}
              size="small"
              theme="danger"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic title="总密钥数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已启用" value={stats.enabled} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已禁用" value={stats.disabled} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="最近使用" value={stats.recently_used} />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space>
          <Button
            theme="primary"
            icon={<AddIcon />}
            onClick={() => {
              setAddVisible(true);
              // 设置默认值
              addForm.setFieldsValue({
                enabled: true,
                max_connections: 5
              });
            }}
          >
            添加密钥
          </Button>
          {selectedSecrets.length > 0 && (
            <Button
              theme="warning"
              onClick={() => setBatchVisible(true)}
            >
              批量操作 ({selectedSecrets.length})
            </Button>
          )}
          <Upload
            accept=".json"
            onChange={(file) => handleImport(file[0] as File)}
            showUploadProgress={false}
          >
            <Button icon={<UploadIcon />}>
              导入
            </Button>
          </Upload>
          <Button
            icon={<DownloadIcon />}
            onClick={handleExport}
          >
            导出
          </Button>
          <Button
            icon={<RefreshIcon />}
            onClick={loadData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {/* 密钥列表 */}
      <Card>
        <Table
          data={secrets}
          columns={columns}
          loading={loading}
          rowKey="secret"
          bordered
          showHeader={true}
          pagination={{
            pageSize: 10,
          }}
          empty="暂无密钥"
        />
      </Card>

      {/* 添加对话框 */}
      <Dialog
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        header="添加密钥"
        width="500px"
      >
        <Form
          form={addForm}
          onSubmit={(context) => handleAdd(context.fields as unknown as Secret)}
          layout="vertical"
        >
          <Form.FormItem
            name="secret"
            label="密钥"
            rules={[{ required: true, message: '请输入密钥' }]}
          >
            <Input placeholder="请输入密钥" />
          </Form.FormItem>
          <Form.FormItem
            name="name"
            label="名称"
          >
            <Input placeholder="请输入密钥名称" />
          </Form.FormItem>
          <Form.FormItem
            name="description"
            label="描述"
          >
            <Input placeholder="请输入描述" />
          </Form.FormItem>
          <Form.FormItem
            name="enabled"
            label="启用"
          >
            <Switch />
          </Form.FormItem>
          <Form.FormItem
            name="max_connections"
            label="最大连接数"
          >
            <InputNumber placeholder="请输入最大连接数" min={1} max={100} />
          </Form.FormItem>
          <Form.FormItem>
            <Space>
              <Button type="submit" theme="primary">
                添加
              </Button>
              <Button onClick={() => setAddVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.FormItem>
        </Form>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        header="编辑密钥"
        width="500px"
      >
        {editingSecret && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #bae6fd' }}>
            <Typography.Text strong>当前编辑密钥：</Typography.Text>
            <Typography.Text code style={{ marginLeft: 8, fontFamily: 'monospace' }}>
              {editingSecret.secret}
            </Typography.Text>
          </div>
        )}
        <Form
          form={editForm}
          onSubmit={(context) => handleEdit(context.fields as unknown as Partial<Secret>)}
          layout="vertical"
        >
          <Form.FormItem
            name="name"
            label="名称"
          >
            <Input placeholder="请输入密钥名称" />
          </Form.FormItem>
          <Form.FormItem
            name="description"
            label="描述"
          >
            <Input placeholder="请输入描述" />
          </Form.FormItem>
          <Form.FormItem
            name="enabled"
            label="启用"
          >
            <Switch />
          </Form.FormItem>
          <Form.FormItem
            name="max_connections"
            label="最大连接数"
          >
            <InputNumber placeholder="请输入最大连接数" min={1} max={100} />
          </Form.FormItem>
          <Form.FormItem>
            <Space>
              <Button type="submit" theme="primary">
                保存
              </Button>
              <Button onClick={() => setEditVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.FormItem>
        </Form>
      </Dialog>

      {/* 批量操作对话框 */}
      <Dialog
        visible={batchVisible}
        onClose={() => setBatchVisible(false)}
        header="批量操作"
        width="400px"
      >
        <Form
          form={batchForm}
          onSubmit={(context) => handleBatchOperation(context.fields as unknown as { operation: string; enabled?: boolean })}
          layout="vertical"
        >
          <Form.FormItem
            name="operation"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select
              placeholder="请选择操作类型"
              options={[
                { label: '启用', value: 'enable' },
                { label: '禁用', value: 'disable' },
                { label: '封禁', value: 'block' },
                { label: '解封', value: 'unblock' },
                { label: '删除', value: 'delete' },
              ]}
            />
          </Form.FormItem>
          <Form.FormItem>
            <Space>
              <Button type="submit" theme="primary">
                确认操作
              </Button>
              <Button onClick={() => setBatchVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.FormItem>
        </Form>
      </Dialog>
    </div>
  );
};

export default SecretManager;