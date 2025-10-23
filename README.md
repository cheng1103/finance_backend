# 金融平台后端API

这是金融平台的Node.js后端API服务，提供用户认证、贷款申请、贷款计算等功能。

## 功能特点

- 🔐 用户注册/登录/认证
- 📋 贷款申请管理
- 🧮 贷款计算器
- 👤 用户资料管理
- 📊 管理员统计功能
- 🔒 安全防护（JWT、速率限制、数据验证）
- 🇲🇾 马来西亚贷款政策支持

## 技术栈

- **Node.js** - JavaScript运行环境
- **Express.js** - Web应用框架
- **MongoDB** - 数据库
- **Mongoose** - MongoDB对象建模
- **JWT** - 身份验证
- **bcryptjs** - 密码加密
- **express-validator** - 数据验证

## 快速开始

### 环境要求

- Node.js 16+
- MongoDB 4.4+
- npm 或 yarn

### 安装依赖

```bash
cd finance_backend
npm install
```

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置数据库连接和其他设置

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 服务地址

- API服务: http://localhost:3001
- 健康检查: http://localhost:3001/health
- API文档: http://localhost:3001/api-docs (待实现)

## API 文档

### 基础信息

- **基础URL**: `http://localhost:3001/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

### 认证相关 `/api/auth`

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录 | 否 |
| GET | `/me` | 获取当前用户信息 | 是 |
| POST | `/logout` | 用户登出 | 是 |
| POST | `/forgot-password` | 忘记密码 | 否 |
| POST | `/reset-password/:token` | 重置密码 | 否 |

### 贷款申请 `/api/loans`

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/apply` | 提交贷款申请 | 可选 |
| GET | `/applications` | 获取用户申请列表 | 是 |
| GET | `/applications/:id` | 获取申请详情 | 可选 |
| GET | `/applications/number/:num` | 通过申请号查询 | 否 |
| PUT | `/applications/:id/cancel` | 取消申请 | 是 |
| GET | `/statistics` | 获取统计信息 | 是(管理员) |

### 贷款计算器 `/api/calculator`

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/calculate` | 计算贷款支付 | 否 |
| GET | `/rates` | 获取当前利率 | 否 |
| GET | `/payment-table` | 获取支付表 | 否 |
| POST | `/compare` | 比较贷款方案 | 否 |

### 用户管理 `/api/users`

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/profile` | 获取用户资料 | 是 |
| PUT | `/profile` | 更新用户资料 | 是 |
| PUT | `/change-password` | 修改密码 | 是 |
| GET | `/dashboard` | 用户仪表板 | 是 |
| DELETE | `/account` | 删除账户 | 是 |
| GET | `/notifications` | 获取通知 | 是 |
| PUT | `/preferences` | 更新偏好设置 | 是 |

## 数据模型

### 用户 (User)

```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  isActive: Boolean,
  role: String (user/admin),
  profile: {
    annualIncome: Number,
    employmentStatus: String,
    creditScore: String,
    // ...
  },
  preferences: {
    emailNotifications: Boolean,
    smsNotifications: Boolean,
    language: String
  }
}
```

### 贷款申请 (LoanApplication)

```javascript
{
  user: ObjectId (optional),
  personalInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  loanDetails: {
    amount: Number,
    purpose: String,
    term: Number,
    interestRate: Number
  },
  financialInfo: {
    annualIncome: Number,
    employmentStatus: String,
    creditScore: String
  },
  status: String,
  applicationNumber: String (auto-generated)
}
```

## 错误处理

API使用标准HTTP状态码和一致的错误响应格式：

```javascript
{
  "status": "error",
  "message": "错误描述",
  "errors": [...] // 验证错误详情(可选)
}
```

## 安全特性

- 🔒 密码加密 (bcryptjs)
- 🎫 JWT身份验证
- 🛡️ Helmet安全头
- 🚦 速率限制
- ✅ 数据验证
- 🔍 SQL注入防护
- 🎭 XSS防护

## 开发说明

### 代码结构

```
finance_backend/
├── config/          # 配置文件
├── middleware/      # 中间件
├── models/          # 数据模型
├── routes/          # 路由处理
├── server.js        # 应用入口
├── package.json     # 项目配置
└── README.md        # 文档
```

### 添加新功能

1. 在 `models/` 中定义数据模型
2. 在 `routes/` 中创建路由处理
3. 在 `server.js` 中注册路由
4. 添加相应的中间件和验证

### 测试

```bash
npm test
```

## 部署

### 环境变量

确保在生产环境中设置以下环境变量：
- `NODE_ENV=production`
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`

### Docker部署 (可选)

```bash
# 构建镜像
docker build -t finance-backend .

# 运行容器
docker run -p 3001:3001 --env-file .env finance-backend
```

## 许可证

MIT License

## 支持

如有问题请联系开发团队或查看项目文档。



