import { configService } from '../services/configService';

// 配置验证规则
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => string | null;
}

// 配置验证器
export class ConfigValidator {
  private static instance: ConfigValidator;
  private schema: any = null;

  private constructor() {}

  public static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }

  // 获取配置架构
  async getSchema() {
    if (this.schema) {
      return this.schema;
    }

    try {
      const response = await configService.getConfigSchema();
      this.schema = response;
      return this.schema;
    } catch (error) {
      console.error('获取配置架构失败:', error);
      return null;
    }
  }

  // 验证单个配置值
  async validateValue(key: string, value: any): Promise<string | null> {
    const schema = await this.getSchema();
    if (!schema) {
      return null; // 没有架构，跳过验证
    }

    return configService.validateConfigValue(key, value, schema);
  }

  // 验证配置对象
  async validateConfig(config: Record<string, any>): Promise<Record<string, string>> {
    const errors: Record<string, string> = {};
    const schema = await this.getSchema();

    if (!schema) {
      return errors; // 没有架构，跳过验证
    }

    for (const [key, value] of Object.entries(config)) {
      const error = configService.validateConfigValue(key, value, schema);
      if (error) {
        errors[key] = error;
      }
    }

    return errors;
  }

  // 验证服务器配置
  validateServerConfig(config: any): Record<string, string> {
    const errors: Record<string, string> = {};

    if (config.port) {
      const port = Number(config.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        errors.port = '端口号必须在1-65535之间';
      }
    }

    if (config.host && typeof config.host !== 'string') {
      errors.host = '主机地址必须是字符串';
    }

    if (config.mode && !['debug', 'release', 'test'].includes(config.mode)) {
      errors.mode = '运行模式必须是debug、release或test之一';
    }

    return errors;
  }

  // 验证安全配置
  validateSecurityConfig(config: any): Record<string, string> {
    const errors: Record<string, string> = {};

    if (config.max_connections_per_secret !== undefined) {
      const maxConn = Number(config.max_connections_per_secret);
      if (isNaN(maxConn) || maxConn < 1 || maxConn > 100) {
        errors.max_connections_per_secret = '每个密钥的最大连接数必须在1-100之间';
      }
    }

    return errors;
  }

  // 验证认证配置
  validateAuthConfig(config: any): Record<string, string> {
    const errors: Record<string, string> = {};

    if (config.username && typeof config.username !== 'string') {
      errors.username = '用户名必须是字符串';
    }

    if (config.password !== undefined && config.password !== '' && typeof config.password !== 'string') {
      errors.password = '密码必须是字符串';
    }

    if (config.session_timeout !== undefined) {
      const timeout = Number(config.session_timeout);
      if (isNaN(timeout) || timeout < 300 || timeout > 604800) {
        errors.session_timeout = '会话超时时间必须在300-604800秒之间';
      }
    }

    return errors;
  }

  // 验证日志配置
  validateLoggingConfig(config: any): Record<string, string> {
    const errors: Record<string, string> = {};

    if (config.level && !['debug', 'info', 'warn', 'error'].includes(config.level)) {
      errors.level = '日志级别必须是debug、info、warn或error之一';
    }

    if (config.max_log_entries !== undefined) {
      const maxEntries = Number(config.max_log_entries);
      if (isNaN(maxEntries) || maxEntries < 100 || maxEntries > 10000) {
        errors.max_log_entries = '最大日志条数必须在100-10000之间';
      }
    }

    if (config.log_file_path && typeof config.log_file_path !== 'string') {
      errors.log_file_path = '日志文件路径必须是字符串';
    }

    return errors;
  }

  // 验证WebSocket配置
  validateWebSocketConfig(config: any): Record<string, string> {
    const errors: Record<string, string> = {};

    if (config.heartbeat_interval !== undefined) {
      const interval = Number(config.heartbeat_interval);
      if (isNaN(interval) || interval < 1000 || interval > 300000) {
        errors.heartbeat_interval = '心跳间隔必须在1000-300000毫秒之间';
      }
    }

    if (config.heartbeat_timeout !== undefined) {
      const timeout = Number(config.heartbeat_timeout);
      if (isNaN(timeout) || timeout < 1000 || timeout > 60000) {
        errors.heartbeat_timeout = '心跳超时必须在1000-60000毫秒之间';
      }
    }

    if (config.client_heartbeat_interval !== undefined) {
      const interval = Number(config.client_heartbeat_interval);
      if (isNaN(interval) || interval < 1000 || interval > 300000) {
        errors.client_heartbeat_interval = '客户端心跳间隔必须在1000-300000毫秒之间';
      }
    }

    if (config.max_message_size !== undefined) {
      const size = Number(config.max_message_size);
      if (isNaN(size) || size < 1024 || size > 10485760) {
        errors.max_message_size = '最大消息大小必须在1024-10485760字节之间';
      }
    }

    if (config.read_timeout !== undefined) {
      const timeout = Number(config.read_timeout);
      if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
        errors.read_timeout = '读取超时必须在1000-300000毫秒之间';
      }
    }

    if (config.write_timeout !== undefined) {
      const timeout = Number(config.write_timeout);
      if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
        errors.write_timeout = '写入超时必须在1000-300000毫秒之间';
      }
    }

    return errors;
  }

  // 验证UI配置
  validateUIConfig(config: any): Record<string, string> {
    const errors: Record<string, string> = {};

    if (config.enableWebConsole !== undefined && typeof config.enableWebConsole !== 'boolean') {
      errors.enableWebConsole = '启用Web控制台必须是布尔值';
    }

    if (config.theme && !['light', 'dark', 'auto'].includes(config.theme)) {
      errors.theme = '主题模式必须是light、dark或auto之一';
    }

    if (config.language && !['zh-CN', 'en-US'].includes(config.language)) {
      errors.language = '语言必须是zh-CN或en-US之一';
    }

    if (config.primaryColor && typeof config.primaryColor !== 'string') {
      errors.primaryColor = '主色调必须是字符串';
    }

    return errors;
  }

  // 验证所有配置
  async validateAllConfig(config: any): Promise<Record<string, string>> {
    const errors: Record<string, string> = {};

    // 验证各个分类的配置
    if (config.server) {
      const serverErrors = this.validateServerConfig(config.server);
      Object.keys(serverErrors).forEach(key => {
        errors[`server.${key}`] = serverErrors[key];
      });
    }

    if (config.security) {
      const securityErrors = this.validateSecurityConfig(config.security);
      Object.keys(securityErrors).forEach(key => {
        errors[`security.${key}`] = securityErrors[key];
      });
    }

    if (config.auth) {
      const authErrors = this.validateAuthConfig(config.auth);
      Object.keys(authErrors).forEach(key => {
        errors[`auth.${key}`] = authErrors[key];
      });
    }

    if (config.logging) {
      const loggingErrors = this.validateLoggingConfig(config.logging);
      Object.keys(loggingErrors).forEach(key => {
        errors[`logging.${key}`] = loggingErrors[key];
      });
    }

    if (config.websocket) {
      const websocketErrors = this.validateWebSocketConfig(config.websocket);
      Object.keys(websocketErrors).forEach(key => {
        errors[`websocket.${key}`] = websocketErrors[key];
      });
    }

    if (config.ui) {
      const uiErrors = this.validateUIConfig(config.ui);
      Object.keys(uiErrors).forEach(key => {
        errors[`ui.${key}`] = uiErrors[key];
      });
    }

    return errors;
  }
}

// 导出单例实例
export const configValidator = ConfigValidator.getInstance();
export default configValidator;
