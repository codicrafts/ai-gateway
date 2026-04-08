#!/bin/bash

# Webhook 测试脚本
# 用于测试 Webhook 端点是否正常工作

set -e

echo "🧪 Webhook 端点测试"
echo "===================="
echo ""

# 默认 URL
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/webhooks/one-api-usage}"

echo "📡 测试 Webhook 端点: $WEBHOOK_URL"
echo ""

# 1. 健康检查
echo "1️⃣  健康检查..."
HEALTH_RESPONSE=$(curl -s "$WEBHOOK_URL")
echo "响应: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ 端点正常"
else
    echo "❌ 端点异常"
    exit 1
fi

echo ""

# 2. 发送测试 Webhook
echo "2️⃣  发送测试 Webhook..."

TEST_PAYLOAD='{
  "id": 999999,
  "created_at": '$(date +%s)',
  "type": 1,
  "username": "test_user",
  "token_name": "test_key",
  "model_name": "deepseek-chat",
  "start_time": '$(date +%s)',
  "end_time": '$(($(date +%s) + 1))',
  "channel_id": 1,
  "quota": 18000,
  "prompt_tokens": 8,
  "completion_tokens": 28,
  "content": "test webhook",
  "user_id": 1,
  "token_id": 1
}'

echo "Payload:"
echo "$TEST_PAYLOAD" | jq '.'
echo ""

WEBHOOK_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

echo "响应:"
echo "$WEBHOOK_RESPONSE" | jq '.'
echo ""

if echo "$WEBHOOK_RESPONSE" | grep -q "success"; then
    echo "✅ Webhook 处理成功"
else
    echo "⚠️  Webhook 处理可能失败（可能是 API Key 映射问题）"
fi

echo ""
echo "📝 下一步:"
echo "1. 检查应用日志查看详细信息"
echo "2. 在 Supabase 中查询: SELECT * FROM org_usage_ledger WHERE new_api_log_id = 999999"
echo "3. 配置 One API 使用此 Webhook URL"
echo ""
echo "🔧 配置 One API Webhook:"
echo "   URL: $WEBHOOK_URL"
echo "   Method: POST"
echo "   Content-Type: application/json"
