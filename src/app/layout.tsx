import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import AuthProvider from '@/components/AuthProvider';
import Notification from '@/components/Notification';

export const metadata: Metadata = {
  title: 'AI Gateway - 统一的AI模型API平台',
  description: '一个API，访问所有AI模型',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" />
      </head>
      <body>
        <AuthProvider>
          <Providers>
            <Notification />
            {children}
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
