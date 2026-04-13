import { BaseEmailLayout } from '@/components/emails/BaseEmailLayout';
import { EmailButton } from '@/components/emails/EmailButton';

type PasswordResetEmailProps = {
  resetUrl: string;
  expiryText: string;
};

export function PasswordResetEmail({ resetUrl, expiryText }: PasswordResetEmailProps) {
  return (
    <BaseEmailLayout title="重置你的密码" preview="打开链接完成密码重置">
      <p style={{ margin: '0 0 12px' }}>我们收到了你的密码重置请求。如果这是你本人操作，请点击下面的按钮继续。</p>
      <p style={{ margin: '20px 0' }}>
        <EmailButton href={resetUrl}>打开重置页面</EmailButton>
      </p>
      <p style={{ margin: '0 0 12px' }}>{expiryText}</p>
      <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: '14px' }}>如果按钮无法打开，请使用下面的链接：</p>
      <p style={{ margin: 0, color: '#374151', fontSize: '14px', wordBreak: 'break-all' }}>{resetUrl}</p>
    </BaseEmailLayout>
  );
}
