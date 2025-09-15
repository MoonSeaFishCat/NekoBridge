# NekoBridge Makefile
# 使用方法:
#   make build          - 构建所有平台
#   make build-frontend - 只构建前端
#   make build-backend  - 只构建后端
#   make release        - 创建发布包
#   make clean          - 清理构建文件
#   make dev            - 开发模式运行

.PHONY: all build build-frontend build-backend release clean dev install-deps

# 默认版本
VERSION ?= dev
BUILD_DIR = build
DIST_DIR = dist
LDFLAGS = -w -s

# 构建所有
all: clean build release

# 安装依赖
install-deps:
	@echo "📦 安装依赖..."
	@cd web/frontend && pnpm install
	@go mod download

# 构建前端
build-frontend:
	@echo "🔨 构建前端..."
	@if [ ! -d "web/frontend" ]; then \
		echo "❌ 前端目录不存在: web/frontend"; \
		exit 1; \
	fi
	@cd web/frontend && pnpm install && pnpm build
	@mkdir -p web/dist
	@cp -r web/frontend/dist/* web/dist/
	@echo "✅ 前端构建完成"

# 构建后端
build-backend:
	@echo "🔨 构建后端..."
	@mkdir -p $(BUILD_DIR)
	
	@echo "🐧 构建 Linux amd64..."
	@GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/nekobridge-linux-amd64 .
	
	@echo "🪟 构建 Windows amd64..."
	@GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/nekobridge-windows-amd64.exe .
	
	@echo "🍎 构建 macOS amd64..."
	@GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/nekobridge-darwin-amd64 .
	
	@echo "🍎 构建 macOS arm64..."
	@GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o $(BUILD_DIR)/nekobridge-darwin-arm64 .
	
	@echo "✅ 后端构建完成"

# 构建所有
build: build-frontend build-backend

# 创建发布包
release: build
	@echo "📦 创建发布包..."
	@mkdir -p $(DIST_DIR)
	
	# Linux amd64
	@mkdir -p $(DIST_DIR)/nekobridge-linux-amd64
	@cp $(BUILD_DIR)/nekobridge-linux-amd64 $(DIST_DIR)/nekobridge-linux-amd64/nekobridge
	@cp -r configs $(DIST_DIR)/nekobridge-linux-amd64/
	@cp -r web $(DIST_DIR)/nekobridge-linux-amd64/
	@cp README.md $(DIST_DIR)/nekobridge-linux-amd64/
	@echo '#!/bin/bash\necho "🐱 启动 NekoBridge..."\n./nekobridge' > $(DIST_DIR)/nekobridge-linux-amd64/start.sh
	@chmod +x $(DIST_DIR)/nekobridge-linux-amd64/start.sh
	@cd $(DIST_DIR) && tar -czf nekobridge-linux-amd64-$(VERSION).tar.gz nekobridge-linux-amd64
	
	# Windows amd64
	@mkdir -p $(DIST_DIR)/nekobridge-windows-amd64
	@cp $(BUILD_DIR)/nekobridge-windows-amd64.exe $(DIST_DIR)/nekobridge-windows-amd64/nekobridge.exe
	@cp -r configs $(DIST_DIR)/nekobridge-windows-amd64/
	@cp -r web $(DIST_DIR)/nekobridge-windows-amd64/
	@cp README.md $(DIST_DIR)/nekobridge-windows-amd64/
	@echo '@echo off\necho 🐱 启动 NekoBridge...\nnekobridge.exe\npause' > $(DIST_DIR)/nekobridge-windows-amd64/start.bat
	@cd $(DIST_DIR) && zip -r nekobridge-windows-amd64-$(VERSION).zip nekobridge-windows-amd64
	
	# macOS amd64
	@mkdir -p $(DIST_DIR)/nekobridge-darwin-amd64
	@cp $(BUILD_DIR)/nekobridge-darwin-amd64 $(DIST_DIR)/nekobridge-darwin-amd64/nekobridge
	@cp -r configs $(DIST_DIR)/nekobridge-darwin-amd64/
	@cp -r web $(DIST_DIR)/nekobridge-darwin-amd64/
	@cp README.md $(DIST_DIR)/nekobridge-darwin-amd64/
	@echo '#!/bin/bash\necho "🐱 启动 NekoBridge..."\n./nekobridge' > $(DIST_DIR)/nekobridge-darwin-amd64/start.sh
	@chmod +x $(DIST_DIR)/nekobridge-darwin-amd64/start.sh
	@cd $(DIST_DIR) && tar -czf nekobridge-darwin-amd64-$(VERSION).tar.gz nekobridge-darwin-amd64
	
	# macOS arm64
	@mkdir -p $(DIST_DIR)/nekobridge-darwin-arm64
	@cp $(BUILD_DIR)/nekobridge-darwin-arm64 $(DIST_DIR)/nekobridge-darwin-arm64/nekobridge
	@cp -r configs $(DIST_DIR)/nekobridge-darwin-arm64/
	@cp -r web $(DIST_DIR)/nekobridge-darwin-arm64/
	@cp README.md $(DIST_DIR)/nekobridge-darwin-arm64/
	@echo '#!/bin/bash\necho "🐱 启动 NekoBridge..."\n./nekobridge' > $(DIST_DIR)/nekobridge-darwin-arm64/start.sh
	@chmod +x $(DIST_DIR)/nekobridge-darwin-arm64/start.sh
	@cd $(DIST_DIR) && tar -czf nekobridge-darwin-arm64-$(VERSION).tar.gz nekobridge-darwin-arm64
	
	@echo "✅ 发布包创建完成！"
	@echo ""
	@echo "📁 发布包位置:"
	@echo "  - Linux amd64:   $(DIST_DIR)/nekobridge-linux-amd64-$(VERSION).tar.gz"
	@echo "  - Windows amd64: $(DIST_DIR)/nekobridge-windows-amd64-$(VERSION).zip"
	@echo "  - macOS amd64:   $(DIST_DIR)/nekobridge-darwin-amd64-$(VERSION).tar.gz"
	@echo "  - macOS arm64:   $(DIST_DIR)/nekobridge-darwin-arm64-$(VERSION).tar.gz"

# 开发模式运行
dev: build-frontend
	@echo "🚀 开发模式启动..."
	@go run .

# 仅构建当前平台用于开发
dev-build: build-frontend
	@echo "🔨 构建当前平台版本..."
	@go build -ldflags="$(LDFLAGS)" -o nekobridge .

# 清理构建文件
clean:
	@echo "🧹 清理构建文件..."
	@rm -rf $(BUILD_DIR) $(DIST_DIR)
	@rm -rf web/dist
	@rm -f nekobridge nekobridge.exe
	@echo "✅ 清理完成"

# 测试
test:
	@echo "🧪 运行测试..."
	@go test -v ./...

# 格式化代码
fmt:
	@echo "🎨 格式化代码..."
	@go fmt ./...
	@cd web/frontend && pnpm format

# 检查代码
lint:
	@echo "🔍 检查代码..."
	@golangci-lint run
	@cd web/frontend && pnpm lint

# 显示帮助
help:
	@echo "NekoBridge 构建工具"
	@echo ""
	@echo "可用命令:"
	@echo "  make build          - 构建所有平台"
	@echo "  make build-frontend - 只构建前端"
	@echo "  make build-backend  - 只构建后端"
	@echo "  make release        - 创建发布包"
	@echo "  make dev            - 开发模式运行"
	@echo "  make dev-build      - 构建当前平台版本"
	@echo "  make clean          - 清理构建文件"
	@echo "  make test           - 运行测试"
	@echo "  make fmt            - 格式化代码"
	@echo "  make lint           - 检查代码"
	@echo "  make install-deps   - 安装依赖"
	@echo "  make help           - 显示帮助"
	@echo ""
	@echo "参数:"
	@echo "  VERSION=v1.0.0      - 设置版本号 (默认: dev)"
	@echo ""
	@echo "示例:"
	@echo "  make release VERSION=v1.0.0"
	@echo "  make dev"
