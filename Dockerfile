FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 启用 corepack
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# 复制 workspace 配置和所有 package.json
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/design-system/package.json ./packages/design-system/
COPY packages/product-services/package.json ./packages/product-services/

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app

# 启用 corepack
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

# 复制源码
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

# 构建应用
RUN pnpm --filter @ai-gateway/web build

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制 standalone 输出（包含 server.js 和必要的依赖）
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# 复制 static 文件（从构建阶段的原始 .next 目录）
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
