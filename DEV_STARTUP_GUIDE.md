# KEC 课程管理平台 - 开发测试启动指南

## 📋 系统重置完成

系统已成功重置到初始状态,所有数据已清空并重新初始化。

## ✅ 已完成的操作

### 1. 数据库重置
- ✓ 删除旧数据库文件
- ✓ 重新生成数据库表结构
- ✓ 创建超级管理员账户
- ✓ 初始化系统默认设置

### 2. 系统配置
- ✓ 系统名称: KEC课程管理平台
- ✓ 系统版本: 1.0.0
- ✓ 最大上传文件大小: 10MB
- ✓ 允许的文件类型: xlsx,xls,csv,pdf,jpg,png
- ✓ 当前学期: 2026-1
- ✓ 当前学年: 2026

### 3. 服务状态
- ✓ 后端服务器: http://localhost:3000 (运行中)
- ✓ 前端应用: http://localhost:5177 (运行中)
- ✓ 数据库连接: 正常
- ✓ API健康检查: 通过

## 🔑 登录信息

```
用户名: admin
密码: admin123
角色: super_admin
```

## 🚀 快速启动

### Windows 用户
双击运行 `start-dev.bat` 或在命令行执行:
```bash
start-dev.bat
```

### macOS/Linux 用户
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### 手动启动
```bash
# 1. 重置数据库
cd server
node scripts/reset-database.js

# 2. 返回根目录并启动开发服务器
cd ..
npm run dev
```

## 🧪 测试验证

### 健康检查
```bash
curl http://localhost:3000/api/health
```

预期响应:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected"
}
```

### 登录测试
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 系统设置
```bash
curl http://localhost:3000/api/settings
```

## 📁 项目结构

```
kec-manager/
├── client/              # 前端 Vue.js 应用
│   ├── src/
│   └── package.json
├── server/              # 后端 Node.js + Express 应用
│   ├── prisma/         # Prisma ORM 配置
│   │   ├── schema.prisma
│   │   └── dev.db      # SQLite 数据库
│   ├── scripts/        # 管理脚本
│   │   ├── reset-database.js    # 重置数据库脚本
│   │   └── check-db-state.js    # 检查数据库状态
│   ├── src/
│   └── package.json
├── start-dev.bat       # Windows 启动脚本
├── start-dev.sh        # Linux/Mac 启动脚本
└── package.json
```

## 🛠️ 常用命令

### 数据库管理
```bash
# 重置数据库(清空所有数据)
cd server && node scripts/reset-database.js

# 查看数据库状态
cd server && node scripts/check-db-state.js

# Prisma 数据库迁移
cd server && npm run db:migrate

# 生成 Prisma 客户端
cd server && npm run db:generate

# 填充种子数据
cd server && npm run db:seed
```

### 开发服务器
```bash
# 同时启动前后端
npm run dev

# 仅启动后端
cd server && npm run dev

# 仅启动前端
cd client && npm run dev
```

## ⚠️ 注意事项

1. **数据安全**: 重置数据库会清空所有数据,请谨慎操作
2. **端口占用**: 如果端口被占用,服务会自动尝试下一个可用端口
3. **环境变量**: 确保 `server/.env` 文件配置正确
4. **依赖安装**: 首次运行前确保已安装依赖 (`npm install`)

## 🔧 故障排除

### 端口被占用
如果看到 "Port XXXX is in use" 提示,服务会自动使用其他端口。可以手动指定端口:
```bash
# 修改 server/.env 中的 PORT 值
PORT=3000
```

### 数据库锁定
如果遇到数据库锁定错误,删除 `server/prisma/dev.db` 后重新运行重置脚本。

### 依赖问题
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 服务端
cd server
rm -rf node_modules package-lock.json
npm install
```

## 📞 技术支持

如遇问题,请检查:
1. Node.js 版本是否兼容
2. 所有依赖是否正确安装
3. 环境变量配置是否正确
4. 端口是否被其他程序占用

---
**最后更新**: 2026-06-13
**系统版本**: 1.0.0
