# AI Gateway - 统一的AI模型API平台

一个类似 OpenRouter 和 Infron 的 AI API 聚合平台，提供统一的接口访问多个主流 AI 模型提供商。

## 📋 项目简介

AI Gateway 是一个功能完整的 AI API 聚合平台，让开发者可以通过单一 API 接口访问来自 OpenAI、Anthropic、Google、Mistral AI 等提供商的多种 AI 模型。

### 核心特性

- ✅ **统一接口** - 一个 API 密钥访问所有模型
- ✅ **多模型支持** - 支持文本、图像、音频、视频等多种模型
- ✅ **按需付费** - 透明的按 token 计费模式
- ✅ **实时监控** - 详细的使用统计和成本分析
- ✅ **API 密钥管理** - 安全的密钥创建、管理和撤销
- ✅ **交互式 Playground** - 实时测试和体验 AI 模型
- ✅ **完整文档** - 详细的 API 文档和代码示例

## 🎯 已完成功能

### 1. 用户系统
- [x] 用户注册/登录
- [x] 账户管理
- [x] 余额管理
- [x] LocalStorage 会话管理

### 2. 控制台 (Dashboard)
- [x] 账户余额显示
- [x] 使用统计（请求数、费用、tokens）
- [x] API 密钥管理（创建、查看、删除）
- [x] 使用记录查询
- [x] 数据可视化图表

### 3. 模型市场
- [x] 模型列表展示
- [x] 多维度筛选（提供商、类型、价格）
- [x] 模型详情展示
- [x] 价格对比
- [x] 快速试用入口

### 4. API 文档
- [x] 完整的 API 文档
- [x] 身份验证说明
- [x] 接口参数说明
- [x] 代码示例（Python、Node.js、cURL）
- [x] 错误处理指南
- [x] 速率限制说明

### 5. Playground
- [x] 实时聊天界面
- [x] 模型选择和参数配置
- [x] 对话历史记录
- [x] Token 和费用实时统计
- [x] 系统提示词设置

### 6. 定价页面
- [x] 多种套餐展示（免费、专业版、企业版）
- [x] 按 token 计费说明
- [x] 价格对比表
- [x] 常见问题解答

## 🗂️ 项目结构

```
├── index.html              # 首页
├── register.html           # 注册页面
├── login.html             # 登录页面
├── dashboard.html         # 用户控制台
├── models.html            # 模型市场
├── docs.html              # API文档
├── playground.html        # 交互式测试
├── pricing.html           # 定价页面
├── css/
│   └── style.css          # 全局样式
└── js/
    ├── main.js            # 公共功能
    └── dashboard.js       # 控制台逻辑
```

## 📊 数据模型

### Users 表
- `id` - 用户唯一标识
- `username` - 用户名
- `email` - 邮箱地址
- `password` - 密码（编码存储）
- `balance` - 账户余额
- `created_at` - 注册时间

### API Keys 表
- `id` - 密钥ID
- `user_id` - 所属用户ID
- `key_name` - 密钥名称
- `api_key` - API密钥
- `status` - 状态（active/inactive/revoked）
- `created_at` - 创建时间
- `last_used` - 最后使用时间

### Models 表
- `id` - 模型ID
- `model_name` - 模型名称
- `provider` - 提供商
- `category` - 分类（text/image/audio/video/embedding）
- `input_price` - 输入价格（每百万tokens）
- `output_price` - 输出价格（每百万tokens）
- `context_length` - 上下文长度
- `description` - 模型描述

### Usage Logs 表
- `id` - 日志ID
- `user_id` - 用户ID
- `api_key_id` - API密钥ID
- `model_id` - 模型ID
- `input_tokens` - 输入token数
- `output_tokens` - 输出token数
- `cost` - 费用
- `timestamp` - 时间戳

## 🚀 功能入口

### 访问路径
- **首页**: `index.html`
- **注册**: `register.html`
- **登录**: `login.html`
- **控制台**: `dashboard.html` (需登录)
- **模型市场**: `models.html`
- **API文档**: `docs.html`
- **Playground**: `playground.html` (需登录)
- **定价**: `pricing.html`

### API 端点（RESTful Table API）

#### 获取模型列表
```
GET tables/models?limit=100
```

#### 创建用户
```
POST tables/users
```

#### 创建 API 密钥
```
POST tables/api_keys
```

#### 查询使用记录
```
GET tables/usage_logs?search=user_id&limit=100
```

## 💡 使用流程

1. **注册账户** - 访问 `register.html` 创建账户，自动获得 $5 试用额度
2. **登录系统** - 访问 `login.html` 登录账户
3. **创建 API 密钥** - 在控制台创建和管理 API 密钥
4. **选择模型** - 在模型市场浏览并选择合适的 AI 模型
5. **测试模型** - 在 Playground 实时测试模型效果
6. **集成 API** - 参考文档将 API 集成到您的应用

## 🎨 技术栈

- **前端框架**: 纯 HTML/CSS/JavaScript
- **UI 库**: Font Awesome (图标)
- **字体**: Google Fonts (Inter)
- **图表**: Chart.js
- **数据存储**: RESTful Table API
- **状态管理**: LocalStorage

## 🔐 安全特性

- 密码编码存储（Base64）
- API 密钥安全管理
- 会话状态管理
- 密钥只显示一次机制

## 🎯 待开发功能

以下功能可在未来版本中添加：

### 高优先级
- [ ] 真实的 API 转发功能（需后端支持）
- [ ] 支付集成（充值功能）
- [ ] 密码加密（使用更安全的加密方式）
- [ ] 邮箱验证
- [ ] 密码找回功能

### 中优先级
- [ ] 团队协作功能
- [ ] 更详细的使用分析
- [ ] 预算和配额管理
- [ ] Webhook 通知
- [ ] 社交登录集成

### 低优先级
- [ ] 多语言支持
- [ ] 暗色/亮色主题切换
- [ ] 移动端 App
- [ ] API 版本管理
- [ ] 自定义模型部署

## 📝 开发说明

### 本地测试
1. 确保所有文件在同一目录结构中
2. 使用本地服务器运行（例如 Python 的 `http.server` 或 VS Code 的 Live Server）
3. 访问 `index.html` 开始使用

### 数据初始化
项目已预置 10 个示例 AI 模型数据，包括：
- OpenAI (GPT-4, GPT-3.5, DALL-E 3)
- Anthropic (Claude 3 系列)
- Google (Gemini Pro)
- Mistral AI (Mistral Large)
- Stability AI (Stable Diffusion XL)

## 🐛 已知限制

1. **密码安全**: 当前使用 Base64 编码，实际应用应使用更安全的加密方式
2. **API 模拟**: Playground 中的 API 调用是模拟的，未连接真实 AI 服务
3. **支付功能**: 充值和支付功能为占位符，需集成支付网关
4. **社交登录**: Google/GitHub 登录为占位符功能
5. **服务器端**: 无后端服务器，所有逻辑在客户端运行

## 📄 许可证

本项目仅供学习和演示使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Email: support@aigateway.com

---

**注意**: 这是一个静态网站演示项目，展示了 AI API 聚合平台的前端功能。要构建完整的生产级系统，需要添加后端服务、真实的 API 集成和安全加固。