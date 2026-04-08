# API Key 使用统计测试指南

## 问题诊断

你已经通过 One API 成功调用了模型，但 Dashboard 的统计数据没有更新。

### 数据流程

```
用户调用 API
    ↓
One API 处理请求
    ↓
One API 记录日志到自己的数据库
    ↓
【缺失环节】同步到 Supabase
    ↓
Dashboard 从 Supabase 读取数据
```

## 原因分析

你的应用架构中，One API 和你的 Web 应用使用不同的数据库：

- **One API**: 使用自己的 SQLite/MySQL 数据库
- **Web 应用**: 使用 Supabase PostgreSQL 数据库

目前缺少数据同步机制。

## 解决方案

### 方案 1：实时同步（推荐）

创建一个同步服务，定期从 One API 拉取使用日志并写入 Supabase。

#### 1.1 创建同步脚本

```typescript
// scripts/sync-usage-logs.ts
import { createClient } from '@supabase/supabase-js';

const ONE_API_URL = process.env.ONE_API_URL!;
const ONE_API_ACCESS_TOKEN = process.env.ONE_API_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function syncUsageLogs() {
  console.log('🔄 开始同步使用日志...');

  // 1. 从 One API 获取日志
  const response = await fetch(`${ONE_API_URL}/api/log?p=0&size=100`, {
    headers: {
      'Authorization': `Bearer ${ONE_API_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取 One API 日志失败');
  }

  const data = await response.json();
  const logs = data.data || [];

  console.log(`📊 获取到 ${logs.length} 条日志`);

  // 2. 写入 Supabase
  for (const log of logs) {
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('org_usage_ledger')
      .select('id')
      .eq('new_api_log_id', log.id)
      .single();

    if (existing) {
      console.log(`⏭️  日志 ${log.id} 已存在，跳过`);
      continue;
    }

    // 插入新日志
    const { error } = await supabase
      .from('org_usage_ledger')
      .insert({
        new_api_log_id: log.id,
        team_id: log.team_id, // 需要映射
        org_api_key_id: log.token_id,
        model: log.model_name,
        prompt_tokens: log.prompt_tokens,
        completion_tokens: log.completion_tokens,
        total_tokens: log.prompt_tokens + log.completion_tokens,
        amount: log.quota,
        request_count: 1,
        occurred_at: new Date(log.created_at * 1000).toISOString(),
      });

    if (error) {
      console.error(`❌ 插入日志 ${log.id} 失败:`, error);
    } else {
      console.log(`✅ 插入日志 ${log.id} 成功`);
    }
  }

  console.log('✅ 同步完成');
}

syncUsageLogs().catch(console.error);
```

#### 1.2 运行同步脚本

```bash
# 安装依赖
pnpm add tsx

# 运行同步
pnpm tsx scripts/sync-usage-logs.ts
```

#### 1.3 设置定时任务

```bash
# 使用 cron 每分钟同步一次
* * * * * cd /path/to/project && pnpm tsx scripts/sync-usage-logs.ts
```

### 方案 2：Webhook 同步（更实时）

在 One API 中配置 Webhook，每次调用后自动推送到你的应用。

#### 2.1 创建 Webhook 接收端点

```typescript
// apps/web/src/app/api/webhooks/one-api/route.ts
import { NextRequest } from 'next/server';
import { createServerAdminSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const supabase = createServerAdminSupabaseClient();
  const log = await request.json();

  // 验证签名（可选）
  const signature = request.headers.get('x-one-api-signature');
  // ... 验证逻辑

  // 插入日志
  const { error } = await supabase
    .from('org_usage_ledger')
    .insert({
      new_api_log_id: log.id,
      team_id: log.team_id,
      org_api_key_id: log.token_id,
      model: log.model_name,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      total_tokens: log.prompt_tokens + log.completion_tokens,
      amount: log.quota,
      request_count: 1,
      occurred_at: new Date(log.created_at * 1000).toISOString(),
    });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

#### 2.2 在 One API 中配置 Webhook

```
One API 管理后台 → 设置 → Webhook
URL: https://your-domain.com/api/webhooks/one-api
```

### 方案 3：直接查询 One API（临时方案）

修改 `gateway-usage.service.ts`，直接从 One API 查询数据。

```typescript
// apps/web/src/services/gateway/gateway-usage.service.ts

async function fetchOneApiLogs(teamId: string) {
  const response = await fetch(
    `${process.env.ONE_API_URL}/api/log?p=0&size=50`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.ONE_API_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('获取 One API 日志失败');
  }

  const data = await response.json();
  return data.data || [];
}

export async function listGatewayUsageForTeam(options: {
  teamId: string;
  page?: number;
  limit?: number;
}) {
  const { teamId, page = 0, limit = 20 } = options;

  // 直接从 One API 获取数据
  const logs = await fetchOneApiLogs(teamId);

  return {
    logs: logs.map((log: any) => ({
      id: log.id,
      model: log.model_name,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      total_tokens: log.prompt_tokens + log.completion_tokens,
      quota_cost: log.quota,
      token_name: `Key #${log.token_id}`,
      created_at: new Date(log.created_at * 1000).toISOString(),
    })),
    stats: {
      total_quota: 10000, // 从 One API 获取
      used_quota: logs.reduce((sum: number, log: any) => sum + log.quota, 0),
      remaining_quota: 10000 - logs.reduce((sum: number, log: any) => sum + log.quota, 0),
      request_count: logs.length,
    },
    page,
    limit,
  };
}
```

## 快速测试

### 1. 检查 One API 日志

```bash
# 查看 One API 日志
curl http://localhost:3001/api/log?p=0&size=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

应该能看到你刚才的调用记录。

### 2. 检查 Supabase 数据

```sql
-- 在 Supabase SQL Editor 中运行
SELECT * FROM org_usage_ledger 
ORDER BY occurred_at DESC 
LIMIT 10;
```

如果为空，说明数据没有同步。

### 3. 手动插入测试数据

```sql
-- 在 Supabase SQL Editor 中运行
INSERT INTO org_usage_ledger (
  team_id,
  org_api_key_id,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  amount,
  request_count,
  occurred_at
) VALUES (
  '你的团队ID',
  1,
  'deepseek-chat',
  8,
  28,
  36,
  0.00036,
  1,
  NOW()
);
```

然后刷新 Dashboard，应该能看到数据了。

## 推荐实施步骤

### 第一步：验证数据流

1. 调用 API
2. 检查 One API 日志
3. 检查 Supabase 数据
4. 确认哪个环节缺失

### 第二步：实施同步

1. 先用方案 3（直接查询）快速验证
2. 再实施方案 1（定时同步）作为长期方案
3. 最后考虑方案 2（Webhook）实现实时性

### 第三步：监控和优化

1. 添加同步日志
2. 监控同步延迟
3. 处理同步失败

## 调试命令

### 查看 One API 日志

```bash
# 获取最近的日志
curl http://localhost:3001/api/log?p=0&size=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq

# 查看特定用户的日志
curl "http://localhost:3001/api/log?p=0&size=10&user_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq
```

### 查看 Supabase 数据

```bash
# 使用 Supabase CLI
supabase db query "SELECT * FROM org_usage_ledger LIMIT 10"
```

### 测试 API 调用

```bash
# 使用你的 API Key 调用
curl http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "测试"}]
  }'
```

## 常见问题

### Q: 为什么数据不同步？

A: 因为 One API 和你的 Web 应用使用不同的数据库，需要手动同步。

### Q: 同步会有延迟吗？

A: 
- 方案 1（定时同步）：延迟 = 同步间隔（如 1 分钟）
- 方案 2（Webhook）：延迟 < 1 秒
- 方案 3（直接查询）：无延迟，但性能较差

### Q: 如何确保数据一致性？

A: 
1. 使用 `new_api_log_id` 作为唯一标识
2. 插入前检查是否已存在
3. 使用事务保证原子性

### Q: 同步失败怎么办？

A:
1. 记录失败日志
2. 实现重试机制
3. 设置告警通知

## 总结

你的问题是数据没有从 One API 同步到 Supabase。

**立即可做**：
1. 使用方案 3 直接查询 One API（快速验证）
2. 手动插入测试数据验证 Dashboard 功能

**长期方案**：
1. 实施方案 1 定时同步
2. 或实施方案 2 Webhook 同步

需要我帮你实现哪个方案吗？
