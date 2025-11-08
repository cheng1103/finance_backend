# 数据备份脚本

## 备份脚本使用说明

### 手动备份
```bash
cd finance_backend
node scripts/backup-database.js
```

### 自动备份（每天凌晨2点）
添加到 crontab:
```
0 2 * * * cd /path/to/finance_backend && node scripts/backup-database.js >> logs/backup.log 2>&1
```

### 备份内容
1. MongoDB 完整数据库备份（.tar.gz格式）
2. 访客数据 CSV 导出
3. 申请数据 CSV 导出

### 备份保留
- 自动保留最近 30 天的备份
- 旧备份自动删除

### 备份位置
`finance_backend/backups/`

建议每周将备份复制到：
- 外部硬盘
- 云盘（Google Drive, Dropbox等）
- 其他服务器
