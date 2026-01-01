import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
} from 'tdesign-react';
import {
  RefreshIcon,
  PoweroffIcon,
  BookIcon,
  CheckCircleIcon,
} from 'tdesign-icons-react';
import { apiService } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useData } from '../contexts/DataContext';
import type { Connection } from '../types';

const ConnectionManager: React.FC = () => {
  const { refreshCounter } = useData();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [current, setCurrent] = useState(1);
  const { success, error } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (current - 1) * pageSize;
      const response = await apiService.getConnections(pageSize, offset);
      if (response.success && response.data) {
        setConnections(response.data.connections || []);
        setTotal(response.data.total || 0);
      }
    } catch (err: any) {
      console.error('加载连接失败:', err.message);
      const errorMsg = err.response?.data?.error || err.message || '网络错误';
      error('加载失败', errorMsg);
    } finally {
      setLoading(false);
    }
  }, [current, pageSize]);  // 移除 error 依赖，避免不必要的重新渲染

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshCounter]);

  const refreshData = () => {
    fetchData();
  };

  // 踢出连接
  const handleKick = async (secret: string) => {
    try {
      const response = await apiService.kickConnection(secret);
      if (response.success) {
        success('连接已断开', response.message || '操作成功');
        refreshData();
      } else {
        error('踢出失败', response.error || '未知错误');
      }
    } catch (err: any) {
      error('踢出失败', err.message || '网络错误');
    }
  };

  // 封禁/解封密钥
  const handleToggleBlock = async (connection: Connection) => {
    try {
      if (connection.enabled) {
        const response = await apiService.blockSecret(connection.secret, '管理员手动封禁');
        if (response.success) {
          success('已封禁', response.message || '密钥已禁用');
          refreshData();
        } else {
          error('封禁失败', response.error || '未知错误');
        }
      } else {
        const response = await apiService.unblockSecret(connection.secret);
        if (response.success) {
          success('已解封', response.message || '密钥已启用');
          refreshData();
        } else {
          error('解封失败', response.error || '未知错误');
        }
      }
    } catch (err: any) {
      error('操作失败', err.message || '网络错误');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '密钥',
      key: 'secret',
      width: 200,
      ellipsis: true,
      cell: (props: any) => (
        <code style={{ fontSize: '12px' }}>{props.row.secret}</code>
      ),
    },
    {
      title: '描述',
      key: 'description',
      ellipsis: true,
      cell: (props: any) => props.row.description || '-',
    },
    {
      title: '连接状态',
      key: 'connected',
      width: 120,
      cell: (props: any) => (
        <Space size="small">
          {props.row.connected ? (
            <Tag theme="success" variant="light" icon={<CheckCircleIcon />}>已连接</Tag>
          ) : (
            <Tag theme="default" variant="light">未连接</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '启用状态',
      key: 'enabled',
      width: 120,
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
      title: '连接时间',
      key: 'connectedAt',
      width: 180,
      cell: (props: any) => props.row.connectedAt ? new Date(props.row.connectedAt).toLocaleString() : '-',
    },
    {
      title: '最后使用',
      key: 'lastUsed',
      width: 180,
      cell: (props: any) => props.row.lastUsed ? new Date(props.row.lastUsed).toLocaleString() : '从未使用',
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      cell: (props: any) => (
        <Space>
          {props.row.connected && (
            <Popconfirm
              content="确定要踢出这个连接吗？"
              onConfirm={() => handleKick(props.row.secret)}
            >
              <Button
                variant="text"
                icon={<PoweroffIcon />}
                size="small"
                theme="warning"
              >
                踢出
              </Button>
            </Popconfirm>
          )}
          <Button
            variant="text"
            icon={props.row.enabled ? <BookIcon /> : <CheckCircleIcon />}
            size="small"
            theme={props.row.enabled ? 'danger' : 'success'}
            onClick={() => handleToggleBlock(props.row)}
          >
            {props.row.enabled ? '封禁' : '解封'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>连接管理</span>
          <Button
            icon={<RefreshIcon />}
            onClick={refreshData}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      }
    >
      <Table
        data={connections}
        columns={columns}
        loading={loading}
        rowKey="secret"
        pagination={{
          current,
          pageSize,
          total,
          showPageSize: true,
          onChange: (pageInfo) => {
            setCurrent(pageInfo.current);
            setPageSize(pageInfo.pageSize);
          },
        }}
        empty="暂无连接"
      />
    </Card>
  );
};

export default ConnectionManager;