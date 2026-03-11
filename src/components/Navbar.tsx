'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { loadUserFromStorage, logout } from '@/store/slices/authSlice';

interface NavbarProps {
  variant?: 'default' | 'dashboard';
}

export default function Navbar({ variant = 'default' }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoggedIn, currentUser } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
  };

  const defaultLinks = [
    { href: '/', label: '首页' },
    { href: '/models', label: '模型市场' },
    { href: '/docs', label: '文档' },
    { href: '/playground', label: 'Playground' },
    { href: '/pricing', label: '定价' },
  ];

  const dashboardLinks = [
    { href: '/', label: '首页' },
    { href: '/dashboard', label: '控制台' },
    { href: '/models', label: '模型市场' },
    { href: '/docs', label: '文档' },
    { href: '/playground', label: 'Playground' },
  ];

  const links = variant === 'dashboard' ? dashboardLinks : defaultLinks;

  return (
    <nav className="bg-dark/80 backdrop-blur-md border-b border-border sticky top-0 z-[1000]">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="flex justify-between items-center py-4">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold text-primary no-underline">
            <i className="fas fa-brain text-3xl" />
            <span>AI Gateway</span>
          </Link>
          <div className="hidden md:flex gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-medium transition-colors relative no-underline ${
                  pathname === link.href ? 'text-text-primary after:content-[""] after:absolute after:-bottom-2 after:left-0 after:right-0 after:h-0.5 after:bg-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-4 items-center">
            {variant === 'dashboard' && isLoggedIn ? (
              <>
                <span className="text-text-secondary mr-4 hidden sm:inline">{currentUser?.email}</span>
                <button onClick={handleLogout} className="btn-secondary">
                  <i className="fas fa-sign-out-alt" /> 退出
                </button>
              </>
            ) : isLoggedIn ? (
              <>
                <Link href="/dashboard" className="btn-secondary no-underline">
                  <i className="fas fa-tachometer-alt" /> 控制台
                </Link>
                <button onClick={handleLogout} className="btn-secondary">
                  <i className="fas fa-sign-out-alt" /> 退出
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary no-underline">登录</Link>
                <Link href="/register" className="btn-primary no-underline">注册</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
