import { NextRequest } from 'next/server';
import { verifyTeamAccess } from '@/lib/teamAuth';
import { uploadTeamLogo } from '@/services/team/team-logo.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const authResult = await verifyTeamAccess(teamId, ['owner', 'admin']);
  if (!authResult.success) {
    return fail(authResult.error || '权限验证失败', authResult.code || 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return fail('请上传图片文件', 400);
    }

    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
    if (!allowedTypes.has(file.type)) {
      return fail('仅支持 PNG、JPEG、WEBP 或 SVG 图片', 400);
    }

    const result = await uploadTeamLogo({ teamId, file });
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '上传团队 Logo 失败', 400);
  }
}
