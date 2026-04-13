import { BaseEmailLayout } from '@/components/emails/BaseEmailLayout';

type AccountVerificationEmailProps = {
  code: string;
};

export function AccountVerificationEmail({ code }: AccountVerificationEmailProps) {
  return (
    <BaseEmailLayout title="登录验证码" preview={`你的验证码是 ${code}`}>
      <p style={{ margin: '0 0 12px' }}>你正在使用邮箱验证码登录 MeshRouter。</p>
      <p
        style={{
          margin: '24px 0',
          padding: '20px 24px',
          borderRadius: '18px',
          backgroundColor: '#fcf5ef',
          border: '1px solid #efd8c8',
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '6px',
          textAlign: 'center',
        }}
      >
        {code}
      </p>
      <p style={{ margin: 0 }}>验证码 10 分钟内有效。</p>
    </BaseEmailLayout>
  );
}
