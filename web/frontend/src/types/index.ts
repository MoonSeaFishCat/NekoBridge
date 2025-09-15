// 日志条目
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  details?: any;
}

// 连接信息
export interface Connection {
  secret: string;
  connected: boolean;
  enabled: boolean;
  description?: string;
  createdAt?: string;
  lastUsed?: string;
  connectedAt: string;
}

// 密钥信息
export interface Secret {
  secret: string;
  name?: string;
  enabled: boolean;
  description?: string;
  max_connections?: number;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  last_used?: string;
}

// 封禁信息
export interface BanInfo {
  secret: string;
  reason?: string;
  bannedAt: string;
  bannedBy: string;
}

// WebSocket消息
export interface WebSocketMessage {
  type: string;
  data: any;
}

// API响应
export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  message?: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  token?: string;
}

// 仪表盘统计
export interface DashboardStats {
  connections: {
    active: number;
    total: number;
  };
  secrets: {
    total: number;
    blocked: number;
  };
  logs: {
    total: number;
    error: number;
    warnings: number;
  };
  system: {
    uptime: number;
    memory: number;
    cpu: number;
    cpu_cores: number;
    cpu_model: string;
    load_average: number[];
  };
}

// 密钥统计
export interface SecretStats {
  total: number;
  enabled: number;
  disabled: number;
  recently_used: number;
  never_used: number;
}

// 批量操作请求
export interface BatchOperationRequest {
  action: string;
  secrets: string[];
}

// 批量操作结果
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

// 导出数据
export interface ExportData {
  secrets: Record<string, Secret>;
  metadata: {
    exported_at: string;
    version: string;
    total_secrets: number;
  };
}

// 导入数据
export interface ImportData {
  secrets: Record<string, Secret>;
  metadata?: Record<string, any>;
}

// 导入结果
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// 健康检查响应
export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    heap_used: number;
    heap_total: number;
    heap_sys: number;
    heap_idle: number;
    heap_inuse: number;
    heap_released: number;
    heap_objects: number;
  };
  cpu: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
  };
  connections: number;
  load_average: number[];
}

// 主题配置
export interface ThemeConfig {
  enableWebConsole: boolean;
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  compact: boolean;
  language: 'zh-CN' | 'en-US';
  showBreadcrumb: boolean;
  showFooter: boolean;
  enableAnimation: boolean;
}

// 系统配置
export interface SystemConfig {
  server: {
    port: string;
    host: string;
    mode: string;
    cors: {
      origins: string[];
    };
  };
  security: {
    enable_signature_validation: boolean;
    default_allow_new_connections: boolean;
    max_connections_per_secret: number;
    require_manual_key_management: boolean;
  };
  auth: {
    username: string;
    password: string;
    session_timeout: number;
    jwt_secret: string;
  };
  ui: ThemeConfig;
  logging: {
    level: string;
    max_log_entries: number;
    enable_file_logging: boolean;
    log_file_path: string;
  };
  websocket: {
    enable_heartbeat: boolean;
    heartbeat_interval: number;
    heartbeat_timeout: number;
    client_heartbeat_interval: number;
  };
  secrets: Record<string, Secret>;
}
