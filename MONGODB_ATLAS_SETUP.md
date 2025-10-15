# MongoDB Atlas 设置指南

## 🚀 快速设置 MongoDB Atlas（免费云数据库）

### 步骤 1: 创建 MongoDB Atlas 账户
1. 访问 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 点击 "Try Free" 注册免费账户
3. 验证邮箱地址

### 步骤 2: 创建集群
1. 登录后选择 "Build a Database"
2. 选择 **FREE** 层级（M0 Sandbox）
3. 选择云提供商和区域：
   - **推荐**: AWS - Singapore (ap-southeast-1)
   - 这样离你的 EC2 最近，延迟最低
4. 集群名称保持默认或自定义
5. 点击 "Create Cluster"

### 步骤 3: 创建数据库用户
1. 在 "Security" → "Database Access" 中
2. 点击 "Add New Database User"
3. 选择 "Password" 认证方式
4. 设置用户名和密码（记住这些信息！）
5. 权限选择 "Read and write to any database"
6. 点击 "Add User"

### 步骤 4: 设置网络访问
1. 在 "Security" → "Network Access" 中
2. 点击 "Add IP Address"
3. 选择 "Allow Access from Anywhere" (0.0.0.0/0)
   - 这样你的 EC2 服务器就能访问数据库
4. 点击 "Confirm"

### 步骤 5: 获取连接字符串
1. 回到 "Database" 页面
2. 点击你的集群的 "Connect" 按钮
3. 选择 "Connect your application"
4. 选择 "Node.js" 和版本 "4.1 or later"
5. 复制连接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

### 步骤 6: 配置环境变量
1. 在项目根目录创建 `.env` 文件
2. 添加以下内容（替换为你的实际信息）：

```env
# 应用程序配置
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# MongoDB Atlas 数据库配置
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/finance-platform?retryWrites=true&w=majority

# JWT 安全配置
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 其他配置...
```

### 步骤 7: 测试连接
运行数据库设置脚本：
```bash
node setup-database.js
```

## 🔧 AWS EC2 部署配置

### 生产环境 .env 配置
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com

# MongoDB Atlas（生产环境）
MONGODB_URI=mongodb+srv://prod-user:prod-password@your-cluster.mongodb.net/finance-platform-prod?retryWrites=true&w=majority

# 强密码 JWT Secret
JWT_SECRET=your-very-secure-production-jwt-secret-with-at-least-32-characters

# AWS 配置
AWS_REGION=ap-southeast-1
```

### EC2 安全组设置
确保你的 EC2 安全组允许：
- 入站规则：端口 3001（或你设置的端口）
- 出站规则：端口 443（HTTPS，用于连接 Atlas）

### EC2 部署命令
```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 克隆项目
git clone your-repo-url
cd finance_backend

# 安装依赖
npm install

# 设置环境变量
nano .env  # 添加生产环境配置

# 测试数据库连接
node setup-database.js

# 启动应用
npm start
```

## 📊 监控和维护

### Atlas 监控
- 在 Atlas 控制台查看数据库性能
- 设置警报通知
- 监控连接数和查询性能

### 备份
- Atlas 免费层自动提供基本备份
- 升级到付费层可获得更多备份选项

## 🆘 常见问题

### 连接失败
1. 检查用户名和密码是否正确
2. 确认 IP 地址在白名单中
3. 检查网络连接

### 性能优化
1. 使用适当的索引
2. 选择离 EC2 最近的 Atlas 区域
3. 监控查询性能

### 安全最佳实践
1. 使用强密码
2. 定期轮换数据库密码
3. 限制 IP 访问（生产环境）
4. 启用审计日志（付费功能）

## 💰 成本估算

### 免费层 (M0)
- 512 MB 存储
- 共享 RAM
- 无备份保留
- 适合开发和小规模应用

### 升级选项
- M2: $9/月 - 2GB 存储
- M5: $25/月 - 5GB 存储
- 更大规模根据需要选择

---

**🎉 完成设置后，你的应用就可以在 AWS EC2 上运行了！**













