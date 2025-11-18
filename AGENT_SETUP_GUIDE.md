# 🚀 WhatsApp Agent 设置指南

## 只需3步！

### 步骤 1: 部署最新代码

在你的电脑Terminal运行：

```bash
ssh -i ~/Downloads/eplatform.pem ubuntu@13.214.8.31 << 'ENDSSH'
cd finance_backend
git pull origin main
npm install
pm2 restart all
ENDSSH
```

---

### 步骤 2: 填写WhatsApp号码

SSH到服务器：

```bash
ssh -i ~/Downloads/eplatform.pem ubuntu@13.214.8.31
cd finance_backend
```

编辑配置文件：

```bash
nano config/agents.config.js
```

**只需要改3个地方：**

```javascript
{
  whatsappNumber: '+60123456789',  // ← 改成Agent 1的号码
  name: 'Agent 1',  // ← 改成Agent 1的名字（可选）
},
{
  whatsappNumber: '+60198765432',  // ← 改成Agent 2的号码
  name: 'Agent 2',  // ← 改成Agent 2的名字（可选）
},
{
  whatsappNumber: '+60187654321',  // ← 改成Agent 3的号码
  name: 'Agent 3',  // ← 改成Agent 3的名字（可选）
}
```

**保存并退出：**
- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

---

### 步骤 3: 运行设置

```bash
node scripts/quick-setup-agents.js
```

**看到这个就成功了：**

```
✅ Agent 1
   📱 WhatsApp: +60123456789
   📊 最大leads: 10/天

✅ Agent 2
   📱 WhatsApp: +60198765432
   📊 最大leads: 10/天

✅ Agent 3
   📱 WhatsApp: +60187654321
   📊 最大leads: 10/天

📊 轮流分配预览:
Lead 01  → Agent 1
Lead 02  → Agent 2
Lead 03  → Agent 3
Lead 04  → Agent 1
...

🎉 设置完成！
```

---

## ✅ 完成！

现在：
1. 访问你的网站提交表单
2. AI会自动轮流分配给3个agents
3. 查看分配报告：`node scripts/agent-distribution-report.js`

---

## 🔧 其他命令

### 查看分配报告
```bash
node scripts/agent-distribution-report.js
```

### 查看系统日志
```bash
pm2 logs --lines 50
```

### 每日重置（手动）
```bash
node scripts/reset-daily-counts.js
```

### 每日自动重置（设置cron）
```bash
crontab -e
# 添加这一行：
0 0 * * * cd /home/ubuntu/finance_backend && node scripts/reset-daily-counts.js
```

---

## ❓ 常见问题

**Q: 如何修改agent信息？**
A: 编辑 `config/agents.config.js`，然后重新运行 `node scripts/quick-setup-agents.js`

**Q: 如何添加第4个agent？**
A: 在 `config/agents.config.js` 添加第4个配置，重新运行设置脚本

**Q: 如何查看哪个客户分配给了哪个agent？**
A: 运行 `node scripts/agent-distribution-report.js` 查看详细报告

**Q: 如何暂停某个agent？**
A: 登录admin panel，将agent状态改为 `inactive`

---

## 📊 分配规则

- 轮流分配：确保每个agent工作量均衡
- 智能调整：如果某个agent满载，自动跳过
- 优先级相同：所有agent平等对待
- 一天10个leads → Agent 1得4个，Agent 2和3各得3个

---

## 🎯 就是这么简单！

任何问题随时问我 💪
