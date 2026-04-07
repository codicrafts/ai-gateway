# new-api 模型广场与渠道初始化

这套脚本分两步：

1. 导入 `vendors / models` 元数据，让 `new-api` 后台的模型广场先有一批展示数据。
2. 按环境变量里的 provider key 创建第一批 channel，让后台出现真实可调用模型。

当前这批元数据的单一来源是：

- [packages/model-catalog/catalog.json](/Users/weili/work/ai-gateway/packages/model-catalog/catalog.json)

`ai-gateway` 的模型目录页和这里的 `new-api` 初始化脚本都读取同一份数据。

## 前提

需要先有 `new-api` 的 admin 凭证：

- `NEW_API_BASE_URL`
- `NEW_API_ACCESS_TOKEN`
- `NEW_API_USER_ID`

例如：

```bash
export NEW_API_BASE_URL=http://localhost:3001
export NEW_API_ACCESS_TOKEN=your-admin-access-token
export NEW_API_USER_ID=1
```

## 1. 导入模型广场元数据

```bash
node /Users/weili/work/ai-gateway/scripts/new-api/import-model-catalog.mjs
```

这会把首批供应商和模型写进：

- `vendors`
- `models`

目前覆盖：

- OpenAI
- Anthropic
- Google Gemini
- DeepSeek
- Mistral AI

## 2. 创建第一批 provider channels

按你已有的 key 设置环境变量：

```bash
export OPENAI_API_KEY=...
export ANTHROPIC_API_KEY=...
export GEMINI_API_KEY=...
export DEEPSEEK_API_KEY=...
export MISTRAL_API_KEY=...
```

如果某家用了自定义网关地址，也可以额外设置：

```bash
export OPENAI_BASE_URL=https://api.openai.com
export ANTHROPIC_BASE_URL=https://api.anthropic.com
export GEMINI_BASE_URL=https://generativelanguage.googleapis.com
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export MISTRAL_BASE_URL=https://api.mistral.ai
```

执行：

```bash
node /Users/weili/work/ai-gateway/scripts/new-api/seed-provider-channels.mjs
```

默认行为：

- 缺少 key 的 provider 会跳过
- 已存在同名 channel 会跳过
- 创建完成后自动执行一次 `/api/channel/fix`，修复 `abilities`

如果你要覆盖更新已有 channel：

```bash
export NEW_API_CHANNEL_UPSERT=1
node /Users/weili/work/ai-gateway/scripts/new-api/seed-provider-channels.mjs
```

## 结果边界

### 只跑第一步

你会得到：

- 模型广场有供应商和模型元数据

但不会得到：

- 真实可调用模型
- `new-api` 定价/模型广场里的“可用模型”数量不会自动变多，因为那个页面主要按已启用 `abilities` 展示

### 两步都跑

并且 provider key 有效时，你会得到：

- `channels`
- `abilities`
- 后台里可调用的模型能力

## 当前脚本的定位

这是首批冷启动脚本，不是长期同步器。

后续更合理的方向是：

- 定期同步官方模型元数据
- 把 `ai-gateway` 的展示目录和 `new-api` 的模型元数据统一到同一份源
