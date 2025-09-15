import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  Input,
  Tag,
  DatePicker,
} from 'tdesign-react';
import {
  DownloadIcon,
  RefreshIcon,
} from 'tdesign-icons-react';
import type { LogEntry } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
  onRefresh: () => void;
  loading: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onRefresh, loading }) => {
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(logs);

  // 过滤日志
  useEffect(() => {
    let filtered = logs;

    // 按级别过滤
    if (levelFilter) {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // 按文本搜索
    if (searchText) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchText.toLowerCase()) ||
        log.details?.toString().toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 按日期范围过滤
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, searchText, dateRange]);

  // 导出日志
  const handleExport = async () => {
    try {
      const data = filteredLogs.map(log => ({
        时间: new Date(log.timestamp).toLocaleString(),
        级别: log.level,
        消息: log.message,
        详情: log.details ? JSON.stringify(log.details) : '',
      }));

      const csv = [
        '时间,级别,消息,详情',
        ...data.map(row => 
          `"${row.时间}","${row.级别}","${row.消息}","${row.详情}"`
        )
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      console.log('导出成功');
    } catch (error) {
      console.error('导出失败');
    }
  };

  // 获取日志级别颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'primary';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '时间',
      key: 'timestamp',
      width: 180,
      cell: (props: any) => new Date(props.row.timestamp).toLocaleString(),
    },
    {
      title: '级别',
      key: 'level',
      width: 100,
      cell: (props: any) => (
        <Tag
          theme={getLevelColor(props.row.level)}
          variant="light"
        >
          {props.row.level.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '消息',
      key: 'message',
      ellipsis: true,
      cell: (props: any) => props.row.message,
    },
    {
      title: '详情',
      key: 'details',
      width: 200,
      cell: (props: any) => props.row.details ? (
        <div style={{ 
          maxWidth: '200px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {JSON.stringify(props.row.details)}
        </div>
      ) : '-',
    },
  ];

  return (
    <Card
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>日志查看器</span>
          <Space>
            <Button
              icon={<RefreshIcon />}
              onClick={onRefresh}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              icon={<DownloadIcon />}
              onClick={handleExport}
            >
              导出
            </Button>
          </Space>
        </div>
      }
    >
      {/* 过滤器 */}
      <div style={{ marginBottom: '16px' }}>
        <Space>
          <Select
            placeholder="选择日志级别"
            value={levelFilter}
            onChange={(value) => setLevelFilter(value as string)}
            style={{ width: '150px' }}
          >
            <Select.Option value="">全部级别</Select.Option>
            <Select.Option value="debug">Debug</Select.Option>
            <Select.Option value="info">Info</Select.Option>
            <Select.Option value="warning">Warning</Select.Option>
            <Select.Option value="error">Error</Select.Option>
          </Select>

          <Input
            placeholder="搜索日志内容"
            value={searchText}
            onChange={(value) => setSearchText(value)}
            style={{ width: '200px' }}
          />

          <DatePicker
            placeholder="选择日期范围"
            value={dateRange || undefined}
            onChange={(value) => setDateRange(value as [Date, Date] | null)}
            style={{ width: '200px' }}
          />

          {(levelFilter || searchText || dateRange) && (
            <Button
              variant="text"
              onClick={() => {
                setLevelFilter('');
                setSearchText('');
                setDateRange(null);
              }}
            >
              清除过滤
            </Button>
          )}
        </Space>
      </div>

      <Table
        data={filteredLogs}
        columns={columns}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
        }}
        empty="暂无日志记录"
      />
    </Card>
  );
};

export default LogViewer;