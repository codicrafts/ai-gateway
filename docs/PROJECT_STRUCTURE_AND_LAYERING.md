# 当前项目目录结构与服务分层方案

适用前提：

- 官网和企业后台都在同一个 Next.js 项目内
- `new-api` 负责网关运行时
- Supabase 负责产品域数据
- 当前阶段先不拆独立 `app-api` 项目

## 1. 分层原则

### `src/app/*`

职责：

- 页面路由
- API Route Handler
- 只做参数解析、鉴权入口、返回响应

要求：

- 不承载核心业务逻辑
- 不直接堆叠大量 Supabase / `new-api` 调用

### `src/services/*`

职责：

- 业务逻辑层
- 聚合多个底层依赖
- 体现领域边界

当前建议的领域：

- `account`
- `catalog`
- `gateway`
- `team`
- `billing`
- `contact`

### `src/lib/*`

职责：

- 基础设施适配层
- 外部系统 SDK / client / helper

当前放置内容：

- `auth.ts`
- `supabase.ts`
- `oneapi.ts`
- `auditLog.ts`

原则：

- `lib` 只做能力接入，不做复杂业务编排

### `src/server/*`

职责：

- 仅服务端可复用能力
- API 响应工具
- server-only helper

### `src/store/*`

职责：

- 前端状态管理
- 只处理 UI 状态和页面聚合状态
- 不承担后端业务逻辑

## 2. 推荐目录结构

```text
src/
  app/
    api/
      account/
      catalog/
      gateway/
      billing/
      contact/
      teams/
    (pages...)

  components/
  hooks/
  i18n/

  services/
    account/
      app-user.service.ts
      session.service.ts
    catalog/
      model-catalog.service.ts
    gateway/
      gateway-account.service.ts
      gateway-token.service.ts
      gateway-usage.service.ts
    billing/
      billing.service.ts
      payment.service.ts
    team/
      team.service.ts
      team-audit.service.ts
    contact/
      sales-lead.service.ts

  lib/
    auth.ts
    oneapi.ts
    supabase.ts
    auditLog.ts
    teamAuth.ts

  server/
    api/
      responses.ts

  store/
    slices/

  types/
  utils/
```

## 3. 当前项目应如何落地

### 第一阶段

先做以下动作：

- 把账户逻辑迁到 `services/account`
- 把模型目录逻辑迁到 `services/catalog`
- 给 API Route 增加统一响应工具
- 保留 `lib` 作为外部依赖接入层

### 第二阶段

继续迁移：

- `api_keys` / `usage_logs` -> `services/gateway`
- 团队相关 API -> `services/team`
- 支付和账单 -> `services/billing`
- 联系销售 -> `services/contact`

### 第三阶段

对外 API 路径按领域收敛：

- `/api/account/*`
- `/api/catalog/*`
- `/api/gateway/*`
- `/api/billing/*`
- `/api/contact/*`
- `/api/teams/*`

逐步淘汰当前偏临时性的 `/api/tables/*` 风格。

## 4. 本次已执行的第一批改造

已完成：

- 新增 `src/services/account/app-user.service.ts`
- 新增 `src/services/account/session.service.ts`
- 新增 `src/services/catalog/model-catalog.service.ts`
- 新增 `src/services/gateway/gateway-token.service.ts`
- 新增 `src/services/gateway/gateway-usage.service.ts`
- 新增 `src/services/gateway/gateway-types.ts`
- 新增 `src/services/billing/billing.service.ts`
- 新增 `src/services/billing/payment.service.ts`
- 新增 `src/services/team/team-query.service.ts`
- 新增 `src/services/team/team-audit.service.ts`
- 新增 `src/services/team/team-mutation.service.ts`
- 新增 `src/server/api/responses.ts`
- `GET /api/account/session` 已改为调用 `services/account`
- `GET/POST /api/tables/users` 已改为调用 `services/account`
- `GET /api/tables/models` 已改为调用 `services/catalog`
- `api_keys` / `usage_logs` 路由已改为调用 `services/gateway`
- 已新增领域接口 `/api/gateway/keys` 和 `/api/gateway/usage`
- 已新增领域接口 `/api/billing/summary`
- 已新增领域接口 `/api/billing/payment-orders`
- 已新增领域接口 `/api/billing/webhooks/[provider]`
- 充值确认已打通 `payment_order -> billing_transaction -> new-api topup`
- `GET /api/teams`、`POST /api/teams` 已改为调用 `services/team`
- `GET/PUT/DELETE /api/teams/[id]` 已改为调用 `services/team`
- `GET/POST /api/teams/[id]/members` 已改为调用 `services/team`
- `PUT/DELETE /api/teams/[id]/members/[userId]` 已改为调用 `services/team`
- `POST /api/teams/[id]/transfer` 已改为调用 `services/team`
- `GET /api/teams/[id]/audit-logs` 已改为调用 `services/team`
- `src/lib/appUser.ts` 已降级为兼容性 re-export

## 5. 接下来最值得继续迁移的模块

优先级建议：

1. `services/gateway`
   - `api_keys`
   - `usage_logs`
   - Dashboard 聚合数据
2. `services/team`
   - 团队详情
   - 成员管理
   - 审计日志
3. `services/billing`
   - 余额
   - 充值订单
   - 账单导出

## 6. 判断标准

如果一个 `route.ts` 同时出现这些内容，就说明它应该被下沉到 `services/*`：

- 业务规则判断
- 超过一个外部依赖调用
- 多步数据库读写
- 审计日志编排
- 用户映射 / 权限映射
- 同时访问 Supabase 和 `new-api`

## 7. 一句话结论

对你当前项目，最合适的不是立刻拆独立后端，而是先把 Next.js 内部重构成：

- `app/api` 做薄控制器
- `services` 做业务层
- `lib` 做基础设施层

等 `services` 变重后，再把其中部分领域拆成独立接口服务。
