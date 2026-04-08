# One API Webhook 实时同步配置指南

## 目标

实现每次 API 调用后，使用数据立即同步到你的应用数据库。

## 架构

```
用户调用 API
    ↓
One API 处理请求
    ↓
One API 发送 Webhook (实时)
    ↓
你的应用 /api/webhooks/one-api-usage
    ↓
写入 Supabase
    ↓
Dashboard 立即显示更新
```

## 配置步骤

### 1. 确认 Webhook 端点已部署

**本地开发**：
```
http://localhost:3000/api/webhooks/one-api-usage
```

**生产环境**：
```
https://your-domain.railway.app/api/webhooks/one-api-usage
```

**测试端点**：
```bash
curl http://localhost:3000/api/webhooks/one-api-usage
# 应该返回: {"status":"ok","endpoint":"/api/webhooks/one-api-usage",...}
```

### 2. 在 One API 中配置 Webhook

#### 方法 1：通过管理界面（如果支持）

1. 登录 One API 管理后台
2. 进入 **设置** → **Webhook 配置**
3. 添加 Webhook URL：
   ```
   http://localhost:3000/api/webhooks/one-api-usage
   ```
4. 选择事件类型：**使用日志创建**
5. 保存配置

#### 方法 2：通过配置文件

如果 One API 使用配置文件，添加：

```yaml
# one-api config.yaml
webhooks:
  - url: http://localhost:3000/api/webhooks/one-api-usage
    events:
      - log.created
    secret: your-webhook-secret  # 可选，用于验证
```

#### 方法 3：通过环境变量

```env
# One API .env
WEBHOOK_URL=http://localhost:3000/api/webhooks/one-api-usage
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_EVENTS=log.created
```

#### 方法 4：修改 One API 源码（如果需要）

如果 One API 不支持 Webhook，需要修改源码添加：

```go
// 在 One API 记录日志后添加
func LogUsage(log *Log) error {
    // 原有的日志记录逻辑
    err := db.Create(log).Error
    if err != nil {
        return err
    }
    
    // 发送 Webhook
    go sendWebhook(log)
    
    return nil
}

func sendWebhook(log *Log) {
    webhookURL := os.Getenv("WEBHOOK_URL")
    if webhookURL == "" {
        return
    }
    
    payload, _ := json.Marshal(log)
    resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(payload))
    if err != nil {
        log.Printf("Webhook failed: %v", err)
        return
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != 200 {
        log.Printf("Webhook returned status: %d", resp.StatusCode)
    }
}
```

### 3. 配置环境变量

在你的应用中添加（可选）：

```env
# apps/web/.env.local

# Webhook 密钥（用于验证请求来自 One API）
ONE_API_WEBHOOK_SECRET=your-secret-key-here
```

生成密钥：
```bash
openssl rand -base64 32
```

### 4. 测试 Webhook

#### 4.1 手动测试

```bash
# 发送测试 Webhook
curl -X POST http://localhost:3000/api/webhooks/one-api-usage \
  -H "Content-Type: application/json" \
  -d '{
    "id": 999999,
    "created_at": 1704067200,
    "type": 1,
    "username": "test_user",
    "token_name": "test_key",
    "model_name": "deepseek-chat",
    "start_time": 1704067200,
    "end_time": 1704067201,
    "channel_id": 1,
    "quota": 18000,
    "prompt_tokens": 8,
    "completion_tokens": 28,
    "content": "test",
    "user_id": 1,
    "token_id": 1
  }'
```

**预期响应**：
```json
{
  "success": true,
  "message": "Usage log synced successfully",
  "data": {
    "log_id": 999999,
    "team_id": "your-team-id",
    "tokens": 36
  }
}
```

#### 4.2 实际调用测试

```bash
# 1. 调用 API
curl http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "测试"}]
  }'

# 2. 检查 Webhook 日志
# 应该在应用日志中看到：
# [Webhook] 收到 One API 使用日志: {...}
# [Webhook] ✅ 使用日志同步成功: {...}

# 3. 刷新 Dashboard
# 应该立即看到新的使用记录
```

### 5. 监控和调试

#### 查看 Webhook 日志

**应用日志**：
```bash
# 本地开发
# 在终端中查看 Next.js 输出

# 生产环境
railway logs --tail 100
```

**One API 日志**：
```bash
tail -f new-api/logs/*.log | grep -i webhook
```

#### 检查数据库

```sql
-- 查看最新的使用记录
SELECT * FROM org_usage_ledger 
ORDER BY occurred_at DESC 
LIMIT 10;

-- 检查是否有重复
SELECT new_api_log_id, COUNT(*) 
FROM org_usage_ledger 
GROUP BY new_api_log_id 
HAVING COUNT(*) > 1;
```

### 6. 故障排查

#### Webhook 没有触发

**检查清单**：
1. ✅ One API 配置正确
2. ✅ Webhook URL 可访问
3. ✅ 网络连接正常
4. ✅ One API 日志中有 Webhook 发送记录

**调试命令**：
```bash
# 测试 Webhook 端点是否可访问
curl http://localhost:3000/api/webhooks/one-api-usage

# 查看 One API 日志
tail -f new-api/logs/*.log
```

#### Webhook 触发但数据没有同步

**可能原因**：
1. API Key 映射错误
2. 数据库写入失败
3. 数据格式不匹配

**调试步骤**：
```bash
# 1. 查看应用日志
railway logs | grep -i webhook

# 2. 检查 API Key 映射
# 在 Supabase SQL Editor 中运行：
SELECT * FROM org_api_keys 
WHERE new_api_token_id = YOUR_TOKEN_ID;

# 3. 手动测试 Webhook
curl -X POST http://localhost:3000/api/webhooks/one-api-usage \
  -H "Content-Type: application/json" \
  -d @test-webhook-payload.json
```

#### 数据重复

**原因**：Webhook 重试导致

**解决方案**：
- Webhook 端点已实现去重逻辑（检查 `new_api_log_id`）
- 如果仍有重复，检查数据库唯一约束

```sql
-- 添加唯一约束（如果还没有）
ALTER TABLE org_usage_ledger 
ADD CONSTRAINT unique_new_api_log_id 
UNIQUE (new_api_log_id);
```

### 7. 性能优化

#### 异步处理

如果 Webhook 处理较慢，可以使用消息队列：

```
One API Webhook
    ↓
你的应用（快速响应 200）
    ↓
消息队列（Redis/RabbitMQ）
    ↓
后台 Worker 处理
    ↓
写入 Supabase
```

#### 批量写入

如果请求量很大，可以批量写入：

```typescript
// 收集 Webhook 数据
const buffer: WebhookPayload[] = [];

// 每 10 条或每 5 秒批量写入
if (buffer.length >= 10 || timeSinceLastWrite > 5000) {
  await supabase.from('org_usage_ledger').insert(buffer);
  buffer = [];
}
```

### 8. 安全建议

#### 验证 Webhook 签名

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

#### IP 白名单

```typescript
const ALLOWED_IPS = ['127.0.0.1', 'your-one-api-server-ip'];

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip');
  
  if (!ALLOWED_IPS.includes(clientIP)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 继续处理...
}
```

#### 限流

```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

export async function POST(request: NextRequest) {
  const { success } = await ratelimit.limit('webhook');
  
  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }
  
  // 继续处理...
}
```

## 完整配置示例

### One API 配置

```env
# One API .env
WEBHOOK_URL=https://your-domain.railway.app/api/webhooks/one-api-usage
WEBHOOK_SECRET=your-secret-key
WEBHOOK_EVENTS=log.created
WEBHOOK_TIMEOUT=5000
WEBHOOK_RETRY=3
```

### 应用配置

```env
# apps/web/.env.local
ONE_API_WEBHOOK_SECRET=your-secret-key
```

### 数据库约束

```sql
-- 确保日志不重复
ALTER TABLE org_usage_ledger 
ADD CONSTRAINT unique_new_api_log_id 
UNIQUE (new_api_log_id);

-- 添加索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_new_api_log_id 
ON org_usage_ledger(new_api_log_id);

CREATE INDEX IF NOT EXISTS idx_org_usage_ledger_team_occurred 
ON org_usage_ledger(team_id, occurred_at DESC);
```

## 验证成功

配置成功后，你应该看到：

1. ✅ 调用 API 后，立即在应用日志中看到 Webhook 记录
2. ✅ 刷新 Dashboard，立即看到新的使用统计
3. ✅ 数据库中有对应的记录
4. ✅ 没有重复数据

## 下一步

- [ ] 配置 One API Webhook
- [ ] 测试 Webhook 端点
- [ ] 实际调用 API 验证
- [ ] 监控 Webhook 日志
- [ ] 添加告警（可选）

## 获取帮助

如果遇到问题：

1. 查看应用日志：`railway logs`
2. 查看 One API 日志：`tail -f new-api/logs/*.log`
3. 测试 Webhook 端点：`curl http://localhost:3000/api/webhooks/one-api-usage`
4. 检查数据库：`SELECT * FROM org_usage_ledger ORDER BY occurred_at DESC LIMIT 10`

需要帮助？提供以下信息：
- Webhook 日志输出
- One API 日志
- 数据库查询结果
