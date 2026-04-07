/**
 * 团队管理 API
 * 
 * GET /api/teams - 获取用户所属团队列表
 * POST /api/teams - 创建新团队
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { listTeamsForUser } from '@/services/team/team-query.service';
import {
  createTeamWithOwner,
  validateTeamBrandColor,
  validateTeamName,
  validateTeamSlug,
  validateTeamWebsite,
} from '@/services/team/team-mutation.service';
import { fail, ok } from '@/server/api/responses';
import {
  ErrorCode,
  type TeamListResponse,
  type CreateTeamRequest,
  type CreateTeamResponse,
} from '@ai-gateway/shared-types/team';

/**
 * GET /api/teams
 * 获取用户所属团队列表
 * 
 * 查询参数：
 * - page: 页码，默认 1
 * - limit: 每页数量，默认 20
 * 
 * 返回：TeamListResponse（包含 member_count 和 user_role）
 * 按加入时间倒序排列
 */
export async function GET(request: NextRequest): Promise<NextResponse<TeamListResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('请先登录', 401, { code: ErrorCode.UNAUTHORIZED });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const result = await listTeamsForUser(user.id, { page, limit });
    return ok(result);
  } catch (error) {
    console.error('获取团队列表异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500, {
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}

/**
 * POST /api/teams
 * 创建新团队
 * 
 * 请求体：CreateTeamRequest（name 必填，description/logo 可选）
 * 验证：name 长度 2-100 字符
 * 自动创建 team_members 记录，设置创建者为 Owner
 * 记录审计日志（team.create）
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateTeamResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail('请先登录', 401, { code: ErrorCode.UNAUTHORIZED });
    }

    let body: CreateTeamRequest;
    try {
      body = await request.json();
    } catch {
      return fail('请求体格式错误', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const nameError = validateTeamName(body.name, true);
    if (nameError) {
      return fail(nameError, 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const slugError = validateTeamSlug(body.slug);
    if (slugError) {
      return fail(slugError, 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const websiteError = validateTeamWebsite(body.website);
    if (websiteError) {
      return fail(websiteError, 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const brandColorError = validateTeamBrandColor(body.brand_color);
    if (brandColorError) {
      return fail(brandColorError, 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const team = await createTeamWithOwner({
      userId: user.id,
      request: body,
      clientInfo: getClientInfo(request),
    });

    return ok(team, { status: 201 });
  } catch (error) {
    console.error('创建团队异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500, {
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}
