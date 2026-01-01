import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Select,
  Input,
  Tag,
  DatePicker,
  Dialog,
} from 'tdesign-react';
import {
  DownloadIcon,
  RefreshIcon,
} from 'tdesign-icons-react';
import { apiService } from '../services/api';
import { useData } from '../contexts/DataContext';
import type { LogEntry } from '../types';

interface TableCellProps {
  row: LogEntry;
  rowIndex: number;
  col: any;
  colIndex: number;
}

const LogViewer: React.FC = () => {
  const { refreshCounter } = useData();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [current, setCurrent] = useState(1);
  const [levelFilter, setLevelFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // 获取数据
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (current - 1) * pageSize;
      const response = await apiService.getLogs(pageSize, offset, levelFilter);
      if (response.success && response.data) {
        setLogs(response.data.logs || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [current, pageSize, levelFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshCounter]);

  // 过滤日志（仅对当前页进行搜索过滤，或者我们可以选择让后端支持搜索）
  // 目前后端仅支持级别过滤，前端支持搜索过滤
  const filteredLogs = React.useMemo(() => {
    if (!searchText && !dateRange) return logs;
    
    let filtered = [...logs];
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter((log: LogEntry) => 
        log.message.toLowerCase().includes(lowerSearch) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(lowerSearch))
      );
    }
    if (dateRange) {
      const [start, end] = dateRange;
      filtered = filtered.filter((log: LogEntry) => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }
    return filtered;
  }, [logs, searchText, dateRange]);

  // 导出日志
  const handleExport = async () => {
    try {
      setLoading(true);
      // 导出时获取更多日志
      const response = await apiService.getLogs(1000, 0, levelFilter);
      if (response.success && response.data) {
        const exportData = response.data.logs.map((log: LogEntry) => ({
          timestamp: new Date(log.timestamp).toLocaleString(),
          level: log.level,
          message: log.message,
          details: log.details ? JSON.stringify(log.details) : ''
        }));

        const csvContent = "data:text/csv;charset=utf-8,"
          + "Time,Level,Message,Details\n"
          + exportData.map((e: any) => `"${e.timestamp}","${e.level}","${e.message.replace(/"/g, '""')}","${e.details.replace(/"/g, '""')}"`).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `logs_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchData();
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
      width: 120,
      cell: (props: TableCellProps) => props.row.details ? (
        <Button
          variant="text"
          theme="primary"
          size="small"
          onClick={() => {
            setSelectedDetails(props.row.details);
            setDetailsVisible(true);
          }}
        >
          查看详情
        </Button>
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
      <Dialog
        header="日志详情"
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        footer={null}
        width="600px"
      >
        <pre style={{ 
          margin: 0,
          padding: '16px',
          backgroundColor: 'var(--nb-bg-layout)',
          border: '1px solid var(--nb-border-color)',
          borderRadius: '8px',
          fontSize: '12px',
          maxHeight: '400px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: 'var(--nb-text-main)',
          fontFamily: 'monospace'
        }}>
          {selectedDetails ? JSON.stringify(selectedDetails, null, 2) : ''}
        </pre>
      </Dialog>
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
          current,
          pageSize,
          total,
          showPageSize: true,
          onChange: (pageInfo) => {
            setCurrent(pageInfo.current);
            setPageSize(pageInfo.pageSize);
          },
        }}
        empty={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--nb-text-secondary)' }}>暂无匹配的日志记录</div>}
        style={{ borderRadius: '8px', overflow: 'hidden' }}
      />
    </Card>
  );
};

export default LogViewer;