#!/bin/bash

# API 使用测试脚本
# 用于测试 API Key 的消耗和统计

set -e

echo "🧪 API 使用测试脚本"
echo "===================="
echo ""

# 检查环境变量
if [ -z "$ONE_API_URL" ]; then
    echo "❌ 缺少 ONE_API_URL 环境变量"
    echo "请在 .env.local 中设置或手动导出"
    exit 1
fi

# 读取 API Key
echo "请输入你的 API Key:"
read -r API_KEY

if [ -z "$API_KEY" ]; then
    echo "❌ API Key 不能为空"
    exit 1
fi

echo ""
echo "📡 测试 API 调用..."
echo "URL: $ONE_API_URL/v1/chat/completions"
echo "Model: deepseek-chat"
echo ""

# 调用 API
RESPONSE=$(curl -s -w "\n%{http_code}" "$ONE_API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role": "user", "content": "用一句话介绍你自己"}
    ]
  }')

# 分离响应体和状态码
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

echo "HTTP 状态码: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ API 调用成功！"
    echo ""
    echo "📊 响应详情:"
    echo "$HTTP_BODY" | jq '.'
    echo ""
    
    # 提取 token 使用情况
    PROMPT_TOKENS=$(echo "$HTTP_BODY" | jq -r '.usage.prompt_tokens // 0')
    COMPLETION_TOKENS=$(echo "$HTTP_BODY" | jq -r '.usage.completion_tokens // 0')
    TOTAL_TOKENS=$(echo "$HTTP_BODY" | jq -r '.usage.total_tokens // 0')
    
    echo "💰 Token 消耗:"
    echo "  输入: $PROMPT_TOKENS tokens"
    echo "  输出: $COMPLETION_TOKENS tokens"
    echo "  总计: $TOTAL_TOKENS tokens"
    echo ""
    
    # 计算费用（DeepSeek 价格：输入 $0.14/M tokens，输出 $0.28/M tokens）
    COST=$(echo "scale=6; ($PROMPT_TOKENS * 0.14 + $COMPLETION_TOKENS * 0.28) / 1000000" | bc)
    echo "  预估费用: \$$COST"
    echo ""
    
    echo "📝 下一步:"
    echo "1. 等待 1-2 分钟让数据同步"
    echo "2. 刷新 Dashboard 查看统计数据"
    echo "3. 或运行同步脚本: pnpm tsx scripts/sync-one-api-logs.ts"
    
else
    echo "❌ API 调用失败"
    echo ""
    echo "错误响应:"
    echo "$HTTP_BODY" | jq '.' || echo "$HTTP_BODY"
    echo ""
    echo "可能的原因:"
    echo "1. API Key 无效或已过期"
    echo "2. API Key 没有权限调用该模型"
    echo "3. One API 服务未运行"
    echo "4. 模型配置错误"
fi

echo ""
echo "🔍 查看 One API 日志:"
echo "   tail -f new-api/logs/*.log"
echo ""
echo "🔍 查看最近的使用记录:"
echo "   curl '$ONE_API_URL/api/log?p=0&size=10' \\"
echo "     -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'"
