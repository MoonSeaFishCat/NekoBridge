import React from 'react';
import {
  Card,
  Tabs,
  Space,
  Tag,
  Button,
  Divider,
} from 'tdesign-react';
import {
  CopyIcon,
  CheckCircleIcon,
} from 'tdesign-icons-react';

const ApiDocs: React.FC = () => {
  const [copiedEndpoint, setCopiedEndpoint] = React.useState<string | null>(null);

  // 复制到剪贴板
  const handleCopy = (text: string, endpoint: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpoint);
    console.log('已复制到剪贴板');
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  // API端点数据
  const apiEndpoints = [
    {
      category: '认证接口',
      endpoints: [
        {
          method: 'POST',
          path: '/api/auth/login',
          description: '用户登录',
          request: {
            username: 'admin',
            password: 'admin123'
          },
          response: {
            success: true,
            token: 'jwt_token_here',
            message: '登录成功'
          }
        },
        {
          method: 'POST',
          path: '/api/auth/logout',
          description: '用户登出',
          headers: 'Authorization: Bearer <token>',
          response: {
            success: true,
            message: '登出成功'
          }
        },
        {
          method: 'GET',
          path: '/api/auth/verify',
          description: '验证Token',
          headers: 'Authorization: Bearer <token>',
          response: {
            valid: true,
            user: { username: 'admin' }
          }
        }
      ]
    },
    {
      category: '密钥管理',
      endpoints: [
        {
          method: 'GET',
          path: '/api/secrets',
          description: '获取密钥列表',
          headers: 'Authorization: Bearer <token>',
          response: {
            secrets: [
              {
                secret: 'your-secret-key',
                enabled: true,
                description: '测试机器人',
                max_connections: 5,
                created_at: '2024-01-01T00:00:00.000Z',
                lastUsed: '2024-01-01T12:00:00.000Z'
              }
            ]
          }
        },
        {
          method: 'POST',
          path: '/api/secrets',
          description: '添加密钥',
          headers: 'Authorization: Bearer <token>',
          request: {
            secret: 'my-bot-key',
            description: '测试机器人',
            enabled: true,
            max_connections: 5
          },
          response: {
            success: true
          }
        },
        {
          method: 'PUT',
          path: '/api/secrets/:secret',
          description: '更新密钥',
          headers: 'Authorization: Bearer <token>',
          request: {
            description: '更新的描述',
            enabled: false
          },
          response: {
            success: true
          }
        },
        {
          method: 'DELETE',
          path: '/api/secrets/:secret',
          description: '删除密钥',
          headers: 'Authorization: Bearer <token>',
          response: {
            success: true
          }
        }
      ]
    },
    {
      category: '连接管理',
      endpoints: [
        {
          method: 'GET',
          path: '/api/connections',
          description: '获取连接状态',
          headers: 'Authorization: Bearer <token>',
          response: {
            connections: [
              {
                secret: 'your-secret-key',
                connected: true,
                enabled: true,
                description: '测试机器人',
                connectedAt: '2024-01-01T12:00:00.000Z'
              }
            ],
            total: 1
          }
        },
        {
          method: 'POST',
          path: '/api/connections/:secret/kick',
          description: '踢出连接',
          headers: 'Authorization: Bearer <token>',
          response: {
            success: true,
            message: '连接已断开'
          }
        }
      ]
    },
    {
      category: '系统管理',
      endpoints: [
        {
          method: 'GET',
          path: '/api/health',
          description: '健康检查',
          response: {
            status: 'healthy',
            timestamp: '2024-01-01T12:00:00.000Z',
            uptime: 3600,
            memory: {
              heap_used: 1024000,
              heap_total: 2048000
            },
            cpu: {
              usage: 25,
              cores: 4,
              model: 'Intel Core i7'
            },
            connections: 1
          }
        },
        {
          method: 'GET',
          path: '/api/logs',
          description: '获取日志',
          headers: 'Authorization: Bearer <token>',
          query: '?limit=100&level=error',
          response: {
            logs: [
              {
                id: '1',
                timestamp: '2024-01-01T12:00:00.000Z',
                level: 'info',
                message: '用户登录成功',
                details: { username: 'admin' }
              }
            ],
            total: 1
          }
        },
        {
          method: 'GET',
          path: '/api/dashboard/stats',
          description: '获取仪表盘统计',
          headers: 'Authorization: Bearer <token>',
          response: {
            connections: {
              active: 1,
              total: 5
            },
            secrets: {
              total: 5,
              blocked: 0
            },
            logs: {
              total: 100,
              error: 5,
              warnings: 10
            },
            system: {
              uptime: 3600,
              memory: 45,
              cpu: 25,
              cpu_cores: 4,
              cpu_model: 'Intel Core i7',
              load_average: [0.5, 0.8, 1.2]
            }
          }
        }
      ]
    },
    {
      category: 'Webhook接口',
      endpoints: [
        {
          method: 'POST',
          path: '/api/webhook',
          description: '接收Webhook消息',
          query: '?secret=YOUR_SECRET_KEY',
          request: {
            type: 'message',
            data: {
              user_id: '12345',
              content: 'Hello World',
              timestamp: 1640995200
            }
          },
          response: {
            status: '推送成功'
          }
        }
      ]
    }
  ];

  // 渲染请求/响应示例
  const renderExample = (data: any, title: string) => {
    if (!data) return null;
    
    return (
      <div style={{ marginTop: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{title}</h4>
        <pre style={{
          background: 'var(--td-bg-color-container)',
          padding: '12px',
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
          margin: 0,
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  // 渲染API端点
  const renderEndpoint = (endpoint: any, index: number) => {
    const fullPath = `http://localhost:3000${endpoint.path}${endpoint.query || ''}`;
    const isCopied = copiedEndpoint === `${endpoint.method}-${endpoint.path}`;

    return (
      <Card key={index} size="small" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <Space>
              <Tag
                theme={endpoint.method === 'GET' ? 'success' : 
                       endpoint.method === 'POST' ? 'primary' :
                       endpoint.method === 'PUT' ? 'warning' : 'danger'}
                variant="light"
              >
                {endpoint.method}
              </Tag>
              <code style={{ fontSize: '14px', fontWeight: 500 }}>{endpoint.path}</code>
            </Space>
            <p style={{ margin: '8px 0 0 0', color: 'var(--td-text-color-secondary)' }}>
              {endpoint.description}
            </p>
          </div>
          <Button
            variant="text"
            icon={isCopied ? <CheckCircleIcon /> : <CopyIcon />}
            size="small"
            onClick={() => handleCopy(fullPath, `${endpoint.method}-${endpoint.path}`)}
          >
            {isCopied ? '已复制' : '复制'}
          </Button>
        </div>

        {endpoint.headers && (
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>请求头</h4>
            <code style={{
              background: 'var(--td-bg-color-container)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              {endpoint.headers}
            </code>
          </div>
        )}

        {endpoint.query && (
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>查询参数</h4>
            <code style={{
              background: 'var(--td-bg-color-container)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              {endpoint.query}
            </code>
          </div>
        )}

        {renderExample(endpoint.request, '请求示例')}
        {renderExample(endpoint.response, '响应示例')}
      </Card>
    );
  };

  return (
    <div>
      <Card title="API 文档" style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3>基础信息</h3>
          <p>API 基础地址: <code>http://localhost:3000/api</code></p>
          <p>认证方式: Bearer Token (JWT)</p>
          <p>数据格式: JSON</p>
        </div>

        <Divider />

        <div style={{ marginBottom: '16px' }}>
          <h3>WebSocket 连接</h3>
          <p>WebSocket 地址: <code>ws://localhost:3000/ws/YOUR_SECRET_KEY</code></p>
          <p>支持的消息类型:</p>
          <ul>
            <li><code>ping</code> - 客户端心跳</li>
            <li><code>pong</code> - 服务端心跳响应</li>
            <li><code>webhook</code> - Webhook 消息</li>
            <li><code>log</code> - 系统日志</li>
            <li><code>connected</code> - 连接确认</li>
          </ul>
        </div>

        <Divider />

        <div>
          <h3>错误码说明</h3>
          <ul>
            <li><code>400</code> - 请求参数错误</li>
            <li><code>401</code> - 未授权，需要登录</li>
            <li><code>403</code> - 禁止访问，权限不足</li>
            <li><code>404</code> - 资源不存在</li>
            <li><code>500</code> - 服务器内部错误</li>
          </ul>
        </div>
      </Card>

      <Tabs defaultValue="0">
        {apiEndpoints.map((category, categoryIndex) => (
          <Tabs.TabPanel key={categoryIndex} value={categoryIndex.toString()} label={category.category}>
            {category.endpoints.map((endpoint, endpointIndex) => 
              renderEndpoint(endpoint, endpointIndex)
            )}
          </Tabs.TabPanel>
        ))}
      </Tabs>
    </div>
  );
};

export default ApiDocs;
