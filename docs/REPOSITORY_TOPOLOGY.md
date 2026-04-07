# Repository Topology

当前采用“两仓协作”结构：

## 1. Product Monorepo

路径：

- `/Users/weili/work/ai-gateway`

职责：

- 官网
- 企业后台
- 产品域 BFF
- Supabase migration
- 共享类型
- 共享设计 token

结构：

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
└── supabase/
```

## 2. External Gateway Dependency

外部仓库：

- [QuantumNous/new-api](https://github.com/QuantumNous/new-api)

职责：

- `new-api` Go 网关运行时
- `new-api/web` 运营后台
- Provider / Channel / Token / Usage / Relay / 网关设置

接入方式：

- 由你自行单独拉取、部署
- `ai-gateway` 通过 `ONE_API_URL` / `ONE_API_KEY` / `ONE_API_ACCESS_TOKEN` / `ONE_API_USER_ID` 连接你部署好的 `new-api`

## 4. 边界原则

- `ai-gateway`
  - 产品站和客户后台
- 外部 `new-api`
  - 网关运行时 + 网关运营后台

不要再把 `new-api` 源码或 `new-api/web` 直接嵌回 `ai-gateway`。
