import React from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Badge,
  Popconfirm,
} from 'tdesign-react';
import {
  RefreshIcon,
  PoweroffIcon,
  BookIcon,
  CheckCircleIcon,
} from 'tdesign-icons-react';
import { apiService } from '../services/api';
import type { Connection } from '../types';

interface ConnectionManagerProps {
  connections: Connection[];
  onRefresh: () => void;
  loading: boolean;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  connections,
  onRefresh,
  loading,
}) => {
  // 踢出连接
  const handleKick = async (secret: string) => {
    try {
      await apiService.kickConnection(secret);
      console.log('连接已断开');
      onRefresh();
    } catch (error: any) {
      console.error(error.response?.data?.message || '操作失败');
    }
  };

  // 封禁/解封密钥
  const handleToggleBlock = async (connection: Connection) => {
    try {
      if (connection.enabled) {
        await apiService.blockSecret(connection.secret);
        console.log('已封禁');
      } else {
        await apiService.unblockSecret(connection.secret);
        console.log('已解封');
      }
      onRefresh();
    } catch (error: any) {
      console.error('操作失败');
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
        <Badge
          dot
        >
          {props.row.connected ? '已连接' : '未连接'}
        </Badge>
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
      cell: (props: any) => new Date(props.row.connectedAt).toLocaleString(),
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
            onClick={onRefresh}
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
          pageSize: 10,
        }}
        empty="暂无连接"
      />
    </Card>
  );
};

export default ConnectionManager;