# AI Gateway

产品层 monorepo，承载官网、账号与组织后台、共享类型和设计系统。

## 当前仓库边界

- `apps/web`
  - Next.js 官网 + 账号与组织后台
- `packages/shared-types`
  - 共享业务类型
- `packages/design-system`
  - 共享设计 token / Tailwind 主题
- `packages/shared-config`
  - 共享 TypeScript 配置
- `packages/product-services`
  - 后续产品域服务抽离落点
- `supabase`
  - 产品域数据库迁移
- `docs`
  - 架构、需求、部署文档

网关系统不再作为本仓库的子项目维护。
`ai-gateway` 现在按“外部依赖官方 `new-api`”方式接入：

- 官方仓库：[QuantumNous/new-api](https://github.com/QuantumNous/new-api)
- 由你自行拉取、部署和运维
- `ai-gateway` 通过 `ONE_API_URL` / `ONE_API_KEY` / `ONE_API_ACCESS_TOKEN` / `ONE_API_USER_ID` 调用你部署好的服务

## 产品职责拆分

当前架构严格按产品文档拆成三层：

### 1. 官网

放在 `apps/web` 的公开站点中，负责获客、转化和首次接入。

- Landing Page
- Models
- Pricing
- Documentation
- Contact / About
- 注册登录入口

### 2. 账号与组织后台

也在 `apps/web` 中，负责企业用户的产品控制台能力，不承载平台运行时配置。

- 账号注册 / 登录 / 会话
- 个人中心
- API Key 产品入口
- 用量统计
- 账单 / 充值 / 订单
- 团队 / 组织 / RBAC
- Playground / 验证工作台

说明：

- `接入渠道`
- `模型管理`
- `路由策略`

这三类能力不再放在 `ai-gateway` 企业后台中，而是统一放到 `new-api` 底座平台和运营后台里。

### 3. `new-api` 底座平台

`new-api` 负责网关运行时真源和平台运营后台。

- Provider / Channel 接入
- Runtime Model 管理
- Router / Fallback / 负载均衡
- Token / Quota / Usage / Request Logs
- 健康检查
- 平台级监控与告警
- 运营后台 / 全局汇总视图

一句话：

- `ai-gateway` 管产品层
- `new-api` 管运行时和运营层

## 当前改动与升级点

本轮调整后，项目边界和底座能力有这些关键变化：

### `ai-gateway` 侧

- 仓库正式收敛为产品层 monorepo，不再内置 runtime / ops 子项目
- 官网、账号与组织后台继续保留在 `apps/web`
- 企业后台按文档收口，只保留账号、组织、账单、API Key、团队、个人中心、Playground
- 登录态校验前移到入口与 SSR 侧，减少刷新时的登录页闪跳
- 控制台信息架构重新收口，围绕“账号与组织”而不是“平台运维配置”展开

### `new-api` 侧

如果按当前方案作为平台底座使用，建议在你部署的 `new-api` 分支中补齐以下增强能力：

- 渠道类型接口
  - `GET /api/channel/types`
- 渠道配置版本历史
  - `GET /api/channel/:id/versions`
- 渠道配置回滚
  - `POST /api/channel/:id/rollback/:version_id`
- 监控摘要
  - `GET /api/monitor/summary`
- 告警列表
  - `GET /api/monitor/alerts`
- 趋势数据
  - `GET /api/monitor/trends`
- 渠道健康明细
  - `GET /api/monitor/channels`
- 手动触发告警派发
  - `POST /api/monitor/dispatch-alerts`

这些增强对应的目标是：

- 补齐 Provider 接入中的版本管理与回滚
- 补齐 API Gateway 侧的监控、告警和渠道级可观测性
- 让 `new-api` 更适合作为 AI 聚合平台的运行时底座和运营后台

## 数据与真源原则

为避免两边功能重叠后出现“双写冲突”，当前遵循以下原则：

### `ai-gateway` 真源

- 用户主身份
- 团队 / 组织 / RBAC
- 订单 / 支付 / 账单表达
- 个人资料
- 官网与产品层文案

### `new-api` 真源

- Channel / Provider
- Runtime Model / Ability
- Router / Fallback / 负载均衡
- Token / Quota / Usage / Request Logs
- 健康状态 / 告警 / 平台监控

普通企业用户应先在 `ai-gateway` 注册，再同步或映射运行时账户到 `new-api`，而不是反过来让 `new-api` 作为产品主身份系统。

## Workspace 结构

```text
ai-gateway/
├── apps/
│   └── web/
├── packages/
│   ├── design-system/
│   ├── product-services/
│   ├── shared-config/
│   └── shared-types/
├── docs/
├── supabase/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

## 开发

### 环境要求

- Node.js 18+
- pnpm 8+

### 安装依赖

```bash
pnpm install
```

### 启动 Web

```bash
pnpm dev
```

默认等价于：

```bash
pnpm --dir apps/web dev
```

### 常用命令

```bash
pnpm build
pnpm lint
pnpm type-check
```

## 环境变量

Web 应用环境变量位于：

- [apps/web/.env.example](/Users/weili/work/ai-gateway/apps/web/.env.example)
- [apps/web/.env.local](/Users/weili/work/ai-gateway/apps/web/.env.local)

网关接入相关的关键变量：

- `ONE_API_URL`
  - 指向你自己部署的 `new-api` 服务地址
- `ONE_API_KEY`
  - 你在 `new-api` 中创建的 `/v1/*` relay key
- `ONE_API_ACCESS_TOKEN`
  - 你在 `new-api` 后台生成的用户 access token，用于 `/api/*` 管理接口
- `ONE_API_USER_ID`
  - 你在 `new-api` 中的用户 ID，官方版本调用 `/api/*` 时需要传 `New-Api-User`

例如：

```env
ONE_API_URL=http://localhost:3001
ONE_API_KEY=sk-your-relay-key
ONE_API_ACCESS_TOKEN=your-access-token
ONE_API_USER_ID=1
```

## 部署

根仓库 Dockerfile 和 Compose 只负责部署 `apps/web`。
`new-api` 需要单独部署。

```bash
docker-compose up -d
```

详见 [DEPLOYMENT.md](/Users/weili/work/ai-gateway/docs/DEPLOYMENT.md)
以及 [NEW_API_INTEGRATION.md](/Users/weili/work/ai-gateway/docs/NEW_API_INTEGRATION.md)

## 推荐协作方式

- 官网与账号组织能力在 `ai-gateway` 中持续迭代
- Provider / Router / Gateway runtime 的增强优先落在 `new-api`
- 企业后台如果需要展示运行时状态，应通过 `ai-gateway -> new-api` 的适配层读取，而不是在产品库中再维护一份运行时配置
