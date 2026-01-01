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
import { useData } from '../contexts/DataContext';
import type { LogEntry } from '../types';

interface TableCellProps {
  row: LogEntry;
  rowIndex: number;
  col: any;
  colIndex: number;
}

const LogViewer: React.FC = () => {
  const { logs, loading, refreshData } = useData();
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
      case 'info': return 'success';
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
      cell: (props: TableCellProps) => (
        <span style={{ color: 'var(--nb-text-secondary)', fontSize: '13px' }}>
          {new Date(props.row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      title: '级别',
      key: 'level',
      width: 100,
      cell: (props: TableCellProps) => (
        <Tag
          theme={getLevelColor(props.row.level)}
          variant="light"
          shape="round"
          size="small"
        >
          {props.row.level.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '消息',
      key: 'message',
      ellipsis: true,
      cell: (props: TableCellProps) => (
        <span style={{ fontWeight: 500, color: 'var(--nb-text-main)' }}>
          {props.row.message}
        </span>
      ),
    },
    {
      title: '详情',
      key: 'details',
      cell: (props: TableCellProps) => props.row.details ? (
        <pre style={{ 
          margin: 0,
          padding: '12px',
          backgroundColor: 'var(--nb-bg-layout)',
          border: '1px solid var(--nb-border-color)',
          borderRadius: '8px',
          fontSize: '11px',
          maxHeight: '150px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: 'var(--nb-text-secondary)',
          fontFamily: 'monospace'
        }}>
          {JSON.stringify(props.row.details, null, 2)}
        </pre>
      ) : <span style={{ color: 'var(--nb-text-secondary)' }}>-</span>,
    },
  ];

  return (
    <Card
      className="glass-effect animate-fade-in"
      style={{ boxShadow: 'var(--nb-shadow)', border: 'none' }}
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              padding: '6px', 
              background: 'var(--nb-primary-light)', 
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <DownloadIcon style={{ color: 'var(--nb-primary)' }} />
            </div>
            <span style={{ fontWeight: 600 }}>实时日志查询</span>
          </div>
          <Space>
            <Button
              variant="outline"
              icon={<RefreshIcon />}
              onClick={refreshData}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              variant="base"
              icon={<DownloadIcon />}
              onClick={handleExport}
            >
              导出 CSV
            </Button>
          </Space>
        </div>
      }
    >
      {/* 过滤器 */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '16px', 
        background: 'var(--nb-bg-layout)', 
        borderRadius: '10px',
        border: '1px solid var(--nb-border-color)'
      }}>
        <Space breakLine>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--nb-text-secondary)', whiteSpace: 'nowrap' }}>日志级别:</span>
            <Select
              placeholder="全部级别"
              value={levelFilter}
              onChange={(value: any) => setLevelFilter(value as string)}
              style={{ width: '140px' }}
              clearable
            >
              <Select.Option value="debug">Debug</Select.Option>
              <Select.Option value="info">Info</Select.Option>
              <Select.Option value="warning">Warning</Select.Option>
              <Select.Option value="error">Error</Select.Option>
            </Select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--nb-text-secondary)', whiteSpace: 'nowrap' }}>搜索内容:</span>
            <Input
              placeholder="关键字搜索..."
              value={searchText}
              onChange={(value: string) => setSearchText(value)}
              style={{ width: '220px' }}
              clearable
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--nb-text-secondary)', whiteSpace: 'nowrap' }}>时间范围:</span>
            <DatePicker
              placeholder="选择日期范围"
              value={dateRange || undefined}
              onChange={(value: any) => setDateRange(value as [Date, Date] | null)}
              style={{ width: '240px' }}
              clearable
            />
          </div>

          {(levelFilter || searchText || dateRange) && (
            <Button
              variant="text"
              theme="primary"
              onClick={() => {
                setLevelFilter('');
                setSearchText('');
                setDateRange(null);
              }}
            >
              重置过滤器
            </Button>
          )}
        </Space>
      </div>

      <Table
        data={filteredLogs}
        columns={columns}
        loading={loading}
        rowKey="id"
        verticalAlign="top"
        pagination={{
          pageSize: 20,
          showPageSize: false,
        }}
        empty={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--nb-text-secondary)' }}>暂无匹配的日志记录</div>}
        style={{ borderRadius: '8px', overflow: 'hidden' }}
      />
    </Card>
  );
};

export default LogViewer;