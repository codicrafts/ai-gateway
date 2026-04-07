# new-api Integration

`ai-gateway` 不再内嵌网关系统源码。

推荐方式：

1. 你单独拉取官方仓库
2. 你单独部署 `new-api`
3. 在 `ai-gateway` 中配置指向该服务的环境变量

官方仓库：

- [QuantumNous/new-api](https://github.com/QuantumNous/new-api)

## 1. 拉取并部署

最直接方式：

```bash
git clone https://github.com/QuantumNous/new-api.git
cd new-api
docker-compose up -d
```

部署完成后，按你自己的环境拿到：

- `new-api` 服务地址
- 管理后台地址
- access token
- 用户 ID
- relay API key

## 2. 在 ai-gateway 中配置

编辑：

- [apps/web/.env.local](/Users/weili/work/ai-gateway/apps/web/.env.local)

至少配置：

```env
ONE_API_URL=http://localhost:3001
ONE_API_KEY=sk-your-relay-key
ONE_API_ACCESS_TOKEN=your-access-token
ONE_API_USER_ID=1
```

说明：

- `ONE_API_URL`
  - 你部署好的 `new-api` 地址
- `ONE_API_KEY`
  - 你在 `new-api` 中创建的 `/v1/*` relay key
- `ONE_API_ACCESS_TOKEN`
  - 你在 `new-api` 中生成的 access token，用于 `/api/*` 管理接口
- `ONE_API_USER_ID`
  - 你在 `new-api` 中的用户 ID，官方版本管理接口要求传 `New-Api-User`

## 3. 责任边界

`ai-gateway` 负责：

- 官网
- 企业后台
- 产品域 BFF
- Supabase 产品数据

`new-api` 负责：

- 网关运行时
- 运营后台
- Provider / Channel / Token / Usage / Routing / Billing Runtime

## 4. 本地开发建议

- `new-api` 单独启动在 `3001`
- `ai-gateway` 启动在 `3000`

例如：

```env
ONE_API_URL=http://localhost:3001
```
