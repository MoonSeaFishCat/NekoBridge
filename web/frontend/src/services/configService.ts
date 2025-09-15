import { apiService } from './api';
import type { ThemeConfig } from '../types';

// 配置服务类
export class ConfigService {
  private static instance: ConfigService;
  private configCache: Map<string, any> = new Map();
  private configSchema: any = null;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  // 获取配置架构
  async getConfigSchema() {
    if (this.configSchema) {
      return this.configSchema;
    }

    try {
      const response = await apiService.getSystemConfigSchema();
      if (response.success) {
        this.configSchema = response.data;
        return this.configSchema;
      }
      throw new Error('获取配置架构失败');
    } catch (error) {
      console.error('获取配置架构失败:', error);
      throw error;
    }
  }

  // 获取所有配置
  async getAllConfigs(): Promise<Record<string, any>> {
    try {
      const response = await apiService.getSystemConfig();
      if (response.success) {
        return response.data;
      }
      throw new Error('获取配置失败');
    } catch (error) {
      console.error('获取配置失败:', error);
      throw error;
    }
  }

  // 获取分类配置
  async getConfigsByCategory(category: string): Promise<Record<string, any>> {
    const allConfigs = await this.getAllConfigs();
    const categoryConfigs: Record<string, any> = {};
    
    Object.keys(allConfigs).forEach(key => {
      if (key.startsWith(`${category}.`)) {
        const fieldName = key.replace(`${category}.`, '');
        categoryConfigs[fieldName] = allConfigs[key];
      }
    });

    return categoryConfigs;
  }

  // 获取服务器配置
  async getServerConfig(): Promise<{
    port: string;
    host: string;
    mode: string;
    cors: {
      origins: string[];
    };
  }> {
    const configs = await this.getConfigsByCategory('server');
    
    return {
      port: configs.port || '3000',
      host: configs.host || '0.0.0.0',
      mode: configs.mode || 'debug',
      cors: {
        origins: Array.isArray(configs.cors?.origins) ? configs.cors.origins : ['*']
      }
    };
  }

  // 获取安全配置
  async getSecurityConfig(): Promise<{
    enable_signature_validation: boolean;
    default_allow_new_connections: boolean;
    max_connections_per_secret: number;
    require_manual_key_management: boolean;
  }> {
    const configs = await this.getConfigsByCategory('security');
    
    return {
      enable_signature_validation: configs.enable_signature_validation ?? true,
      default_allow_new_connections: configs.default_allow_new_connections ?? true,
      max_connections_per_secret: configs.max_connections_per_secret ?? 5,
      require_manual_key_management: configs.require_manual_key_management ?? false,
    };
  }

  // 获取认证配置
  async getAuthConfig(): Promise<{
    username: string;
    password: string;
    session_timeout: number;
    jwt_secret: string;
  }> {
    const configs = await this.getConfigsByCategory('auth');
    
    return {
      username: configs.username || 'admin',
      password: '', // 不返回密码
      session_timeout: configs.session_timeout ?? 86400,
      jwt_secret: configs.jwt_secret || '',
    };
  }

  // 获取UI配置
  async getUIConfig(): Promise<ThemeConfig> {
    const configs = await this.getConfigsByCategory('ui');
    
    return {
      enableWebConsole: configs.enable_web_console ?? true,
      theme: (configs.theme as 'light' | 'dark' | 'auto') || 'auto',
      primaryColor: configs.primary_color || '#165DFF',
      compact: configs.compact_mode ?? false,
      language: (configs.language as 'zh-CN' | 'en-US') || 'zh-CN',
      showBreadcrumb: configs.show_breadcrumb ?? true,
      showFooter: configs.show_footer ?? true,
      enableAnimation: configs.enable_animation ?? true,
    };
  }

  // 获取日志配置
  async getLoggingConfig(): Promise<{
    level: string;
    max_log_entries: number;
    enable_file_logging: boolean;
    log_file_path: string;
  }> {
    const configs = await this.getConfigsByCategory('logging');
    
    return {
      level: configs.level || 'info',
      max_log_entries: configs.max_log_entries ?? 1000,
      enable_file_logging: configs.enable_file_logging ?? false,
      log_file_path: configs.log_file_path || './logs/webhook.log',
    };
  }

  // 获取WebSocket配置
  async getWebSocketConfig(): Promise<{
    enable_heartbeat: boolean;
    heartbeat_interval: number;
    heartbeat_timeout: number;
    client_heartbeat_interval: number;
    max_message_size: number;
    read_timeout: number;
    write_timeout: number;
  }> {
    const configs = await this.getConfigsByCategory('websocket');
    
    return {
      enable_heartbeat: configs.enable_heartbeat ?? false,
      heartbeat_interval: configs.heartbeat_interval ?? 30000,
      heartbeat_timeout: configs.heartbeat_timeout ?? 5000,
      client_heartbeat_interval: configs.client_heartbeat_interval ?? 25000,
      max_message_size: configs.max_message_size ?? 1048576,
      read_timeout: configs.read_timeout ?? 60000,
      write_timeout: configs.write_timeout ?? 60000,
    };
  }

  // 更新配置
  async updateConfigs(updates: Record<string, any>): Promise<void> {
    try {
      const response = await apiService.updateSystemConfig(updates);
      if (!response.success) {
        throw new Error(response.message || '更新配置失败');
      }
      
      // 清除缓存
      this.configCache.clear();
    } catch (error) {
      console.error('更新配置失败:', error);
      throw error;
    }
  }

  // 更新分类配置
  async updateConfigsByCategory(category: string, configs: Record<string, any>): Promise<void> {
    const updates: Record<string, any> = {};
    
    Object.keys(configs).forEach(key => {
      updates[`${category}.${key}`] = configs[key];
    });

    await this.updateConfigs(updates);
  }

  // 更新服务器配置
  async updateServerConfig(config: {
    port?: string;
    host?: string;
    mode?: string;
    cors?: { origins?: string[] };
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (config.port !== undefined) updates['server.port'] = config.port;
    if (config.host !== undefined) updates['server.host'] = config.host;
    if (config.mode !== undefined) updates['server.mode'] = config.mode;
    if (config.cors?.origins !== undefined) updates['server.cors.origins'] = config.cors.origins;

    await this.updateConfigs(updates);
  }

  // 更新安全配置
  async updateSecurityConfig(config: {
    enable_signature_validation?: boolean;
    default_allow_new_connections?: boolean;
    max_connections_per_secret?: number;
    require_manual_key_management?: boolean;
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (config.enable_signature_validation !== undefined) {
      updates['security.enable_signature_validation'] = config.enable_signature_validation;
    }
    if (config.default_allow_new_connections !== undefined) {
      updates['security.default_allow_new_connections'] = config.default_allow_new_connections;
    }
    if (config.max_connections_per_secret !== undefined) {
      updates['security.max_connections_per_secret'] = config.max_connections_per_secret;
    }
    if (config.require_manual_key_management !== undefined) {
      updates['security.require_manual_key_management'] = config.require_manual_key_management;
    }

    await this.updateConfigs(updates);
  }

  // 更新认证配置
  async updateAuthConfig(config: {
    username?: string;
    password?: string;
    session_timeout?: number;
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (config.username !== undefined) updates['auth.username'] = config.username;
    if (config.password !== undefined && config.password.trim() !== '') {
      updates['auth.password'] = config.password;
    }
    if (config.session_timeout !== undefined) {
      updates['auth.session_timeout'] = config.session_timeout;
    }

    await this.updateConfigs(updates);
  }

  // 更新UI配置
  async updateUIConfig(config: Partial<ThemeConfig>): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (config.enableWebConsole !== undefined) updates['ui.enable_web_console'] = config.enableWebConsole;
    if (config.theme !== undefined) updates['ui.theme'] = config.theme;
    if (config.primaryColor !== undefined) updates['ui.primary_color'] = config.primaryColor;
    if (config.compact !== undefined) updates['ui.compact_mode'] = config.compact;
    if (config.language !== undefined) updates['ui.language'] = config.language;
    if (config.showBreadcrumb !== undefined) updates['ui.show_breadcrumb'] = config.showBreadcrumb;
    if (config.showFooter !== undefined) updates['ui.show_footer'] = config.showFooter;
    if (config.enableAnimation !== undefined) updates['ui.enable_animation'] = config.enableAnimation;

    await this.updateConfigs(updates);
  }

  // 更新日志配置
  async updateLoggingConfig(config: {
    level?: string;
    max_log_entries?: number;
    enable_file_logging?: boolean;
    log_file_path?: string;
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (config.level !== undefined) updates['logging.level'] = config.level;
    if (config.max_log_entries !== undefined) updates['logging.max_log_entries'] = config.max_log_entries;
    if (config.enable_file_logging !== undefined) {
      updates['logging.enable_file_logging'] = config.enable_file_logging;
    }
    if (config.log_file_path !== undefined) updates['logging.log_file_path'] = config.log_file_path;

    await this.updateConfigs(updates);
  }

  // 更新WebSocket配置
  async updateWebSocketConfig(config: {
    enable_heartbeat?: boolean;
    heartbeat_interval?: number;
    heartbeat_timeout?: number;
    client_heartbeat_interval?: number;
    max_message_size?: number;
    read_timeout?: number;
    write_timeout?: number;
  }): Promise<void> {
    const updates: Record<string, any> = {};
    
    if (config.enable_heartbeat !== undefined) {
      updates['websocket.enable_heartbeat'] = config.enable_heartbeat;
    }
    if (config.heartbeat_interval !== undefined) {
      updates['websocket.heartbeat_interval'] = config.heartbeat_interval;
    }
    if (config.heartbeat_timeout !== undefined) {
      updates['websocket.heartbeat_timeout'] = config.heartbeat_timeout;
    }
    if (config.client_heartbeat_interval !== undefined) {
      updates['websocket.client_heartbeat_interval'] = config.client_heartbeat_interval;
    }
    if (config.max_message_size !== undefined) {
      updates['websocket.max_message_size'] = config.max_message_size;
    }
    if (config.read_timeout !== undefined) {
      updates['websocket.read_timeout'] = config.read_timeout;
    }
    if (config.write_timeout !== undefined) {
      updates['websocket.write_timeout'] = config.write_timeout;
    }

    await this.updateConfigs(updates);
  }

  // 重置配置为默认值
  async resetConfigToDefault(key: string): Promise<void> {
    try {
      const response = await apiService.resetSystemConfig(key);
      if (!response.success) {
        throw new Error(response.message || '重置配置失败');
      }
      
      // 清除缓存
      this.configCache.clear();
    } catch (error) {
      console.error('重置配置失败:', error);
      throw error;
    }
  }

  // 初始化系统配置
  async initializeSystemConfig(): Promise<void> {
    try {
      const response = await apiService.initializeSystemConfig();
      if (!response.success) {
        throw new Error(response.message || '初始化配置失败');
      }
      
      // 清除缓存
      this.configCache.clear();
    } catch (error) {
      console.error('初始化配置失败:', error);
      throw error;
    }
  }

  // 验证配置值
  validateConfigValue(key: string, value: any, schema: any): string | null {
    if (!schema || !schema[key]) {
      return null; // 没有验证规则
    }

    const fieldSchema = schema[key];
    
    // 必填验证
    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      return `${fieldSchema.description || key} 是必填项`;
    }

    // 类型验证
    if (value !== undefined && value !== null && value !== '') {
      switch (fieldSchema.type) {
        case 'int':
          if (!Number.isInteger(Number(value))) {
            return `${fieldSchema.description || key} 必须是整数`;
          }
          break;
        case 'float':
          if (isNaN(Number(value))) {
            return `${fieldSchema.description || key} 必须是数字`;
          }
          break;
        case 'bool':
          if (typeof value !== 'boolean') {
            return `${fieldSchema.description || key} 必须是布尔值`;
          }
          break;
      }

      // 范围验证
      if (fieldSchema.minValue !== undefined) {
        const numValue = Number(value);
        const minValue = Number(fieldSchema.minValue);
        if (numValue < minValue) {
          return `${fieldSchema.description || key} 不能小于 ${fieldSchema.minValue}`;
        }
      }

      if (fieldSchema.maxValue !== undefined) {
        const numValue = Number(value);
        const maxValue = Number(fieldSchema.maxValue);
        if (numValue > maxValue) {
          return `${fieldSchema.description || key} 不能大于 ${fieldSchema.maxValue}`;
        }
      }

      // 选项验证
      if (fieldSchema.options && Array.isArray(fieldSchema.options)) {
        if (!fieldSchema.options.includes(value)) {
          return `${fieldSchema.description || key} 必须是以下选项之一: ${fieldSchema.options.join(', ')}`;
        }
      }
    }

    return null;
  }
}

// 导出单例实例
export const configService = ConfigService.getInstance();
export default configService;
