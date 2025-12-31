#!/bin/bash

# NekoBridge Linux amd64 构建脚本

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

echo -e "${YELLOW}� 开始构建 NekoBridge (Linux amd64)...${NC}"

# 1. 前端构建
echo -e "${YELLOW}📦 正在构建前端...${NC}"
cd web/frontend
if [ -f "pnpm-lock.yaml" ]; then
    pnpm install && pnpm build
elif [ -f "yarn.lock" ]; then
    yarn install && yarn build
else
    npm install && npm run build
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 前端构建失败！${NC}"
    exit 1
fi
cd ../..

# 2. 准备静态资源目录
echo -e "${YELLOW}� 正在同步静态资源...${NC}"
mkdir -p web/dist
cp -r web/frontend/dist/* web/dist/

# 3. 后端构建 (交叉编译)
echo -e "${YELLOW}� 正在构建后端 (Linux amd64)...${NC}"
export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=1 # 注意：SQLite 需要 CGO。如果交叉编译报错，请确保已安装 gcc-multilib

# 设置构建版本号和时间
VERSION="2.0.0"
BUILD_TIME=$(date "+%Y-%m-%d %H:%M:%S")
LDFLAGS="-X 'main.Version=${VERSION}' -X 'main.BuildTime=${BUILD_TIME}' -s -w"

go build -ldflags "$LDFLAGS" -o bin/nekobridge-linux-amd64 main.go

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 后端构建失败！${NC}"
    echo -e "${YELLOW}提示：SQLite 需要 CGO 支持。如果是从 Windows/macOS 交叉编译到 Linux，需要安装对应的交叉编译工具链（如 x86_64-linux-gnu-gcc）。${NC}"
    echo -e "${YELLOW}或者您可以尝试设置 CGO_ENABLED=0，但这将导致 SQLite 无法使用。建议在 Linux 环境下或使用 Docker 进行构建。${NC}"
    exit 1
fi

# 4. 整理发布包
echo -e "${YELLOW}🎁 正在整理发布包...${NC}"
mkdir -p release
cp bin/nekobridge-linux-amd64 release/nekobridge
cp -r configs release/
mkdir -p release/data
mkdir -p release/logs

echo -e "${GREEN}✅ 构建完成！${NC}"
echo -e "${GREEN}� 发布包位于: ./release${NC}"
echo -e "${YELLOW}使用方法:${NC}"
echo -e "  cd release"
echo -e "  chmod +x nekobridge"
echo -e "  ./nekobridge"
