#!/bin/bash

# NekoBridge 构建脚本
# 用法: ./build.sh [版本号]
# 例如: ./build.sh v1.0.0

set -e

VERSION=${1:-"dev"}
BUILD_DIR="build"
DIST_DIR="dist"

echo "🐱 NekoBridge 构建脚本"
echo "版本: $VERSION"

# 清理构建目录
echo "🧹 清理构建目录..."
rm -rf $BUILD_DIR $DIST_DIR
mkdir -p $BUILD_DIR $DIST_DIR

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，请先安装 pnpm"
    echo "npm install -g pnpm"
    exit 1
fi

# 构建前端
echo "🔨 构建前端..."
cd web/frontend
pnpm install
pnpm build
cd ../..

# 复制前端构建文件
echo "📁 复制前端文件..."
mkdir -p web/dist
cp -r web/frontend/dist/* web/dist/

# 构建后端 - Linux
echo "🐧 构建 Linux 版本..."
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-w -s" -o $BUILD_DIR/nekobridge-linux-amd64

# 构建后端 - Windows
echo "🪟 构建 Windows 版本..."
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-w -s" -o $BUILD_DIR/nekobridge-windows-amd64.exe

# 创建发布包 - Linux
echo "📦 创建 Linux 发布包..."
LINUX_DIR="$DIST_DIR/nekobridge-linux-amd64"
mkdir -p $LINUX_DIR
cp $BUILD_DIR/nekobridge-linux-amd64 $LINUX_DIR/nekobridge
cp -r configs $LINUX_DIR/
cp -r web $LINUX_DIR/
cp README.md $LINUX_DIR/

# 创建启动脚本 - Linux
cat > $LINUX_DIR/start.sh << 'EOF'
#!/bin/bash
echo "🐱 启动 NekoBridge..."
./nekobridge
EOF
chmod +x $LINUX_DIR/start.sh

# 打包 Linux
cd $DIST_DIR
tar -czf nekobridge-linux-amd64-$VERSION.tar.gz nekobridge-linux-amd64
cd ..

# 创建发布包 - Windows
echo "📦 创建 Windows 发布包..."
WINDOWS_DIR="$DIST_DIR/nekobridge-windows-amd64"
mkdir -p $WINDOWS_DIR
cp $BUILD_DIR/nekobridge-windows-amd64.exe $WINDOWS_DIR/nekobridge.exe
cp -r configs $WINDOWS_DIR/
cp -r web $WINDOWS_DIR/
cp README.md $WINDOWS_DIR/

# 创建启动脚本 - Windows
cat > $WINDOWS_DIR/start.bat << 'EOF'
@echo off
echo 🐱 启动 NekoBridge...
nekobridge.exe
pause
EOF

# 打包 Windows
cd $DIST_DIR
zip -r nekobridge-windows-amd64-$VERSION.zip nekobridge-windows-amd64
cd ..

echo "✅ 构建完成！"
echo ""
echo "📁 发布包位置:"
echo "  - Linux:   $DIST_DIR/nekobridge-linux-amd64-$VERSION.tar.gz"
echo "  - Windows: $DIST_DIR/nekobridge-windows-amd64-$VERSION.zip"
echo ""
echo "🚀 安装说明:"
echo "Linux:"
echo "  tar -xzf nekobridge-linux-amd64-$VERSION.tar.gz"
echo "  cd nekobridge-linux-amd64"
echo "  ./start.sh"
echo ""
echo "Windows:"
echo "  解压 nekobridge-windows-amd64-$VERSION.zip"
echo "  双击运行 start.bat"
echo ""
echo "🌐 访问地址: http://localhost:3000"
