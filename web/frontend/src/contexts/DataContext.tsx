import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { LogEntry, Connection } from '../types';

interface DataContextType {
  logs: LogEntry[];
  connections: Connection[];
  loading: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsRes, connectionsRes] = await Promise.all([
        apiService.getLogs(),
        apiService.getConnections(),
      ]);
      
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data.logs || []);
      }
      
      if (connectionsRes.success && connectionsRes.data) {
        setConnections(connectionsRes.data.connections || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    // 设置定时刷新
    const timer = setInterval(refreshData, 30000);
    return () => clearInterval(timer);
  }, [refreshData]);

  return (
    <DataContext.Provider value={{ logs, connections, loading, refreshData }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
