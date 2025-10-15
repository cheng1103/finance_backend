# ⚡ 快速参考卡片

## 📍 关键路径信息

```bash
EC2 IP: 13.214.8.31
用户: ubuntu
路径: /home/ubuntu/finance_backend/finance_backend  ⚠️ 注意是两层！
GitHub: https://github.com/cheng1103/finance_backend
```

---

## 🚀 立即开始的 3 个命令

### 1. 推送代码（Windows）
```bash
cd C:\Users\User\project\finance_fullstackDev\finance_backend
git add . && git commit -m "Deploy automation" && git push origin main
```

### 2. 部署到 EC2
```bash
ssh ubuntu@13.214.8.31
cd /home/ubuntu/finance_backend/finance_backend
git pull origin main
```

### 3. 创建环境文件
```bash
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
```

---

## ✅ 一键部署脚本

**在 EC2 上复制粘贴执行：**

```bash
cd /home/ubuntu/finance_backend/finance_backend && \
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
chmod 600 .env.production && \
npm install --production && \
pm2 delete all && \
pm2 start ecosystem.config.js --env production && \
pm2 save && \
echo "✅ 部署完成！" && \
pm2 status
```

---

## 🔗 重要链接

| 链接 | 说明 |
|------|------|
| https://github.com/cheng1103/finance_backend | 代码仓库 |
| https://github.com/cheng1103/finance_backend/actions | GitHub Actions |
| https://github.com/cheng1103/finance_backend/settings/secrets/actions | GitHub Secrets 配置 |
| https://cloud.mongodb.com | MongoDB Atlas |
| https://aistudio.google.com/app/apikey | Gemini API Key |

---

## 🛠️ 常用命令

```bash
# 连接 EC2
ssh ubuntu@13.214.8.31

# 进入项目
cd /home/ubuntu/finance_backend/finance_backend

# PM2 管理
pm2 status
pm2 logs finance-api
pm2 restart finance-api

# 验证
node scripts/validate-env.js
node scripts/health-check.js
curl http://localhost:3001/health

# Git
git pull origin main
git status
```

---

## 📋 GitHub Secrets

需要添加 3 个：

```
EC2_HOST = 13.214.8.31
EC2_USER = ubuntu
EC2_SSH_KEY = [你的私钥内容]
```

---

## 🎯 下一步

1. ✅ 推送代码到 GitHub
2. ✅ 在 EC2 上运行一键部署脚本
3. ✅ 配置 GitHub Secrets
4. ✅ 测试自动部署

**详细步骤查看：** `DEPLOYMENT_STEPS_FINAL.md`
