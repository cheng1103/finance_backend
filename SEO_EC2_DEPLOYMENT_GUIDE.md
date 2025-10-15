# 📱 SEO 自动化系统 EC2 部署指南

## 📍 服务器信息
- **EC2 IP:** 13.214.8.31
- **用户:** ubuntu
- **Backend 路径:** /var/www/eplatformcredit/backend
- **SEO 系统路径:** /var/www/eplatformcredit/backend/seo-automation

---

## 🚀 一次性部署步骤

### 第 1 步：SSH 连接到 EC2

```bash
ssh ubuntu@13.214.8.31
```

如果你使用密钥文件：
```bash
ssh -i your-key.pem ubuntu@13.214.8.31
```

---

### 第 2 步：确认目录结构

```bash
# 检查 backend 目录是否存在
ls -la /var/www/eplatformcredit/backend

# 你应该看到 seo-automation 文件夹
ls -la /var/www/eplatformcredit/backend/seo-automation
```

---

### 第 3 步：安装 SEO 系统依赖

```bash
# 进入 seo-automation 目录
cd /var/www/eplatformcredit/backend/seo-automation

# 安装依赖
npm install

# 检查安装结果
npm list --depth=0
```

**期望输出：**
```
seo-automation@1.0.0
├── @google/generative-ai@0.1.3
├── googleapis@135.0.0
├── axios@1.6.2
├── dotenv@16.3.1
├── node-cron@3.0.3
├── marked@11.0.0
└── turndown@7.1.2
```

---

### 第 4 步：配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑环境变量
nano .env
```

**最小配置（仅生成文章）：**
```bash
# Google Gemini API (必需)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp

# 调度配置
ARTICLES_PER_DAY=3
CRON_SCHEDULE=0 9 * * *
SCHEDULER_ENABLED=true

# 日志配置
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=true
```

**完整配置（包含 WordPress 发布）：**
```bash
# Google Gemini API
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp

# WordPress 配置
WP_API_URL=https://eplatformcredit.com/wp-json/wp/v2/posts
WP_USER=your_wp_username
WP_APP_PASSWORD=your_wp_app_password
WP_STATUS=publish

# 站点配置
SITE_URL=https://eplatformcredit.com

# 调度配置
ARTICLES_PER_DAY=3
CRON_SCHEDULE=0 9 * * *
DELAY_BETWEEN_ARTICLES=30000
SCHEDULER_ENABLED=true
```

保存文件：
- 按 `Ctrl + O` (保存)
- 按 `Enter` (确认)
- 按 `Ctrl + X` (退出)

---

### 第 5 步：获取 Google Gemini API Key

1. 访问：https://aistudio.google.com/app/apikey
2. 点击 **"Create API Key"**
3. 选择或创建 Google Cloud Project
4. 复制生成的 API Key
5. 粘贴到 `.env` 文件中的 `GEMINI_API_KEY`

---

### 第 6 步：测试系统

```bash
# 测试配置
node index.js test

# 如果成功，你会看到：
# ✅ Configuration valid
# ✅ Gemini API connected
```

```bash
# 测试生成一篇文章（不发布）
node index.js generate "personal loan malaysia"

# 检查生成的文章
ls -la output/
cat output/personal-loan-malaysia-*.json
```

---

### 第 7 步：使用 PM2 启动调度器

```bash
# 启动 SEO 自动化系统
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs seo-automation

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

**重要：** 复制 PM2 输出的命令并执行，例如：
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

### 第 8 步：验证调度器运行

```bash
# 查看 PM2 日志（实时）
pm2 logs seo-automation --lines 50

# 手动触发一次运行（测试）
node index.js run

# 查看关键词统计
node index.js stats
```

---

## 📊 常用管理命令

### PM2 管理

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs seo-automation

# 重启服务
pm2 restart seo-automation

# 停止服务
pm2 stop seo-automation

# 删除服务
pm2 delete seo-automation

# 查看详细信息
pm2 show seo-automation
```

### 手动运行

```bash
# 进入 SEO 目录
cd /var/www/eplatformcredit/backend/seo-automation

# 立即运行一次（生成 3 篇文章）
node index.js run

# 生成单篇文章
node index.js generate "your keyword here"

# 查看统计
node index.js stats

# 测试配置
node index.js test
```

### 查看生成的文章

```bash
# 查看最近生成的文章
ls -lt output/ | head -10

# 查看某篇文章内容
cat output/filename.json | jq '.'

# 如果没有 jq，直接查看
cat output/filename.json
```

### 查看日志

```bash
# 查看应用日志
tail -f logs/seo-automation-$(date +%Y-%m-%d).log

# 查看所有日志文件
ls -la logs/

# 清理旧日志（保留最近 7 天）
find logs/ -name "*.log" -mtime +7 -delete
```

---

## 🔧 故障排查

### 问题 1: "GEMINI_API_KEY is required"

**原因：** `.env` 文件不存在或 API key 未设置

**解决：**
```bash
cd /var/www/eplatformcredit/backend/seo-automation
nano .env
# 确保 GEMINI_API_KEY 已正确设置
```

### 问题 2: "Failed to generate article"

**原因：** API key 无效或网络问题

**解决：**
```bash
# 测试 API 连接
node index.js test

# 检查网络
ping google.com

# 验证 API key 在 Google AI Studio
# https://aistudio.google.com/app/apikey
```

### 问题 3: PM2 服务无法启动

**原因：** 端口冲突或配置错误

**解决：**
```bash
# 查看 PM2 错误日志
pm2 logs seo-automation --err --lines 50

# 删除并重新启动
pm2 delete seo-automation
pm2 start ecosystem.config.js
```

### 问题 4: 文章未发布到 WordPress

**原因：** WordPress 凭证未配置或 REST API 不可访问

**解决：**
```bash
# 测试 WordPress API
curl https://eplatformcredit.com/wp-json/wp/v2/posts

# 如果返回 401，检查 WP_USER 和 WP_APP_PASSWORD
nano .env
```

### 问题 5: 调度器不按时运行

**原因：** Cron 格式错误或服务器时区问题

**解决：**
```bash
# 检查服务器时间
date
timedatectl

# 检查 cron 配置
# 编辑 .env
nano .env
# CRON_SCHEDULE=0 9 * * *  (每天上午 9 点)

# 重启 PM2
pm2 restart seo-automation
```

---

## 📅 调度配置说明

**Cron 格式：** `分钟 小时 日 月 星期`

**常用示例：**
```bash
# 每天上午 9 点
CRON_SCHEDULE=0 9 * * *

# 每天下午 2 点
CRON_SCHEDULE=0 14 * * *

# 每天上午 9 点和下午 5 点
CRON_SCHEDULE=0 9,17 * * *

# 每 6 小时
CRON_SCHEDULE=0 */6 * * *

# 每周一上午 9 点
CRON_SCHEDULE=0 9 * * 1
```

**修改调度时间：**
```bash
nano .env
# 修改 CRON_SCHEDULE
pm2 restart seo-automation
```

---

## 🔐 安全建议

1. **保护 .env 文件**
```bash
chmod 600 .env
chown ubuntu:ubuntu .env
```

2. **定期更新依赖**
```bash
npm outdated
npm update
```

3. **备份重要数据**
```bash
# 备份已使用的关键词
cp data/used-keywords.json data/used-keywords-backup-$(date +%Y%m%d).json

# 备份配置
cp .env .env.backup
```

4. **监控日志大小**
```bash
# 查看日志大小
du -sh logs/

# 定期清理（crontab）
0 0 * * 0 find /var/www/eplatformcredit/backend/seo-automation/logs -name "*.log" -mtime +30 -delete
```

---

## 📊 监控和维护

### 每日检查

```bash
# 检查 PM2 状态
pm2 status

# 查看最近日志
pm2 logs seo-automation --lines 100

# 检查生成的文章数量
ls -l output/ | grep $(date +%Y-%m-%d) | wc -l
```

### 每周检查

```bash
# 查看关键词使用情况
node index.js stats

# 检查磁盘空间
df -h

# 清理旧备份
find output/ -name "*.json" -mtime +30 -delete
```

### 性能监控

```bash
# 查看 PM2 监控面板
pm2 monit

# 查看内存使用
pm2 show seo-automation | grep memory

# 查看重启次数
pm2 show seo-automation | grep restart
```

---

## 🎯 下一步

✅ 系统部署完成后：

1. **监控首次运行**
   - 等待首次调度运行（根据 CRON_SCHEDULE）
   - 或手动触发：`node index.js run`

2. **验证文章质量**
   - 检查 `output/` 文件夹
   - 如配置了 WordPress，检查网站后台

3. **调整配置**
   - 根据结果调整 `ARTICLES_PER_DAY`
   - 优化关键词列表（`utils/keywords.js`）

4. **扩展功能**（可选）
   - 配置 Google Indexing API
   - 添加更多关键词
   - 设置 Telegram/Email 通知

---

## 📞 需要帮助？

遇到问题时：

1. **查看日志**
   ```bash
   pm2 logs seo-automation --lines 200
   ```

2. **运行诊断**
   ```bash
   node index.js test
   ```

3. **检查配置**
   ```bash
   cat .env | grep -v PASSWORD
   ```

---

**部署完成！🎉**

你的 SEO 自动化系统现在应该正在 EC2 上运行了。
