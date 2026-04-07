# Aggregator 技术改造方案

目标：

- 明确 `new-api` 和 Supabase 的职责边界
- 消灭双写和重复主数据
- 让身份、团队、网关、账单、监控形成可维护架构
- 严格按 PRD 把“官网 + 账号与组织后台”和“平台底座 + 运营后台”拆开

## 0. 严格按 PRD 的职责拆分

基于 [Aggregator产品需求结构 (1).pdf](/Users/weili/Downloads/Aggregator产品需求结构%20%281%29.pdf)，当前项目应按下面的边界执行：

### 0.1 `ai-gateway` 负责

- 官网
  - Landing Page
  - Models
  - Pricing
  - Documentation
  - Contact Sales / About Us
- 账号与认证
  - 注册登录
  - 会话管理
  - 忘记密码 / 重置
- 个人中心
  - 个人资料
  - 修改密码
  - API Key 产品层入口
- 账号与组织后台
  - 团队 / 组织
  - 成员管理
  - 角色与 RBAC
  - 账单、充值、订单、支付
  - 企业视角的用量、账务、审计展示

说明：

- `ai-gateway` 不再承载 Provider 接入、模型管理、路由策略的运营配置面
- 这些能力不属于 PRD 里的“账号与组织后台”

### 0.2 `new-api` 负责

- API Gateway
- Provider 接入系统
  - Provider 注册
  - 连接配置
  - 健康检查
  - 版本管理
- 模型管理
  - 模型列表
  - 模型详情
  - 模型状态
  - runtime 能力标签
- Router 系统
  - 请求路由
  - Fallback
  - 负载均衡
  - 路由策略管理
- 平台运营后台
  - 运行时配置
  - 平台级观测
  - 全局汇总视图

### 0.3 执行原则

- `ai-gateway` 是产品层和企业后台
- `new-api` 是平台底座、运营后台和网关层
- 企业后台不再复制 `new-api` 的运营配置页面
- 企业后台只读取 `new-api` 的运行时结果用于展示，不承载其配置真源

## 1. 目标架构

推荐采用三层结构：

### 1.1 展示与 BFF 层

- `Next.js`
- 负责官网、控制台、文档、团队管理 UI、BFF API

职责：

- 用户会话
- 页面渲染
- 产品域 API 聚合
- 权限编排
- 把多个后端能力整合成前端可消费接口

### 1.2 产品域数据库

- `Supabase Postgres`

职责：

- 用户资料
- 身份映射
- 团队与组织
- 审计日志
- 销售线索
- 支付订单
- 账单导出记录
- SEO / 营销补充信息

### 1.3 网关运行时

- `new-api`

职责：

- Provider / channel 管理
- runtime model 管理
- API token / key
- 请求转发
- 限流
- quota / balance 扣减
- request log / usage log
- 路由、Fallback、负载均衡

## 2. 数据归属原则

核心规则：

- 任何关键数据只能有一个 source of truth
- `new-api` 负责“请求在运行时如何被接收、路由、计量、扣费”
- Supabase 负责“产品侧用户、组织、支付、销售、SEO、运营”

## 3. 数据归属矩阵

### 3.1 应放在 Supabase 的数据

#### 用户与身份

- `app_users`
  - 平台用户资料
  - 昵称
  - 头像
  - 联系方式
  - 状态
- `user_identities`
  - OAuth provider
  - provider user id
  - 登录来源
- `new_api_accounts`
  - `app_user_id`
  - `new_api_user_id`
  - 同步状态
  - 最近同步时间

原因：

- 这是产品级身份，不应耦合在网关运行时里
- 团队、销售、支付、控制台 UI 都依赖这层身份

#### 团队与组织

- `teams`
- `team_members`
- `team_invitations`
- `audit_logs`

原因：

- 团队协作属于产品域
- 不应污染 `new-api` 的核心职责

#### 支付与销售

- `payment_orders`
- `payment_webhooks`
- `credit_adjustments`
- `invoice_requests`
- `sales_leads`
- `support_tickets` 或后续工单表

原因：

- 第三方支付和企业线索属于业务系统，不属于网关 runtime
- 财务审计需要保留自己的业务侧流水

#### 官网补充内容

- `model_catalog_overrides`
  - marketing name
  - 标签
  - use cases
  - benchmark 说明
  - SEO 文案
- `docs_content` 或静态内容配置
- FAQ / landing 文案配置

原因：

- `new-api` 只需要知道模型能不能跑，不需要负责营销文案

#### 聚合缓存和读模型

- `usage_daily_rollups`
- `provider_health_snapshots`
- `billing_exports`

原因：

- 用于前台 BI 和导出优化
- 这些可以是派生数据，不是 runtime 主数据

### 3.2 应放在 new-api 的数据

#### 网关用户运行时账户

- `new-api users`
  - 用于调用权限、quota、group、余额扣减

原因：

- 网关请求在执行时需要本地快速完成鉴权和计费
- 余额 / quota 的原子扣减不应跨系统完成

注意：

- 这里的用户不是产品主身份，而是网关运行时账户
- 需要通过 Supabase 映射到 `app_user`

#### API Key / Token

- token / key
- token 状态
- token 额度
- token 模型限制
- token IP 白名单
- token 过期时间

原因：

- 这些直接参与运行时鉴权

#### Provider / Channel / Endpoint

- provider 配置
- channel 配置
- endpoint / instance
- 权重
- 健康状态

原因：

- 这是网关核心运行时配置

#### 模型 runtime 数据

- 模型 ID
- 模型启用状态
- 与 provider / channel 的映射
- 运行时价格
- 上下文长度
- 协议支持

原因：

- 这些决定请求是否能被正确路由和计费

#### 请求与计量数据

- request logs
- usage logs
- request status
- request cost
- token 消耗
- quota / balance 变更

原因：

- 请求发生时这些数据天然在 `new-api` 产生
- 不应让 Next.js 或 Supabase 负责主记账

### 3.3 不建议作为主数据放在 Supabase 的内容

- API Key 主表
- request logs 主表
- usage logs 主表
- runtime provider 配置
- runtime model enablement
- 钱包扣费流水主表

原因：

- 会和 `new-api` 形成双写
- 会导致计费、权限、日志在两个系统间失真

## 4. 推荐的同步关系

### 4.1 单向主从，不做双主

推荐关系：

- Supabase -> `new-api`
  - 用户开户 / 映射
  - 支付成功后的加款
- `new-api` -> Supabase
  - 用量日汇总
  - Provider 健康快照
  - 账单读模型

不要做：

- Supabase 和 `new-api` 对同一份 key / usage / balance 同时写

### 4.2 最小同步策略

第一阶段只同步这些：

- `app_user_id -> new_api_user_id`
- 支付成功后的 credit 调整结果
- usage 日级聚合

这样可以先把系统跑顺，再逐步补 BI。

## 5. 关键业务流程

### 5.1 注册 / 登录

推荐流程：

1. 用户通过 `Auth.js/NextAuth` 登录
2. Next.js 在 Supabase 中 upsert `app_user`
3. 检查 `new_api_accounts` 是否存在映射
4. 如果不存在，则通过 `new-api` 管理 API 创建 runtime user
5. 记录 `app_user_id <-> new_api_user_id`
6. 返回统一 session

结果：

- 产品层用户身份在 Supabase
- 网关运行时用户在 `new-api`
- 两者一对一映射

### 5.2 创建 API Key

推荐流程：

1. 前端调用 Next.js BFF
2. BFF 从 session 取 `app_user_id`
3. 查 Supabase 映射拿到 `new_api_user_id`
4. 调用 `new-api` 创建 token
5. 返回 token 结果给前端

注意：

- API Key 主记录在 `new-api`
- 如果未来需要把 key 绑定 team / project，可在 Supabase 保存绑定关系，不复制 key 本体

### 5.3 请求调用

推荐流程：

1. 开发者带 API Key 直接请求网关
2. `new-api` 完成鉴权、路由、计量、扣费、日志记录
3. 聚合指标定期同步到 Supabase

原则：

- 运行时调用路径不要绕回 Next.js

### 5.4 控制台查看用量

推荐流程：

1. 控制台请求 Next.js BFF
2. BFF 根据 `app_user_id` 找到 `new_api_user_id`
3. 优先从 `new-api` 获取实时 usage / token / balance
4. 如需趋势图和导出，可读取 Supabase 聚合表

原则：

- 明细看 `new-api`
- 聚合和导出可读 Supabase 缓存

### 5.5 支付 / 充值

推荐流程：

1. 在 Supabase 创建 `payment_order`
2. 支付回调更新订单状态
3. 支付成功后，调用 `new-api` 增加用户余额 / quota
4. 在 Supabase 写 `credit_adjustment`
5. 控制台余额以 `new-api` 为准，订单历史以 Supabase 为准

原则：

- 订单主数据在 Supabase
- 运行时可消费余额在 `new-api`

### 5.6 团队与权限

推荐流程：

1. 团队、成员、RBAC 全部落在 Supabase
2. 控制台操作先过 Supabase 权限校验
3. 需要创建 / 管理 token 时，再调用 `new-api`
4. 如果未来支持 team 级账单与 token，可在 Supabase 增加 team 与 runtime asset 的绑定关系

原则：

- RBAC 在 Supabase
- token runtime 在 `new-api`

## 6. 推荐的表设计调整

### 6.1 Supabase

建议把当前“概念上容易与 `new-api users` 混淆”的表做整理。

推荐目标表：

- `app_users`
- `user_identities`
- `new_api_accounts`
- `teams`
- `team_members`
- `audit_logs`
- `sales_leads`
- `payment_orders`
- `payment_webhooks`
- `credit_adjustments`
- `invoice_requests`
- `model_catalog_overrides`
- `usage_daily_rollups`
- `provider_health_snapshots`

说明：

- 当前 migration 里的 `users` 表建议逐步演进为 `app_users`
- 否则后续讨论“用户”时会一直混淆是产品用户还是网关用户

### 6.2 BFF API

建议逐步废弃当前 `/api/tables/*` 风格，改为领域化接口：

- `/api/account/profile`
- `/api/account/session`
- `/api/gateway/keys`
- `/api/gateway/usage`
- `/api/catalog/models`
- `/api/catalog/pricing`
- `/api/billing/orders`
- `/api/billing/balance`
- `/api/billing/export`
- `/api/contact/leads`
- `/api/teams/*`

原因：

- 当前 `/api/tables/*` 更像临时 mock 风格
- 不利于持续演进

## 7. 当前代码对应的主要改造点

### 7.1 必须重写或替换

- [apps/web/src/app/api/tables/users/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/users/route.ts)
  - 去掉内存 `Map`
- [apps/web/src/store/slices/authSlice.ts](/Users/weili/work/ai-gateway/apps/web/src/store/slices/authSlice.ts)
  - 去掉 `localStorage.currentUser` 作为主登录态
- [apps/web/src/app/api/tables/models/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/models/route.ts)
  - 替换 mock 模型

### 7.2 必须加用户映射校验

- [apps/web/src/app/api/tables/api_keys/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/api_keys/route.ts)
- [apps/web/src/app/api/tables/api_keys/[id]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/api_keys/%5Bid%5D/route.ts)
- [apps/web/src/app/api/tables/usage_logs/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/usage_logs/route.ts)

### 7.3 可以保留并继续增强

- [apps/web/src/lib/teamAuth.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/teamAuth.ts)
- [apps/web/src/app/api/teams/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/route.ts)
- [apps/web/src/app/api/teams/[id]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/route.ts)
- [apps/web/src/app/api/teams/[id]/members/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/members/route.ts)
- [apps/web/src/app/api/teams/[id]/audit-logs/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/audit-logs/route.ts)

说明：

- 团队模块本身方向是对的，只是需要挂到统一身份体系下

## 8. 风险与规避

### 风险 1：双写导致账务不一致

规避：

- 余额 / quota 运行时扣减只认 `new-api`
- 支付订单和财务审计只认 Supabase

### 风险 2：用户身份映射丢失

规避：

- 把 `new_api_accounts` 做成强约束唯一映射
- 在登录和关键操作前做补偿检查

### 风险 3：官网与 runtime 数据口径不一致

规避：

- 模型、价格、上下文长度等 runtime 字段统一从 `new-api` 拉
- Supabase 只补充营销字段，不覆盖核心运行时字段

### 风险 4：Next.js BFF 变成第二个网关

规避：

- 实际模型调用依然直连 `new-api`
- Next.js 只处理控制台和产品侧聚合 API

## 9. 推荐结论

明确建议如下：

- `new-api` 做网关运行时和计量扣费
- Supabase 做产品域、团队域、支付域、销售域
- 用映射表把 `app_user` 和 `new-api user` 串起来
- 不在 Supabase 复制 API Key、request logs、usage logs 作为主数据
- 不让 Next.js 直接承担 runtime 调用主路径

## 10. 一句话总结

最佳改造方向不是“把所有东西都塞进一个库”，而是把 Aggregator 明确拆成：

- `Next.js + Supabase` 负责产品系统
- `new-api` 负责网关系统

两者通过“用户映射、账务同步、聚合读模型”连接，而不是通过双写和混用连接。
