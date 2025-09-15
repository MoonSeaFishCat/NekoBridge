import { useState, useCallback } from 'react';
import type { ToastProps } from '../components/ui/Toast';

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  content?: string;
  duration?: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastProps = {
      id,
      ...options,
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // 便捷方法
  const success = useCallback((title: string, content?: string, duration?: number) => {
    return addToast({ type: 'success', title, content, duration });
  }, [addToast]);

  const error = useCallback((title: string, content?: string, duration?: number) => {
    return addToast({ type: 'error', title, content, duration });
  }, [addToast]);

  const warning = useCallback((title: string, content?: string, duration?: number) => {
    return addToast({ type: 'warning', title, content, duration });
  }, [addToast]);

  const info = useCallback((title: string, content?: string, duration?: number) => {
    return addToast({ type: 'info', title, content, duration });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };
};
