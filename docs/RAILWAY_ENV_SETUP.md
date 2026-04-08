# Railway 环境变量配置指南

## 健康检查失败的原因

Railway 部署成功，但健康检查失败，通常是因为缺少必要的环境变量导致应用无法正常启动。

## 必需的环境变量

### 1. NextAuth 配置（必需）

```env
# 应用 URL（使用 Railway 提供的域名）
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}
# 或者手动设置
NEXTAUTH_URL=https://your-app.railway.app

# NextAuth 密钥（生成方法见下方）
NEXTAUTH_SECRET=your-secret-key-here
```

**生成 NEXTAUTH_SECRET**：
```bash
openssl rand -base64 32
```

### 2. Supabase 配置（必需）

```env
# Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase 匿名密钥（公开密钥）
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase 服务角色密钥（私密密钥）
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

**获取 Supabase 密钥**：
1. 访问 https://supabase.com/dashboard
2. 选择你的项目
3. 进入 Settings → API
4. 复制 `URL`、`anon public` 和 `service_role` 密钥

### 3. One API 配置（必需）

```env
# One API 服务地址
ONE_API_URL=http://your-one-api-url

# One API 密钥
ONE_API_KEY=sk-your-relay-key

# One API 访问令牌
ONE_API_ACCESS_TOKEN=your-access-token

# One API 用户 ID
ONE_API_USER_ID=1
```

## 可选的环境变量

### OAuth 登录（推荐）

#### Google OAuth
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### GitHub OAuth
```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 邮件服务（推荐）

```env
# Resend API（用于发送邀请邮件）
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=AI Gateway <noreply@example.com>
RESEND_REPLY_TO_EMAIL=support@example.com
```

### 联系信息

```env
CONTACT_EMAIL=contact@example.com
CONTACT_PHONE=+86 400-888-2048
SALES_EMAIL=sales@example.com
SUPPORT_EMAIL=support@example.com
```

### 分析工具

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Railway 配置步骤

### 方式 1：通过 Railway Dashboard

1. 打开 Railway Dashboard
2. 选择你的项目
3. 点击 "Variables" 标签
4. 点击 "New Variable"
5. 逐个添加环境变量

### 方式 2：使用 Railway CLI

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 添加环境变量
railway variables set NEXTAUTH_URL=https://your-app.railway.app
railway variables set NEXTAUTH_SECRET=your-secret-key
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# ... 继续添加其他变量
```

### 方式 3：批量导入

创建一个 `.env.railway` 文件：

```env
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ONE_API_URL=http://your-one-api-url
ONE_API_KEY=sk-your-key
ONE_API_ACCESS_TOKEN=your-token
ONE_API_USER_ID=1
```

然后使用 Railway CLI 导入：

```bash
railway variables set --from-file .env.railway
```

## 最小配置示例

如果你只想快速测试部署，可以使用以下最小配置：

```env
# 必需
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-secret-key-here

# Supabase（必需）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# One API（必需）
ONE_API_URL=http://your-one-api-url
ONE_API_KEY=sk-your-key
ONE_API_ACCESS_TOKEN=your-token
ONE_API_USER_ID=1
```

## 验证配置

### 1. 检查环境变量

在 Railway Dashboard 中：
- Variables 标签
- 确认所有必需变量已设置
- 检查变量值是否正确（没有多余空格）

### 2. 触发重新部署

配置完环境变量后：
1. Railway 会自动触发重新部署
2. 或者手动点击 "Redeploy"

### 3. 查看部署日志

```
Deployments → 选择最新部署 → View logs
```

查找以下信息：
- ✅ "Server listening on port 3000"
- ✅ "Ready in XXXms"
- ❌ 任何错误信息

### 4. 测试健康检查

```bash
curl https://your-app.railway.app/
```

应该返回 HTML 内容，而不是错误。

## 常见问题

### Q: 健康检查仍然失败

**可能原因**：
1. NEXTAUTH_URL 配置错误
2. Supabase 密钥无效
3. One API 服务不可访问

**解决方案**：
```bash
# 查看运行日志
railway logs

# 检查特定错误
railway logs | grep -i error
```

### Q: 如何获取 Railway 域名？

**方法 1**：在 Railway Dashboard 中查看
```
Settings → Domains → 复制域名
```

**方法 2**：使用变量
```env
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}
```

### Q: Supabase 连接失败

**检查清单**：
1. ✅ URL 格式正确（https://xxx.supabase.co）
2. ✅ 密钥没有多余空格
3. ✅ 使用的是正确的项目密钥
4. ✅ Supabase 项目状态正常

### Q: One API 连接失败

**检查清单**：
1. ✅ One API 服务正在运行
2. ✅ URL 可以从 Railway 访问
3. ✅ API Key 有效
4. ✅ Access Token 正确

## 安全建议

### 1. 不要在代码中硬编码密钥

❌ 错误：
```javascript
const apiKey = 'sk-1234567890';
```

✅ 正确：
```javascript
const apiKey = process.env.ONE_API_KEY;
```

### 2. 使用强密钥

```bash
# 生成强密钥
openssl rand -base64 32
```

### 3. 定期轮换密钥

- 每 90 天更换一次 NEXTAUTH_SECRET
- 定期更新 API 密钥
- 监控异常访问

### 4. 限制密钥权限

- Supabase：使用 service_role 时要小心
- One API：创建专用的 API Key
- OAuth：限制回调 URL

## 部署后检查清单

- [ ] 所有必需环境变量已配置
- [ ] 健康检查通过
- [ ] 可以访问首页
- [ ] 可以注册/登录
- [ ] API 调用正常
- [ ] 数据库连接正常
- [ ] 邮件发送正常（如果配置）
- [ ] OAuth 登录正常（如果配置）

## 下一步

配置完环境变量后：

1. ✅ 等待 Railway 自动重新部署
2. ✅ 检查健康检查状态
3. ✅ 访问应用验证功能
4. ✅ 配置自定义域名（可选）
5. ✅ 设置监控告警（可选）

## 获取帮助

如果仍然遇到问题：

1. 查看 Railway 日志
   ```bash
   railway logs --tail 100
   ```

2. 检查应用日志
   ```
   Railway Dashboard → Deployments → Logs
   ```

3. 验证环境变量
   ```bash
   railway variables
   ```

4. 查看文档
   - [Railway 文档](https://docs.railway.app/)
   - [Next.js 部署](https://nextjs.org/docs/deployment)
   - [Supabase 文档](https://supabase.com/docs)

## 总结

健康检查失败通常是因为缺少环境变量。按照以下步骤操作：

1. ✅ 配置必需的环境变量（NextAuth、Supabase、One API）
2. ✅ 等待自动重新部署
3. ✅ 验证健康检查通过
4. ✅ 测试应用功能

配置完成后，应用应该可以正常运行了！🎉
