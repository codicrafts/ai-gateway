import { updateAppUserProfile } from '@/services/account/app-user.service';
import { getAuthenticatedAppUser } from '@/services/account/session.service';
import { uploadAccountAvatar } from '@/services/account/account-avatar.service';
import { fail, ok } from '@/server/api/responses';

export async function POST(request: Request) {
  const appUser = await getAuthenticatedAppUser();
  if (!appUser) {
    return fail('请先登录', 401);
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

    const result = await uploadAccountAvatar({
      userId: appUser.id,
      file,
    });
    const updatedUser = await updateAppUserProfile(appUser.id, { image: result.image });
    return ok(updatedUser);
  } catch (error) {
    return fail(error instanceof Error ? error.message : '上传头像失败', 400);
  }
}
