# ✅ 完整部署步骤 - 按顺序执行

## 📍 实际路径信息
```
EC2 IP: 13.214.8.31
用户: ubuntu
实际路径: /home/ubuntu/finance_backend
GitHub: https://github.com/cheng1103/finance_backend
```

---

## 🚀 Step 1: 推送代码到 GitHub

**在你的 Windows 电脑上：**

```bash
cd C:\Users\User\project\finance_fullstackDev\finance_backend

# 查看状态
git status

# 添加所有新文件
git add .

# 提交
git commit -m "Add deployment automation system

- GitHub Actions CI/CD workflow
- Environment validation script
- Health check script
- Complete deployment documentation
- Correct EC2 paths (/home/ubuntu/finance_backend)

🤖 Generated with Claude Code"

# 推送
git push origin main
```

---

## 🖥️ Step 2: SSH 到 EC2 并拉取代码

```bash
ssh ubuntu@13.214.8.31
cd /home/ubuntu/finance_backend

# 拉取最新代码
git pull origin main

# 确认文件存在
ls -la scripts/
# 应该看到: validate-env.js, health-check.js

ls -la .github/workflows/
# 应该看到: deploy.yml
```

---

## 📝 Step 3: 创建 .env.production

```bash
cd /home/ubuntu/finance_backend

# 创建环境文件
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://baabaa311_db_user:1jjMb368BQslysRQ@e-finance.boazyyj.mongodb.net/E-finance?retryWrites=true&w=majority&appName=E-finance
FRONTEND_URL=https://www.eplatformcredit.com
ADMIN_URL=https://admin.eplatformcredit.com
JWT_SECRET=kBxcBrpUeURiPYwLNg06zUdaduIoQEJaVnhAjRCguCbsHe0rDo9e6VDN/AepFQ8jrHEpj8eyqwdWUGj3I+faRA==
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=Weilun777
ADMIN_PASSWORD_HASH=$2a$10$DmfrIMCG43UbHBv07QFMo.s7h3LRngsGVLP0bgj0UQUpFCWv7AO5a
EOF

# 设置权限
chmod 600 .env.production

# 验证文件
cat .env.production
```

---

## ✅ Step 4: 验证环境

```bash
# 加载环境变量
export $(cat .env.production | xargs)

# 运行验证
node scripts/validate-env.js
```

**期望输出：**
```
═══════════════════════════════════════
🔍 Environment Variables Validation
═══════════════════════════════════════

📋 Checking Required Variables:
✅ NODE_ENV: SET
✅ PORT: SET
✅ MONGODB_URI: SET
✅ FRONTEND_URL: SET
✅ ADMIN_URL: SET
✅ JWT_SECRET: SET
✅ JWT_EXPIRES_IN: SET
✅ CORS_ORIGIN: SET

✅ Validation PASSED - All checks successful!
```

---

## 📦 Step 5: 安装依赖

```bash
cd /home/ubuntu/finance_backend
npm install --production
```

**等待完成，应该看到：**
```
added XXX packages
```

---

## 🔄 Step 6: 启动 PM2

```bash
# 如果有旧进程，先删除
pm2 delete all

# 启动新进程
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status
```

**期望看到：**
```
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ mode        │ status  │ cpu     │ memory   │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ finance-api  │ cluster     │ online  │ 0%      │ 50.0mb   │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘
```

---

## 📊 Step 7: 查看日志

```bash
# 实时日志
pm2 logs finance-api

# 按 Ctrl+C 退出日志查看
```

**期望看到：**
```
🚀 Finance Platform API Server Started Successfully!
📍 Server Address: http://localhost:3001
🌍 Environment: production
✅ MongoDB Atlas 连接成功!
```

---

## 🏥 Step 8: 健康检查

```bash
# 运行健康检查脚本
node scripts/health-check.js
```

**期望输出：**
```
═══════════════════════════════════════
🏥 Backend Health Check
═══════════════════════════════════════

🔍 Checking: API Health Endpoint
   URL: http://localhost:3001/health
   ✅ Status: 200 (XXXms)

✅ Health check PASSED!
All services are operational.
```

**或者用 curl 测试：**
```bash
curl http://localhost:3001/health
```

**应该返回：**
```json
{
  "status": "success",
  "message": "Finance Platform API is running normally",
  "timestamp": "...",
  "environment": "production"
}
```

---

## 💾 Step 9: 保存 PM2 配置

```bash
# 保存当前配置
pm2 save

# 设置开机自启
pm2 startup
```

**会输出类似这样的命令：**
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

**复制这条命令并执行！**

---

## 🔐 Step 10: 配置 GitHub Secrets

**访问：** https://github.com/cheng1103/finance_backend/settings/secrets/actions

**点击 "New repository secret"，添加 3 个 secrets：**

### Secret 1: EC2_HOST
```
Name: EC2_HOST
Secret: 13.214.8.31
```

### Secret 2: EC2_USER
```
Name: EC2_USER
Secret: ubuntu
```

### Secret 3: EC2_SSH_KEY
```
Name: EC2_SSH_KEY
Secret: [你的 EC2 私钥完整内容]
```

**如何获取私钥：**
- 找到你登录 EC2 用的 `.pem` 文件
- 在 Windows: `type your-key.pem | clip` (复制到剪贴板)
- 粘贴到 GitHub Secret

**私钥格式应该是：**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(很多行)
-----END RSA PRIVATE KEY-----
```

---

## 🎯 Step 11: 测试自动部署

### 方法 1: 手动触发

1. 访问：https://github.com/cheng1103/finance_backend/actions
2. 点击 "Deploy Backend to EC2"
3. 点击 "Run workflow"
4. 选择 main 分支
5. 点击绿色的 "Run workflow" 按钮

### 方法 2: 推送代码触发

```bash
# 在本地做一个小改动
cd C:\Users\User\project\finance_fullstackDev\finance_backend

# 创建一个测试文件
echo "# Test deployment" > TEST.md

git add TEST.md
git commit -m "Test automatic deployment"
git push origin main
```

**然后访问：** https://github.com/cheng1103/finance_backend/actions

查看部署进度！

---

## 📱 Step 12: 部署 SEO 自动化（可选）

```bash
cd /home/ubuntu/finance_backend/seo-automation

# 安装依赖
npm install

# 创建环境配置
cp .env.example .env
nano .env

# 最小配置（只需要 Gemini API Key）：
# GEMINI_API_KEY=your_api_key_here
# ARTICLES_PER_DAY=3
# CRON_SCHEDULE=0 9 * * *

# 测试
node index.js test

# 启动
pm2 start ecosystem.config.js
pm2 save
```

**获取 Gemini API Key：**
https://aistudio.google.com/app/apikey

---

## ✅ 验证清单

完成后检查：

- [ ] GitHub 代码已推送
- [ ] EC2 代码已拉取
- [ ] `.env.production` 已创建
- [ ] 环境验证通过
- [ ] 依赖已安装
- [ ] PM2 运行正常（`pm2 status` 显示 online）
- [ ] 健康检查通过
- [ ] PM2 已保存并设置开机自启
- [ ] GitHub Secrets 已配置（3个）
- [ ] 自动部署测试成功

---

## 🛠️ 常用命令参考

```bash
# SSH 登录
ssh ubuntu@13.214.8.31

# 查看 PM2 状态
pm2 status

# 查看日志
pm2 logs finance-api

# 重启服务
pm2 restart finance-api

# 停止服务
pm2 stop finance-api

# 删除服务
pm2 delete finance-api

# 查看详细信息
pm2 show finance-api

# 环境验证
cd /home/ubuntu/finance_backend
node scripts/validate-env.js

# 健康检查
node scripts/health-check.js

# 测试 API
curl http://localhost:3001/health

# 查看 Git 状态
cd /home/ubuntu/finance_backend
git status
git log --oneline -5
```

---

## 🆘 遇到问题？

### PM2 无法启动

```bash
# 查看错误日志
pm2 logs finance-api --err --lines 50

# 删除并重新启动
pm2 delete all
pm2 start ecosystem.config.js --env production
```

### 环境验证失败

```bash
# 检查 .env.production
cat .env.production

# 重新创建
nano .env.production
```

### GitHub Actions 失败

1. 访问：https://github.com/cheng1103/finance_backend/actions
2. 点击失败的 run
3. 查看错误信息
4. 检查 GitHub Secrets 是否正确

---

**按顺序完成这 12 步，你的系统就完全部署好了！** 🎉
