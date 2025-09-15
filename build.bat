@echo off
setlocal enabledelayedexpansion

REM NekoBridge Windows 构建脚本
REM 用法: build.bat [版本号]
REM 例如: build.bat v1.0.0

set "VERSION=%~1"
if "%VERSION%"=="" set "VERSION=dev"

set "BUILD_DIR=build"
set "DIST_DIR=dist"

echo 🐱 NekoBridge Windows 构建脚本
echo 版本: %VERSION%

REM 清理构建目录
echo 🧹 清理构建目录...
if exist "%BUILD_DIR%" (
    echo 正在删除 %BUILD_DIR% 目录...
    rmdir /s /q "%BUILD_DIR%" 2>nul
    if exist "%BUILD_DIR%" (
        echo ⚠️  无法完全清理 %BUILD_DIR% 目录，可能有文件被占用
    )
)
if exist "%DIST_DIR%" (
    echo 正在删除 %DIST_DIR% 目录...
    rmdir /s /q "%DIST_DIR%" 2>nul
    if exist "%DIST_DIR%" (
        echo ⚠️  无法完全清理 %DIST_DIR% 目录，可能有文件被占用
    )
)

echo 创建构建目录...
mkdir "%BUILD_DIR%" 2>nul
mkdir "%DIST_DIR%" 2>nul

if not exist "%BUILD_DIR%" (
    echo ❌ 无法创建构建目录: %BUILD_DIR%
    pause
    exit /b 1
)

if not exist "%DIST_DIR%" (
    echo ❌ 无法创建分发目录: %DIST_DIR%
    pause
    exit /b 1
)

REM 检查 pnpm
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pnpm 未安装，请先安装 pnpm
    echo npm install -g pnpm
    pause
    exit /b 1
)

REM 检查前端目录
if not exist "web\frontend" (
    echo ❌ 前端目录不存在: web\frontend
    pause
    exit /b 1
)

REM 构建前端
echo 🔨 构建前端...
cd web\frontend
pnpm install
if errorlevel 1 (
    echo ❌ 前端依赖安装失败
    pause
    exit /b 1
)

pnpm build
if errorlevel 1 (
    echo ❌ 前端构建失败
    pause
    exit /b 1
)
cd ..\..

REM 复制前端构建文件
echo 📁 复制前端文件...
if not exist "web\dist" mkdir "web\dist"
xcopy /e /i /y "web\frontend\dist\*" "web\dist\"

REM 构建后端 - Linux
echo 🐧 构建 Linux 版本...
set GOOS=linux
set GOARCH=amd64
set CGO_ENABLED=0
go build -ldflags="-w -s" -o "%BUILD_DIR%\nekobridge-linux-amd64" .
if errorlevel 1 (
    echo ❌ Linux 版本构建失败
    pause
    exit /b 1
)

REM 构建后端 - Windows
echo 🪟 构建 Windows 版本...
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -ldflags="-w -s" -o "%BUILD_DIR%\nekobridge-windows-amd64.exe" .
if errorlevel 1 (
    echo ❌ Windows 版本构建失败
    pause
    exit /b 1
)

REM 创建发布包 - Linux
echo 📦 创建 Linux 发布包...
set "LINUX_DIR=%DIST_DIR%\nekobridge-linux-amd64"
mkdir "%LINUX_DIR%"
copy "%BUILD_DIR%\nekobridge-linux-amd64" "%LINUX_DIR%\nekobridge"
xcopy /e /i /y "configs" "%LINUX_DIR%\configs\"
xcopy /e /i /y "web" "%LINUX_DIR%\web\"
copy "README.md" "%LINUX_DIR%\"

REM 创建启动脚本 - Linux
echo #!/bin/bash > "%LINUX_DIR%\start.sh"
echo echo "🐱 启动 NekoBridge..." >> "%LINUX_DIR%\start.sh"
echo ./nekobridge >> "%LINUX_DIR%\start.sh"

REM 创建发布包 - Windows
echo 📦 创建 Windows 发布包...
set "WINDOWS_DIR=%DIST_DIR%\nekobridge-windows-amd64"
mkdir "%WINDOWS_DIR%"
copy "%BUILD_DIR%\nekobridge-windows-amd64.exe" "%WINDOWS_DIR%\nekobridge.exe"
xcopy /e /i /y "configs" "%WINDOWS_DIR%\configs\"
xcopy /e /i /y "web" "%WINDOWS_DIR%\web\"
copy "README.md" "%WINDOWS_DIR%\"

REM 创建启动脚本 - Windows
echo @echo off > "%WINDOWS_DIR%\start.bat"
echo echo 🐱 启动 NekoBridge... >> "%WINDOWS_DIR%\start.bat"
echo nekobridge.exe >> "%WINDOWS_DIR%\start.bat"
echo pause >> "%WINDOWS_DIR%\start.bat"

REM 检查 tar 命令（用于 Linux 包）
tar --version >nul 2>&1
if not errorlevel 1 (
    echo 📦 打包 Linux 版本...
    cd "%DIST_DIR%"
    tar -czf "nekobridge-linux-amd64-%VERSION%.tar.gz" "nekobridge-linux-amd64"
    cd ..
) else (
    echo ⚠️  tar 命令不可用，跳过 Linux tar.gz 包创建
)

REM 打包 Windows 版本（使用 PowerShell）
echo 📦 打包 Windows 版本...
powershell -Command "Compress-Archive -Path '%DIST_DIR%\nekobridge-windows-amd64' -DestinationPath '%DIST_DIR%\nekobridge-windows-amd64-%VERSION%.zip' -Force"

echo ✅ 构建完成！
echo.
echo 📁 发布包位置:
if exist "%DIST_DIR%\nekobridge-linux-amd64-%VERSION%.tar.gz" (
    echo   - Linux:   %DIST_DIR%\nekobridge-linux-amd64-%VERSION%.tar.gz
)
echo   - Windows: %DIST_DIR%\nekobridge-windows-amd64-%VERSION%.zip
echo.
echo 🚀 安装说明:
echo Linux:
echo   tar -xzf nekobridge-linux-amd64-%VERSION%.tar.gz
echo   cd nekobridge-linux-amd64
echo   ./start.sh
echo.
echo Windows:
echo   解压 nekobridge-windows-amd64-%VERSION%.zip
echo   双击运行 start.bat
echo.
echo 🌐 访问地址: http://localhost:3000
pause
