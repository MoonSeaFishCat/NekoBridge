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
  }, []);  // 保持稳定，不添加额外依赖

  useEffect(() => {
    // 禁用自动刷新，改为手动刷新以防止卡顿
    // 如果需要自动刷新，可以根据场景调整间隔时间
    // const timer = setInterval(refreshData, 60000); // 改为 60 秒最少
    // return () => clearInterval(timer);
    return () => {};
  }, []);  // 空依赖数组，只运行一次，避免无限循环

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
