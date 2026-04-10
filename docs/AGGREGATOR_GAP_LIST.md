# Aggregator 需求对齐审计

基于以下三部分交叉整理：

- 目标需求：[AGGREGATOR_REQUIREMENTS_SUMMARY.md](/Users/weili/work/ai-gateway/docs/AGGREGATOR_REQUIREMENTS_SUMMARY.md)
- 当前主项目：`ai-gateway`
- 运行时底座：`/Users/weili/work/new-api`

## 1. 总体结论

当前状态不是“完全没做”，也不是“已经差不多上线”，而是：

- `ai-gateway` 已经具备官网、登录注册、团队、账单、API Key、Playground 的产品骨架
- `new-api` 已经具备用户、Token、Channel、Model、Relay、Monitoring、Topup、Subscription 等运行时能力
- 两者之间只打通了最小子集，很多需求点处于“页面已做但数据没对齐”或“底座已有但产品层没接出来”的状态

距离需求中的 MVP，最大 gap 不在页面数量，而在这四条主线：

- 官网展示数据与实际运行时能力没有统一
- 用户/个人/团队/API Key/账单之间的产品边界没有完全对齐
- 支付、充值、账单闭环还停留在半成品
- Provider/Router/Monitoring 虽然底座有能力，但还没有在 `ai-gateway` 中产品化

## 2. 现有能力分层

### 2.1 已基本具备

- 官网基础页
  - 首页、Models、Pricing、Docs、Contact 已存在
- 账号体系基础
  - NextAuth、邮箱/手机号验证码登录、本地密码登录、忘记密码、手机号绑定、2FA 已存在
- 团队基础
  - 团队创建、成员管理、邀请、加入申请、团队设置、审计日志已存在
- 团队 API Key
  - 本地组织 API Key 与 `new-api` 运行时 Token 的同步链路已存在
- 团队账务基础
  - 组织用量账本、充值订单、账单摘要、CSV 导出已存在
- Playground 原型
  - 已可基于平台 Key 或团队 Key 发起 `chat/completions`

### 2.2 主要问题形态

- `ai-gateway` 前台展示层很多地方仍不以 `new-api` 的真实运行态为准
- `new-api` 的大量能力只停留在底座侧，未在 `ai-gateway` 中形成面向客户的产品能力
- 个人维度与团队维度的职责边界不完全符合需求文档的表述

## 3. 模块级对齐结果

## 3.1 官网

### Landing Page

结论：

- 大体已实现，但有少量需求点未补齐

已对齐：

- Hero
- 快速接入示例
- CTA
- 模型能力展示
- 核心功能介绍
- 成本优势说明
- API 调用示例
- Skill 安装示例

未实现或未对齐：

- 文档批注提到的 QA 区块未看到独立实现
- 客户背书 / 使用案例未实现
- 页面文案中宣称的平台能力，部分还没有和实际运行时能力完全打通

证据：

- [HomePageClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/home/HomePageClient.tsx)

### Models

结论：

- 页面存在，但和需求相比仍缺关键能力

已对齐：

- 模型列表
- 搜索
- Provider 筛选
- Category 筛选
- 基础价格展示

未实现：

- 模型详情页
- Benchmark 展示
- 模型在线状态
- 延迟状态
- 按价格筛选
- 按能力标签筛选

未对齐：

- 当前目录主要来自 OpenRouter + 本地 catalog，不是 `new-api` 当前真实启用模型
- 因此前台“可展示模型”与运行时“可调用模型”不是一套口径

证据：

- [page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/models/page.tsx)
- [ModelsPageClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/models/ModelsPageClient.tsx)
- [model-catalog.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/catalog/model-catalog.service.ts)
- [gateway-model.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/gateway/gateway-model.service.ts)

### Pricing

结论：

- 页面完成度不低，但仍偏展示页，不是严格的运行时价格镜像

已对齐：

- 价格说明
- 模型价格表
- FAQ
- 企业方案入口

未对齐：

- 模型价格来自 catalog，而不是 `new-api /api/pricing`
- “成本对比”更接近参考解释，没有真实官方对比口径
- “使用成本示例”是静态推导，不是按真实账单规则实时计算

已存在但未接入：

- `new-api` 有价格目录接口，当前主项目没有把它接到前台

证据：

- [page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/pricing/page.tsx)
- [PricingPageClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/pricing/PricingPageClient.tsx)
- [pricing-reference.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/pricing/pricing-reference.service.ts)
- [oneapi.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/oneapi.ts)
- [api-router.go](/Users/weili/work/new-api/router/api-router.go)

### Documentation

结论：

- 文档页结构齐全，但“文档内容”和“实际接入入口”存在明显偏差

已对齐：

- Overview / Quickstart / API Reference / Models / Pricing / Usage & Billing
- 错误码列表

未对齐：

- 文档写的 base URL 是 `/api/openai/v1`
- 但当前 `ai-gateway` 仓库里并没有对应的完整 relay 路由实现
- 当前主项目真正提供的是 `/api/chat` 这一层 chat 代理
- 文档展示了 `/v1/messages`、`/v1/responses` 等能力，这些能力实际在独立 `new-api` 服务中，不在当前主项目内

风险：

- 文档会让用户以为 `ai-gateway` 自己提供完整 OpenAI/Anthropic relay
- 实际部署中必须额外配套 `new-api`

证据：

- [page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/docs/page.tsx)
- [DocsPageClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/docs/DocsPageClient.tsx)
- [docs-reference.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/docs/docs-reference.service.ts)
- [docs-reference.ts](/Users/weili/work/ai-gateway/apps/web/src/config/docs-reference.ts)
- [route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/chat/route.ts)
- [relay-router.go](/Users/weili/work/new-api/router/relay-router.go)

### Contact / About

结论：

- Contact 已经不是假表单了，但 About 仍未独立成页

已对齐：

- 联系表单提交
- 线索落库
- 通知发送尝试

未实现：

- 独立 About 页面

未对齐：

- 需求里是 `Contact / About` 两块
- 当前实现是 Contact 页面内混合展示 About 内容

证据：

- [page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/contact/page.tsx)
- [ContactPageClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/contact/ContactPageClient.tsx)
- [route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/contact/route.ts)

## 3.2 账号与组织

### 注册登录

结论：

- 已经比旧版本成熟很多，但仍未完全达到需求里“国内/国外完整生产级方案”

已对齐：

- 邮箱密码登录
- 手机号验证码登录
- 邮箱验证码登录
- 会话管理
- 忘记密码 / 重置密码
- Google / GitHub OAuth

未实现或未对齐：

- 手机短信未真实发送，当前只是写库 + 开发态回显验证码
- 忘记密码没有真实邮件发送链路，生产态只是不返回 reset link
- 国内手机号注册的产品路径存在，但仍是自建实现，不是成熟短信网关闭环
- `new-api` 还支持 passkey，`ai-gateway` 当前未接

证据：

- [auth.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/auth.ts)
- [LoginPageClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/auth/LoginPageClient.tsx)
- [auth-requirements route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/account/auth-requirements/route.ts)
- [account-code route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/account/account-code/route.ts)
- [phone-auth.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/account/phone-auth.service.ts)
- [forgot-password route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/account/forgot-password/route.ts)
- [app-user.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/account/app-user.service.ts)
- [api-router.go](/Users/weili/work/new-api/router/api-router.go)

### 个人中心

结论：

- 大部分基础能力已具备

已对齐：

- 个人资料管理
- 修改密码
- 手机号绑定
- 2FA

未对齐：

- 文档把 API Key 管理归入个人中心，但当前实际是 Team 维度 API Key
- 个人使用统计不是以“个人账户”为主，而是团队账本/团队 Key 视角
- `new-api` 已支持 passkey，但个人中心未暴露

证据：

- [password route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/account/password/route.ts)
- [PhoneBindingCard.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/account/PhoneBindingCard.tsx)
- [TwoFactorCard.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/account/TwoFactorCard.tsx)
- [dashboard/profile page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/dashboard/profile/page.tsx)
- [api-router.go](/Users/weili/work/new-api/router/api-router.go)

### 组织和团队管理

结论：

- 这是当前主项目里完成度最高的一块之一

已对齐：

- 创建团队
- 成员管理
- 邀请成员
- 加入申请
- 角色分配
- 团队设置
- 审计日志

未对齐：

- 当前产品很多能力默认要求“用户至少属于一个团队”
- 需求文档里团队更像 P1 增强项，但当前实现里它已经是 API Key / 账单 / 用量的基础容器

说明：

- 这不是“没实现”
- 而是产品边界和需求文档的叙述顺序不一致

证据：

- [team-query.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/team/team-query.service.ts)
- [team-mutation.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/team/team-mutation.service.ts)
- [team-audit.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/team/team-audit.service.ts)
- [teamAuth.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/teamAuth.ts)
- [route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/route.ts)

### 权限管理

结论：

- 基础 RBAC 已做，细粒度权限还没有

已对齐：

- Owner / Admin / Member / Guest
- 团队级 RBAC
- 审计日志

已部分对齐：

- API Key 支持模型限制、权限 scope、IP 白名单

未对齐：

- 权限和 credit / 垫付逻辑没有关联
- 没有更细的功能权限矩阵配置
- 没有独立“权限中心”产品界面

证据：

- [team.ts](/Users/weili/work/ai-gateway/packages/shared-types/src/team.ts)
- [teamAuth.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/teamAuth.ts)
- [gateway-token.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/gateway/gateway-token.service.ts)

## 3.3 API Key 管理

结论：

- 团队 API Key 闭环已初步成型，但和需求中的“个人 Key + 团队 Key”口径未完全一致

已对齐：

- 创建 API Key
- 启停 / 删除
- 命名 / 备注
- 模型范围限制
- IP 白名单
- scope 控制
- 过期时间

已实现但需注意：

- 本地 `org_api_keys` 会同步到团队运行时账户对应的 `new-api token`
- 用量与花费通过 `org_usage_ledger` 回收统计

未对齐：

- 当前是 Team Key，不是个人 Key
- 需求里提到的“个人中心 API Key 管理”没有独立实现
- 权限策略还没和组织 credit 直接绑定

证据：

- [gateway-token.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/gateway/gateway-token.service.ts)
- [org-api-key-sync.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/runtime-sync/org-api-key-sync.service.ts)
- [route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/api_keys/route.ts)
- [api-router.go](/Users/weili/work/new-api/router/api-router.go)

## 3.4 Provider 接入、Router、Gateway

### new-api 底座能力

结论：

- `new-api` 对这块能力支持很强

已存在于 `new-api`：

- Provider / Channel 管理
- Channel 测试、余额更新、拉取上游模型
- 版本回滚
- Ability、Priority、Weight
- Retry / Fallback 基础
- OpenAI / Anthropic / Responses / Embeddings / Images / Audio / Rerank 等 relay
- 监控 summary / alerts / trends / channels

证据：

- [api-router.go](/Users/weili/work/new-api/router/api-router.go)
- [relay-router.go](/Users/weili/work/new-api/router/relay-router.go)
- [channel.go](/Users/weili/work/new-api/model/channel.go)
- [ability.go](/Users/weili/work/new-api/model/ability.go)
- [monitoring.go](/Users/weili/work/new-api/model/monitoring.go)

### ai-gateway 产品层

结论：

- 这是当前最明显的“底座有、产品没接”的模块

已实现：

- 通过 `oneapi.ts` 调一部分管理接口
- 有少量 enterprise-config / sync service 雏形
- Playground 会校验模型是否在运行时启用

未实现：

- Provider 管理后台
- 路由策略管理后台
- 版本管理后台
- 健康检查面板
- 渠道负载、压力、延迟策略配置页

未对齐：

- 技术方案文档把这些能力视为 Aggregator 产品的一部分
- 当前真正可操作的大部分仍在 `new-api` 自带后台

证据：

- [oneapi.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/oneapi.ts)
- [gateway-model.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/gateway/gateway-model.service.ts)
- [new-api-sync.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/sync/new-api-sync.service.ts)

## 3.5 数据、支付、账单

### 用量与账单

结论：

- 团队用量账本已经有了，但还不是完整“请求级账单中心”

已对齐：

- 用量 webhook 入账
- 组织账单摘要
- 充值订单列表
- CSV 导出

未对齐：

- 当前是组织账本视角，不是需求里“个人 + 组织”双视角
- 请求日志和账单明细仍偏简化
- 趋势图能力较弱

证据：

- [one-api-usage route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/webhooks/one-api-usage/route.ts)
- [gateway-usage.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/gateway/gateway-usage.service.ts)
- [billing.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/billing/billing.service.ts)

### 支付与充值

结论：

- 已经不是“完全缺失”，但仍未完成真实支付接入

已实现：

- 充值订单模型
- 支付方式抽象
- webhook 入口
- 手动确认并给 `new-api` 充值
- 组织账务流水写入

未对齐：

- 创建订单时 metadata 明确写了 `manual_pending_gateway_integration`
- 说明支付宝 / 微信 / 信用卡 / PayPal 的真实拉起与回调核验还未最终打通
- 目前更像“支付壳 + 履约壳”

证据：

- [payment.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/billing/payment.service.ts)
- [payment-orders route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/billing/payment-orders/route.ts)
- [webhooks route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/billing/webhooks/%5Bprovider%5D/route.ts)
- [api-router.go](/Users/weili/work/new-api/router/api-router.go)

## 3.6 实时 BI / 监控

结论：

- `new-api` 已经有 summary / alerts / trends / channel health，但 `ai-gateway` 还没把这些能力产品化

已在 `new-api` 中具备：

- 请求量
- 成功率 / 错误率
- 平均延迟 / P95 延迟
- 通道健康
- 监控告警状态

未在 `ai-gateway` 中落地：

- 平台监控大盘
- 告警中心
- Channel health 看板

未实现：

- TTFT
- TPOT
- Provider 压力指标

证据：

- [monitoring.go](/Users/weili/work/new-api/model/monitoring.go)
- [monitoring_alert_state.go](/Users/weili/work/new-api/model/monitoring_alert_state.go)

## 3.7 开发者体验

### Playground

结论：

- 已有可用原型，但仍是聊天调试器，不是完整开发者平台

已对齐：

- 模型切换
- 温度 / max tokens
- 代码示例
- 使用平台 Key 或团队 Key 调用聊天

未对齐：

- 只支持 `chat/completions`
- 没把 `messages`、`responses`、embeddings、images、audio、rerank 等能力暴露出来

证据：

- [page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/playground/page.tsx)
- [PlaygroundPageClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/playground/PlaygroundPageClient.tsx)
- [chat route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/chat/route.ts)
- [relay-router.go](/Users/weili/work/new-api/router/relay-router.go)

### 请求日志追踪与调试

结论：

- 当前更接近“组织用量账本”，还不是“调试日志中心”

已对齐：

- 请求成功 / 失败状态
- 基础错误信息
- Token / 金额 / 模型统计

未实现：

- 输入输出明细
- 状态码级调试视图
- 请求日志导出
- 面向排障的 trace 视图

证据：

- [gateway-usage.service.ts](/Users/weili/work/ai-gateway/apps/web/src/services/gateway/gateway-usage.service.ts)
- [DashboardClient.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/dashboard/DashboardClient.tsx)

## 4. 分类汇总

### 4.1 文档里没实现的功能

- Models 详情页
- Benchmark 展示
- 模型在线状态 / 延迟展示
- 按价格筛选
- 按能力筛选
- 独立 About 页面
- QA 区块
- 客户背书 / 使用案例
- 平台侧 Provider 管理后台
- 路由策略管理后台
- 健康检查 / 监控看板后台
- 请求日志导出
- TTFT / TPOT 指标
- passkey 产品接入

### 4.2 已有实现但没对齐的功能

- Models / Pricing / Docs 不是按 `new-api` 真实运行态展示
- Docs 中的 API 入口与主项目真实路由不一致
- API Key 当前是 Team 维度，不是文档中的个人中心维度
- 团队在产品中比文档描述更“前置”
- 账单与用量偏组织账本，不是完整个人 + 组织双视角
- Playground 能力范围小于文档表述

### 4.3 new-api 已有但 ai-gateway 没接出来的功能

- `/v1/messages`
- `/v1/responses`
- embeddings / images / audio / rerank relay
- Channel / Provider 管理
- 版本回滚
- 监控 summary / alerts / trends / channels
- passkey
- subscription billing
- runtime organization summary

## 5. 优先级建议

### 第一优先级

- 统一官网展示数据与运行时能力口径
- 修正文档 API 入口与部署边界
- 确认“个人 vs 团队”产品边界
- 完成真实支付接入

### 第二优先级

- 把 `new-api` 的模型、监控、路由、Provider 能力接到 `ai-gateway`
- 增强 Playground 到多 endpoint 调试台
- 完善请求日志追踪能力

### 第三优先级

- 模型详情页
- SEO / 增长增强
- passkey
- 更细权限和 credit 关联

## 6. 一句话结论

当前最大的真实问题不是“页面不够”，而是 `ai-gateway` 作为产品层，还没有把 `new-api` 的真实运行时能力、价格能力、监控能力和支付能力，统一成一个对客户口径一致的 Aggregator 产品。
