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

interface TableCellProps {
  row: LogEntry;
  rowIndex: number;
  col: any;
  colIndex: number;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onRefresh, loading }: LogViewerProps) => {
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(logs);

  // 过滤日志
  useEffect(() => {
    let filtered = logs;

    // 按级别过滤
    if (levelFilter) {
      filtered = filtered.filter((log: LogEntry) => log.level === levelFilter);
    }

    // 按文本搜索
    if (searchText) {
      filtered = filtered.filter((log: LogEntry) => 
        log.message.toLowerCase().includes(searchText.toLowerCase()) ||
        log.details?.toString().toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 按日期范围过滤
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter((log: LogEntry) => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, searchText, dateRange]);

  // 导出日志
  const handleExport = async () => {
    try {
      const data = filteredLogs.map((log: LogEntry) => ({
        时间: new Date(log.timestamp).toLocaleString(),
        级别: log.level,
        消息: log.message,
        详情: log.details ? JSON.stringify(log.details) : '',
      }));

      const csv = [
        '时间,级别,消息,详情',
        ...data.map((row: any) => 
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
      cell: (props: TableCellProps) => new Date(props.row.timestamp).toLocaleString(),
    },
    {
      title: '级别',
      key: 'level',
      width: 100,
      cell: (props: TableCellProps) => (
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
      cell: (props: TableCellProps) => props.row.message,
    },
    {
      title: '详情',
      key: 'details',
      cell: (props: TableCellProps) => props.row.details ? (
        <pre style={{ 
          margin: 0,
          padding: '8px',
          backgroundColor: 'var(--td-bg-color-container)',
          borderRadius: '4px',
          fontSize: '12px',
          maxHeight: '200px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {JSON.stringify(props.row.details, null, 2)}
        </pre>
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
            onChange={(value: any) => setLevelFilter(value as string)}
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
            onChange={(value: string) => setSearchText(value)}
            style={{ width: '200px' }}
          />

          <DatePicker
            placeholder="选择日期范围"
            value={dateRange || undefined}
            onChange={(value: any) => setDateRange(value as [Date, Date] | null)}
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