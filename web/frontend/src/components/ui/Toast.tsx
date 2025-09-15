import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, CloseIcon, ErrorCircleIcon, InfoCircleIcon, ErrorIcon } from 'tdesign-icons-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  content?: string;
  duration?: number;
  onClose?: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  content,
  duration = 3000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onClose?.(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon style={{ color: '#00a870' }} />;
      case 'error':
        return <ErrorCircleIcon style={{ color: '#d54941' }} />;
      case 'warning':
        return <ErrorIcon style={{ color: '#ed7b2f' }} />;
      case 'info':
        return <InfoCircleIcon style={{ color: '#0052d9' }} />;
      default:
        return <InfoCircleIcon style={{ color: '#0052d9' }} />;
    }
  };

  if (!visible) return null;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return (
    <div
      className="toast"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '400px',
        background: isDark ? '#1A1A1A' : 'white',
        border: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`,
        borderRadius: '8px',
        boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.15)',
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        <div
          className="toast-title"
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: isDark ? '#FFFFFF' : '#333',
            marginBottom: content ? '4px' : '0',
            textShadow: isDark ? '0 0 5px rgba(255,255,255,0.1)' : 'none',
          }}
        >
          {title}
        </div>
        {content && (
          <div
            className="toast-content"
            style={{
              fontSize: '13px',
              color: isDark ? '#E0E0E0' : '#666',
              lineHeight: '1.4',
              fontWeight: '500',
            }}
          >
            {content}
          </div>
        )}
      </div>
      <button
        className="toast-close"
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDark ? '#CCCCCC' : '#999',
          flexShrink: 0,
          fontWeight: '600',
        }}
      >
        <CloseIcon size="16px" />
      </button>
    </div>
  );
};

export default Toast;
