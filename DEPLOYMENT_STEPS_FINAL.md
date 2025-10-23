# 🚀 Backend 部署步骤（最终版）

## 📍 你的实际路径
```
EC2 IP: 13.214.8.31
用户: ubuntu
实际路径: /home/ubuntu/finance_backend/finance_backend
GitHub: https://github.com/cheng1103/finance_backend
```

---

## Step 1️⃣: 推送代码到 GitHub（在 Windows）

```bash
cd C:\Users\User\project\finance_fullstackDev\finance_backend

git add .
git commit -m "Add deployment automation - final version

- GitHub Actions with correct path (/home/ubuntu/finance_backend/finance_backend)
- Environment validation and health check scripts
- Complete deployment documentation

🤖 Generated with Claude Code"

git push origin main
```

---

## Step 2️⃣: SSH 到 EC2 并拉取代码

```bash
ssh ubuntu@13.214.8.31

# 进入正确目录
cd /home/ubuntu/finance_backend/finance_backend

# 拉取最新代码
git pull origin main

# 确认文件存在
ls -la scripts/
# 应该看到: validate-env.js, health-check.js

ls -la .github/workflows/
# 应该看到: deploy.yml
```

✅ 如果看到这些文件，继续下一步！

---

## Step 3️⃣: 创建 .env.production

```bash
# 确保在正确目录
cd /home/ubuntu/finance_backend/finance_backend

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

# 验证文件内容
cat .env.production
```

✅ 确认所有变量都正确！

---

## Step 4️⃣: 验证环境

```bash
# 加载环境变量并测试
cd /home/ubuntu/finance_backend/finance_backend
export $(cat .env.production | xargs)
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
✅ ADMIN_USERNAME: SET
✅ ADMIN_PASSWORD_HASH: SET

✅ Validation PASSED - All checks successful!
```

✅ 如果通过，继续！

---

## Step 5️⃣: 安装依赖

```bash
cd /home/ubuntu/finance_backend/finance_backend
npm install --production
```

**等待完成...**（可能需要 1-2 分钟）

---

## Step 6️⃣: 启动 PM2

```bash
# 删除旧进程（如果有）
pm2 delete all

# 启动新进程
cd /home/ubuntu/finance_backend/finance_backend
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status
```

**期望看到：**
```
┌────┬──────────────┬─────────┬─────────┬────────┬─────────┐
│ id │ name         │ mode    │ status  │ cpu    │ memory  │
├────┼──────────────┼─────────┼─────────┼────────┼─────────┤
│ 0  │ finance-api  │ cluster │ online  │ 0%     │ XXmb    │
└────┴──────────────┴─────────┴─────────┴────────┴─────────┘
```

✅ 状态是 **online** 就对了！

---

## Step 7️⃣: 查看日志

```bash
pm2 logs finance-api --lines 30
```

**期望看到：**
```
🚀 Finance Platform API Server Started Successfully!
📍 Server Address: http://localhost:3001
🌍 Environment: production
✅ MongoDB Atlas 连接成功!
```

✅ 看到这些就成功了！

**按 Ctrl+C 退出日志查看**

---

## Step 8️⃣: 健康检查

```bash
cd /home/ubuntu/finance_backend/finance_backend
node scripts/health-check.js
```

**期望输出：**
```
═══════════════════════════════════════
🏥 Backend Health Check
═══════════════════════════════════════

🔍 Checking: API Health Endpoint
   URL: http://localhost:3001/health
   ✅ Status: 200 (XXms)
   📊 Response: success

✅ Health check PASSED!
```

**或者用 curl：**
```bash
curl http://localhost:3001/health
```

**应该返回：**
```json
{"status":"success","message":"Finance Platform API is running normally"}
```

✅ 成功！

---

## Step 9️⃣: 保存 PM2 配置

```bash
# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

**会输出类似这样的命令：**
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

**📋 复制这条命令并执行！**

---

## Step 🔟: 配置 GitHub Secrets

**访问：** https://github.com/cheng1103/finance_backend/settings/secrets/actions

**点击 "New repository secret"，添加 3 个：**

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

**私钥格式：**
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(很多行)
-----END RSA PRIVATE KEY-----
```

**如何获取私钥：**
- 找到你的 `.pem` 文件
- Windows: `type your-key.pem`
- 复制全部内容（包括 BEGIN 和 END 行）

✅ 添加完成！

---

## Step 1️⃣1️⃣: 测试自动部署

### 方法 1: 手动触发

1. 访问：https://github.com/cheng1103/finance_backend/actions
2. 点击左侧 "Deploy Backend to EC2"
3. 点击右侧蓝色按钮 "Run workflow"
4. 确认分支是 main
5. 点击绿色 "Run workflow" 按钮

**然后刷新页面，应该看到新的 workflow 运行！**

点击它查看实时日志。

### 方法 2: 推送代码触发

```bash
# 在 Windows
cd C:\Users\User\project\finance_fullstackDev\finance_backend

# 创建测试文件
echo "# Test deployment" > TEST_DEPLOY.md

git add TEST_DEPLOY.md
git commit -m "Test automatic deployment"
git push origin main
```

**然后访问：** https://github.com/cheng1103/finance_backend/actions

查看自动触发的部署！

---

## Step 1️⃣2️⃣: 部署 SEO 自动化（可选）

```bash
cd /home/ubuntu/finance_backend/finance_backend/seo-automation

# 安装依赖
npm install

# 复制配置
cp .env.example .env

# 编辑配置
nano .env
```

**最小配置：**
```bash
GEMINI_API_KEY=your_api_key_here
ARTICLES_PER_DAY=3
CRON_SCHEDULE=0 9 * * *
SCHEDULER_ENABLED=true
```

**获取 Gemini API Key：**
https://aistudio.google.com/app/apikey

**保存后测试：**
```bash
node index.js test
```

**如果成功，启动：**
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## ✅ 完成清单

完成后检查这些：

```bash
# 1. PM2 状态
pm2 status
# ✅ finance-api 应该是 online

# 2. 健康检查
curl http://localhost:3001/health
# ✅ 应该返回 {"status":"success"}

# 3. 查看日志
pm2 logs finance-api --lines 10
# ✅ 应该没有错误

# 4. 验证环境
cd /home/ubuntu/finance_backend/finance_backend
node scripts/validate-env.js
# ✅ 应该全部通过

# 5. GitHub Secrets
# ✅ 确认添加了 3 个 secrets

# 6. 测试自动部署
# ✅ 手动触发一次成功
```

---

## 🛠️ 常用命令速查

```bash
# SSH 登录
ssh ubuntu@13.214.8.31

# 进入项目目录
cd /home/ubuntu/finance_backend/finance_backend

# PM2 管理
pm2 status              # 查看状态
pm2 logs finance-api    # 查看日志
pm2 restart finance-api # 重启
pm2 stop finance-api    # 停止
pm2 monit               # 监控面板

# 验证和测试
node scripts/validate-env.js    # 验证环境
node scripts/health-check.js    # 健康检查
curl http://localhost:3001/health  # 测试 API

# Git 操作
git status              # 查看状态
git pull origin main    # 拉取最新代码
git log --oneline -5    # 查看最近提交
```

---

## 🆘 故障排查

### 问题 1: PM2 无法启动

```bash
# 查看错误日志
pm2 logs finance-api --err --lines 50

# 常见原因和解决：
# 1. 端口被占用
sudo lsof -i :3001
# 如果有进程，kill 它

# 2. 环境变量问题
cat .env.production
# 检查是否正确

# 3. 依赖问题
npm install --production
```

### 问题 2: 健康检查失败

```bash
# 检查服务是否运行
pm2 status

# 检查端口
curl http://localhost:3001/health

# 查看详细日志
pm2 logs finance-api --lines 100
```

### 问题 3: MongoDB 连接失败

```bash
# 检查 MongoDB URI
cat .env.production | grep MONGODB_URI

# 确保 EC2 IP 在 MongoDB Atlas 白名单
# 访问: https://cloud.mongodb.com
# Network Access → Add IP Address → 13.214.8.31/32
```

### 问题 4: GitHub Actions 部署失败

**查看错误：**
1. 访问：https://github.com/cheng1103/finance_backend/actions
2. 点击失败的 run
3. 查看红色 ❌ 的步骤

**常见问题：**
- SSH 密钥错误 → 检查 EC2_SSH_KEY secret
- 路径错误 → 确认是 `/home/ubuntu/finance_backend/finance_backend`
- 权限问题 → 在 EC2 上运行 `chmod -R 755 /home/ubuntu/finance_backend`

---

## 📊 部署流程图

```
本地代码修改
    ↓
git push origin main
    ↓
GitHub Actions 触发
    ↓
SSH 连接 EC2 (13.214.8.31)
    ↓
cd /home/ubuntu/finance_backend/finance_backend
    ↓
创建备份
    ↓
git pull origin main
    ↓
npm ci --production
    ↓
node scripts/validate-env.js
    ↓
pm2 restart ecosystem.config.js
    ↓
node scripts/health-check.js
    ↓
✅ 部署成功！
```

---

## 🎉 完成！

按照这 12 步操作，你的 Backend 就完全部署好了！

**重要提醒：**
- 所有路径必须是：`/home/ubuntu/finance_backend/finance_backend`
- GitHub Secrets 必须配置正确
- `.env.production` 必须在正确目录

**现在开始 Step 1：推送代码到 GitHub！** 🚀
