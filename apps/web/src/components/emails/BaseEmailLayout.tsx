import type { ReactNode } from 'react';

type BaseEmailLayoutProps = {
  title: string;
  preview?: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function BaseEmailLayout({ title, preview, footer, children }: BaseEmailLayoutProps) {
  return (
    <div
      style={{
        margin: 0,
        padding: '32px 16px',
        backgroundColor: '#f7efe6',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#1f2937',
      }}
    >
      {preview ? (
        <div
          style={{
            display: 'none',
            maxHeight: 0,
            overflow: 'hidden',
            opacity: 0,
          }}
        >
          {preview}
        </div>
      ) : null}

      <div
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          border: '1px solid #e8d6c7',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(109, 68, 33, 0.08)',
        }}
      >
        <div
          style={{
            padding: '24px 28px',
            background:
              'linear-gradient(135deg, rgba(184, 87, 43, 0.12), rgba(252, 248, 243, 0.65))',
            borderBottom: '1px solid #eedccf',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '999px',
              backgroundColor: '#1e130f',
              color: '#fff8f0',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            MeshRouter
          </div>
          <h1
            style={{
              margin: '16px 0 0',
              fontSize: '28px',
              lineHeight: 1.2,
              color: '#201412',
            }}
          >
            {title}
          </h1>
        </div>

        <div style={{ padding: '28px', fontSize: '15px', lineHeight: 1.7 }}>{children}</div>

        <div
          style={{
            padding: '18px 28px 24px',
            borderTop: '1px solid #f1e3d8',
            color: '#6b7280',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          {footer || 'This email was sent by MeshRouter. If you did not expect it, you can safely ignore it.'}
        </div>
      </div>
    </div>
  );
}
