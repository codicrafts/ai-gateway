# Aggregator 可执行开发路线图

基于以下文档继续拆解：

- [AGGREGATOR_REQUIREMENTS_SUMMARY.md](/Users/weili/work/ai-gateway/docs/AGGREGATOR_REQUIREMENTS_SUMMARY.md)
- [AGGREGATOR_GAP_LIST.md](/Users/weili/work/ai-gateway/docs/AGGREGATOR_GAP_LIST.md)

## 1. 路线图目标

把当前“产品原型 + 混合后端”状态，推进到“可运营的 MVP”。

核心原则：

- 先统一身份和数据边界，再补功能
- 先去掉 mock，再谈 SEO、团队增强和高级调试
- 所有核心域只保留一个 source of truth
- Next.js 负责产品层和 BFF，`new-api` 负责网关运行时

## 2. 阶段划分

建议分 6 个阶段推进。

### Phase 0：架构冻结与清障

目标：

- 先把目标架构和边界定死，避免继续在混合状态上堆功能

任务：

- 确认 `new-api` 和 Supabase 的职责边界
- 确认认证方案
  - 推荐：`Auth.js/NextAuth + Supabase`
- 确认用户主键策略
  - `app_user_id`
  - `new_api_user_id`
  - 两者一对一映射
- 确认 P0 只覆盖文本模型还是包含 image / TTS / embedding
- 确认支付第一期范围
  - 推荐：先做 ToB 充值与手工授信，延后复杂支付渠道

涉及改造点：

- [apps/web/src/app/api/tables/users/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/users/route.ts)
- [apps/web/src/store/slices/authSlice.ts](/Users/weili/work/ai-gateway/apps/web/src/store/slices/authSlice.ts)
- [docs/AGGREGATOR_TECHNICAL_SPEC.md](/Users/weili/work/ai-gateway/docs/AGGREGATOR_TECHNICAL_SPEC.md)

交付物：

- 架构决议文档
- 数据归属表
- 迁移清单

验收标准：

- 团队内部对“什么放 `new-api`，什么放 Supabase”没有歧义
- 后续 API 命名和表设计可以按统一边界推进

### Phase 1：统一身份与用户映射

目标：

- 消灭 `localStorage 用户 + NextAuth + mock users + Supabase users + new-api users` 的混乱状态

任务：

- 去掉进程内 mock 用户接口
- 用 Supabase 持久化用户资料和身份映射
- 登录后自动完成 `app_user` 和 `new-api user` 的双向关联
- 前端统一改为依赖服务端 session，不再以 `localStorage.currentUser` 作为真实登录依据
- 建立用户映射表
  - `app_user_id`
  - `new_api_user_id`
  - `status`
  - `synced_at`

涉及改造点：

- [apps/web/src/app/login/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/login/page.tsx)
- [apps/web/src/app/register/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/register/page.tsx)
- [apps/web/src/store/slices/authSlice.ts](/Users/weili/work/ai-gateway/apps/web/src/store/slices/authSlice.ts)
- [apps/web/src/app/api/auth/[...nextauth]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/auth/%5B...nextauth%5D/route.ts)
- [apps/web/src/lib/supabase.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/supabase.ts)
- [apps/web/src/lib/oneapi.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/oneapi.ts)

建议新增：

- `app_users`
- `user_identities`
- `new_api_accounts`

交付物：

- 可持久化的用户体系
- 单一登录状态来源
- `app user -> new-api user` 映射能力

验收标准：

- 用户重启服务后仍然存在
- 登录状态只依赖 session
- 任一登录用户都能稳定查到自己的 `new_api_user_id`

### Phase 2：替换 mock 数据，打通真实官网数据

目标：

- 让官网、价格页、模型页、文档页不再依赖硬编码内容

任务：

- 用真实模型目录替换 [apps/web/src/app/api/tables/models/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/models/route.ts)
- 建立“模型目录聚合接口”
  - 运行时数据来自 `new-api`
  - SEO/营销补充信息来自 Supabase
- Pricing 页面改为真实价格
- Docs 页面同步真实支持的协议、模型、错误码、速率限制
- Contact 表单接入真实投递
  - 先写 Supabase `sales_leads`
  - 再接邮件 / webhook / CRM

涉及改造点：

- [apps/web/src/app/api/tables/models/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/models/route.ts)
- [apps/web/src/app/models/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/models/page.tsx)
- [apps/web/src/app/pricing/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/pricing/page.tsx)
- [apps/web/src/app/docs/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/docs/page.tsx)
- [apps/web/src/app/contact/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/contact/page.tsx)

建议新增：

- `model_catalog_overrides`
- `sales_leads`
- `docs_references` 或静态内容配置

交付物：

- 真实模型目录
- 真实价格展示
- 可用的线索收集入口

验收标准：

- 官网每一个展示的模型都能映射到真实 runtime model
- 模型价格与网关实际计费口径一致
- Contact 表单提交后有可追踪记录

### Phase 3：按用户隔离 API Key、Usage、Dashboard

目标：

- 让控制台真正变成“用户自己的控制台”，而不是管理员包装页

任务：

- 所有 API Key 读写都按 `new_api_user_id` 过滤
- 所有 usage / stats 都按 `new_api_user_id` 聚合
- 替换当前“只校验登录，不校验用户归属”的 BFF 实现
- 引入服务层
  - `gatewayAccountService`
  - `gatewayTokenService`
  - `gatewayUsageService`
- Dashboard 页面改造为真实用户视角

涉及改造点：

- [apps/web/src/app/api/tables/api_keys/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/api_keys/route.ts)
- [apps/web/src/app/api/tables/api_keys/[id]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/api_keys/%5Bid%5D/route.ts)
- [apps/web/src/app/api/tables/usage_logs/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/usage_logs/route.ts)
- [apps/web/src/store/slices/dashboardSlice.ts](/Users/weili/work/ai-gateway/apps/web/src/store/slices/dashboardSlice.ts)
- [apps/web/src/app/dashboard/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/dashboard/page.tsx)

交付物：

- 用户级 API Key 管理
- 用户级用量和统计
- 用户级 Dashboard

验收标准：

- A 用户看不到 B 用户的 key 和 usage
- 删除 / 更新 key 时必须校验 key 所属用户
- Dashboard 所见数据与 `new-api` 后台该用户数据一致

### Phase 4：补齐钱包、充值、账单主链路

目标：

- 跑通“使用 -> 扣费 -> 充值 -> 对账”商业闭环

任务：

- 定义账务模型
  - 钱包余额
  - 充值订单
  - 授信 / 手工调账
  - 发票 / 对账单
- 第一阶段建议先做
  - 企业授信
  - 线下打款确认
  - 手工加款
- 第二阶段再补在线支付
  - Stripe / 支付宝 / 微信
- 支付成功后写支付订单并同步增加 `new-api` 用户余额 / quota
- Dashboard 增加
  - 当前余额
  - 充值记录
  - 费用明细
  - 导出

涉及改造点：

- [apps/web/src/app/pricing/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/pricing/page.tsx)
- [apps/web/src/app/dashboard/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/dashboard/page.tsx)

建议新增：

- `payment_orders`
- `payment_webhooks`
- `credit_adjustments`
- `invoice_requests`
- `billing_exports`

交付物：

- 最小可用账务闭环
- 人工或在线充值入口
- 费用明细与导出

验收标准：

- 一笔成功充值可追踪到
  - 支付订单
  - 对账状态
  - `new-api` 余额变化
- 用户可看到余额和消费明细

### Phase 5：平台计量、监控、运营看板

目标：

- 从“看 usage”提升到“看平台健康”

任务：

- 补 TTFT、Latency、Success Rate 指标
- 增加 Provider / endpoint 健康度
- 增加异常告警
  - Provider 大面积失败
  - 高延迟
  - 余额不足
  - 异常错误率
- 增加管理视角 BI 看板
- 必要时做日级 / 小时级聚合缓存

涉及改造点：

- [apps/web/src/app/dashboard/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/dashboard/page.tsx)
- [apps/web/src/lib/oneapi.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/oneapi.ts)
- [new-api](/Users/weili/work/ai-gateway/new-api)

建议新增：

- `usage_daily_rollups`
- `provider_health_snapshots`
- `alert_events`

交付物：

- 平台级监控面板
- 告警事件流
- 管理用 BI 数据基础

验收标准：

- 可以按时间窗口查看成功率、延迟和流量
- 可以定位某个 provider / endpoint 的健康问题

### Phase 6：团队、权限增强、开发者体验增强

目标：

- 补齐 P1 中最有价值的协作与调试能力

任务：

- 稳定组织 / 团队 / 成员 / RBAC
- 补审计日志导出和权限变更追踪
- Playground 增强
  - 更多协议
  - 示例代码生成
  - 请求参数模板
- 请求日志追踪
  - 请求输入输出摘要
  - 错误详情
  - 日志下载

涉及改造点：

- [apps/web/src/app/api/teams/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/route.ts)
- [apps/web/src/app/api/teams/[id]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/route.ts)
- [apps/web/src/app/api/teams/[id]/members/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/members/route.ts)
- [apps/web/src/app/api/teams/[id]/audit-logs/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/audit-logs/route.ts)
- [apps/web/src/app/playground/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/playground/page.tsx)

交付物：

- 团队协作能力
- 完整权限体系
- 更好用的开发者控制台

验收标准：

- 团队角色与权限边界清晰
- 敏感操作可审计
- 开发者可在控制台完成基础排障

## 3. 推荐迭代顺序

推荐按下面顺序推进，不建议打乱：

1. `Phase 0`
2. `Phase 1`
3. `Phase 2`
4. `Phase 3`
5. `Phase 4`
6. `Phase 5`
7. `Phase 6`

原因：

- `Phase 1` 不完成，后面所有用户隔离都是假的
- `Phase 2` 不完成，官网转化和产品可信度不足
- `Phase 3` 不完成，Dashboard 仍不是可运营后台
- `Phase 4` 不完成，就不具备商业化闭环

## 4. 近 4 个迭代的建议目标

### Iteration 1

- 冻结架构边界
- 去掉 mock user
- 统一 session
- 建立 `app_user <-> new_api_user` 映射

### Iteration 2

- 模型目录改造
- Pricing 改真实价格
- Docs 改真实能力
- Contact 改真实线索流

### Iteration 3

- API Key 用户隔离
- Usage 用户隔离
- Dashboard 真实化

### Iteration 4

- 余额
- 充值订单
- 账单明细
- 导出

## 5. Definition of Done

以下条件满足后，才算进入“可运营 MVP”：

- 登录身份唯一，用户数据持久化
- 官网不再依赖核心 mock 数据
- API Key / Usage / Dashboard 严格用户隔离
- 可以查询余额、消费和账单
- 至少有一种可运营的充值方式
- Contact / 销售线索有真实落库和流转

## 6. 一句话结论

最现实的推进方式不是继续往现有页面里补功能，而是先完成“身份统一、数据去 mock、控制台用户隔离、账务闭环”四件事；这四件事完成后，剩下的 P1 才值得继续堆。
