#!/bin/bash

# Railway 环境变量快速配置脚本

set -e

echo "🚀 Railway 环境变量配置向导"
echo "================================"
echo ""

# 检查 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安装"
    echo "请运行: npm i -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI 已安装"
echo ""

# 登录检查
echo "📝 检查登录状态..."
if ! railway whoami &> /dev/null; then
    echo "请先登录 Railway:"
    railway login
fi

echo "✅ 已登录"
echo ""

# 链接项目
echo "🔗 链接项目..."
if ! railway status &> /dev/null; then
    echo "请选择要配置的项目:"
    railway link
fi

echo "✅ 项目已链接"
echo ""

# 生成 NEXTAUTH_SECRET
echo "🔐 生成 NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "生成的密钥: $NEXTAUTH_SECRET"
echo ""

# 获取 Railway 域名
echo "🌐 获取 Railway 域名..."
echo "请输入你的 Railway 域名（例如：your-app.railway.app）:"
read -r RAILWAY_DOMAIN

if [ -z "$RAILWAY_DOMAIN" ]; then
    echo "❌ 域名不能为空"
    exit 1
fi

NEXTAUTH_URL="https://$RAILWAY_DOMAIN"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo ""

# Supabase 配置
echo "📦 配置 Supabase..."
echo "请输入 Supabase 项目 URL（例如：https://xxx.supabase.co）:"
read -r SUPABASE_URL

echo "请输入 Supabase Anon Key:"
read -r SUPABASE_ANON_KEY

echo "请输入 Supabase Service Role Key:"
read -r SUPABASE_SERVICE_ROLE_KEY

# One API 配置
echo ""
echo "🔌 配置 One API..."
echo "请输入 One API URL（例如：http://your-one-api.com）:"
read -r ONE_API_URL

echo "请输入 One API Key:"
read -r ONE_API_KEY

echo "请输入 One API Access Token:"
read -r ONE_API_ACCESS_TOKEN

echo "请输入 One API User ID（默认：1）:"
read -r ONE_API_USER_ID
ONE_API_USER_ID=${ONE_API_USER_ID:-1}

# 确认配置
echo ""
echo "📋 配置摘要"
echo "================================"
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo "NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:10}..."
echo "NEXT_PUBLIC_SUPABASE_URL: $SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:10}..."
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:10}..."
echo "ONE_API_URL: $ONE_API_URL"
echo "ONE_API_KEY: ${ONE_API_KEY:0:10}..."
echo "ONE_API_ACCESS_TOKEN: ${ONE_API_ACCESS_TOKEN:0:10}..."
echo "ONE_API_USER_ID: $ONE_API_USER_ID"
echo ""

echo "确认配置并上传到 Railway？(y/n)"
read -r CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ 已取消"
    exit 0
fi

# 上传环境变量
echo ""
echo "⬆️  上传环境变量到 Railway..."

railway variables set NEXTAUTH_URL="$NEXTAUTH_URL"
railway variables set NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
railway variables set NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
railway variables set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
railway variables set ONE_API_URL="$ONE_API_URL"
railway variables set ONE_API_KEY="$ONE_API_KEY"
railway variables set ONE_API_ACCESS_TOKEN="$ONE_API_ACCESS_TOKEN"
railway variables set ONE_API_USER_ID="$ONE_API_USER_ID"

echo ""
echo "✅ 环境变量配置完成！"
echo ""
echo "📝 下一步："
echo "1. Railway 会自动触发重新部署"
echo "2. 等待部署完成（约 2-3 分钟）"
echo "3. 访问 https://$RAILWAY_DOMAIN 验证"
echo ""
echo "🔍 查看部署状态："
echo "   railway status"
echo ""
echo "📊 查看日志："
echo "   railway logs"
echo ""
echo "🎉 完成！"
