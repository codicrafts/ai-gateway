# Resend 接入说明

当前项目已经按 Resend 官方 Next.js 示例接入，包含：

- 安装 `resend`
- React 邮件模板
- `app/api/send/route.ts` 示例发送路由
- 业务邮件统一走 Resend SDK

## 1. 环境变量

在 `apps/web/.env.local` 配置：

```env
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=MeshRouter <noreply@yourdomain.com>
RESEND_REPLY_TO_EMAIL=support@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

要求：

- `RESEND_API_KEY` 来自 Resend 后台
- `RESEND_FROM_EMAIL` 的域名必须已经在 Resend 验证通过

## 2. 官方示例型发送路由

项目里保留了一条最小联调路由：

- `/api/send`

对应文件：

- [email-template.tsx](/Users/weili/work/ai-gateway/apps/web/src/components/email-template.tsx)
- [route.ts](/Users/weili/work/ai-gateway/apps/web/src/app/api/send/route.ts)

## 3. 查看可用模板

```bash
curl http://localhost:3000/api/send
```

当前联调路由支持：

- `welcome`
- `verification`
- `password-reset`

## 4. 本地测试

启动项目后执行：

```bash
curl -X POST http://localhost:3000/api/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","template":"welcome","firstName":"Weili","subject":"Resend test"}'
```

成功时会返回 Resend 的发送结果。

验证码模板：

```bash
curl -X POST http://localhost:3000/api/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","template":"verification","code":"654321"}'
```

重置密码模板：

```bash
curl -X POST http://localhost:3000/api/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","template":"password-reset","resetUrl":"http://localhost:3000/reset-password?token=demo-token"}'
```

## 5. 业务邮件入口

下面这些业务能力已经统一切到 Resend SDK：

- 邮箱验证码
- 忘记密码
- 联系表单通知
- 团队邀请邮件

模板目录：

- [emails](/Users/weili/work/ai-gateway/apps/web/src/components/emails)
