// src/lib/auditLog.ts
// 审计日志服务 - 记录团队管理相关的敏感操作

import { createServerSupabaseClient, Database } from './supabase';
import type { AuditAction, AuditLog } from '@ai-gateway/shared-types/team';
import type { NextRequest } from 'next/server';

// 审计日志表的插入类型
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];
type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];

/**
 * 客户端信息
 */
export interface ClientInfo {
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * 创建审计日志参数
 */
export interface CreateAuditLogParams {
  /** 团队 ID */
  team_id: string;
  /** 操作者 ID */
  user_id: string;
  /** 操作类型 */
  action: AuditAction;
  /** 目标类型（team/member） */
  target_type?: string | null;
  /** 目标 ID */
  target_id?: string | null;
  /** 变更前的值 */
  old_value?: Record<string, unknown> | null;
  /** 变更后的值 */
  new_value?: Record<string, unknown> | null;
  /** 客户端 IP */
  ip_address?: string | null;
  /** 客户端 User-Agent */
  user_agent?: string | null;
}

/**
 * 从请求中提取客户端信息（IP 和 User-Agent）
 * @param request Next.js 请求对象
 * @returns 客户端信息
 */
export function getClientInfo(request: NextRequest): ClientInfo {
  // 获取 IP 地址
  // 优先从 x-forwarded-for 获取（代理/负载均衡场景）
  // 其次从 x-real-ip 获取
  // 最后尝试从 request.ip 获取
  let ip_address: string | null = null;
  
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for 可能包含多个 IP，取第一个（客户端真实 IP）
    ip_address = forwardedFor.split(',')[0].trim();
  } else {
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      ip_address = realIp;
    } else {
      // Next.js 14 中可以通过 request.ip 获取
      ip_address = (request as unknown as { ip?: string }).ip || null;
    }
  }

  // 获取 User-Agent
  const user_agent = request.headers.get('user-agent');

  return {
    ip_address,
    user_agent,
  };
}

/**
 * 将数据库行转换为 AuditLog 类型
 */
function rowToAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    team_id: row.team_id,
    user_id: row.user_id,
    action: row.action as AuditAction,
    target_type: row.target_type,
    target_id: row.target_id,
    old_value: row.old_value ? JSON.parse(row.old_value) : null,
    new_value: row.new_value ? JSON.parse(row.new_value) : null,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at,
  };
}

/**
 * 创建审计日志记录
 * @param params 审计日志参数
 * @returns 创建的审计日志记录，失败时返回 null
 */
export async function createAuditLog(
  params: CreateAuditLogParams
): Promise<AuditLog | null> {
  const supabase = createServerSupabaseClient();

  const {
    team_id,
    user_id,
    action,
    target_type = null,
    target_id = null,
    old_value = null,
    new_value = null,
    ip_address = null,
    user_agent = null,
  } = params;

  const insertData: AuditLogInsert = {
    team_id,
    user_id,
    action,
    target_type,
    target_id,
    old_value: old_value ? JSON.stringify(old_value) : null,
    new_value: new_value ? JSON.stringify(new_value) : null,
    ip_address,
    user_agent,
  };

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error('创建审计日志失败:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return rowToAuditLog(data);
  } catch (err) {
    console.error('创建审计日志异常:', err);
    return null;
  }
}

/**
 * 批量创建审计日志（用于原子性操作，如所有权转让）
 * @param logs 审计日志参数数组
 * @returns 是否全部创建成功
 */
export async function createAuditLogsBatch(
  logs: CreateAuditLogParams[]
): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  const insertData: AuditLogInsert[] = logs.map((log) => ({
    team_id: log.team_id,
    user_id: log.user_id,
    action: log.action,
    target_type: log.target_type || null,
    target_id: log.target_id || null,
    old_value: log.old_value ? JSON.stringify(log.old_value) : null,
    new_value: log.new_value ? JSON.stringify(log.new_value) : null,
    ip_address: log.ip_address || null,
    user_agent: log.user_agent || null,
  }));

  try {
    const { error } = await supabase.from('audit_logs').insert(insertData as never);

    if (error) {
      console.error('批量创建审计日志失败:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('批量创建审计日志异常:', err);
    return false;
  }
}
