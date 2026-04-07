'use client';

import Navbar from '@/components/Navbar';
import { useTranslation } from '@/hooks/useTranslation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLoading() {
  const t = useTranslation();
  const pathname = usePathname() || '/dashboard/overview';
  const isZh = t.nav.home === '首页';
  const tr = (zh: string, en: string) => (isZh ? zh : en);
  
  const tabs = [
    { id: 'overview', label: tr('概览', 'Overview'), icon: 'fa-chart-pie', href: '/dashboard/overview' },
    { id: 'api-keys', label: tr('API 密钥', 'API Keys'), icon: 'fa-key', href: '/dashboard/api-keys' },
    { id: 'usage', label: tr('用量统计', 'Usage'), icon: 'fa-chart-line', href: '/dashboard/usage' },
    { id: 'billing', label: tr('账单', 'Billing'), icon: 'fa-receipt', href: '/dashboard/billing' },
    { id: 'team', label: tr('团队管理', 'Team'), icon: 'fa-users', href: '/dashboard/team' },
    { id: 'profile', label: tr('个人中心', 'Profile'), icon: 'fa-user', href: '/dashboard/profile' }
  ];

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <div className="absolute top-0 inset-x-0 h-[500px] pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60"></div>
      <Navbar variant="dashboard" />
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-5 py-4 sm:py-8 flex-1">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:hidden scrollbar-hide">
              {tabs.map((tab) => {
                const isActive = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all text-sm sm:text-base ${
                      isActive ? 'bg-primary text-white' : 'bg-white/60 text-text-secondary hover:text-text-primary hover:bg-white'
                    }`}
                  >
                    <i className={`fas ${tab.icon} mr-1 sm:mr-2`} />
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            <div className="hidden lg:block editorial-panel p-4">
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const isActive = pathname.startsWith(tab.href);
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-white shadow-glow'
                          : 'bg-white/60 text-text-secondary hover:bg-white hover:text-text-primary'
                      }`}
                    >
                      <i className={`fas ${tab.icon} w-4 text-center`} />
                      <span>{tab.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex h-[60vh] flex-col items-center justify-center text-text-secondary bg-white border border-border rounded-[2rem] shadow-sm">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl text-primary animate-pulse shadow-sm">
                <i className="fas fa-spinner fa-spin" />
              </div>
              <div className="text-lg font-bold tracking-tight text-text-primary mb-2">{tr('正在载入...', 'Loading...')}</div>
              <p className="text-sm text-text-secondary">{tr('请稍候，正在获取最新数据', 'Please wait while we fetch the latest data.')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
