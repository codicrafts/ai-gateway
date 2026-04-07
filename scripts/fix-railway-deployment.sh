#!/bin/bash

# Railway 部署修复脚本
# 用于解决 pnpm lockfile 相关问题

set -e

echo "🔧 开始修复 Railway 部署问题..."

# 1. 检查 pnpm 版本
echo ""
echo "📦 检查 pnpm 版本..."
PNPM_VERSION=$(pnpm --version)
EXPECTED_VERSION="9.15.9"

if [ "$PNPM_VERSION" != "$EXPECTED_VERSION" ]; then
    echo "⚠️  当前 pnpm 版本: $PNPM_VERSION"
    echo "⚠️  期望版本: $EXPECTED_VERSION"
    echo "🔄 正在更新 pnpm..."
    corepack enable
    corepack prepare pnpm@$EXPECTED_VERSION --activate
    echo "✅ pnpm 已更新到 $EXPECTED_VERSION"
else
    echo "✅ pnpm 版本正确: $PNPM_VERSION"
fi

# 2. 清理旧的依赖
echo ""
echo "🧹 清理旧的依赖..."
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -rf .pnpm-store
echo "✅ 清理完成"

# 3. 重新安装依赖
echo ""
echo "📥 重新安装依赖..."
pnpm install
echo "✅ 依赖安装完成"

# 4. 验证 lockfile
echo ""
echo "🔍 验证 lockfile..."
if pnpm install --frozen-lockfile; then
    echo "✅ lockfile 验证通过"
else
    echo "❌ lockfile 验证失败"
    exit 1
fi

# 5. 测试构建
echo ""
echo "🏗️  测试构建..."
if pnpm build; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    exit 1
fi

# 6. 提示提交更改
echo ""
echo "✅ 所有检查通过！"
echo ""
echo "📝 下一步操作："
echo "1. 提交更改："
echo "   git add pnpm-lock.yaml Dockerfile"
echo "   git commit -m 'fix: update pnpm lockfile and optimize Dockerfile'"
echo "   git push"
echo ""
echo "2. 在 Railway 中触发重新部署"
echo ""
echo "🎉 完成！"
