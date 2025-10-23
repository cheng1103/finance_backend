# ⚡ 快速开始 - Backend 部署

## 🎯 你需要的所有信息

### 📍 基本信息
```
GitHub 仓库: https://github.com/cheng1103/finance_backend
EC2 IP: 13.214.8.31
用户名: ubuntu
部署路径: /var/www/eplatformcredit/backend
```

---

## 🚀 3 步完成自动部署设置

### Step 1: 配置 GitHub Secrets (2 分钟)

访问：https://github.com/cheng1103/finance_backend/settings/secrets/actions

添加 3 个 secrets：

```
EC2_HOST = 13.214.8.31
EC2_USER = ubuntu
EC2_SSH_KEY = [你的私钥内容，包括 BEGIN 和 END 行]
```

### Step 2: 配置 EC2 环境 (5 分钟)

```bash
ssh ubuntu@13.214.8.31

cd /var/www/eplatformcredit/backend
nano .env.production

# 复制粘贴以下内容（修改实际值）：
NODE_ENV=production
PORT=3001
MONGODB_URI=your_mongodb_connection_string
FRONTEND_URL=https://www.eplatformcredit.com
ADMIN_URL=https://admin.eplatformcredit.com
JWT_SECRET=your_jwt_secret_at_least_32_chars
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your_bcrypt_hash
CORS_ORIGIN=https://www.eplatformcredit.com,https://admin.eplatformcredit.com

# 保存：Ctrl+O, Enter, Ctrl+X
```

### Step 3: 首次部署 (3 分钟)

```bash
# 还在 EC2 SSH 会话中
cd /var/www/eplatformcredit/backend
npm install --production
node scripts/validate-env.js
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # 复制输出的命令并执行
```

---

## ✅ 验证部署成功

```bash
# 检查 PM2 状态
pm2 status

# 应该看到：
# finance-api | online | 0 | ...

# 测试 API
curl http://localhost:3001/health

# 应该返回：
# {"status":"success","message":"Finance Platform API is running normally"}
```

---

## 🤖 使用自动部署

### 触发部署

**方法 1：推送代码**
```bash
git add .
git commit -m "Your changes"
git push origin main
```
→ GitHub Actions 自动部署！

**方法 2：手动触发**
1. 访问：https://github.com/cheng1103/finance_backend/actions
2. 点击 "Deploy Backend to EC2"
3. 点击 "Run workflow"

### 查看部署状态

访问：https://github.com/cheng1103/finance_backend/actions

---

## 📱 部署 SEO 自动化 (可选)

```bash
ssh ubuntu@13.214.8.31
cd /var/www/eplatformcredit/backend/seo-automation

npm install
cp .env.example .env
nano .env  # 添加 GEMINI_API_KEY

node index.js test
pm2 start ecosystem.config.js
pm2 save
```

**详细步骤：** 查看 `SEO_EC2_DEPLOYMENT_GUIDE.md`

---

## 🛠️ 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs finance-api

# 重启服务
pm2 restart finance-api

# 验证环境
npm run validate-env

# 健康检查
npm run health-check
```

---

## 📚 完整文档

| 文档 | 说明 |
|------|------|
| `DEPLOYMENT_AUTOMATION_COMPLETE.md` | 完整部署指南 |
| `SEO_EC2_DEPLOYMENT_GUIDE.md` | SEO 系统部署 |
| `.github/workflows/deploy.yml` | GitHub Actions 配置 |
| `scripts/validate-env.js` | 环境验证脚本 |
| `scripts/health-check.js` | 健康检查脚本 |

---

## 🆘 遇到问题？

### 部署失败
```bash
# 查看 GitHub Actions 日志
https://github.com/cheng1103/finance_backend/actions

# 查看 EC2 日志
pm2 logs finance-api --err
```

### 健康检查失败
```bash
# 重启服务
pm2 restart finance-api

# 查看详细日志
pm2 logs finance-api --lines 100
```

### 环境验证失败
```bash
# 检查配置
nano .env.production

# 重新验证
node scripts/validate-env.js
```

---

**准备好了吗？开始配置 GitHub Secrets！** 🚀
