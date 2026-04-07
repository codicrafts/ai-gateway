// src/types/team.ts
// 团队管理功能类型定义

// ============ 基础类型 ============

/**
 * 团队角色类型
 * - owner: 所有者，拥有最高权限
 * - admin: 管理员，可管理成员和团队设置
 * - member: 普通成员，可使用团队资源
 * - guest: 访客，只能查看部分信息
 */
export type TeamRole = 'owner' | 'admin' | 'member' | 'guest';

/**
 * 成员状态类型
 * - active: 活跃状态
 * - inactive: 非活跃状态
 * - pending: 待确认（邀请中）
 */
export type MemberStatus = 'active' | 'inactive' | 'pending';

/**
 * 邀请状态类型
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

export type JoinApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * 审计操作类型
 */
export type AuditAction =
  | 'api_key.create'
  | 'api_key.update'
  | 'api_key.delete'
  | 'api_key.reveal'
  | 'team.create'
  | 'team.update'
  | 'team.delete'
  | 'team.join_apply'
  | 'team.join_approve'
  | 'team.join_reject'
  | 'member.invite'
  | 'member.invite_accept'
  | 'member.invite_decline'
  | 'member.invite_cancel'
  | 'member.remove'
  | 'member.role_change'
  | 'ownership.transfer'
  | 'security.phone_bind'
  | 'security.2fa_enable'
  | 'security.2fa_disable';

// ============ 实体类型 ============

/**
 * 团队实体
 */
export interface Team {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  slug: string;
  website: string | null;
  brand_color: string | null;
  logo_path: string | null;
  owner_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * 关联用户基本信息
 */
export interface UserInfo {
  id?: string;
  username: string;
  email: string | null;
}

/**
 * 团队成员实体
 */
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: MemberStatus;
  joined_at: string;
  updated_at: string;
  /** 关联用户信息 */
  user?: UserInfo;
}

/**
 * 审计日志实体
 */
export interface AuditLog {
  id: string;
  team_id: string;
  user_id: string;
  action: AuditAction;
  target_type: string | null;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  /** 关联用户信息 */
  user?: Pick<UserInfo, 'username'>;
}

/**
 * 团队邀请实体
 */
export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  status: InvitationStatus;
  invited_by: string;
  invited_user_id: string | null;
  responded_by: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  invite_url?: string | null;
  inviter?: Pick<UserInfo, 'username' | 'email'>;
  team_name?: string;
  notification_status?: 'queued' | 'sent' | 'failed' | null;
  notification_error?: string | null;
  notification_updated_at?: string | null;
}

export interface TeamJoinApplication {
  id: string;
  team_id: string;
  applicant_user_id: string;
  requested_role: Extract<TeamRole, 'member' | 'guest'>;
  status: JoinApplicationStatus;
  message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  applicant?: Pick<UserInfo, 'username' | 'email'>;
  reviewer?: Pick<UserInfo, 'username' | 'email'>;
  team_name?: string;
  team_slug?: string;
}

// ============ 扩展类型 ============

/**
 * 团队列表项（包含用户角色和成员数量）
 */
export interface TeamListItem extends Team {
  member_count: number;
  user_role: TeamRole;
}

/**
 * 团队详情（包含成员列表）
 */
export interface TeamDetail extends Team {
  members: TeamMember[];
  member_count: number;
  owner_user?: UserInfo;
  created_by_user?: UserInfo;
}

// ============ API 请求类型 ============

/**
 * 创建团队请求
 */
export interface CreateTeamRequest {
  /** 团队名称，2-100 字符 */
  name: string;
  /** 团队描述（可选） */
  description?: string;
  /** 团队 Logo URL 或 Base64（可选） */
  logo?: string;
  /** 团队 slug（可选，不填则自动生成） */
  slug?: string;
  /** 团队官网或介绍页（可选） */
  website?: string;
  /** 品牌主色（可选） */
  brand_color?: string;
}

/**
 * 更新团队请求
 */
export interface UpdateTeamRequest {
  /** 团队名称，2-100 字符 */
  name?: string;
  /** 团队描述 */
  description?: string;
  /** 团队 Logo URL 或 Base64 */
  logo?: string;
  /** 团队 slug */
  slug?: string;
  /** 团队官网或介绍页 */
  website?: string;
  /** 品牌主色 */
  brand_color?: string;
}

export interface CreateTeamJoinApplicationRequest {
  slug: string;
  requested_role?: Extract<TeamRole, 'member' | 'guest'>;
  message?: string;
}

export interface ReviewTeamJoinApplicationRequest {
  decision: 'approve' | 'reject';
}

/**
 * 邀请成员请求
 */
export interface InviteMemberRequest {
  /** 被邀请者邮箱 */
  email: string;
  /** 分配的角色（不能为 owner） */
  role: Exclude<TeamRole, 'owner'>;
}

/**
 * 团队邀请查询参数
 */
export interface TeamInvitationQuery {
  /** 页码，默认 1 */
  page?: number;
  /** 每页数量，默认 20 */
  limit?: number;
  /** 状态筛选 */
  status?: InvitationStatus;
}

/**
 * 更新成员角色请求
 */
export interface UpdateMemberRoleRequest {
  /** 新角色（不能为 owner） */
  role: Exclude<TeamRole, 'owner'>;
}

/**
 * 转让所有权请求
 */
export interface TransferOwnershipRequest {
  /** 新 Owner 的用户 ID */
  new_owner_id: string;
}

/**
 * 审计日志查询参数
 */
export interface AuditLogQuery {
  /** 页码，默认 1 */
  page?: number;
  /** 每页数量，默认 50 */
  limit?: number;
  /** 开始日期（ISO 格式） */
  start_date?: string;
  /** 结束日期（ISO 格式） */
  end_date?: string;
  /** 操作类型筛选 */
  action?: AuditAction;
  /** 操作者 ID 筛选 */
  user_id?: string;
}

export interface TeamJoinApplicationQuery {
  page?: number;
  limit?: number;
  status?: JoinApplicationStatus;
}

/**
 * 团队列表查询参数
 */
export interface TeamListQuery {
  /** 页码，默认 1 */
  page?: number;
  /** 每页数量，默认 20 */
  limit?: number;
}

/**
 * 成员列表查询参数
 */
export interface MemberListQuery {
  /** 页码，默认 1 */
  page?: number;
  /** 每页数量，默认 20 */
  limit?: number;
  /** 角色筛选 */
  role?: TeamRole;
  /** 搜索关键词（用户名或邮箱） */
  search?: string;
}

// ============ API 响应类型 ============

/**
 * 通用 API 响应基础类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * 创建团队响应
 */
export type CreateTeamResponse = ApiResponse<Team>;

/**
 * 更新团队响应
 */
export type UpdateTeamResponse = ApiResponse<Team>;

/**
 * 删除团队响应
 */
export type DeleteTeamResponse = ApiResponse<{ id: string }>;

/**
 * 团队详情响应
 */
export type TeamDetailResponse = ApiResponse<TeamDetail>;

/**
 * 分页数据结构
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * 团队列表响应
 */
export type TeamListResponse = ApiResponse<PaginatedData<TeamListItem>>;

/**
 * 邀请成员响应
 */
export type InviteMemberResponse = ApiResponse<TeamMember>;

/**
 * 团队邀请列表响应
 */
export type TeamInvitationListResponse = ApiResponse<PaginatedData<TeamInvitation>>;

/**
 * 创建邀请响应
 */
export type CreateTeamInvitationResponse = ApiResponse<TeamInvitation>;

/**
 * 团队邀请详情响应
 */
export type TeamInvitationDetailResponse = ApiResponse<TeamInvitation>;

/**
 * 接受/拒绝邀请响应
 */
export type RespondTeamInvitationResponse = ApiResponse<{
  invitation: TeamInvitation;
  team_id: string;
}>;

/**
 * 取消邀请响应
 */
export type CancelTeamInvitationResponse = ApiResponse<{ id: string }>;

export type TeamJoinApplicationListResponse = ApiResponse<PaginatedData<TeamJoinApplication>>;

export type CreateTeamJoinApplicationResponse = ApiResponse<TeamJoinApplication>;

export type ReviewTeamJoinApplicationResponse = ApiResponse<TeamJoinApplication>;

/**
 * 更新成员角色响应
 */
export type UpdateMemberRoleResponse = ApiResponse<TeamMember>;

/**
 * 移除成员响应
 */
export type RemoveMemberResponse = ApiResponse<{ user_id: string }>;

/**
 * 成员列表响应
 */
export type MemberListResponse = ApiResponse<PaginatedData<TeamMember>>;

/**
 * 转让所有权响应
 */
export type TransferOwnershipResponse = ApiResponse<{
  old_owner: TeamMember;
  new_owner: TeamMember;
}>;

/**
 * 审计日志响应
 */
export type AuditLogResponse = ApiResponse<{
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}>;

/**
 * 审计日志导出响应（返回 CSV 文件）
 */
export type AuditLogExportResponse = ApiResponse<{
  filename: string;
  content: string;
}>;

// ============ 错误类型 ============

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * API 错误响应
 */
export interface ApiError {
  success: false;
  error: string;
  code?: ErrorCode;
  details?: unknown;
}

// ============ 权限相关类型 ============

/**
 * 权限操作类型
 */
export type PermissionAction =
  | 'team.view'
  | 'team.update'
  | 'team.delete'
  | 'team.join_review'
  | 'member.view'
  | 'member.invite'
  | 'member.remove'
  | 'member.role_change'
  | 'ownership.transfer'
  | 'audit.view'
  | 'audit.export';

/**
 * 角色权限映射
 */
export type RolePermissions = Record<TeamRole, PermissionAction[]>;
