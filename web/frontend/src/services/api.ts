import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  AuthState,
  LogEntry,
  Connection,
  Secret,
  BanInfo,
  DashboardStats,
  SecretStats,
  BatchOperationRequest,
  BatchOperationResult,
  ExportData,
  ImportData,
  ImportResult,
  HealthResponse,
  SystemConfig,
  ApiResponse
} from '../types';

// API基础配置
const API_BASE_URL = '/api';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 认证管理器
class AuthManager {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getAuthHeaders(): Record<string, string> {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }
}

export const authManager = new AuthManager();

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = authManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      authManager.clearToken();
      // 改进：只在非登录页且非已经重定向的情况下跳转
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API服务类
export class ApiService {
  // 认证相关
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    if (response.data.success && response.data.token) {
      authManager.setToken(response.data.token);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      authManager.clearToken();
    }
  }

  async checkAuth(): Promise<AuthState> {
    if (!authManager.isAuthenticated()) {
      return { isAuthenticated: false };
    }

    try {
      const response = await apiClient.get<{ valid: boolean; user: any }>('/auth/verify');
      return { isAuthenticated: response.data.valid, token: authManager.getToken() || undefined };
    } catch (error: any) {
      // 只有在明确收到 401 或 403 错误时才清除 token
      // 这样可以避免因网络波动或服务器暂时不可用导致的误登出
      if (error.response?.status === 401 || error.response?.status === 403) {
        authManager.clearToken();
        return { isAuthenticated: false };
      }
      
      // 对于其他错误（如网络错误），保持当前认证状态，让后续请求自行处理
      return { isAuthenticated: true, token: authManager.getToken() || undefined };
    }
  }

  // 系统信息
  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    const response = await apiClient.get<ApiResponse<HealthResponse>>('/health');
    return response.data;
  }

  async getApiInfo(): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>('/');
    return response.data;
  }

  // Web控制台状态
  async getWebConsoleStatus(): Promise<ApiResponse<{ enabled: boolean }>> {
    const response = await apiClient.get<ApiResponse<{ enabled: boolean }>>('/web-console/status');
    return response.data;
  }

  // 日志管理
  async getLogs(limit?: number, level?: string): Promise<ApiResponse<{ logs: LogEntry[]; total: number }>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (level) params.append('level', level);
    
    const response = await apiClient.get<ApiResponse<{ logs: LogEntry[]; total: number }>>(`/logs?${params}`);
    return response.data;
  }

  // 连接管理
  async getConnections(): Promise<ApiResponse<{ connections: Connection[]; total: number }>> {
    const response = await apiClient.get<ApiResponse<{ connections: any[]; total: number }>>('/connections');
    
    // 如果请求失败，直接返回
    if (!response.data.success || !response.data.data) {
      return response.data as any;
    }

    // 字段转换：下划线转驼峰
    const connections = (response.data.data.connections || []).map((conn: any) => ({
      ...conn,
      createdAt: conn.created_at,
      lastUsed: conn.last_used,
      connectedAt: conn.connected_at,
    }));

    return {
      ...response.data,
      data: {
        connections,
        total: response.data.data.total
      }
    };
  }

  async kickConnection(secret: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/connections/${secret}/kick`);
    return response.data;
  }

  // 密钥管理
  async getSecrets(): Promise<ApiResponse<{ secrets: Secret[] }>> {
    const response = await apiClient.get<ApiResponse<{ secrets: Secret[] }>>('/secrets');
    return response.data;
  }

  async addSecret(secret: Secret): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/secrets', secret);
    return response.data;
  }

  async updateSecret(secret: string, updates: Partial<Secret>): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/secrets/${secret}`, updates);
    return response.data;
  }

  async deleteSecret(secret: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/secrets/${secret}`);
    return response.data;
  }

  async blockSecret(secret: string, reason?: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/secrets/${secret}/block`, { reason });
    return response.data;
  }

  async unblockSecret(secret: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/secrets/${secret}/unblock`);
    return response.data;
  }

  async getBlockedSecrets(): Promise<ApiResponse<{ blockedSecrets: string[]; bans: BanInfo[] }>> {
    const response = await apiClient.get<ApiResponse<{ blockedSecrets: string[]; bans: BanInfo[] }>>('/secrets/blocked');
    return response.data;
  }

  async updateBanRecord(id: number, reason: string): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/bans/${id}`, { reason });
    return response.data;
  }

  async deleteBanRecord(id: number): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/bans/${id}`);
    return response.data;
  }

  async exportSecrets(): Promise<ApiResponse<ExportData>> {
    const response = await apiClient.get<ApiResponse<ExportData>>('/secrets/export');
    return response.data;
  }

  async importSecrets(data: ImportData, overwriteExisting = false): Promise<ApiResponse<{ result: ImportResult }>> {
    const response = await apiClient.post<ApiResponse<{ result: ImportResult }>>(
      `/secrets/import?overwriteExisting=${overwriteExisting}`,
      data
    );
    return response.data;
  }

  async getSecretStats(): Promise<ApiResponse<{ stats: SecretStats }>> {
    const response = await apiClient.get<ApiResponse<{ stats: SecretStats }>>('/secrets/stats');
    return response.data;
  }

  async batchOperateSecrets(request: BatchOperationRequest): Promise<{ success: boolean; results: BatchOperationResult }> {
    const response = await apiClient.post<{ success: boolean; results: BatchOperationResult }>('/secrets/batch', request);
    return response.data;
  }

  // 配置管理
  async getConfig(): Promise<SystemConfig> {
    const response = await apiClient.get<SystemConfig>('/config');
    return response.data;
  }

  async updateConfig(config: Partial<SystemConfig>): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>('/config', config);
    return response.data;
  }

  // 系统配置管理
  async getSystemConfig(): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/config/system');
    return response.data;
  }

  async updateSystemConfig(config: any): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>('/config/system', config);
    return response.data;
  }

  async getSystemConfigSchema(): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/config/system/schema');
    return response.data;
  }

  async resetSystemConfig(key: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/config/system/reset/${key}`);
    return response.data;
  }

  async initializeSystemConfig(): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/config/system/initialize');
    return response.data;
  }

  // WebSocket配置管理
  async getWebSocketConfig(): Promise<{ success: boolean; config: any }> {
    const response = await apiClient.get<{ success: boolean; config: any }>('/config/websocket');
    return response.data;
  }

  async updateWebSocketConfig(config: any): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>('/config/websocket', config);
    return response.data;
  }

  // 仪表盘统计
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats');
    return response.data;
  }
}

// 创建API服务实例
export const apiService = new ApiService();

// 导出默认API服务
export default apiService;
