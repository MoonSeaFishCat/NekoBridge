import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  Dialog,
  Form,
  Input,
  Typography,
  Tag,
  Divider,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  Checkbox,
} from 'tdesign-react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../hooks/useToast';
import {
  AddIcon,
  RefreshIcon,
  ErrorCircleIcon,
  DeleteIcon,
  SearchIcon,
} from 'tdesign-icons-react';
import api from '../services/api';

const { Text } = Typography;
const FormItem = Form.FormItem;

interface BanInfo {
  id?: number;
  secret: string;
  reason?: string;
  bannedAt: string;
  bannedBy: string;
  unbannedAt?: string;
  unbannedBy?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BanStats {
  total: number;
  active: number;
  inactive: number;
  today: number;
  thisWeek: number;
}

function BanManager() {
  const { refreshData } = useData();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [bans, setBans] = useState<BanInfo[]>([]);
  const [stats, setStats] = useState<BanStats>({
    total: 0,
    active: 0,
    inactive: 0,
    today: 0,
    thisWeek: 0,
  });
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBan, setEditingBan] = useState<BanInfo | null>(null);
  const [selectedBans, setSelectedBans] = useState<number[]>([]);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [searchForm] = Form.useForm();
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [batchForm] = Form.useForm();

  useEffect(() => {
    loadBans();
  }, []);

  const loadBans = async () => {
    setLoading(true);
    try {
      const response = await api.getBlockedSecrets();
      const banList = response.data?.bans || [];
      setBans(banList);
      
      // 计算统计信息
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const stats: BanStats = {
        total: banList.length,
        active: banList.filter((ban: any) => ban.isActive === true).length,
        inactive: banList.filter((ban: any) => ban.isActive === false).length,
        today: banList.filter((ban: any) => new Date(ban.bannedAt) >= today).length,
        thisWeek: banList.filter((ban: any) => new Date(ban.bannedAt) >= weekAgo).length,
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to load bans:', error);
      showError('加载封禁列表失败: ' + ((error as any)?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (secret: string) => {
    try {
      await api.unblockSecret(secret);
      showSuccess(`已解除封禁: ${secret}`);
      loadBans();
      refreshData();
    } catch (error) {
      showError('解除封禁失败');
    }
  };

  const handleBlock = async (values: { secret: string; reason?: string }) => {
    try {
      await api.blockSecret(values.secret, values.reason);
      showSuccess(`已封禁密钥: ${values.secret}`);
      setAddModalVisible(false);
      addForm.reset();
      loadBans();
      refreshData();
    } catch (error) {
      showError('封禁失败');
    }
  };

  const handleEdit = async (values: { reason?: string }) => {
    if (!editingBan) return;
    
    try {
      await api.updateBanRecord(editingBan.id || 0, values.reason || '');
      showSuccess('封禁记录更新成功');
      setEditModalVisible(false);
      setEditingBan(null);
      editForm.reset();
      loadBans();
      refreshData();
    } catch (error) {
      showError('更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteBanRecord(id);
      showSuccess('封禁记录删除成功');
      loadBans();
      refreshData();
    } catch (error) {
      showError('删除失败');
    }
  };

  const handleBatchOperation = async (values: { operation: string }) => {
    if (selectedBans.length === 0) {
      showError('请选择要操作的记录');
      return;
    }

    try {
      const promises = selectedBans.map(id => {
        switch (values.operation) {
          case 'unblock':
            const ban = bans.find(b => b.id === id);
            return ban ? api.unblockSecret(ban.secret) : Promise.resolve();
          case 'delete':
            return handleDelete(id);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      showSuccess(`批量${values.operation}操作完成`);
      setBatchModalVisible(false);
      setSelectedBans([]);
      batchForm.reset();
      loadBans();
      refreshData();
    } catch (error) {
      showError('批量操作失败');
    }
  };

  const openEdit = (ban: BanInfo) => {
    setEditingBan(ban);
    editForm.setFieldsValue(ban);
    setEditModalVisible(true);
  };

  const columns = [
    {
      title: '批量选择',
      colKey: 'select',
      width: 60,
      ellipsis: true,
      cell: ({ row }: { row: BanInfo }) => (
        <Checkbox
          checked={selectedBans.includes(row.id || 0)}
          onChange={(checked) => {
            if (checked) {
              setSelectedBans([...selectedBans, row.id || 0]);
            } else {
              setSelectedBans(selectedBans.filter(id => id !== (row.id || 0)));
            }
          }}
        />
      ),
    },
    {
      title: '被封禁的密钥',
      colKey: 'secret',
      width: 200,
      ellipsis: true,
      cell: ({ row }: { row: BanInfo }) => (
        <Text code style={{ fontFamily: 'monospace' }}>
          {row?.secret || '未知密钥'}
        </Text>
      ),
    },
    {
      title: '封禁原因说明',
      colKey: 'reason',
      width: 150,
      ellipsis: true,
      cell: ({ row }: { row: BanInfo }) => (
        <Text>
          {row?.reason || '未提供原因'}
        </Text>
      ),
    },
    {
      title: '执行封禁时间',
      colKey: 'bannedAt',
      width: 180,
      ellipsis: true,
      cell: ({ row }: { row: BanInfo }) => (
        <Text>
          {row?.bannedAt ? new Date(row.bannedAt).toLocaleString() : '未知时间'}
        </Text>
      ),
    },
    {
      title: '执行封禁的管理员',
      colKey: 'bannedBy',
      width: 120,
      ellipsis: true,
      cell: ({ row }: { row: BanInfo }) => (
        <Tag color="blue">{row?.bannedBy || '未知'}</Tag>
      ),
    },
    {
      title: '当前封禁状态',
      colKey: 'status',
      width: 120,
      ellipsis: true,
      cell: ({ row }: { row: BanInfo }) => (
        <Tag
          theme={row.isActive === true ? 'danger' : 'success'}
          variant="light"
        >
          {row.isActive === true ? '已封禁' : '已解封'}
        </Tag>
      ),
    },
    {
      title: '管理操作',
      colKey: 'actions',
      width: 200,
      fixed: 'right' as const,
      cell: ({ row }: { row: BanInfo }) => (
        <Space>
          <Button
            size="small"
            variant="text"
            onClick={() => openEdit(row)}
          >
            编辑
          </Button>
          {row.isActive === true && (
            <Popconfirm
              content="确定要解除封禁吗？"
              onConfirm={() => handleUnblock(row?.secret || '')}
            >
              <Button size="small" theme="success" variant="outline">
                解除封禁
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            content="确定要删除这条记录吗？"
            onConfirm={() => handleDelete(row.id || 0)}
          >
            <Button size="small" theme="danger" variant="outline" icon={<DeleteIcon />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  console.log('BanManager render - loading:', loading, 'bans:', bans);

  return (
    <div style={{ padding: '20px' }}>
      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic title="总封禁数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃封禁" value={stats.active} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日封禁" value={stats.today} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本周封禁" value={stats.thisWeek} />
          </Card>
        </Col>
      </Row>

      {/* 搜索和过滤 */}
      <Card style={{ marginBottom: '16px' }}>
        <Form form={searchForm} layout="inline">
          <FormItem name="secret" label="密钥">
            <Input placeholder="搜索密钥" />
          </FormItem>
          <FormItem name="status" label="状态">
            <Select placeholder="选择状态" options={[
              { label: '全部', value: '' },
              { label: '已封禁', value: 'active' },
              { label: '已解封', value: 'inactive' },
            ]} />
          </FormItem>
          <FormItem name="dateRange" label="时间范围">
            <DatePicker placeholder="选择时间范围" />
          </FormItem>
          <FormItem>
            <Button icon={<SearchIcon />} type="submit">
              搜索
            </Button>
          </FormItem>
        </Form>
      </Card>
      
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ErrorCircleIcon />
              <span>封禁管理</span>
            </div>
            <Space>
              <Button
                icon={<RefreshIcon />}
                onClick={loadBans}
                loading={loading}
              >
                刷新
              </Button>
              {selectedBans.length > 0 && (
                <Button
                  theme="warning"
                  onClick={() => setBatchModalVisible(true)}
                >
                  批量操作 ({selectedBans.length})
                </Button>
              )}
              <Button
                theme="primary"
                icon={<AddIcon />}
                onClick={() => setAddModalVisible(true)}
              >
                封禁密钥
              </Button>
            </Space>
          </div>
        }
        bordered={false}
      >
        {bans.length > 0 ? (
          <Table
            data={bans}
            columns={columns}
            loading={loading}
            rowKey="id"
            bordered
            showHeader={true}
            pagination={{
              pageSize: 10,
              showJumper: true,
            }}
            empty="暂无封禁记录"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text>暂无封禁记录</Text>
            <br />
            <Button onClick={loadBans} loading={loading}>
              刷新数据
            </Button>
          </div>
        )}
      </Card>

      <Dialog
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        header="封禁密钥"
        width="500px"
      >
        <Form
          form={addForm}
          layout="vertical"
          onSubmit={(context) => {
            const values = context.fields;
            handleBlock({ secret: values.secret, reason: values.reason });
          }}
        >
          <FormItem
            label="密钥"
            name="secret"
            rules={[
              { required: true, message: '请输入要封禁的密钥' },
              { min: 8, message: '密钥长度至少8位' }
            ]}
          >
            <Input
              placeholder="请输入要封禁的密钥"
            />
          </FormItem>

          <FormItem
            label="封禁原因"
            name="reason"
          >
            <Input
              placeholder="请输入封禁原因（可选）"
              maxlength={200}
            />
          </FormItem>

          <Divider />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => setAddModalVisible(false)}
              >
                取消
              </Button>
              <Button
                theme="primary"
                type="submit"
              >
                确认封禁
              </Button>
            </Space>
          </div>
        </Form>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        header="编辑封禁记录"
        width="500px"
      >
        {editingBan && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 4, border: '1px solid #bae6fd' }}>
            <Typography.Text strong>当前操作密钥：</Typography.Text>
            <Typography.Text code style={{ marginLeft: 8, fontFamily: 'monospace' }}>
              {editingBan.secret}
            </Typography.Text>
          </div>
        )}
        <Form
          form={editForm}
          onSubmit={(context) => handleEdit(context.fields as unknown as { reason?: string })}
          layout="vertical"
        >
          <FormItem
            name="reason"
            label="封禁原因"
          >
            <Input
              placeholder="请输入封禁原因"
              maxlength={200}
            />
          </FormItem>
          <FormItem>
            <Space>
              <Button type="submit" theme="primary">
                保存
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                取消
              </Button>
            </Space>
          </FormItem>
        </Form>
      </Dialog>

      {/* 批量操作对话框 */}
      <Dialog
        visible={batchModalVisible}
        onClose={() => setBatchModalVisible(false)}
        header="批量操作"
        width="400px"
      >
        <Form
          form={batchForm}
          onSubmit={(context) => handleBatchOperation(context as unknown as { operation: string })}
          layout="vertical"
        >
          <FormItem
            name="operation"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select
              placeholder="请选择操作类型"
              options={[
                { label: '解除封禁', value: 'unblock' },
                { label: '删除记录', value: 'delete' },
              ]}
            />
          </FormItem>
          <FormItem>
            <Space>
              <Button type="submit" theme="primary">
                确认操作
              </Button>
              <Button onClick={() => setBatchModalVisible(false)}>
                取消
              </Button>
            </Space>
          </FormItem>
        </Form>
      </Dialog>
    </div>
  );
}

export default BanManager;