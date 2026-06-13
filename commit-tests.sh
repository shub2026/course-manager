#!/bin/bash
# KEC测试框架提交脚本
# 使用方法: bash commit-tests.sh

set -e

echo "🔍 检查Git状态..."
git status

echo ""
echo "📝 配置Git用户信息（首次使用需要）"
read -p "GitHub用户名: " username
read -p "邮箱地址: " email

git config user.name "$username"
git config user.email "$email"

echo ""
echo "📦 添加测试相关文件..."
git add server/tests/
git add server/vitest.config.js
git add server/.gitignore
git add server/package.json
git add server/package-lock.json
git add .github/workflows/test.yml
git add AUTOMATED_TESTING_SUMMARY.md

echo ""
echo "✅ 即将提交以下文件:"
git status --short

echo ""
read -p "确认提交? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "📝 创建提交..."
git commit -m "test: 添加自动化测试基础设施

- 配置Vitest + Supertest测试框架
- 编写108个测试用例（认证/RBAC/业务/验证）
- 集成GitHub Actions CI流水线
- 预期代码覆盖率60%+
- 详见 AUTOMATED_TESTING_SUMMARY.md"

echo ""
echo "🚀 推送到远程仓库..."
git push origin main

echo ""
echo "✅ 完成！请访问GitHub查看CI运行状态:"
echo "   https://github.com/shub2026/kec-manager/actions"
