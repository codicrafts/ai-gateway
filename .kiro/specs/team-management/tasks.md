# 实现计划：团队管理功能

## 概述

本计划将团队管理功能的设计转化为可执行的编码任务，按照数据库和类型定义、后端 API、前端状态管理、前端组件、属性测试的顺序组织。每个任务都引用具体的需求条款，确保完整覆盖所有功能。

## 任务列表

- [x] 1. 数据库和类型定义
  - [x] 1.1 配置 Supabase 客户端
    - 安装 `@supabase/supabase-js` 依赖
    - 创建 `src/lib/supabase.ts` 文件，配置 Supabase 客户端
    - 在 `.env.local` 中添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY
    - _需求: 1.1_
  
  - [x] 1.2 创建团队相关数据库表
    - 在 Supabase Dashboard 或通过 migration 创建 teams、team_members、audit_logs 表
    - 配置 RLS (Row Level Security) 策略
    - 创建必要的索引和触发器
    - _需求: 1.1, 11.4_
  
  - [x] 1.3 创建 TypeScript 类型定义
    - 创建 `src/types/team.ts` 文件
    - 定义 Team、TeamMember、AuditLog、TeamRole、MemberStatus、AuditAction 等类型
    - 定义 API 请求/响应接口类型
    - _需求: 1.1, 4.1, 11.1_

- [x] 2. 后端 API 实现 - 团队管理
  - [x] 2.1 实现权限验证中间件
    - 创建 `src/lib/teamAuth.ts` 文件
    - 实现 checkTeamMember、checkTeamRole 权限验证函数
    - 实现角色权限矩阵检查逻辑
    - _需求: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 2.2 实现审计日志服务
    - 创建 `src/lib/auditLog.ts` 文件
    - 实现 createAuditLog 函数，记录操作者、操作类型、目标、IP、User-Agent、时间戳
    - _需求: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 2.3 实现团队列表和创建 API
    - 创建 `src/app/api/teams/route.ts`
    - 使用 Supabase 客户端进行数据库操作
    - GET: 获取用户所属团队列表，支持分页，按加入时间倒序
    - POST: 创建团队，验证名称长度（2-100字符），自动设置创建者为 Owner
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4_
  
  - [x] 2.4 实现团队详情、更新、删除 API
    - 创建 `src/app/api/teams/[id]/route.ts`
    - GET: 获取团队详情，验证成员身份
    - PUT: 更新团队信息，验证 Owner/Admin 权限
    - DELETE: 删除团队，验证 Owner 权限，级联删除成员关系
    - _需求: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 9.1, 9.2, 9.3_

- [x] 3. 后端 API 实现 - 成员管理
  - [x] 3.1 实现成员列表和邀请 API
    - 创建 `src/app/api/teams/[id]/members/route.ts`
    - GET: 获取成员列表，支持角色筛选和分页
    - POST: 邀请成员，验证邮箱格式，检查重复邀请，验证邀请权限分层
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 10.1, 10.2, 10.3, 10.4_
  
  - [x] 3.2 实现成员角色更新和移除 API
    - 创建 `src/app/api/teams/[id]/members/[userId]/route.ts`
    - PUT: 更新成员角色，验证权限分层，保护 Owner 角色
    - DELETE: 移除成员，验证权限分层，禁止移除 Owner
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 3.3 实现所有权转让 API
    - 创建 `src/app/api/teams/[id]/transfer/route.ts`
    - POST: 转让所有权，验证 Owner 权限，原子性更新角色
    - _需求: 7.1, 7.2, 7.3, 7.4_

- [x] 4. 后端 API 实现 - 审计日志
  - [x] 4.1 实现审计日志查询 API
    - 创建 `src/app/api/teams/[id]/audit-logs/route.ts`
    - GET: 查询审计日志，支持时间范围、操作类型、操作者筛选，分页，按时间倒序
    - 验证 Owner/Admin 权限
    - _需求: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_
  
  - [x] 4.2 实现审计日志导出 API
    - 创建 `src/app/api/teams/[id]/audit-logs/export/route.ts`
    - GET: 导出 CSV 格式日志，支持时间范围筛选，包含所有字段
    - 验证 Owner/Admin 权限
    - _需求: 13.1, 13.2, 13.3, 13.4_

- [x] 5. 检查点 - 后端 API 完成
  - 确保所有 API 测试通过，如有问题请询问用户。

- [x] 6. 前端状态管理
  - [x] 6.1 创建团队管理 Redux Slice
    - 创建 `src/store/slices/teamSlice.ts`
    - 定义 state: currentTeam, teams, members, auditLogs, loading, error
    - 实现 async thunks: fetchTeams, createTeam, updateTeam, deleteTeam
    - 实现 async thunks: fetchMembers, inviteMember, updateMemberRole, removeMember
    - 实现 async thunks: transferOwnership, fetchAuditLogs, exportAuditLogs
    - _需求: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [x] 6.2 注册 teamSlice 到 Redux Store
    - 更新 `src/store/index.ts`，添加 team reducer
    - 更新 `src/store/hooks.ts` 类型定义（如需要）
    - _需求: 15.1_

- [x] 7. 前端组件实现 - 基础组件
  - [x] 7.1 实现团队信息卡片组件
    - 创建 `src/components/team/TeamInfoCard.tsx`
    - 显示团队名称、描述、Logo、成员数量
    - 根据用户角色显示编辑按钮
    - _需求: 15.2_
  
  - [x] 7.2 实现成员列表组件
    - 创建 `src/components/team/MemberList.tsx`
    - 显示成员头像、名称、邮箱、角色、加入时间、最后活跃时间
    - 支持搜索和角色筛选
    - 根据用户角色显示管理操作按钮
    - _需求: 15.3, 15.4_
  
  - [x] 7.3 实现审计日志列表组件
    - 创建 `src/components/team/AuditLogList.tsx`
    - 显示操作者、操作类型、目标、时间、IP
    - 支持时间范围和操作类型筛选
    - 提供导出按钮
    - _需求: 15.5_

- [x] 8. 前端组件实现 - 弹窗组件
  - [x] 8.1 实现邀请成员弹窗
    - 创建 `src/components/team/InviteModal.tsx`
    - 邮箱输入、角色选择（根据当前用户角色限制可选项）
    - 表单验证和提交
    - _需求: 4.1, 4.4, 4.5, 15.4_
  
  - [x] 8.2 实现团队设置弹窗
    - 创建 `src/components/team/TeamSettingsModal.tsx`
    - 编辑团队名称、描述、Logo
    - 表单验证（名称长度 2-100）
    - _需求: 2.1, 2.4, 15.2_
  
  - [x] 8.3 实现创建团队弹窗
    - 创建 `src/components/team/CreateTeamModal.tsx`
    - 输入团队名称、描述、Logo（可选）
    - 表单验证和提交
    - _需求: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 8.4 实现所有权转让弹窗
    - 创建 `src/components/team/TransferOwnerModal.tsx`
    - 选择目标成员、二次确认
    - _需求: 7.1, 7.3_

- [x] 9. 前端组件实现 - 主页面集成
  - [x] 9.1 重构 Dashboard 团队管理 Tab
    - 更新 `src/app/dashboard/page.tsx` 中的团队管理部分
    - 集成 TeamInfoCard、MemberList、AuditLogList 组件
    - 集成所有弹窗组件
    - 根据用户角色动态显示/隐藏管理功能
    - 替换现有的硬编码数据为 Redux 状态
    - _需求: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 10. 检查点 - 前端集成完成
  - 确保所有组件正常工作，如有问题请询问用户。

- [ ] 11. 属性测试
  - [ ]* 11.1 配置属性测试环境
    - 安装 fast-check 测试库
    - 创建 `src/__tests__/team/` 测试目录
    - 配置测试数据生成器
    - _需求: 所有属性测试_
  
  - [ ]* 11.2 编写团队创建属性测试
    - **Property 1: 团队创建者自动成为 Owner**
    - **Property 2: 团队名称长度验证**
    - **Property 3: 可选字段处理**
    - **验证需求: 1.1, 1.3, 1.5**
  
  - [ ]* 11.3 编写权限验证属性测试
    - **Property 4: Owner/Admin 更新权限**
    - **Property 5: Member/Guest 更新拒绝**
    - **Property 6: Owner 独占删除权限**
    - **Property 7: 删除级联清理**
    - **验证需求: 2.1, 2.2, 3.1, 3.2**
  
  - [ ]* 11.4 编写成员管理属性测试
    - **Property 8: 邀请权限分层**
    - **Property 9: 重复邀请拒绝**
    - **Property 10: 角色修改权限分层**
    - **Property 11: Owner 角色保护**
    - **Property 12: 单一 Owner 不变量**
    - **Property 13: 移除权限分层**
    - **Property 14: 成员自主退出**
    - **验证需求: 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.5, 6.1, 6.2, 6.3, 6.5**
  
  - [ ]* 11.5 编写所有权转让属性测试
    - **Property 15: 所有权转让原子性**
    - **Property 16: 转让权限验证**
    - **验证需求: 7.1, 7.2**
  
  - [ ]* 11.6 编写查询功能属性测试
    - **Property 17: 团队列表成员过滤**
    - **Property 18: 团队列表排序**
    - **Property 19: 非成员访问拒绝**
    - **Property 20: 成员角色筛选**
    - **验证需求: 8.1, 8.4, 9.2, 10.3**
  
  - [ ]* 11.7 编写审计日志属性测试
    - **Property 21: 审计日志自动记录**
    - **Property 22: 审计日志访问权限**
    - **Property 23: 审计日志时间筛选**
    - **Property 24: 审计日志排序**
    - **Property 25: CSV 导出完整性**
    - **Property 26: 导出权限验证**
    - **验证需求: 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.7, 13.1, 13.2, 13.4**
  
  - [ ]* 11.8 编写认证验证属性测试
    - **Property 27: 认证验证**
    - **Property 28: 成员身份验证**
    - **验证需求: 14.1, 14.2**

- [ ] 12. 最终检查点
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 开发
- 每个任务都引用了具体的需求条款，确保可追溯性
- 检查点任务用于增量验证，确保每个阶段的正确性
- 属性测试验证设计文档中定义的 28 个正确性属性
