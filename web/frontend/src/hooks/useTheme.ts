import { useState, useEffect } from 'react';
import type { ThemeConfig } from '../types';

// 主题配置键
const THEME_KEY = 'qq-webhook-theme';

// 默认主题配置
const defaultTheme: ThemeConfig = {
  enableWebConsole: true,
  theme: 'light',
  primaryColor: '#165DFF',
  compact: false,
  language: 'zh-CN',
  showBreadcrumb: true,
  showFooter: true,
  enableAnimation: true,
};

// 获取系统主题偏好
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

// 从localStorage获取主题配置
const getStoredTheme = (): ThemeConfig => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 如果存储的主题是auto，强制设置为light
      if (parsed.theme === 'auto') {
        parsed.theme = 'light';
        localStorage.setItem(THEME_KEY, JSON.stringify(parsed));
      }
      return { ...defaultTheme, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to parse stored theme:', error);
    // 清理损坏的缓存
    localStorage.removeItem(THEME_KEY);
  }
  return defaultTheme;
};

// 保存主题配置到localStorage
const saveTheme = (theme: ThemeConfig): void => {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch (error) {
    console.warn('Failed to save theme:', error);
  }
};

// 应用主题到DOM
const applyTheme = (theme: ThemeConfig): void => {
  const root = document.documentElement;
  
  // 应用主题模式
  const actualTheme = theme.theme === 'auto' ? getSystemTheme() : theme.theme;
  root.setAttribute('data-theme', actualTheme);
  
  // 应用主色调
  root.style.setProperty('--td-brand-color', theme.primaryColor);
  
  // 应用紧凑模式
  if (theme.compact) {
    root.classList.add('tdesign-compact');
  } else {
    root.classList.remove('tdesign-compact');
  }
  
  // 应用语言
  root.setAttribute('lang', theme.language);
};

// 主题Hook
export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    return getStoredTheme();
  });

  // 应用主题到DOM
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme.theme === 'auto') {
        applyTheme(theme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme.theme]);

  // 更新主题
  const updateTheme = (newTheme: Partial<ThemeConfig>): void => {
    const updatedTheme = { ...theme, ...newTheme };
    setTheme(updatedTheme);
    saveTheme(updatedTheme);
    applyTheme(updatedTheme);
  };

  // 切换主题模式
  const toggleTheme = (): void => {
    const newMode = theme.theme === 'light' ? 'dark' : theme.theme === 'dark' ? 'auto' : 'light';
    updateTheme({ theme: newMode });
  };

  // 设置主色调
  const setPrimaryColor = (color: string): void => {
    updateTheme({ primaryColor: color });
  };

  // 切换紧凑模式
  const toggleCompactMode = (): void => {
    updateTheme({ compact: !theme.compact });
  };

  // 设置语言
  const setLanguage = (language: 'zh-CN' | 'en-US'): void => {
    updateTheme({ language });
  };

  // 重置主题
  const resetTheme = (): void => {
    setTheme(defaultTheme);
    saveTheme(defaultTheme);
    applyTheme(defaultTheme);
  };

  // 清理主题缓存
  const clearThemeCache = (): void => {
    localStorage.removeItem(THEME_KEY);
    setTheme(defaultTheme);
    applyTheme(defaultTheme);
  };

  // 获取当前实际主题（考虑auto模式）
  const getCurrentTheme = (): 'light' | 'dark' => {
    return theme.theme === 'auto' ? getSystemTheme() : theme.theme;
  };

  // 是否为暗色主题
  const isDark = getCurrentTheme() === 'dark';

  return {
    theme,
    isDark,
    updateTheme,
    toggleTheme,
    setPrimaryColor,
    toggleCompactMode,
    setLanguage,
    resetTheme,
    clearThemeCache,
    getCurrentTheme,
  };
};
