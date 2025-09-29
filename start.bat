@echo off
echo 正在启动金融平台后端API服务...
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查npm是否安装
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到npm，请先安装npm
    pause
    exit /b 1
)

REM 切换到后端目录
cd /d "%~dp0"

REM 检查是否存在node_modules
if not exist "node_modules" (
    echo 正在安装依赖包...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo 错误: 依赖包安装失败
        pause
        exit /b 1
    )
)

REM 检查是否存在.env文件
if not exist ".env" (
    echo 警告: 未找到.env文件，请参考.env.example创建配置文件
    echo 继续使用默认配置...
)

echo.
echo ========================================
echo 金融平台后端API服务正在启动...
echo ========================================
echo 服务地址: http://localhost:3001
echo 健康检查: http://localhost:3001/health
echo API文档: http://localhost:3001/api
echo ========================================
echo 按 Ctrl+C 停止服务
echo.

REM 启动开发服务器
if exist "node_modules\.bin\nodemon.cmd" (
    echo 使用nodemon启动开发服务器...
    npm run dev
) else (
    echo 使用node启动服务器...
    npm start
)

pause



