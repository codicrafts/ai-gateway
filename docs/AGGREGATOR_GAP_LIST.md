# Aggregator 目标需求 vs 当前项目 Gap List

基于以下两部分对比整理：

- 目标需求：[AGGREGATOR_REQUIREMENTS_SUMMARY.md](/Users/weili/work/ai-gateway/docs/AGGREGATOR_REQUIREMENTS_SUMMARY.md)
- 当前实现：`/src`、`/docs`、`/supabase`、`/new-api` 下现有代码

## 1. 总体判断

当前项目更接近：

- 一个已经具备官网、控制台、Playground、团队管理 UI 的产品原型
- 一个部分接入 `new-api` 能力、部分使用 mock 数据、部分自建 Supabase 数据的混合架构

距离目标中的 MVP 还有明显差距，主要不在页面数量，而在以下四类核心问题：

- 认证与用户数据没有统一
- 模型、价格、用量等关键数据仍有大量 mock
- 商业化闭环没有打通
- 平台侧路由、监控、计量能力还没有真正落到当前主项目

## 2. 当前已具备的基础

这些能力已经有了明显雏形，可以作为后续补齐的基础：

- 官网页面框架已存在
  - 首页、Models、Pricing、Docs、Contact
- 控制台页面已存在
  - Dashboard、API Key、Usage、Playground
- `new-api` 接入基础已存在
  - `/api/chat`
  - `/api/tables/api_keys`
  - `/api/tables/usage_logs`
- 团队管理的数据模型和 API 雏形已存在
  - Supabase migration
  - Team API
  - Team 组件和 Redux slice

## 3. P0 Gap List

以下缺口会直接阻塞目标中的 MVP 主链路。

### 3.1 认证与用户体系未打通

目标：

- 稳定的注册登录
- 会话管理
- 用户资料与后续 API Key / 账单 / 团队能力统一挂在同一身份体系下

现状：

- 前端登录态依赖 `localStorage.currentUser`
- 服务端 API 同时又依赖 `NextAuth session`
- 用户数据接口使用进程内 `Map`，重启即丢失

证据：

- [apps/web/src/app/login/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/login/page.tsx)
- [apps/web/src/app/register/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/register/page.tsx)
- [apps/web/src/store/slices/authSlice.ts](/Users/weili/work/ai-gateway/apps/web/src/store/slices/authSlice.ts)
- [apps/web/src/app/api/auth/[...nextauth]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/auth/%5B...nextauth%5D/route.ts)
- [apps/web/src/app/api/tables/users/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/users/route.ts)

差距：

- 当前不是一个可持续的生产级账号系统
- 用户数据、团队数据、API Key 数据不在同一可信身份源下
- 无法支撑目标需求中的注册登录、权限、团队、账单闭环

建议优先级：

- 最高

### 3.2 官网核心数据仍是 mock，不能支撑真实转化

目标：

- Models、Pricing、Docs 页面反映真实模型、价格、能力和限制

现状：

- 模型列表来自写死的 mock 数组
- 价格页依赖同一组 mock 模型
- 文档内容是静态示例，不与真实接口能力同步

证据：

- [apps/web/src/app/api/tables/models/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/models/route.ts)
- [apps/web/src/app/models/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/models/page.tsx)
- [apps/web/src/app/pricing/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/pricing/page.tsx)
- [apps/web/src/app/docs/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/docs/page.tsx)

差距：

- 目标要求“模型大全 + 价格对比 + SEO 入口”
- 当前页面虽然齐，但内容不可信，不能直接用于真实售卖和转化

建议优先级：

- 最高

### 3.3 API Key 与用量没有真正的用户级隔离

目标：

- 用户能创建、管理自己的 API Key
- 用户只能看到自己的调用数据、消耗和账单

现状：

- API Key 和 usage 接口使用全局 `ONE_API_KEY` 调 `new-api`
- 服务端只校验“是否登录”，没有把当前登录用户映射到 `new-api` 的真实用户边界

证据：

- [apps/web/src/lib/oneapi.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/oneapi.ts)
- [apps/web/src/app/api/tables/api_keys/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/api_keys/route.ts)
- [apps/web/src/app/api/tables/api_keys/[id]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/api_keys/%5Bid%5D/route.ts)
- [apps/web/src/app/api/tables/usage_logs/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/usage_logs/route.ts)

差距：

- 当前更像“管理员代查 / 代管”的封装，不是严格意义上的多租户用户控制台
- 这会直接影响目标中的 API Key 管理、计量、账单透明和权限边界

建议优先级：

- 最高

### 3.4 钱包、充值、支付、账单闭环基本缺失

目标：

- 钱包余额
- 充值
- 支付接入
- 充值历史
- 费用明细
- 报表导出

现状：

- UI 层只有少量价格展示和预估费用
- 没有真实支付接入
- 没有真实充值、余额、账单数据链路

证据：

- [apps/web/src/app/pricing/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/pricing/page.tsx)
- [apps/web/src/app/dashboard/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/dashboard/page.tsx)

差距：

- 目标中的商业化主链路目前没有实现
- 这是从“能演示”到“能收费”之间最大的缺口之一

建议优先级：

- 最高

### 3.5 平台级计量和监控能力远未达到目标要求

目标：

- Token 消耗
- Requests
- TTFT
- Latency
- 成功率 / 错误率
- 消耗趋势
- 异常告警

现状：

- Dashboard 主要展示 API Key 和 usage logs
- 没有 TTFT、Latency、成功率、异常告警等平台级指标
- 也没有完整的路由健康度指标和监控视图

证据：

- [apps/web/src/store/slices/dashboardSlice.ts](/Users/weili/work/ai-gateway/apps/web/src/store/slices/dashboardSlice.ts)
- [apps/web/src/app/dashboard/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/dashboard/page.tsx)

差距：

- 当前只能算基础使用记录展示
- 目标里的 BI / 监控 / 运营看板能力尚未真正落地

建议优先级：

- 高

### 3.6 Provider、Router、Gateway 能力没有在当前主项目中真正产品化

目标：

- Provider 接入
- 健康检查
- 版本管理
- Router
- Fallback
- 负载均衡
- 路由策略管理
- 协议转换
- 限流

现状：

- 这些能力更多存在于 `new-api` 的概念和能力边界里
- 当前根项目只有少量代理接口和前端描述
- 缺少面向 Aggregator 产品自身的配置、管理和观测闭环

证据：

- [new-api/go.mod](/Users/weili/work/ai-gateway/new-api/go.mod)
- [apps/web/src/lib/oneapi.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/oneapi.ts)
- [apps/web/src/app/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/page.tsx)
- [docs/AGGREGATOR_TECHNICAL_SPEC.md](/Users/weili/work/ai-gateway/docs/AGGREGATOR_TECHNICAL_SPEC.md)

差距：

- 现在主要是“依赖 `new-api` 底座”
- 但目标需要的是“把这些能力变成 Aggregator 自己的可售卖产品能力”

建议优先级：

- 高

### 3.7 Contact / 销售入口是静态假流程

目标：

- 商务联系和合作线索收集

现状：

- 联系表单提交后只是前端等待 1 秒并提示成功
- 没有真实表单投递、CRM、邮件或工单流转

证据：

- [apps/web/src/app/contact/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/contact/page.tsx)

差距：

- 页面具备展示价值，但没有业务闭环

建议优先级：

- 中高

## 4. P1 Gap List

以下能力属于第二阶段，但部分已经有雏形，前提是先解决身份和数据源问题。

### 4.1 团队与组织能力部分实现，但依赖链不稳定

目标：

- 创建 / 加入组织
- 成员管理
- 角色分配
- 团队设置
- 审计日志

现状：

- 团队 API、Redux、UI、Supabase migration 都已经存在
- 但它依赖 `users` 表和 `NextAuth` 身份，而当前登录注册并不稳定地写入这个统一用户表

证据：

- [supabase/migrations/001_team_management.sql](/Users/weili/work/ai-gateway/supabase/migrations/001_team_management.sql)
- [apps/web/src/lib/teamAuth.ts](/Users/weili/work/ai-gateway/apps/web/src/lib/teamAuth.ts)
- [apps/web/src/app/api/teams/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/route.ts)
- [apps/web/src/app/api/teams/[id]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/route.ts)
- [apps/web/src/app/api/teams/[id]/members/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/members/route.ts)
- [apps/web/src/app/api/teams/[id]/audit-logs/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/teams/%5Bid%5D/audit-logs/route.ts)

差距：

- 这块并非没有做，而是“做了不少，但挂在不稳定的身份体系上”

建议优先级：

- P1 中最高

### 4.2 Playground 已有，但还不是完整的开发者平台

目标：

- Playground
- 示例代码
- 调试体验

现状：

- Playground 已可发起聊天请求
- 支持基础模型切换、温度、max tokens、代码示例
- 但仍依赖 mock 模型列表和当前混合认证体系

证据：

- [apps/web/src/app/playground/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/playground/page.tsx)
- [apps/web/src/app/api/chat/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/chat/route.ts)

差距：

- 具备体验原型
- 还不具备完整的开发者接入与调试闭环

建议优先级：

- 中高

### 4.3 请求日志追踪与调试能力不完整

目标：

- 请求记录
- 错误详情
- 日志导出

现状：

- 当前更多是 usage logs 展示
- 缺少完整的请求输入输出、错误上下文、日志下载能力

证据：

- [apps/web/src/app/api/tables/usage_logs/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/tables/usage_logs/route.ts)
- [apps/web/src/app/dashboard/page.tsx](/Users/weili/work/ai-gateway/apps/web/src/app/dashboard/page.tsx)

差距：

- 还达不到目标里的“排障工具”标准

建议优先级：

- 中

### 4.4 OAuth、多语言、SEO 只是部分存在

目标：

- 更完整的国际化和增长体系

现状：

- 有语言切换和 i18n 基础
- 有 Google / GitHub OAuth 壳
- 但增长、内容、SEO、分析体系还不成系统

证据：

- [apps/web/src/components/LanguageSwitcher.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/LanguageSwitcher.tsx)
- [apps/web/src/i18n](/Users/weili/work/ai-gateway/apps/web/src/i18n)
- [apps/web/src/app/api/auth/[...nextauth]/route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/auth/%5B...nextauth%5D/route.ts)

差距：

- 有基础，不足以支撑国际化增长目标

建议优先级：

- 中

## 5. 关键架构问题

如果不先解决这些问题，很多需求即使“做了页面”，也很难真正打通：

### 5.1 三套数据源并存

当前项目同时存在：

- 根项目内存用户数据
- Supabase 团队数据
- `new-api` 用户 / token / usage 数据

问题：

- 身份不能自然贯通
- 账单、团队、API Key 无法稳定挂在同一用户实体上

### 5.2 根项目与 `new-api` 的角色边界不清晰

当前看起来像：

- 官网和控制台由根项目负责
- 网关底座由 `new-api` 负责

但没有完全明确：

- 哪些数据以 `new-api` 为主
- 哪些数据以 Supabase 为主
- 哪些功能必须自研，哪些只做 `new-api` 封装

### 5.3 当前很多页面是“可演示”而不是“可运营”

典型特征：

- mock 模型
- mock 用户
- mock 联系表单
- 部分静态文档
- 部分硬编码价格和统计

这意味着当前更适合内部评审和产品原型展示，不适合直接进入真实运营阶段。

## 6. 建议优先修复顺序

如果按“最快补齐到可用 MVP”来排，建议顺序如下：

### 第一阶段：统一身份和数据边界

- 统一账号体系
- 确定用户主数据归属
- 明确 `new-api` 与 Supabase 的职责边界
- 打通登录用户与 API Key / usage / team 的映射关系

### 第二阶段：去 mock，接真实数据

- 模型列表改为真实来源
- 价格页改为真实价格
- 文档同步真实接口能力
- 联系表单接入真实投递

### 第三阶段：补商业化闭环

- 钱包
- 余额
- 充值
- 支付
- 账单明细
- 导出

### 第四阶段：补平台侧观测和协作能力

- TTFT / Latency / Success Rate
- 告警
- 团队能力
- 请求日志追踪
- Playground 增强

## 7. 一句话结论

当前项目已经有了不错的产品壳和部分后台雏形，但距离目标需求里的 Aggregator MVP，最大的 gap 不是页面数量，而是“统一身份、真实数据、商业化闭环、平台级监控”这四条主线还没有真正打通。
