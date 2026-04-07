# 需求文档

## 简介

团队管理功能是 Aggregator AI 模型聚合平台的企业级功能模块，允许用户创建和管理团队，邀请成员协作，分配角色权限，并记录所有敏感操作的审计日志。该功能需要自研实现，不依赖 New API 的团队功能。

## 术语表

- **Team（团队）**: 一个组织单位，包含多个成员，共享资源和权限
- **Team_Member（团队成员）**: 属于某个团队的用户，拥有特定角色
- **Role（角色）**: 成员在团队中的权限级别，包括 Owner、Admin、Member、Guest
- **Owner（所有者）**: 团队创建者，拥有最高权限，可执行所有操作
- **Admin（管理员）**: 可管理成员和团队设置，但不能删除团队或转让所有权
- **Member（成员）**: 普通成员，可使用团队资源但不能管理团队
- **Guest（访客）**: 受限成员，只能查看部分信息
- **Audit_Log（审计日志）**: 记录团队内敏感操作的日志条目
- **Invitation（邀请）**: 向用户发送的加入团队请求
- **Team_API（团队接口）**: 处理团队相关请求的后端 API 服务

## 需求

### 需求 1：团队创建

**用户故事：** 作为平台用户，我希望能够创建团队，以便组织成员协作使用 API 服务。

#### 验收标准

1. WHEN 用户提交团队创建表单，THE Team_API SHALL 创建新团队并将用户设置为 Owner 角色
2. WHEN 用户创建团队时未提供团队名称，THE Team_API SHALL 返回验证错误信息
3. THE Team_API SHALL 限制团队名称长度在 2 到 100 个字符之间
4. WHEN 团队创建成功，THE Audit_Log SHALL 记录创建操作，包含用户 ID、操作类型和时间戳
5. THE Team_API SHALL 允许用户在创建时设置团队描述和 Logo（可选字段）

### 需求 2：团队信息管理

**用户故事：** 作为团队 Owner 或 Admin，我希望能够更新团队信息，以便保持团队资料的准确性。

#### 验收标准

1. WHEN Owner 或 Admin 提交团队更新请求，THE Team_API SHALL 更新团队名称、描述或 Logo
2. WHEN Member 或 Guest 尝试更新团队信息，THE Team_API SHALL 返回 403 权限拒绝错误
3. WHEN 团队信息更新成功，THE Audit_Log SHALL 记录变更操作，包含变更前后的值
4. THE Team_API SHALL 在更新时验证团队名称不为空且长度符合要求

### 需求 3：团队删除

**用户故事：** 作为团队 Owner，我希望能够删除团队，以便在不再需要时清理资源。

#### 验收标准

1. WHEN Owner 请求删除团队，THE Team_API SHALL 删除团队及所有关联的成员关系
2. WHEN 非 Owner 角色尝试删除团队，THE Team_API SHALL 返回 403 权限拒绝错误
3. WHEN 团队删除成功，THE Audit_Log SHALL 记录删除操作
4. THE Team_API SHALL 在删除前要求 Owner 进行二次确认

### 需求 4：成员邀请

**用户故事：** 作为团队 Owner 或 Admin，我希望能够邀请新成员加入团队，以便扩展团队协作。

#### 验收标准

1. WHEN Owner 或 Admin 提交邀请请求，THE Team_API SHALL 创建邀请记录并发送邀请通知
2. WHEN 邀请的邮箱格式无效，THE Team_API SHALL 返回验证错误信息
3. WHEN 用户已是团队成员，THE Team_API SHALL 返回错误提示用户已存在
4. THE Team_API SHALL 允许 Owner 邀请任意角色的成员
5. THE Team_API SHALL 限制 Admin 只能邀请 Member 或 Guest 角色的成员
6. WHEN 邀请发送成功，THE Audit_Log SHALL 记录邀请操作，包含被邀请者邮箱和分配的角色

### 需求 5：成员角色管理

**用户故事：** 作为团队 Owner 或 Admin，我希望能够修改成员角色，以便调整团队权限结构。

#### 验收标准

1. WHEN Owner 请求修改成员角色，THE Team_API SHALL 更新目标成员的角色
2. WHEN Admin 请求修改成员角色，THE Team_API SHALL 仅允许将成员设置为 Member 或 Guest
3. WHEN 尝试修改 Owner 的角色，THE Team_API SHALL 返回错误提示不能修改 Owner 角色
4. WHEN 角色修改成功，THE Audit_Log SHALL 记录变更操作，包含原角色和新角色
5. THE Team_API SHALL 确保团队始终有且仅有一个 Owner

### 需求 6：成员移除

**用户故事：** 作为团队 Owner 或 Admin，我希望能够移除团队成员，以便管理团队人员。

#### 验收标准

1. WHEN Owner 请求移除成员，THE Team_API SHALL 删除该成员的团队关联
2. WHEN Admin 请求移除成员，THE Team_API SHALL 仅允许移除 Member 或 Guest 角色的成员
3. WHEN 尝试移除 Owner，THE Team_API SHALL 返回错误提示不能移除 Owner
4. WHEN 成员移除成功，THE Audit_Log SHALL 记录移除操作
5. THE Team_API SHALL 允许成员主动退出团队（Owner 除外）

### 需求 7：所有权转让

**用户故事：** 作为团队 Owner，我希望能够将所有权转让给其他成员，以便在需要时交接团队管理权。

#### 验收标准

1. WHEN Owner 请求转让所有权，THE Team_API SHALL 将目标成员设置为新 Owner，原 Owner 降级为 Admin
2. WHEN 非 Owner 尝试转让所有权，THE Team_API SHALL 返回 403 权限拒绝错误
3. WHEN 目标成员不存在于团队中，THE Team_API SHALL 返回错误提示
4. WHEN 所有权转让成功，THE Audit_Log SHALL 记录转让操作，包含原 Owner 和新 Owner 信息

### 需求 8：团队列表查询

**用户故事：** 作为平台用户，我希望能够查看我所属的所有团队，以便快速切换和管理。

#### 验收标准

1. WHEN 用户请求团队列表，THE Team_API SHALL 返回用户所属的所有团队及其角色
2. THE Team_API SHALL 在列表中包含团队名称、描述、Logo、成员数量和用户角色
3. THE Team_API SHALL 支持分页查询，默认每页 20 条记录
4. THE Team_API SHALL 按用户加入时间倒序排列团队列表

### 需求 9：团队详情查询

**用户故事：** 作为团队成员，我希望能够查看团队详细信息，以便了解团队状态。

#### 验收标准

1. WHEN 团队成员请求团队详情，THE Team_API SHALL 返回团队完整信息
2. WHEN 非团队成员请求团队详情，THE Team_API SHALL 返回 403 权限拒绝错误
3. THE Team_API SHALL 在详情中包含团队基本信息、成员列表和统计数据

### 需求 10：成员列表查询

**用户故事：** 作为团队成员，我希望能够查看团队所有成员，以便了解团队组成。

#### 验收标准

1. WHEN 团队成员请求成员列表，THE Team_API SHALL 返回所有成员信息
2. THE Team_API SHALL 在成员信息中包含用户名、邮箱、角色、加入时间和最后活跃时间
3. THE Team_API SHALL 支持按角色筛选成员
4. THE Team_API SHALL 支持分页查询，默认每页 20 条记录

### 需求 11：审计日志记录

**用户故事：** 作为团队 Owner 或 Admin，我希望系统自动记录所有敏感操作，以便追踪和审计。

#### 验收标准

1. WHEN 发生团队创建、更新、删除操作，THE Audit_Log SHALL 自动记录操作详情
2. WHEN 发生成员邀请、角色变更、移除操作，THE Audit_Log SHALL 自动记录操作详情
3. WHEN 发生所有权转让操作，THE Audit_Log SHALL 自动记录操作详情
4. THE Audit_Log SHALL 记录操作者 ID、操作类型、操作目标、IP 地址、User-Agent 和时间戳

### 需求 12：审计日志查询

**用户故事：** 作为团队 Owner 或 Admin，我希望能够查询审计日志，以便监控团队活动。

#### 验收标准

1. WHEN Owner 或 Admin 请求审计日志，THE Team_API SHALL 返回团队的操作记录
2. WHEN Member 或 Guest 请求审计日志，THE Team_API SHALL 返回 403 权限拒绝错误
3. THE Team_API SHALL 支持按时间范围筛选审计日志
4. THE Team_API SHALL 支持按操作类型筛选审计日志
5. THE Team_API SHALL 支持按操作者筛选审计日志
6. THE Team_API SHALL 支持分页查询，默认每页 50 条记录
7. THE Team_API SHALL 按时间倒序排列审计日志

### 需求 13：审计日志导出

**用户故事：** 作为团队 Owner 或 Admin，我希望能够导出审计日志，以便进行离线分析或合规存档。

#### 验收标准

1. WHEN Owner 或 Admin 请求导出审计日志，THE Team_API SHALL 生成 CSV 格式的日志文件
2. WHEN 非 Owner 或 Admin 请求导出，THE Team_API SHALL 返回 403 权限拒绝错误
3. THE Team_API SHALL 支持指定导出的时间范围
4. THE Team_API SHALL 在导出文件中包含所有日志字段

### 需求 14：权限验证

**用户故事：** 作为系统，我需要在每个操作前验证用户权限，以确保安全性。

#### 验收标准

1. WHEN 用户发起团队操作请求，THE Team_API SHALL 首先验证用户的登录状态
2. WHEN 用户发起团队操作请求，THE Team_API SHALL 验证用户是否为团队成员
3. WHEN 用户发起管理操作请求，THE Team_API SHALL 验证用户角色是否有足够权限
4. IF 权限验证失败，THEN THE Team_API SHALL 返回相应的错误状态码和错误信息

### 需求 15：团队管理界面

**用户故事：** 作为团队成员，我希望有一个直观的界面来管理团队，以便高效完成团队管理任务。

#### 验收标准

1. THE Dashboard SHALL 在侧边栏显示团队管理入口
2. THE Dashboard SHALL 显示团队基本信息卡片，包含名称、描述和 Logo
3. THE Dashboard SHALL 显示成员列表，支持搜索和筛选
4. THE Dashboard SHALL 为 Owner 和 Admin 显示管理操作按钮
5. THE Dashboard SHALL 显示审计日志列表（仅 Owner 和 Admin 可见）
6. THE Dashboard SHALL 根据用户角色动态显示或隐藏管理功能
