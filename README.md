# NekoBridge

[![Go Version](https://img.shields.io/badge/Go-1.23+-blue.svg)](https://golang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com)

NekoBridge是一个现代化的 Webhook 到 WebSocket 桥接服务，提供实时消息转发和完整的 Web 管理界面。🐱

## 🎯 核心功能

- **Webhook 转发**: 接收 Webhook 并转发到 WebSocket 客户端
- **实时通信**: 基于 WebSocket 的双向实时通信  
- **密钥管理**: 完整的密钥生命周期管理
- **连接管理**: 实时连接状态监控和管理
- **日志系统**: 完整的操作日志记录和查看
- **安全验证**: Ed25519 签名验证和 JWT 认证
- **管理界面**: 现代化的 React Web 管理界面

## 🏗️ 技术架构

### 后端技术栈
- **语言**: Go 1.23+
- **框架**: Gin Web Framework
- **数据库**: SQLite (GORM)
- **WebSocket**: Gorilla WebSocket
- **认证**: JWT + Ed25519 签名
- **监控**: 内置系统监控

### 前端技术栈  
- **框架**: React 18 + TypeScript
- **UI组件**: TDesign React
- **构建工具**: Vite
- **状态管理**: React Hooks

## 🚀 快速开始

### 环境要求
- Go 1.23+
- Node.js 18+
- npm/yarn/pnpm

### 安装和运行

1. **克隆项目**
```bash
git clone https://github.com/your-repo/nekobridge.git
cd nekobridge
```

2. **构建前端**
```bash
cd web/frontend
npm install
npm run build
cd ../..
```

3. **运行服务器**
```bash
# 设置环境变量（Windows）
set CC=C:\msys64\mingw64\bin\gcc.exe
set CXX=C:\msys64\mingw64\bin\g++.exe  
set CGO_ENABLED=1

# 构建并运行
go run ./cmd/server
```

4. **访问管理界面**
- Web 界面: http://localhost:3000
- 默认账号: admin / admin123

## 📡 API 接口

### Webhook 接口
```
POST /api/webhook?secret=YOUR_SECRET
```

### WebSocket 连接
```
ws://localhost:3000/ws/YOUR_SECRET
```

### 管理 API
- `GET /health` - 健康检查
- `POST /api/auth/login` - 用户登录
- `GET /api/dashboard/stats` - 仪表盘统计
- `GET /api/secrets` - 密钥列表
- `POST /api/secrets` - 添加密钥
- `PUT /api/secrets/:secret` - 更新密钥
- `DELETE /api/secrets/:secret` - 删除密钥

完整 API 文档请访问: http://localhost:3000/docs

## 🔧 配置说明

配置文件: `configs/config.yaml`

```yaml
Server:
  Port: "3000"
  Host: "0.0.0.0"
  Mode: "debug"
  CORS:
    Origins: ["*"]

Security:
  EnableSignatureValidation: true
  DefaultAllowNewConnections: true
  MaxConnectionsPerSecret: 5
  RequireManualKeyManagement: false

Auth:
  Username: "admin"
  Password: "admin123"
  SessionTimeout: 86400
  JWTSecret: "your-jwt-secret"
```

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t nekobridge .

# 运行容器
docker run -d \
  --name nekobridge \
  -p 3000:3000 \
  -v $(pwd)/configs:/app/configs \
  -v $(pwd)/data:/app/data \
  nekobridge
```

## 📊 功能特性

### 密钥管理
- ✅ 添加/删除/编辑密钥
- ✅ 批量操作
- ✅ 导入/导出
- ✅ 状态管理
- ✅ 使用统计

### 连接管理
- ✅ 实时连接监控
- ✅ 强制断开连接
- ✅ 连接数限制
- ✅ 心跳检测

### 日志系统
- ✅ 分级日志记录
- ✅ 实时日志查看
- ✅ 日志过滤
- ✅ 日志导出

### 安全机制
- ✅ Ed25519 签名验证
- ✅ JWT 令牌认证
- ✅ CORS 配置
- ✅ 封禁管理

## 🔍 监控指标

- **系统监控**: CPU 使用率、内存占用
- **连接监控**: 活跃连接数、连接历史
- **业务监控**: 消息吞吐量、错误率
- **健康检查**: 服务状态、数据库连接

## 🛠️ 开发指南

### 项目结构
```
nekobridge/
├── cmd/server/          # 服务器入口
├── internal/           # 内部包
│   ├── config/         # 配置管理
│   ├── database/       # 数据库层
│   ├── handlers/       # HTTP 处理器
│   ├── models/         # 数据模型
│   ├── utils/          # 工具函数
│   └── websocket/      # WebSocket 管理
├── web/                # 前端代码
│   ├── frontend/       # React 应用
│   └── dist/          # 构建输出
├── configs/           # 配置文件
└── data/             # 数据存储
```

### 开发环境设置
```bash
# 安装 Go 依赖
go mod tidy

# 安装前端依赖
cd web/frontend && npm install

# 启动开发服务器
go run ./cmd/server

# 前端热重载
cd web/frontend && npm run dev
```

## 📝 更新日志

### v1.1.0 (2026-01-01)
- 🚀 **UI/UX 升级**: 全新设计的登录页面，采用毛玻璃效果和更现代的视觉风格
- 🔒 **安全增强**: 修复了 JWT 令牌过期配置失效的问题，增强了会话稳定性，并支持在配置中自定义会话超时时间
- 🛠️ **稳定性优化**: 优化了 WebSocket 连接管理，增加了累计连接数统计，并修复了在高并发场景下的锁竞争问题
- 🐛 **问题修复**: 修复了由于网络波动导致的误登出问题，统一了前后端 API 响应标准，解决了前端 Token 提取失败的 bug
- 🤖 **CI/CD 增强**: 完善了 GitHub Actions 工作流，支持提交后自动构建，版本号精确到小时
- 📊 **监控优化**: 修正了仪表盘内存统计逻辑，提供更准确的系统负载信息

### v1.0.0 (2025-01-01)
- ✅ 完整的 Webhook 转 WebSocket 功能
- ✅ 现代化的 React 管理界面
- ✅ 完善的密钥管理系统
- ✅ 实时监控和日志系统
- ✅ Ed25519 签名验证
- ✅ Docker 部署支持

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/AmazingFeature`
3. 提交变更: `git commit -m 'Add some AmazingFeature'`
4. 推送分支: `git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

- 📖 [文档](https://github.com/your-repo/webhookhub/wiki)
- 🐛 [问题反馈](https://github.com/your-repo/webhookhub/issues)
- 💬 [讨论](https://github.com/your-repo/webhookhub/discussions)

---

**NekoBridge** - 让 Webhook 消息转发更简单、更高效、更安全！🐱
© 2026 NekoBridge Team.