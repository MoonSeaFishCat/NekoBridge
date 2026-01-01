import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DataContextType {
  refreshCounter: number;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshCounter, setRefreshCounter] = useState(0);
  const loading = false; // 目前没有用到加载状态，暂时设为 false

  const refreshData = useCallback(async () => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  useEffect(() => {
    // 设置定时刷新
    const timer = setInterval(refreshData, 30000);
    return () => clearInterval(timer);
  }, [refreshData]);

  return (
    <DataContext.Provider value={{ refreshCounter, loading, refreshData }}>
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
