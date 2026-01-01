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
  timeout: 10000,
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
      window.location.href = '/login';
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
    } catch {
      authManager.clearToken();
      return { isAuthenticated: false };
    }
  }

  // 系统信息
  async getHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  }

  async getApiInfo(): Promise<any> {
    const response = await apiClient.get('/');
    return response.data;
  }

  // Web控制台状态
  async getWebConsoleStatus(): Promise<{ enabled: boolean }> {
    const response = await apiClient.get<{ enabled: boolean }>('/web-console/status');
    return response.data;
  }

  // 日志管理
  async getLogs(limit?: number, level?: string): Promise<{ logs: LogEntry[]; total: number }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (level) params.append('level', level);
    
    const response = await apiClient.get<{ logs: LogEntry[]; total: number }>(`/logs?${params}`);
    console.log('后端日志响应:', response.data);
    return response.data;
  }

  // 连接管理
  async getConnections(): Promise<{ connections: Connection[]; total: number }> {
    const response = await apiClient.get<{ connections: any[]; total: number }>('/connections');
    // 字段转换：下划线转驼峰
    const connections = (response.data.connections || []).map((conn: any) => ({
      ...conn,
      createdAt: conn.created_at,
      lastUsed: conn.last_used,
      connectedAt: conn.connected_at,
    }));
    return { connections, total: response.data.total };
  }

  async kickConnection(secret: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>(`/connections/${secret}/kick`);
    return response.data;
  }

  // 密钥管理
  async getSecrets(): Promise<{ secrets: Secret[] }> {
    const response = await apiClient.get<{ secrets: Secret[] }>('/secrets');
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

  async getBlockedSecrets(): Promise<{ blockedSecrets: string[]; bans: BanInfo[] }> {
    const response = await apiClient.get<{ blockedSecrets: string[]; bans: BanInfo[] }>('/secrets/blocked');
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

  async exportSecrets(): Promise<ExportData> {
    const response = await apiClient.get<ExportData>('/secrets/export');
    return response.data;
  }

  async importSecrets(data: ImportData, overwriteExisting = false): Promise<{ success: boolean; result: ImportResult }> {
    const response = await apiClient.post<{ success: boolean; result: ImportResult }>(
      `/secrets/import?overwriteExisting=${overwriteExisting}`,
      data
    );
    return response.data;
  }

  async getSecretStats(): Promise<{ success: boolean; stats: SecretStats }> {
    const response = await apiClient.get<{ success: boolean; stats: SecretStats }>('/secrets/stats');
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
