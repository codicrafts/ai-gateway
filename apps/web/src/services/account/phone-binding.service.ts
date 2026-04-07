import { bindPhoneForUser, getAppUserById } from '@/services/account/app-user.service';
import { issuePhoneVerificationCode, normalizePhoneForAuth, verifyPhoneVerificationCode } from '@/services/account/phone-auth.service';

export async function requestPhoneBindingCode(userId: string, phone: string): Promise<{ expiresAt: string; debugCode?: string }> {
  const user = await getAppUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const normalizedPhone = normalizePhoneForAuth(phone);
  if (user.phone === normalizedPhone && user.phone_verified_at) {
    throw new Error('该手机号已经完成绑定');
  }

  return issuePhoneVerificationCode(normalizedPhone, 'bind_phone', {
    metadata: {
      user_id: userId,
    },
  });
}

export async function confirmPhoneBindingCode(params: {
  userId: string;
  phone: string;
  code: string;
}) {
  const normalizedPhone = normalizePhoneForAuth(params.phone);
  await verifyPhoneVerificationCode(normalizedPhone, 'bind_phone', params.code, {
    user_id: params.userId,
  });

  return bindPhoneForUser({
    userId: params.userId,
    phone: normalizedPhone,
  });
}
