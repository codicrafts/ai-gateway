# AI Gateway 技术文档

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
│  Web 浏览器 / API 客户端 / SDK                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      接入层 (Nginx)                          │
│  • SSL 终止                                                  │
│  • 负载均衡                                                  │
│  • 静态资源缓存                                              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│     Next.js 前端服务      │    │      One API 网关        │
│  • 官网展示               │    │  • API 代理转发          │
│  • 用户控制台             │    │  • 认证鉴权              │
│  • Playground            │    │  • 计费扣费              │
│  • 文档系统               │    │  • 负载均衡              │
│                          │    │  • 日志记录              │
│  端口: 3000              │    │  端口: 3001              │
└──────────────────────────┘    └──────────────────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                        ┌─────────┐     ┌─────────┐     ┌─────────┐
                        │ OpenAI  │     │DeepSeek │     │ Claude  │
                        └─────────┘     └─────────┘     └─────────┘
```

### 1.2 数据流

```
1. 用户请求流程（Playground）
   用户输入 → Next.js API → One API → AI 厂商 → 流式返回

2. 用户直接调用 API
   用户 SDK → One API → AI 厂商 → 返回结果
```

## 2. 技术选型

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.x | React 全栈框架 |
| React | 18.x | UI 库 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | 样式框架 |
| Redux Toolkit | 2.x | 状态管理 |
| NextAuth.js | 4.x | 身份认证 |
| Chart.js | 4.x | 图表可视化 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| One API | 0.6.x | API 网关 |
| Go | 1.20+ | One API 运行时 |
| SQLite/MySQL | - | 数据存储 |
| Redis | 7.x | 缓存（可选） |

### 2.3 部署技术栈

| 技术 | 用途 |
|------|------|
| Docker | 容器化部署 |
| Nginx | 反向代理 |
| Let's Encrypt | SSL 证书 |

## 3. 核心模块

### 3.1 前端模块

```
src/
├── app/                      # 页面路由
│   ├── page.tsx             # 首页
│   ├── models/              # 模型市场
│   ├── playground/          # 在线测试
│   ├── dashboard/           # 用户控制台
│   ├── docs/                # API 文档
│   ├── pricing/             # 定价页面
│   ├── login/               # 登录
│   ├── register/            # 注册
│   └── api/                 # API 路由
│       ├── chat/            # 聊天代理
│       ├── auth/            # 认证
│       └── tables/          # 数据接口
├── components/              # 公共组件
│   ├── Navbar.tsx          # 导航栏
│   ├── Footer.tsx          # 页脚
│   └── Notification.tsx    # 通知组件
├── store/                   # Redux 状态
│   ├── slices/
│   │   ├── authSlice.ts    # 认证状态
│   │   ├── dashboardSlice.ts
│   │   ├── playgroundSlice.ts
│   │   └── modelsSlice.ts
│   └── index.ts
├── lib/                     # 工具库
│   └── oneapi.ts           # One API 客户端
├── types/                   # 类型定义
│   └── index.ts
└── utils/                   # 工具函数
    └── helpers.ts
```

### 3.2 One API 模块

One API 提供以下核心功能：

| 模块 | 功能 |
|------|------|
| 渠道管理 | 添加/编辑/删除 AI 厂商渠道 |
| 令牌管理 | 创建用户 API Key |
| 用户管理 | 用户注册、分组、配额 |
| 计费系统 | Token 计费、余额管理 |
| 日志系统 | 请求日志记录和查询 |
| 负载均衡 | 多渠道权重分配 |

## 4. API 设计

### 4.1 聊天接口

**请求**
```http
POST /v1/chat/completions
Authorization: Bearer sk-xxx
Content-Type: application/json

{
  "model": "deepseek-chat",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello"}
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": true
}
```

**响应（流式）**
```
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"Hello"}}]}
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"!"}}]}
data: [DONE]
```

### 4.2 模型列表

**请求**
```http
GET /v1/models
Authorization: Bearer sk-xxx
```

**响应**
```json
{
  "data": [
    {"id": "deepseek-chat", "object": "model"},
    {"id": "gpt-4-turbo", "object": "model"}
  ]
}
```

## 5. 数据模型

### 5.1 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 用户 ID |
| username | string | 用户名 |
| email | string | 邮箱 |
| password | string | 密码（加密） |
| balance | decimal | 余额 |
| created_at | datetime | 创建时间 |

### 5.2 API Key 表 (api_keys)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | Key ID |
| user_id | string | 所属用户 |
| key_name | string | 名称 |
| api_key | string | Key 值 |
| status | string | 状态 |
| created_at | datetime | 创建时间 |

### 5.3 使用日志表 (usage_logs)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 日志 ID |
| user_id | string | 用户 ID |
| model_id | string | 模型 ID |
| input_tokens | int | 输入 Token |
| output_tokens | int | 输出 Token |
| cost | decimal | 费用 |
| timestamp | datetime | 时间 |

## 6. 安全设计

### 6.1 认证机制

- 前端用户：NextAuth.js Session 认证
- API 调用：Bearer Token 认证
- 管理后台：用户名密码 + Session

### 6.2 数据安全

- API Key 加密存储
- HTTPS 传输加密
- 敏感操作日志记录

### 6.3 访问控制

- 用户配额限制
- 请求频率限制（RPM/TPM）
- IP 白名单（可选）

## 7. 性能优化

### 7.1 前端优化

- Next.js SSR/SSG
- 图片懒加载
- 代码分割
- CDN 静态资源

### 7.2 API 优化

- 流式响应减少等待
- Redis 缓存热点数据
- 连接池复用

### 7.3 扩展方案

- One API 多实例部署
- 数据库读写分离
- Redis 集群

### 7.4 并发能力

#### 单实例性能

| 服务器配置 | 预估并发 | 适用场景 |
|-----------|---------|---------|
| 1核2G | 50-100 | 开发测试 |
| 2核4G | 200-500 | 小型生产 |
| 4核8G | 500-1000 | 中型生产 |
| 8核16G | 1000+ | 大型生产 |

> One API 使用 Go 语言编写，天然支持高并发，单实例性能开销很小。

#### 并发瓶颈分析

实际并发瓶颈主要在上游 AI 厂商的 API 限制：

| 厂商 | 免费版限制 | 付费版限制 |
|------|-----------|-----------|
| DeepSeek | 60 RPM | 按账户等级 |
| OpenAI | 3 RPM (免费) | 500-10000 RPM |
| Claude | 5 RPM | 1000+ RPM |

#### 提升并发策略

1. **多渠道负载均衡**
   
   同一模型配置多个渠道，请求自动分流：
   ```
   渠道1: DeepSeek 官方 API (权重 10)
   渠道2: DeepSeek 代理商 A (权重 5)
   渠道3: DeepSeek 代理商 B (权重 5)
   ```

2. **多实例部署**
   
   部署多个 One API 实例，前置负载均衡器（Nginx/SLB）

3. **渠道权重优化**
   
   - 高配额渠道设置更高权重
   - 低延迟渠道优先级更高
   - 根据成功率动态调整

#### 企业级建议

- 向厂商申请更高的 API 配额（企业认证可获得更高限额）
- 配置多个同模型渠道做负载均衡，突破单渠道限制
- 监控各渠道的成功率和延迟，及时调整权重
- 设置渠道故障自动切换，保证服务可用性
- 考虑使用多个厂商账号分散请求

## 8. 监控告警

### 8.1 监控指标

| 指标 | 说明 |
|------|------|
| 请求量 | QPS/QPM |
| 成功率 | 2xx 比例 |
| 延迟 | P50/P95/P99 |
| Token 消耗 | 输入/输出 |
| 渠道状态 | 可用性 |

### 8.2 告警规则

- 成功率 < 99%
- P99 延迟 > 10s
- 渠道连续失败 > 3 次
- 余额不足

## 9. 部署架构

### 9.1 单机部署

```
服务器 (2核4G)
├── Nginx (80/443)
├── Next.js (3000)
├── One API (3001)
└── SQLite
```

### 9.2 高可用部署

```
负载均衡 (SLB)
├── Web 服务器 x2
│   └── Next.js
├── API 服务器 x2
│   └── One API
├── MySQL 主从
└── Redis 集群
```

## 10. 开发规范

### 10.1 代码规范

- ESLint + Prettier
- TypeScript 严格模式
- 组件使用函数式 + Hooks

### 10.2 Git 规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 样式调整
refactor: 重构
perf: 性能优化
```

### 10.3 目录规范

- 页面放 `app/`
- 公共组件放 `components/`
- 工具函数放 `utils/`
- 类型定义放 `types/`
