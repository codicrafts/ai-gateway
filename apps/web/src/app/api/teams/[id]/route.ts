/**
 * 团队详情、更新、删除 API
 * 
 * GET /api/teams/[id] - 获取团队详情
 * PUT /api/teams/[id] - 更新团队信息
 * DELETE /api/teams/[id] - 删除团队
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { getClientInfo } from '@/lib/auditLog';
import { getTeamDetailById } from '@/services/team/team-query.service';
import {
  deleteTeamById,
  updateTeamProfile,
  validateTeamBrandColor,
  validateTeamName,
  validateTeamSlug,
  validateTeamWebsite,
} from '@/services/team/team-mutation.service';
import { fail, ok } from '@/server/api/responses';
import {
  ErrorCode,
  type TeamDetailResponse,
  type UpdateTeamRequest,
  type UpdateTeamResponse,
  type DeleteTeamResponse,
} from '@ai-gateway/shared-types/team';

/**
 * GET /api/teams/[id]
 * 获取团队详情
 * 
 * 验证：用户必须是团队成员
 * 返回：TeamDetailResponse（包含成员列表）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<TeamDetailResponse>> {
  try {
    const { id: teamId } = await params;

    const authResult = await verifyTeamAccess(teamId);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    const teamDetail = await getTeamDetailById(teamId);
    if (!teamDetail) {
      return fail('团队不存在', 404, { code: ErrorCode.NOT_FOUND });
    }

    return ok(teamDetail);
  } catch (error) {
    console.error('获取团队详情异常:', error);
    return fail(error instanceof Error ? error.message : '服务器内部错误', 500, {
      code: ErrorCode.INTERNAL_ERROR,
    });
  }
}

/**
 * PUT /api/teams/[id]
 * 更新团队信息
 * 
 * 验证：用户必须是 Owner 或 Admin
 * 请求体：UpdateTeamRequest（name/description/logo）
 * 验证：name 长度 2-100 字符（如果提供）
 * 记录审计日志（team.update）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateTeamResponse>> {
  try {
    const { id: teamId } = await params;

    const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    let body: UpdateTeamRequest;
    try {
      body = await request.json();
    } catch {
      return fail('请求体格式错误', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const nameError = validateTeamName(body.name);
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

    const hasName = body.name !== undefined;
    const hasDescription = body.description !== undefined;
    const hasLogo = body.logo !== undefined;
    const hasSlug = body.slug !== undefined;
    const hasWebsite = body.website !== undefined;
    const hasBrandColor = body.brand_color !== undefined;

    if (!hasName && !hasDescription && !hasLogo && !hasSlug && !hasWebsite && !hasBrandColor) {
      return fail('没有提供更新内容', 400, { code: ErrorCode.VALIDATION_ERROR });
    }

    const team = await updateTeamProfile({
      teamId,
      userId: authResult.user!.id,
      request: body,
      clientInfo: getClientInfo(request),
    });

    return ok(team);
  } catch (error) {
    console.error('更新团队异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    if (message === '团队不存在') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}

/**
 * DELETE /api/teams/[id]
 * 删除团队
 * 
 * 验证：用户必须是 Owner
 * 级联删除：team_members 记录（数据库外键 ON DELETE CASCADE）
 * 记录审计日志（team.delete）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteTeamResponse>> {
  try {
    const { id: teamId } = await params;

    const authResult = await verifyTeamAccess(teamId, ['owner']);
    if (!authResult.success) {
      return fail(authResult.error || '权限验证失败', authResult.code || 403, {
        code: authResult.code === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.FORBIDDEN,
      });
    }

    const result = await deleteTeamById({
      teamId,
      userId: authResult.user!.id,
      clientInfo: getClientInfo(request),
    });

    return ok(result);
  } catch (error) {
    console.error('删除团队异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    if (message === '团队不存在') {
      return fail(message, 404, { code: ErrorCode.NOT_FOUND });
    }

    return fail(message, 500, { code: ErrorCode.INTERNAL_ERROR });
  }
}
