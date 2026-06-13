#!/bin/bash

# KEC Manager 数据库紧急修复脚本
# 使用方法：bash scripts/fix-database.sh

set -e

echo "=== KEC Manager 数据库紧急修复 ==="
echo ""

SERVER_DIR="/opt/1panel/www/sites/kec/index/kec-manager/server"

if [ ! -d "$SERVER_DIR" ]; then
    echo "❌ 错误：未找到项目目录"
    echo "请确认部署路径是否正确"
    exit 1
fi

cd "$SERVER_DIR"

echo "📁 当前目录: $(pwd)"
echo ""

# 步骤 1：检查数据库文件
echo "[1/7] 检查数据库文件..."
if [ ! -f "data/kec.db" ]; then
    echo "⚠️  数据库文件不存在，创建新数据库..."
    mkdir -p data
    touch data/kec.db
else
    echo "✅ 数据库文件存在"
    ls -lh data/kec.db
fi
echo ""

# 步骤 2：检查现有表
echo "[2/7] 检查现有表结构..."
TABLES=$(sqlite3 data/kec.db ".tables" 2>/dev/null || echo "无法读取数据库")
echo "当前数据库中的表:"
echo "$TABLES"
echo ""

# 检查 system_settings 表是否存在
if echo "$TABLES" | grep -q "system_settings"; then
    echo "✅ system_settings 表存在"
    echo "表内容:"
    sqlite3 data/kec.db "SELECT * FROM system_settings;" 2>/dev/null || echo "无法查询表"
else
    echo "❌ system_settings 表不存在"
fi
echo ""

# 步骤 3：停止 PM2 服务
echo "[3/7] 停止 PM2 服务..."
pm2 stop kec-server 2>/dev/null || true
echo "✅ 服务已停止"
echo ""

# 步骤 4：尝试 Prisma 迁移
echo "[4/7] 尝试 Prisma 迁移..."
if npx prisma migrate deploy 2>&1; then
    echo "✅ Prisma 迁移成功"
else
    echo "❌ Prisma 迁移失败"
    echo "尝试强制重置..."
    if npx prisma migrate reset --force 2>&1; then
        echo "✅ 数据库重置成功"
    else
        echo "❌ 数据库重置失败，将使用手动方案"
    fi
fi
echo ""

# 步骤 5：重新生成 Prisma Client
echo "[5/7] 生成 Prisma Client..."
npx prisma generate
echo "✅ Prisma Client 已生成"
echo ""

# 步骤 6：验证 system_settings 表
echo "[6/7] 验证 system_settings 表..."
if sqlite3 data/kec.db "SELECT count(*) FROM system_settings;" 2>/dev/null; then
    echo "✅ system_settings 表可访问"
else
    echo "⚠️  表仍不可访问，手动创建..."

    # 手动创建表
    sqlite3 data/kec.db <<'SQLCMD'
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "description" TEXT
);

INSERT OR IGNORE INTO "system_settings" ("key", "value", "description")
VALUES ('current_semester', '2025-2026-2', '当前学期（格式：起始学年-结束学年-学期序号）');

INSERT OR IGNORE INTO "system_settings" ("key", "value", "description")
VALUES ('organization_name', '欢迎回来', '系统标识（单位名称），用于首页展示');
SQLCMD

    echo "✅ 手动创建完成"
fi
echo ""

# 步骤 7：启动服务并验证
echo "[7/7] 启动服务..."
pm2 start src/server.js --name kec-server
pm2 save

echo "等待服务启动..."
sleep 5

echo ""
echo "验证接口..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/settings)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP 状态码: $HTTP_CODE"
echo "响应内容:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 修复成功！接口返回正常"
else
    echo "❌ 接口仍然返回错误"
    echo ""
    echo "查看 PM2 错误日志:"
    pm2 logs kec-server --err --lines 30 --nostream
    echo ""
    echo "💡 建议检查:"
    echo "   1. PM2 日志: pm2 logs kec-server"
    echo "   2. 数据库文件权限: ls -lh data/kec.db"
    echo "   3. 环境变量配置: cat .env | grep DATABASE_URL"
fi

echo ""
echo "=== 修复完成 ==="
