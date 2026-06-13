#!/bin/bash

# ==================== KEC 课程管理平台 - 生产环境部署脚本 ====================
# 使用方法：bash deploy.sh [server-ip]
# 示例：bash deploy.sh root@your-server.com

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}KEC 课程管理平台 - 生产环境部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo -e "${YELLOW}提示：未指定服务器地址，将使用本地部署${NC}"
    SERVER=""
else
    SERVER="$1"
    echo -e "${GREEN}目标服务器: ${SERVER}${NC}"
fi

# 函数：在本地或远程执行命令
execute() {
    if [ -z "$SERVER" ]; then
        bash -c "$1"
    else
        ssh "$SERVER" "$1"
    fi
}

# 函数：复制文件到服务器
copy_file() {
    if [ -z "$SERVER" ]; then
        cp "$1" "$2"
    else
        scp "$1" "${SERVER}:$2"
    fi
}

echo -e "${GREEN}[1/8] 检查前置条件...${NC}"
if command -v git &> /dev/null; then
    echo "✓ Git 已安装"
else
    echo -e "${RED}✗ 请先安装 Git${NC}"
    exit 1
fi

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✓ Node.js 版本: $NODE_VERSION"
else
    echo -e "${RED}✗ 请先安装 Node.js 18+${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}[2/8] 创建部署目录...${NC}"
execute "mkdir -p /var/www/kec-manager/server/data"
execute "mkdir -p /var/www/kec-manager/client"
execute "mkdir -p /var/log/kec-manager"
echo "✓ 目录创建完成"

echo ""
echo -e "${GREEN}[3/8] 克隆/更新代码...${NC}"
if execute "test -d /var/www/kec-manager/.git"; then
    echo "更新现有代码..."
    execute "cd /var/www/kec-manager && git pull"
else
    echo "首次克隆代码..."
    execute "cd /var/www && git clone https://github.com/shub2026/kec-manager.git"
fi
echo "✓ 代码准备完成"

echo ""
echo -e "${GREEN}[4/8] 安装依赖...${NC}"
execute "cd /var/www/kec-manager && npm install"
execute "cd /var/www/kec-manager/server && npm install --production"
execute "cd /var/www/kec-manager/client && npm install"
echo "✓ 依赖安装完成"

echo ""
echo -e "${GREEN}[5/8] 配置环境变量...${NC}"
# 生成新的 JWT 密钥
echo "生成安全的 JWT 密钥..."
JWT_SECRET=$(execute "node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"")
JWT_REFRESH_SECRET=$(execute "node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"")
JWT_DOWNLOAD_SECRET=$(execute "node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"")

# 创建 .env 文件
cat > /tmp/kec-env << EOF
# 环境变量
NODE_ENV=production

# 数据库配置
DATABASE_URL="file:/var/www/kec-manager/server/data/kec.db"

# 服务器端口
PORT=3000

# JWT密钥
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_DOWNLOAD_SECRET=${JWT_DOWNLOAD_SECRET}

# JWT过期时间
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS 配置（请修改为你的实际域名）
CORS_ORIGINS=https://kec.sntip.cn,http://localhost:3000

# 日志级别
LOG_LEVEL=info

# 文件上传大小限制（MB）
MAX_FILE_SIZE=10
EOF

copy_file /tmp/kec-env "/var/www/kec-manager/server/.env"
execute "chmod 600 /var/www/kec-manager/server/.env"
echo "✓ 环境变量配置完成"
echo -e "${YELLOW}⚠  重要：请编辑 /var/www/kec-manager/server/.env 修改 CORS_ORIGINS 为你的实际域名${NC}"

echo ""
echo -e "${GREEN}[6/8] 初始化数据库...${NC}"
execute "cd /var/www/kec-manager/server && npx prisma migrate deploy"
execute "cd /var/www/kec-manager/server && npx prisma generate"
execute "cd /var/www/kec-manager/server && npm run db:seed"
echo "✓ 数据库初始化完成"

echo ""
echo -e "${GREEN}[7/8] 构建前端...${NC}"
execute "cd /var/www/kec-manager/client && npm run build"
echo "✓ 前端构建完成"

echo ""
echo -e "${GREEN}[8/8] 启动服务...${NC}"
# 检查 PM2 是否安装
if ! execute "command -v pm2 &> /dev/null"; then
    echo "安装 PM2..."
    execute "npm install -g pm2"
fi

# 启动或重启服务
if execute "pm2 list | grep -q kec-server"; then
    echo "重启现有服务..."
    execute "cd /var/www/kec-manager/server && pm2 restart kec-server"
else
    echo "启动新服务..."
    execute "cd /var/www/kec-manager/server && pm2 start src/server.js --name kec-server"
    execute "pm2 save"
    execute "pm2 startup"
fi

echo "✓ 服务启动完成"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}服务状态：${NC}"
execute "pm2 status"
echo ""
echo -e "${GREEN}查看日志：${NC}"
echo "  pm2 logs kec-server"
echo ""
echo -e "${YELLOW}后续步骤：${NC}"
echo "1. 编辑 /var/www/kec-manager/server/.env 修改 CORS_ORIGINS"
echo "2. 配置 Nginx（参考 docs/PRODUCTION_DEPLOYMENT.md）"
echo "3. 设置 HTTPS 证书（推荐 Let's Encrypt）"
echo "4. 配置备份脚本"
echo "5. 测试访问：https://kec.sntip.cn"
echo ""
echo -e "${GREEN}默认管理员账号：${NC}"
echo "  用户名: admin"
echo "  密码: admin@123456"
echo -e "${YELLOW}⚠  请立即修改默认密码！${NC}"
