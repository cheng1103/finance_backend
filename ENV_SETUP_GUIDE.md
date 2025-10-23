# 🔧 环境变量配置指南

## ⚠️ 重要发现

检查了你的代码后，我发现了几个关键点：

### 1. ❌ CORS_ORIGIN 不需要！

在 `server.js:31-42`，CORS 配置是这样的：

```javascript
const allowedOrigins = [
  'https://eplatformcredit.com',
  'https://www.eplatformcredit.com',
  'https://admin.eplatformcredit.com',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean);
```

**所以 `CORS_ORIGIN` 环境变量根本没用！** 允许的域名是硬编码的。

---

## ✅ 正确的 .env.production 配置

基于你现有的 `.env` 文件，这是正确的生产环境配置：

```bash
# Environment
NODE_ENV=production
PORT=3001

# MongoDB Atlas (你现有的连接)
MONGODB_URI=mongodb+srv://baabaa311_db_user:1jjMb368BQslysRQ@e-finance.boazyyj.mongodb.net/E-finance?retryWrites=true&w=majority&appName=E-finance

# URLs
FRONTEND_URL=https://www.eplatformcredit.com
ADMIN_URL=https://admin.eplatformcredit.com

# JWT (你现有的 secret)
JWT_SECRET=kBxcBrpUeURiPYwLNg06zUdaduIoQEJaVnhAjRCguCbsHe0rDo9e6VDN/AepFQ8jrHEpj8eyqwdWUGj3I+faRA==
JWT_EXPIRES_IN=7d

# Admin (你现有的凭证)
ADMIN_USERNAME=Weilun777
ADMIN_PASSWORD_HASH=$2a$10$DmfrIMCG43UbHBv07QFMo.s7h3LRngsGVLP0bgj0UQUpFCWv7AO5a
```

---

## 📋 所有代码使用的环境变量

从代码检查，实际使用的变量：

### 必需变量（backend 主程序）
| 变量 | 使用位置 | 说明 |
|------|----------|------|
| `NODE_ENV` | server.js, middleware | 环境模式 |
| `PORT` | server.js | 服务器端口 |
| `MONGODB_URI` | config/database.js | 数据库连接 |
| `FRONTEND_URL` | server.js | 前端域名 |
| `ADMIN_URL` | server.js | 管理后台域名 |
| `JWT_SECRET` | models/User.js, routes/admin.js | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | models/User.js, routes/admin.js | Token 过期时间 |
| `ADMIN_USERNAME` | routes/admin.js | 管理员用户名 |
| `ADMIN_PASSWORD_HASH` | routes/admin.js | 管理员密码哈希 |

### 可选变量
| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEFAULT_INTEREST_RATE` | 4.88 | 默认利率 |
| `HEALTH_CHECK_HOST` | localhost | 健康检查主机 |
| `HEALTH_CHECK_PROTOCOL` | http | 健康检查协议 |

### ❌ 不需要的变量
- `CORS_ORIGIN` - 代码硬编码了 CORS 域名

---

## 🚀 EC2 部署步骤（正确版）

### Step 1: 创建 .env.production

```bash
ssh ubuntu@13.214.8.31
cd /var/www/eplatformcredit/backend
nano .env.production
```

**复制粘贴以下内容（已填入你的实际配置）：**

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://baabaa311_db_user:1jjMb368BQslysRQ@e-finance.boazyyj.mongodb.net/E-finance?retryWrites=true&w=majority&appName=E-finance
FRONTEND_URL=https://www.eplatformcredit.com
ADMIN_URL=https://admin.eplatformcredit.com
JWT_SECRET=kBxcBrpUeURiPYwLNg06zUdaduIoQEJaVnhAjRCguCbsHe0rDo9e6VDN/AepFQ8jrHEpj8eyqwdWUGj3I+faRA==
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=Weilun777
ADMIN_PASSWORD_HASH=$2a$10$DmfrIMCG43UbHBv07QFMo.s7h3LRngsGVLP0bgj0UQUpFCWv7AO5a
```

**保存：** `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 2: 验证配置

```bash
# 测试环境验证
node scripts/validate-env.js
```

**期望输出：**
```
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

### Step 3: 部署

```bash
npm install --production
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # 执行输出的命令
```

---

## 🔐 安全建议

### ⚠️ 当前问题

1. **MongoDB 密码暴露在 Git**
   - 你的 `.env` 文件包含真实密码
   - 如果推送到 GitHub，密码会泄露

2. **JWT Secret 在开发和生产相同**
   - 建议生产环境使用不同的 secret

### 🛡️ 解决方案

#### 1. 更换 MongoDB 密码

在 MongoDB Atlas：
```
1. 访问 https://cloud.mongodb.com
2. Database Access → baabaa311_db_user → Edit
3. Edit Password → Autogenerate Secure Password
4. 复制新密码
5. 更新 EC2 的 .env.production
```

#### 2. 生成新的 JWT Secret（生产环境）

```bash
# 在 EC2 上运行
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# 将输出复制到 .env.production 的 JWT_SECRET
```

#### 3. 更改管理员密码（可选）

```bash
# 在 EC2 上运行
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourNewSecurePassword', 10).then(console.log)"

# 将输出复制到 .env.production 的 ADMIN_PASSWORD_HASH
```

#### 4. 确保 .env 不提交到 Git

```bash
# 检查 .gitignore
cat .gitignore | grep .env

# 应该看到：
# .env
# .env.local
# .env.production
# .env.*.local
```

---

## 📊 配置对比

### 你之前的配置（错误）

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster...  # ❌ Placeholder
JWT_SECRET=your-secret-at-least-32-characters-long      # ❌ Placeholder
ADMIN_USERNAME=admin                                     # ❌ 错误用户名
ADMIN_PASSWORD_HASH=your-bcrypt-hash                    # ❌ Placeholder
CORS_ORIGIN=...                                          # ❌ 不需要！
```

### 正确的配置

```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://baabaa311_db_user:1jjMb368BQslysRQ@...  # ✅ 真实连接
JWT_SECRET=kBxcBrpUeURiPYwLNg06zUdaduIoQEJaVnhAjRCguCbsHe0rDo9e6VDN/...  # ✅ 真实密钥
ADMIN_USERNAME=Weilun777                                # ✅ 正确用户名
ADMIN_PASSWORD_HASH=$2a$10$DmfrIMCG43UbHBv07QFMo...    # ✅ 真实哈希
# CORS_ORIGIN - 移除！不需要！
```

---

## 🎯 快速部署命令

**在 EC2 上一次性执行：**

```bash
ssh ubuntu@13.214.8.31 << 'EOF'
cd /var/www/eplatformcredit/backend

# 创建 .env.production
cat > .env.production << 'ENVEOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://baabaa311_db_user:1jjMb368BQslysRQ@e-finance.boazyyj.mongodb.net/E-finance?retryWrites=true&w=majority&appName=E-finance
FRONTEND_URL=https://www.eplatformcredit.com
ADMIN_URL=https://admin.eplatformcredit.com
JWT_SECRET=kBxcBrpUeURiPYwLNg06zUdaduIoQEJaVnhAjRCguCbsHe0rDo9e6VDN/AepFQ8jrHEpj8eyqwdWUGj3I+faRA==
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=Weilun777
ADMIN_PASSWORD_HASH=$2a$10$DmfrIMCG43UbHBv07QFMo.s7h3LRngsGVLP0bgj0UQUpFCWv7AO5a
ENVEOF

# 设置权限
chmod 600 .env.production

# 验证
node scripts/validate-env.js

# 安装和启动
npm install --production
pm2 start ecosystem.config.js --env production
pm2 save

echo "✅ 部署完成！"
pm2 status
EOF
```

---

## ✅ 检查清单

- [ ] `.env.production` 已创建
- [ ] 使用真实的 MongoDB URI（不是 placeholder）
- [ ] 使用真实的 JWT Secret
- [ ] 使用正确的管理员用户名（Weilun777）
- [ ] 移除了 `CORS_ORIGIN`（不需要）
- [ ] 环境验证通过
- [ ] PM2 运行正常
- [ ] 健康检查通过
- [ ] MongoDB Atlas IP 白名单已添加 EC2 IP（13.214.8.31）

---

**现在配置是完全正确的了！** 🎉
