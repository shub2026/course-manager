#!/bin/bash

# KEC Manager 快速诊断脚本
# 使用方法：bash quick-check.sh

echo "=== KEC Manager 快速诊断 ==="
echo ""

# 检查是否在正确的目录
if [ ! -d "/opt/1panel/www/sites/kec/index/kec-manager" ]; then
    echo "错误：未找到项目目录"
    echo "请确认部署路径是否正确"
    exit 1
fi

cd /opt/1panel/www/sites/kec/index/kec-manager

echo "1. 📦 Git 状态:"
git log --oneline -3
echo ""

echo "2. 🚀 PM2 状态:"
pm2 status kec-server 2>/dev/null || echo "服务未运行"
echo ""

echo "3. ❌ 最近错误日志:"
pm2 logs kec-server --err --lines 30 --nostream 2>/dev/null || echo "无法获取日志"
echo ""

echo "4. 🔗 本地接口测试 (绕过 Nginx):"
echo "   测试 /api/settings..."
SETTINGS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/api/settings 2>/dev/null)
if [ $? -eq 0 ]; then
    HTTP_CODE=$(echo "$SETTINGS_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
    BODY=$(echo "$SETTINGS_RESPONSE" | grep -v "HTTP_CODE:")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ 响应正常 (HTTP $HTTP_CODE)"
        echo "   响应内容预览:"
        echo "$BODY" | head -c 150
    else
        echo "   ❌ 返回错误状态码: HTTP $HTTP_CODE"
        echo "   响应内容:"
        echo "$BODY" | head -c 500
    fi
else
    echo "   ❌ 请求失败，服务可能未启动"
fi
echo ""

echo "5. 💚 健康检查:"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
    BODY=$(echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE:")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ 健康检查通过"
    else
        echo "   ❌ 健康检查失败 (HTTP $HTTP_CODE)"
        echo "   响应: $BODY"
    fi
else
    echo "   ❌ 无法连接到后端服务"
fi
echo ""

echo "6. 📁 数据库文件权限:"
if [ -f "server/data/kec.db" ]; then
    ls -lh server/data/kec.db
    echo "   文件所有者: $(stat -c '%U:%G' server/data/kec.db 2>/dev/null || stat -f '%Su:%Sg' server/data/kec.db)"
else
    echo "   ⚠️  数据库文件不存在"
fi
echo ""

echo "7. 🔧 环境变量检查:"
if [ -f "server/.env" ]; then
    echo "   .env 文件存在"
    DB_URL=$(grep "^DATABASE_URL=" server/.env | head -c 50)
    echo "   $DB_URL..."
    NODE_ENV=$(grep "^NODE_ENV=" server/.env)
    echo "   $NODE_ENV"
else
    echo "   ❌ .env 文件不存在"
fi
echo ""

echo "8. 🎯 Settings 接口代码检查:"
if grep -q "Settings GET Error Stack" server/src/routes/settings.routes.js; then
    echo "   ✅ 错误处理代码已更新"
else
    echo "   ❌ 错误处理代码未更新（可能需要 git pull）"
fi
echo ""

echo "=== 诊断完成 ==="
echo ""
echo "💡 如果本地接口测试通过但外部访问失败，问题可能在 Nginx 配置"
echo "   检查 Nginx: sudo nginx -t && sudo tail -f /var/log/nginx/error.log"
echo ""
echo "📝 详细调试指南: docs/DEBUG_500_ERROR.md"
