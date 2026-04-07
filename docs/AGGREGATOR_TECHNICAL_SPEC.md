# Aggregator 平台技术方案文档

## 一、项目概述

### 1.1 项目背景

Aggregator 是一个 AI 模型聚合平台，对标 InfronAI、ZenMux、OpenRouter，提供统一的 LLM API 接入服务。平台通过标准的 OpenAI API 格式，让开发者可以一键接入多个大模型提供商。

### 1.2 核心价值

- **统一接口**：一个 API Key 访问所有主流大模型
- **成本优化**：智能路由、负载均衡，降低调用成本
- **开发友好**：OpenAI 协议兼容，零迁移成本
- **企业级**：团队管理、权限控制、审计日志

### 1.3 对标产品

| 产品 | 特点 |
|------|------|
| InfronAI | Reliable AI Model Interface for Growing Business |
| ZenMux | 多模型聚合，智能路由 |
| OpenRouter | 开源模型生态，统一 API |

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                          用户访问层                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌───────────────────┐         ┌───────────────────────────────┐  │
│   │   官网 (Next.js)   │         │     企业后台 (Next.js)         │  │
│   │                   │         │                               │  │
│   │ • Landing Page    │         │ • Dashboard 控制台             │  │
│   │ • Models 模型大全  │         │ • 团队管理                     │  │
│   │ • Pricing 定价    │         │ • API Key 管理                 │  │
│   │ • Docs 文档中心   │         │ • 用量统计                     │  │
│   │ • Contact 联系    │         │ • Playground 调试              │  │
│   │                   │         │ • 账单管理                     │  │
│   └─────────┬─────────┘         └───────────────┬───────────────┘  │
│             │                                   │                   │
│             │            REST API               │                   │
│             └─────────────────┬─────────────────┘                   │
│                               ▼                                     │
├─────────────────────────────────────────────────────────────────────┤
│                      New API (核心底座)                              │
│                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│   │  用户系统    │  │  令牌系统    │  │  渠道系统    │  │  计费系统  │ │
│   │             │  │             │  │             │  │           │ │
│   │ • 注册登录   │  │ • API Key   │  │ • Provider  │  │ • Token   │ │
│   │ • OAuth     │  │ • 额度控制   │  │ • 健康检查   │  │ • 余额    │ │
│   │ • 用户分组   │  │ • 权限绑定   │  │ • 负载均衡   │  │ • 充值    │ │
│   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│   │  路由系统    │  │  日志系统    │  │  模型系统    │  │  网关系统  │ │
│   │             │  │             │  │             │  │           │ │
│   │ • 智能路由   │  │ • 请求日志   │  │ • 模型列表   │  │ • 协议转换 │ │
│   │ • Fallback  │  │ • 调用统计   │  │ • 能力标签   │  │ • 限流    │ │
│   │ • 重试机制   │  │ • 错误追踪   │  │ • 状态监控   │  │ • 鉴权    │ │
│   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                      运营后台 (New API 自带)                         │
│                                                                     │
│   • 全局用户管理  • 渠道配置  • 模型定价  • 系统设置  • 数据统计      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         LLM Providers                               │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ OpenAI  │ │ Claude  │ │ Gemini  │ │DeepSeek │ │  通义    │  ...  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **官网/企业后台** | Next.js 14 + TypeScript | React 生态，SSR/SSG 支持，SEO 友好 |
| **状态管理** | Redux Toolkit | 全局状态管理 |
| **样式方案** | Tailwind CSS | 原子化 CSS，快速开发 |
| **API 网关** | New API (Go) | 开源 LLM 网关，功能完善 |
| **数据库** | MySQL / PostgreSQL | New API 支持，生产环境推荐 |
| **缓存** | Redis | 会话、限流、缓存 |
| **部署** | Docker + Nginx | 容器化部署 |
| **监控** | Prometheus + Grafana | 可选，生产环境监控 |

---

## 三、功能模块设计

### 3.1 模块总览

| 模块 | 实现方式 | 说明 |
|------|---------|------|
| 官网 | Next.js 自研 | Landing Page、Models、Pricing、Docs、Contact |
| 账号与组织 | New API + 自研增强 | 注册登录用 New API，团队管理自研 |
| Provider接入与API Gateway | New API | 直接使用 |
| 数据和支付系统 | New API + 自研增强 | 基础计费用 New API，BI 看板自研 |
| 开发者体验 | Next.js 自研 | Playground、请求日志 |

### 3.2 官网模块

#### 3.2.1 Landing Page

**目标**：让用户 3 秒理解产品价值，引导注册获取 API Key

| 组件 | 功能 |
|------|------|
| Hero | Logo + Slogan + 一句话介绍 |
| 快速接入示例 | 一段代码调用 API |
| CTA | Get Started / 获取 API Key |
| 模型能力展示 | GPT / Claude / DeepSeek... |
| 核心功能介绍 | 多模型 / 智能路由 / 成本优化 |
| 成本优势说明 | 对比官方 API 成本 |
| 客户背书 | 合作企业 / 使用案例 |

#### 3.2.2 Models 页面

**目标**：AI 模型大全页面，支持搜索、筛选、价格对比，承担 SEO 流量入口

| 功能 | 说明 |
|------|------|
| 模型列表 | 展示所有支持的模型 |
| 搜索框 | 按模型名搜索 |
| 条件筛选 | 按厂商 / 价格 / 能力筛选 |
| 价格表 | Input / Output Token 价格 |
| 模型能力标签 | 对话 / 编程 / 推理 |
| 模型详情页 | Context 长度 / Benchmark |
| 模型状态 | 延迟 / 在线状态 |

#### 3.2.3 Pricing 页面

**目标**：让用户理解平台如何收费、是否更便宜

| 功能 | 说明 |
|------|------|
| 价格说明 | 按 Token 计费 |
| 模型价格表 | 各模型调用价格 |
| 成本对比 | 对比官方 API 成本 |
| 使用成本示例 | Chat 示例 |
| 企业方案 | SLA / 私有部署 |

#### 3.2.4 Documentation 页面

**目标**：帮开发者快速接入 API 并成功调用模型

| 章节 | 内容 |
|------|------|
| Overview | 产品介绍 |
| Quickstart | 3分钟跑通 API |
| API Reference | 接口文档 |
| Models | 支持的模型 |
| Pricing | 价格说明 |
| Usage & Billing | 用量和账单 |

### 3.3 账号与组织模块

#### 3.3.1 注册和登录（New API 支持）

| 功能 | New API 支持 | 说明 |
|------|-------------|------|
| 邮箱注册 | ✅ | 支持邮箱白名单 |
| 手机号注册 | ❌ | 需要二开 |
| 验证码 | ✅ | 邮件验证码 |
| OAuth 登录 | ✅ | GitHub、飞书、微信 |
| 忘记密码 | ✅ | 邮箱重置 |

#### 3.3.2 用户个人中心（New API 支持）

| 功能 | New API 支持 |
|------|-------------|
| 个人信息管理 | ✅ |
| API Key 管理 | ✅ |
| 安全设置 | ✅ |
| 使用统计 | ✅ |

#### 3.3.3 组织和团队管理（需要自研）

| 功能 | 实现方式 |
|------|---------|
| 创建/加入组织 | Next.js + 自建 API |
| 成员管理 | Next.js + 自建 API |
| 角色权限分配 | Owner / Admin / Member / Guest |
| 团队设置 | 名称、Logo、描述 |
| 审计日志 | 权限变更记录 |

#### 3.3.4 API Key 管理（New API 支持）

| 功能 | New API 支持 |
|------|-------------|
| 创建 API Key | ✅ |
| 撤销/禁用 Key | ✅ |
| 使用统计 | ✅ |
| 权限绑定 | ✅ |
| Key 命名与管理 | ✅ |
| 过期时间设置 | ✅ |
| IP 白名单 | ✅ |
| 模型限制 | ✅ |

### 3.4 Provider接入与API Gateway（New API 支持）

#### 3.4.1 支持的 Provider

| Provider | 模型 |
|----------|------|
| OpenAI | GPT-4、GPT-3.5、DALL-E |
| Anthropic | Claude 3 系列 |
| Google | Gemini 系列 |
| Azure OpenAI | GPT 系列 |
| DeepSeek | DeepSeek 系列 |
| 字节豆包 | 豆包系列 |
| 阿里通义 | 千问系列 |
| 百度文心 | 文心一言 |
| 讯飞星火 | 星火系列 |
| 智谱 | ChatGLM 系列 |
| Moonshot | Kimi |
| Groq | 高速推理 |
| Ollama | 本地模型 |

#### 3.4.2 路由系统

| 功能 | 说明 |
|------|------|
| 智能路由 | 根据模型、延迟、成本选择最优渠道 |
| Fallback | Provider 故障时自动切换 |
| 负载均衡 | 多渠道流量分配 |
| 重试机制 | 失败自动重试 |

#### 3.4.3 API Gateway

| 功能 | 说明 |
|------|------|
| 统一接口 | OpenAI 协议兼容 |
| 协议转换 | 不同 Provider 格式转换 |
| 权限校验 | API Key 验证 |
| 请求日志 | 记录每次调用 |
| 接口限流 | 防止滥用 |

### 3.5 数据和支付系统

#### 3.5.1 Token 实时计量（New API 支持）

| 指标 | 说明 |
|------|------|
| Token 消耗 | Input / Output Token |
| 请求数 | API 调用次数 |
| TTFT | 首 Token 时间 |
| 延迟 | 请求延迟 |
| 成功率 | 调用成功率 |

#### 3.5.2 钱包/充值管理（New API 支持）

| 功能 | 支持情况 |
|------|---------|
| 支付宝 | ✅ EPay |
| 微信支付 | ✅ EPay |
| Stripe | ✅ |
| 余额管理 | ✅ |
| 充值历史 | ✅ |

#### 3.5.3 消耗成本统计看板（需要增强）

| 功能 | 实现方式 |
|------|---------|
| 费用明细 | 对接 New API 数据 |
| 成本趋势 | 自研图表组件 |
| 导出报表 | CSV / PDF 导出 |

### 3.6 开发者体验（需要自研）

#### 3.6.1 Playground

| 功能 | 说明 |
|------|------|
| 模型选择 | 下拉选择模型 |
| 参数配置 | Temperature、Max Tokens 等 |
| 对话界面 | 实时对话测试 |
| 代码生成 | 生成调用代码 |

#### 3.6.2 请求日志追踪

| 功能 | 说明 |
|------|------|
| 请求记录 | 输入、输出、状态码 |
| 调用状态 | 成功、失败、异常 |
| 错误信息 | 详细错误信息 |
| 日志导出 | 支持导出 |

---

## 四、数据库设计

### 4.1 New API 核心表（已有）

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| tokens | API Key 表 |
| channels | 渠道表 |
| logs | 日志表 |
| redemptions | 兑换码表 |
| options | 配置表 |

### 4.2 自研扩展表

#### 4.2.1 团队表 (teams)

```sql
CREATE TABLE teams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  logo VARCHAR(255),
  owner_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 4.2.2 团队成员表 (team_members)

```sql
CREATE TABLE team_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role ENUM('owner', 'admin', 'member', 'guest') DEFAULT 'member',
  status ENUM('active', 'inactive') DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (team_id, user_id)
);
```

#### 4.2.3 审计日志表 (audit_logs)

```sql
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT,
  user_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  target VARCHAR(255),
  ip VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 五、API 设计

### 5.1 New API 已有接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/user/register | POST | 用户注册 |
| /api/user/login | POST | 用户登录 |
| /api/user/self | GET | 获取当前用户 |
| /api/token | GET/POST/DELETE | API Key 管理 |
| /api/log | GET | 日志查询 |
| /api/channel | GET/POST/PUT/DELETE | 渠道管理 |
| /v1/chat/completions | POST | Chat API |
| /v1/completions | POST | Completions API |
| /v1/embeddings | POST | Embeddings API |
| /v1/images/generations | POST | 图像生成 |

### 5.2 自研扩展接口

#### 5.2.1 团队管理

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/teams | GET | 获取用户的团队列表 |
| /api/teams | POST | 创建团队 |
| /api/teams/:id | GET | 获取团队详情 |
| /api/teams/:id | PUT | 更新团队信息 |
| /api/teams/:id | DELETE | 删除团队 |
| /api/teams/:id/members | GET | 获取团队成员 |
| /api/teams/:id/members | POST | 邀请成员 |
| /api/teams/:id/members/:userId | PUT | 更新成员角色 |
| /api/teams/:id/members/:userId | DELETE | 移除成员 |

#### 5.2.2 审计日志

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/teams/:id/audit-logs | GET | 获取审计日志 |
| /api/teams/:id/audit-logs/export | GET | 导出审计日志 |

---

## 六、部署方案

### 6.1 开发环境

```bash
# 1. 启动 New API
docker run -d --name new-api \
  -p 3001:3000 \
  -e TZ=Asia/Shanghai \
  -v ./data:/data \
  calciumion/new-api:latest

# 2. 启动 Next.js 前端
cd ai-gateway
pnpm install
pnpm dev
```

### 6.2 生产环境

#### 6.2.1 Docker Compose

```yaml
version: '3.8'

services:
  # MySQL 数据库
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: aggregator
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  # Redis 缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # New API 核心服务
  new-api:
    image: calciumion/new-api:latest
    depends_on:
      - mysql
      - redis
    environment:
      - SQL_DSN=root:your_password@tcp(mysql:3306)/aggregator
      - REDIS_CONN_STRING=redis://redis:6379
      - TZ=Asia/Shanghai
    ports:
      - "3001:3000"
    volumes:
      - ./data:/data

  # Next.js 前端
  frontend:
    build: .
    depends_on:
      - new-api
    environment:
      - NEXT_PUBLIC_API_URL=http://new-api:3000
    ports:
      - "3000:3000"

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    depends_on:
      - frontend
      - new-api
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl

volumes:
  mysql_data:
```

#### 6.2.2 Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # 前端
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # New API
    location /api/ {
        proxy_pass http://new-api:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }

    # LLM API
    location /v1/ {
        proxy_pass http://new-api:3000/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
}
```

---

## 七、开发计划

### 7.1 阶段一：基础搭建（1-2 周）

- [ ] New API 部署和配置
- [ ] Next.js 项目结构优化
- [ ] 对接 New API 用户系统
- [ ] 对接 New API API Key 管理

### 7.2 阶段二：官网完善（2-3 周）

- [ ] Landing Page 优化
- [ ] Models 页面（模型大全）
- [ ] Pricing 页面
- [ ] Documentation 页面
- [ ] Contact 页面
- [ ] SEO 优化
- [ ] 多语言支持

### 7.3 阶段三：企业后台（2-3 周）

- [ ] Dashboard 控制台
- [ ] 团队管理功能
- [ ] 成员权限管理
- [ ] 审计日志
- [ ] 增强 BI 看板

### 7.4 阶段四：开发者体验（1-2 周）

- [ ] Playground 调试页面
- [ ] 请求日志追踪
- [ ] 示例代码生成

### 7.5 阶段五：上线准备（1 周）

- [ ] 生产环境部署
- [ ] 性能优化
- [ ] 安全加固
- [ ] 监控告警

---

## 八、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| New API 版本更新 | 可能导致兼容性问题 | 锁定版本，定期评估升级 |
| Provider API 变更 | 影响模型调用 | New API 社区会跟进适配 |
| 高并发压力 | 系统不稳定 | 使用 MySQL + Redis，水平扩展 |
| 数据安全 | 用户数据泄露 | HTTPS、数据加密、权限控制 |

---

## 九、参考资料

- [New API GitHub](https://github.com/Calcium-Ion/new-api)
- [One API GitHub](https://github.com/songquanpeng/one-api)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Next.js Documentation](https://nextjs.org/docs)
