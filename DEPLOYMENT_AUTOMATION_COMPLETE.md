# 🚀 Backend 自动化部署完整指南

## 📋 概述

本指南涵盖 **Finance Platform Backend** 的完整自动化部署流程，包括：
- ✅ GitHub Actions CI/CD 自动部署
- ✅ 环境变量验证
- ✅ 健康检查
- ✅ SEO 自动化系统部署

---

## 📍 部署信息

| 项目 | 信息 |
|------|------|
| **GitHub 仓库** | https://github.com/cheng1103/finance_backend |
| **分支** | main |
| **EC2 IP** | 13.214.8.31 |
| **部署路径** | /var/www/eplatformcredit/backend |
| **PM2 进程名** | finance-api |
| **端口** | 3001 |

---

## 🎯 部署架构

```
GitHub Push (main branch)
    ↓
GitHub Actions Triggered
    ↓
1. Run Tests
2. SSH to EC2
3. Backup Current Version
4. Pull Latest Code
5. Install Dependencies
6. Validate Environment
7. Restart PM2
8. Health Check
    ↓
Deployment Success ✅
```

---

## 🔧 第一次设置（一次性）

### Step 1: 准备 EC2 服务器

SSH 到你的 EC2：
```bash
ssh ubuntu@13.214.8.31
```

**确认目录结构：**
```bash
# 应该已存在
ls -la /var/www/eplatformcredit/backend

# 确认 Git 仓库
cd /var/www/eplatformcredit/backend
git remote -v
# 应该显示: https://github.com/cheng1103/finance_backend
```

**如果目录不存在，创建并克隆：**
```bash
sudo mkdir -p /var/www/eplatformcredit
cd /var/www/eplatformcredit
sudo git clone https://github.com/cheng1103/finance_backend.git backend
sudo chown -R ubuntu:ubuntu /var/www/eplatformcredit
```

---

### Step 2: 配置 GitHub Secrets

在 GitHub 仓库设置 Secrets：

1. 访问：https://github.com/cheng1103/finance_backend/settings/secrets/actions

2. 点击 **"New repository secret"**

3. 添加以下 3 个 secrets：

**Secret 1: EC2_HOST**
```
Name: EC2_HOST
Value: 13.214.8.31
```

**Secret 2: EC2_USER**
```
Name: EC2_USER
Value: ubuntu
```

**Secret 3: EC2_SSH_KEY**
```
Name: EC2_SSH_KEY
Value: [你的私钥内容]
```

**如何获取私钥：**
- 如果你用密钥文件登录 EC2，复制私钥文件内容
- 文件通常是 `.pem` 格式
- 在 Windows: `type your-key.pem | clip`
- 在 Mac/Linux: `cat your-key.pem | pbcopy`

**私钥格式示例：**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
... (很多行)
-----END RSA PRIVATE KEY-----
```

---

### Step 3: 配置 EC2 环境文件

SSH 到 EC2，创建生产环境配置：

```bash
cd /var/www/eplatformcredit/backend
nano .env.production
```

**最小配置：**
```bash
NODE_ENV=production
PORT=3001

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Domain
FRONTEND_URL=https://www.eplatformcredit.com
ADMIN_URL=https://admin.eplatformcredit.com

# JWT
JWT_SECRET=your-super-secure-secret-at-least-32-characters-long
JWT_EXPIRES_IN=7d

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your-bcrypt-password-hash-here

# CORS
CORS_ORIGIN=https://www.eplatformcredit.com,https://admin.eplatformcredit.com,https://eplatformcredit.com
```

**生成 JWT Secret：**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**生成 Admin Password Hash：**
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourPassword', 10).then(console.log)"
```

**保存并退出：** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Step 4: 创建必要目录和权限

```bash
# 确保脚本可执行
chmod +x /var/www/eplatformcredit/backend/scripts/*.js

# 创建备份目录
sudo mkdir -p /var/www/eplatformcredit/backups
sudo chown ubuntu:ubuntu /var/www/eplatformcredit/backups

# 创建日志目录
mkdir -p /var/www/eplatformcredit/backend/logs
```

---

### Step 5: 测试脚本

```bash
cd /var/www/eplatformcredit/backend

# 测试环境验证
node scripts/validate-env.js

# 如果成功，应该看到：
# ✅ Validation PASSED - All checks successful!

# 测试健康检查
node scripts/health-check.js
```

---

### Step 6: 首次手动部署

```bash
cd /var/www/eplatformcredit/backend

# 安装依赖
npm install --production

# 启动 PM2
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 复制输出的命令并执行
```

**验证运行：**
```bash
pm2 status
pm2 logs finance-api
curl http://localhost:3001/health
```

---

## 🤖 自动化部署使用

### 触发自动部署

**方法 1: 推送代码到 main 分支**
```bash
# 在本地
git add .
git commit -m "Update backend"
git push origin main
```

GitHub Actions 会自动运行部署！

**方法 2: 手动触发**
1. 访问：https://github.com/cheng1103/finance_backend/actions
2. 选择 "Deploy Backend to EC2"
3. 点击 "Run workflow"
4. 选择 main 分支
5. 点击 "Run workflow"

---

### 监控部署进度

1. 访问：https://github.com/cheng1103/finance_backend/actions

2. 点击最新的 workflow run

3. 查看实时日志

**成功的部署会显示：**
```
✅ Backup created
✅ Latest code pulled
✅ Dependencies installed
✅ Environment validated
✅ PM2 restarted
✅ Health check passed
✅ Deployment Completed Successfully!
```

---

## 📊 查看部署日志

**在 GitHub：**
- https://github.com/cheng1103/finance_backend/actions

**在 EC2：**
```bash
# PM2 日志
pm2 logs finance-api

# 最近 100 行
pm2 logs finance-api --lines 100

# 只看错误
pm2 logs finance-api --err
```

---

## 🔄 回滚到之前版本

如果部署出问题，可以快速回滚：

```bash
ssh ubuntu@13.214.8.31

# 查看备份
ls -lt /var/www/eplatformcredit/backups/

# 找到最近的备份，例如：
# backend-20250115-143022

# 停止当前服务
pm2 stop finance-api

# 回滚
cd /var/www/eplatformcredit
mv backend backend-broken
cp -r backups/backend-20250115-143022 backend
cd backend

# 重启
pm2 restart finance-api

# 验证
pm2 logs finance-api
curl http://localhost:3001/health
```

---

## 🛠️ 常用维护命令

### PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs finance-api

# 重启服务
pm2 restart finance-api

# 停止服务
pm2 stop finance-api

# 查看监控
pm2 monit

# 查看详细信息
pm2 show finance-api
```

### 手动验证

```bash
cd /var/www/eplatformcredit/backend

# 验证环境变量
node scripts/validate-env.js

# 健康检查
node scripts/health-check.js

# 测试 API
curl http://localhost:3001/health
curl http://localhost:3001/api/csrf-token
```

### Git 管理

```bash
cd /var/www/eplatformcredit/backend

# 查看当前状态
git status

# 查看最近提交
git log --oneline -5

# 强制更新到最新
git fetch origin main
git reset --hard origin/main
```

---

## 🔧 故障排查

### 问题 1: GitHub Actions 部署失败

**检查：**
1. GitHub Secrets 是否正确设置
2. SSH 密钥是否有效
3. EC2 是否可访问

**解决：**
```bash
# 测试 SSH 连接
ssh ubuntu@13.214.8.31

# 检查 GitHub Actions 日志
# 访问: https://github.com/cheng1103/finance_backend/actions
```

---

### 问题 2: 环境验证失败

**错误信息：**
```
❌ MONGODB_URI: MISSING (REQUIRED)
```

**解决：**
```bash
ssh ubuntu@13.214.8.31
cd /var/www/eplatformcredit/backend
nano .env.production
# 添加缺失的环境变量
```

---

### 问题 3: 健康检查失败

**错误信息：**
```
❌ Error: ECONNREFUSED
```

**解决：**
```bash
# 检查 PM2 状态
pm2 status

# 查看错误日志
pm2 logs finance-api --err

# 重启服务
pm2 restart finance-api
```

---

### 问题 4: PM2 进程未启动

**解决：**
```bash
# 删除旧进程
pm2 delete finance-api

# 重新启动
pm2 start ecosystem.config.js --env production

# 保存配置
pm2 save
```

---

## 📱 SEO 自动化系统部署

详细步骤请查看：**SEO_EC2_DEPLOYMENT_GUIDE.md**

**快速部署：**
```bash
ssh ubuntu@13.214.8.31
cd /var/www/eplatformcredit/backend/seo-automation

# 安装依赖
npm install

# 配置环境
cp .env.example .env
nano .env
# 添加 GEMINI_API_KEY

# 测试
node index.js test

# 启动
pm2 start ecosystem.config.js
pm2 save
```

---

## 🔐 安全最佳实践

### 1. 保护敏感文件

```bash
# 设置 .env 权限
chmod 600 /var/www/eplatformcredit/backend/.env.production

# 确保 .gitignore 包含
echo ".env.production" >> .gitignore
echo ".env" >> .gitignore
```

### 2. 定期更新密钥

```bash
# 更新 JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# 更新 Admin 密码
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NewPassword', 10).then(console.log)"

# 更新 .env.production
nano .env.production
```

### 3. 限制 SSH 访问

```bash
# 编辑 SSH 配置
sudo nano /etc/ssh/sshd_config

# 添加/修改：
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# 重启 SSH
sudo systemctl restart sshd
```

### 4. 配置防火墙

```bash
# 只允许必要端口
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 📊 监控和日志

### 应用日志

```bash
# PM2 日志
pm2 logs finance-api --lines 200

# 导出日志
pm2 logs finance-api --lines 1000 > backend-logs.txt
```

### 系统资源监控

```bash
# CPU 和内存
pm2 monit

# 磁盘使用
df -h

# 内存使用
free -h

# 进程状态
top
```

### 定期清理

```bash
# 清理旧备份（保留最近 10 个）
cd /var/www/eplatformcredit/backups
ls -t | tail -n +11 | xargs -r rm -rf

# 清理 PM2 日志
pm2 flush

# 清理 npm 缓存
npm cache clean --force
```

---

## 📅 维护计划

### 每日检查

```bash
# 查看 PM2 状态
pm2 status

# 查看最近错误
pm2 logs finance-api --err --lines 50

# 健康检查
curl http://localhost:3001/health
```

### 每周检查

```bash
# 更新依赖
npm outdated

# 查看磁盘空间
df -h

# 查看系统更新
sudo apt update
sudo apt list --upgradable
```

### 每月检查

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新 Node.js（如需要）
node -v
npm -v

# 检查 MongoDB 白名单
# 访问: https://cloud.mongodb.com
```

---

## 🎯 性能优化

### PM2 集群模式

编辑 `ecosystem.config.js`:
```javascript
instances: 'max',  // 使用所有 CPU 核心
exec_mode: 'cluster'
```

重启：
```bash
pm2 reload ecosystem.config.js
```

### Nginx 缓存

如果使用 Nginx：
```nginx
# 启用 gzip
gzip on;
gzip_types text/plain application/json;

# 启用缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
```

---

## 📞 快速参考

### 重要路径

| 路径 | 说明 |
|------|------|
| `/var/www/eplatformcredit/backend` | Backend 主目录 |
| `/var/www/eplatformcredit/backend/.env.production` | 生产环境变量 |
| `/var/www/eplatformcredit/backups` | 备份目录 |
| `/var/www/eplatformcredit/backend/seo-automation` | SEO 系统 |
| `~/.pm2/logs` | PM2 日志目录 |

### 重要命令

```bash
# 快速重启
pm2 restart finance-api

# 快速查看日志
pm2 logs finance-api --lines 50

# 快速健康检查
curl http://localhost:3001/health

# 快速验证环境
node scripts/validate-env.js

# 手动部署
cd /var/www/eplatformcredit/backend && \
git pull origin main && \
npm install --production && \
pm2 restart finance-api
```

### 重要 URLs

| URL | 说明 |
|-----|------|
| https://github.com/cheng1103/finance_backend | 代码仓库 |
| https://github.com/cheng1103/finance_backend/actions | GitHub Actions |
| https://github.com/cheng1103/finance_backend/settings/secrets | GitHub Secrets |
| https://cloud.mongodb.com | MongoDB Atlas |
| http://13.214.8.31:3001/health | 健康检查端点 |

---

## ✅ 部署检查清单

### 首次部署

- [ ] EC2 服务器可访问
- [ ] GitHub Secrets 已配置
  - [ ] EC2_HOST
  - [ ] EC2_USER
  - [ ] EC2_SSH_KEY
- [ ] .env.production 已创建并配置
- [ ] MongoDB IP 白名单已添加 EC2 IP
- [ ] PM2 已安装并启动
- [ ] 健康检查通过
- [ ] GitHub Actions workflow 存在

### 每次部署后

- [ ] GitHub Actions 部署成功
- [ ] PM2 进程运行中
- [ ] 健康检查端点返回 200
- [ ] 日志无严重错误
- [ ] API 功能正常

---

## 🎉 完成！

你的 Backend 自动化部署系统现在已完全配置好！

**下一步：**
1. 推送代码到 GitHub，触发首次自动部署
2. 部署 SEO 自动化系统（参考 SEO_EC2_DEPLOYMENT_GUIDE.md）
3. 配置监控和告警
4. 设置定期备份

**需要帮助？**
- 查看 GitHub Actions 日志
- 查看 PM2 日志：`pm2 logs finance-api`
- 运行诊断：`node scripts/validate-env.js`

祝部署顺利！🚀
