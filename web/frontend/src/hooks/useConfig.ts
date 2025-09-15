import { useState, useEffect, useCallback } from 'react';
import { configService } from '../services/configService';
import type { SystemConfig, ThemeConfig } from '../types';

// 配置状态接口
interface ConfigState {
  config: SystemConfig | null;
  loading: boolean;
  error: string | null;
}

// 配置操作接口
interface ConfigActions {
  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<SystemConfig>) => Promise<void>;
  updateServerConfig: (config: any) => Promise<void>;
  updateSecurityConfig: (config: any) => Promise<void>;
  updateAuthConfig: (config: any) => Promise<void>;
  updateUIConfig: (config: Partial<ThemeConfig>) => Promise<void>;
  updateLoggingConfig: (config: any) => Promise<void>;
  updateWebSocketConfig: (config: any) => Promise<void>;
  resetConfig: (key: string) => Promise<void>;
  initializeConfig: () => Promise<void>;
}

// 配置Hook
export const useConfig = (): ConfigState & ConfigActions => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行加载所有配置
      const [serverConfig, securityConfig, authConfig, loggingConfig, uiConfig, websocketConfig] = await Promise.all([
        configService.getServerConfig(),
        configService.getSecurityConfig(),
        configService.getAuthConfig(),
        configService.getLoggingConfig(),
        configService.getUIConfig(),
        configService.getWebSocketConfig(),
      ]);

      const systemConfig: SystemConfig = {
        server: serverConfig,
        security: securityConfig,
        auth: authConfig,
        logging: loggingConfig,
        ui: uiConfig,
        websocket: websocketConfig,
        secrets: {}, // 密钥配置单独管理
      };

      setConfig(systemConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载配置失败';
      setError(errorMessage);
      console.error('加载配置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新配置
  const updateConfig = useCallback(async (updates: Partial<SystemConfig>) => {
    try {
      setLoading(true);
      setError(null);

      const updatePromises = [];

      if (updates.server) {
        updatePromises.push(configService.updateServerConfig(updates.server));
      }
      if (updates.security) {
        updatePromises.push(configService.updateSecurityConfig(updates.security));
      }
      if (updates.auth) {
        updatePromises.push(configService.updateAuthConfig(updates.auth));
      }
      if (updates.logging) {
        updatePromises.push(configService.updateLoggingConfig(updates.logging));
      }
      if (updates.ui) {
        updatePromises.push(configService.updateUIConfig(updates.ui));
      }
      if (updates.websocket) {
        updatePromises.push(configService.updateWebSocketConfig(updates.websocket));
      }

      await Promise.all(updatePromises);

      // 重新加载配置
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新配置失败';
      setError(errorMessage);
      console.error('更新配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 更新服务器配置
  const updateServerConfig = useCallback(async (config: any) => {
    try {
      setLoading(true);
      setError(null);
      await configService.updateServerConfig(config);
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新服务器配置失败';
      setError(errorMessage);
      console.error('更新服务器配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 更新安全配置
  const updateSecurityConfig = useCallback(async (config: any) => {
    try {
      setLoading(true);
      setError(null);
      await configService.updateSecurityConfig(config);
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新安全配置失败';
      setError(errorMessage);
      console.error('更新安全配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 更新认证配置
  const updateAuthConfig = useCallback(async (config: any) => {
    try {
      setLoading(true);
      setError(null);
      await configService.updateAuthConfig(config);
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新认证配置失败';
      setError(errorMessage);
      console.error('更新认证配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 更新UI配置
  const updateUIConfig = useCallback(async (config: Partial<ThemeConfig>) => {
    try {
      setLoading(true);
      setError(null);
      await configService.updateUIConfig(config);
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新UI配置失败';
      setError(errorMessage);
      console.error('更新UI配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 更新日志配置
  const updateLoggingConfig = useCallback(async (config: any) => {
    try {
      setLoading(true);
      setError(null);
      await configService.updateLoggingConfig(config);
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新日志配置失败';
      setError(errorMessage);
      console.error('更新日志配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 更新WebSocket配置
  const updateWebSocketConfig = useCallback(async (config: any) => {
    try {
      setLoading(true);
      setError(null);
      await configService.updateWebSocketConfig(config);
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '更新WebSocket配置失败';
      setError(errorMessage);
      console.error('更新WebSocket配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 重置配置
  const resetConfig = useCallback(async (key: string) => {
    try {
      setLoading(true);
      setError(null);
      await configService.resetConfigToDefault(key);
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '重置配置失败';
      setError(errorMessage);
      console.error('重置配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 初始化配置
  const initializeConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await configService.initializeSystemConfig();
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '初始化配置失败';
      setError(errorMessage);
      console.error('初始化配置失败:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadConfig]);

  // 组件挂载时加载配置
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    loadConfig,
    updateConfig,
    updateServerConfig,
    updateSecurityConfig,
    updateAuthConfig,
    updateUIConfig,
    updateLoggingConfig,
    updateWebSocketConfig,
    resetConfig,
    initializeConfig,
  };
};

export default useConfig;
