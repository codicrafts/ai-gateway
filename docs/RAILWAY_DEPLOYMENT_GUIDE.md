# Railway 部署指南

## 问题诊断

### 错误：ERR_PNPM_OUTDATED_LOCKFILE

**错误信息**：
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date
```

**原因**：
1. `pnpm-lock.yaml` 与 `package.json` 不同步
2. 本地 pnpm 版本与 Dockerfile 中指定的版本不一致
3. lockfile 是用旧版本 pnpm 生成的

**解决方案**：

#### 方案 1：重新生成 lockfile（已实施）

```bash
# 1. 确保本地 pnpm 版本正确
pnpm --version  # 应该是 9.15.9

# 2. 如果版本不对，更新 pnpm
corepack enable
corepack prepare pnpm@9.15.9 --activate

# 3. 重新安装依赖
pnpm install

# 4. 提交更新后的 lockfile
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock.yaml"
git push
```

#### 方案 2：优化 Dockerfile（已实施）

**改进点**：
1. 分离 corepack 启用步骤
2. 优化 runner 阶段，只复制必要文件
3. 简化 CMD 命令

**优化后的 Dockerfile**：
- ✅ 在每个阶段开始时启用 corepack
- ✅ 分步执行命令，便于调试
- ✅ 减少最终镜像大小

## 部署前检查清单

### 1. 本地验证

```bash
# 检查 pnpm 版本
pnpm --version

# 清理并重新安装
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# 本地构建测试
pnpm build

# Docker 构建测试
docker build -t ai-gateway-test .
docker run -p 3000:3000 ai-gateway-test
```

### 2. 环境变量配置

在 Railway 中配置以下环境变量：

#### 必需变量

```env
# Next.js
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.railway.app

# NextAuth
NEXTAUTH_URL=https://your-domain.railway.app
NEXTAUTH_SECRET=your-secret-key-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# One API
ONE_API_URL=http://your-one-api-url
ONE_API_KEY=your-one-api-key
ONE_API_ACCESS_TOKEN=your-access-token
ONE_API_USER_ID=1
```

#### 可选变量

```env
# 支付配置
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PAYMENT_ALIPAY_CHECKOUT_URL=https://pay.example.com/alipay
PAYMENT_WECHAT_PAY_CHECKOUT_URL=https://pay.example.com/wechat
PAYMENT_CREDIT_CARD_CHECKOUT_URL=https://pay.example.com/card
PAYMENT_PAYPAL_CHECKOUT_URL=https://pay.example.com/paypal
PAYMENT_WEBHOOK_SECRET=replace-with-shared-secret
PAYMENT_MANUAL_CONFIRM_ENABLED=false

# 邮件服务
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# 短信服务（国内 / 阿里云短信）
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY_ID=your-access-key
SMS_ACCESS_KEY_SECRET=your-secret
SMS_SIGN_NAME=your-sign-name
SMS_TEMPLATE_CODE=SMS_xxxxxx
# 可按场景单独覆盖模板；未设置时回退到 SMS_TEMPLATE_CODE
SMS_TEMPLATE_CODE_AUTH=
SMS_TEMPLATE_CODE_LOGIN=
SMS_TEMPLATE_CODE_REGISTER=
SMS_TEMPLATE_CODE_BIND_PHONE=
SMS_TEMPLATE_CODE_RESET_PASSWORD=
SMS_ALIYUN_ENDPOINT=https://dysmsapi.aliyuncs.com/
SMS_ALIYUN_REGION_ID=cn-hangzhou
```

### 3. Railway 配置

#### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 构建设置

- **Builder**: Dockerfile
- **Dockerfile Path**: `Dockerfile`
- **Root Directory**: `/`

## 常见问题

### 1. 构建超时

**症状**：构建过程超过 10 分钟

**解决方案**：
```dockerfile
# 在 Dockerfile 中添加构建缓存
FROM node:18-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
```

### 2. 内存不足

**症状**：构建时出现 `JavaScript heap out of memory`

**解决方案**：
```json
// 在 apps/web/package.json 中修改 build 脚本
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### 3. 端口问题

**症状**：应用启动但无法访问

**解决方案**：
```dockerfile
# 确保 Dockerfile 中正确设置
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
EXPOSE 3000
```

### 4. 环境变量未生效

**症状**：应用运行但功能异常

**解决方案**：
1. 检查 Railway 中的环境变量是否正确设置
2. 确保变量名以 `NEXT_PUBLIC_` 开头（客户端变量）
3. 重新部署应用

### 5. 数据库连接失败

**症状**：`Error: connect ECONNREFUSED`

**解决方案**：
1. 检查 Supabase URL 是否正确
2. 确认 Service Role Key 权限
3. 检查网络策略和防火墙设置

## 部署流程

### 方式 1：通过 GitHub 自动部署（推荐）

1. **连接 GitHub 仓库**
   ```
   Railway Dashboard → New Project → Deploy from GitHub
   ```

2. **配置环境变量**
   ```
   Settings → Variables → Add all required variables
   ```

3. **触发部署**
   ```
   git push origin main
   ```

### 方式 2：通过 Railway CLI

```bash
# 1. 安装 Railway CLI
npm i -g @railway/cli

# 2. 登录
railway login

# 3. 初始化项目
railway init

# 4. 部署
railway up
```

## 性能优化

### 1. 启用构建缓存

```dockerfile
# 使用 BuildKit 缓存
# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
```

### 2. 多阶段构建优化

```dockerfile
# 只复制必要的文件到 runner
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
# 不要复制整个 /app 目录
```

### 3. 减少镜像大小

```bash
# 查看镜像大小
docker images ai-gateway

# 优化后应该在 200-300MB 左右
```

## 监控和日志

### 查看部署日志

```bash
# Railway CLI
railway logs

# 或在 Railway Dashboard
Deployments → View logs
```

### 健康检查

Railway 会定期访问 `healthcheckPath` 来检查应用状态。

确保你的应用在根路径 `/` 能正常响应：

```typescript
// apps/web/src/app/page.tsx
export default function Home() {
  return <div>AI Gateway</div>;
}
```

## 回滚策略

### 快速回滚

```bash
# Railway Dashboard
Deployments → 选择之前的成功部署 → Redeploy
```

### 通过 Git 回滚

```bash
git revert HEAD
git push origin main
```

## 成本优化

### Railway 定价

- **Hobby Plan**: $5/月 + 使用量
- **Pro Plan**: $20/月 + 使用量

### 优化建议

1. **使用 Starter Plan**：适合开发和测试
2. **优化镜像大小**：减少存储成本
3. **配置自动休眠**：非生产环境可以启用
4. **监控资源使用**：定期检查 CPU 和内存使用情况

## 故障排查步骤

1. **检查构建日志**
   ```
   Railway Dashboard → Deployments → View logs
   ```

2. **验证环境变量**
   ```
   Settings → Variables → 检查所有必需变量
   ```

3. **本地 Docker 测试**
   ```bash
   docker build -t test .
   docker run -p 3000:3000 test
   ```

4. **检查健康状态**
   ```bash
   curl https://your-app.railway.app/
   ```

5. **查看运行时日志**
   ```bash
   railway logs --tail 100
   ```

## 下一步

- [ ] 配置自定义域名
- [ ] 设置 SSL 证书（Railway 自动提供）
- [ ] 配置 CDN（可选）
- [ ] 设置监控告警
- [ ] 配置备份策略

## 参考资料

- [Railway 官方文档](https://docs.railway.app/)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)
