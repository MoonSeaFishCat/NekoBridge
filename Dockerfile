# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/web/frontend

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件并安装
COPY web/frontend/package.json web/frontend/pnpm-lock.yaml ./
RUN pnpm install

# 复制源码并构建
COPY web/frontend/ ./
RUN pnpm run build

# Stage 2: Build Backend
FROM golang:1.23-bullseye AS backend-builder
WORKDIR /app

# 安装 SQLite 编译所需的依赖 (CGO)
RUN apt-get update && apt-get install -y gcc libc6-dev

# 复制 Go 依赖文件
COPY go.mod go.sum ./
RUN go mod download

# 复制后端源码
COPY . .

# 将前端构建产物复制到后端目录以便 embed
# 根据 vite.config.ts，构建产物在 web/dist
COPY --from=frontend-builder /app/web/dist ./web/dist

# 编译后端 (启用 CGO)
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o nekobridge main.go

# Stage 3: Final Image
FROM debian:bullseye-slim
WORKDIR /app

# 安装运行所需的库和时区数据
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    tzdata \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 设置时区
ENV TZ=Asia/Shanghai

# 从构建阶段复制二进制文件
COPY --from=backend-builder /app/nekobridge .

# 复制默认配置
COPY configs/config.yaml ./configs/config.yaml

# 创建数据目录挂载点
RUN mkdir -p data

# 暴露端口
EXPOSE 15141

# 挂载卷
VOLUME ["/app/data", "/app/configs"]

# 启动命令
CMD ["./nekobridge"]
