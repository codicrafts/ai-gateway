'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
      <div className="max-w-[1200px] mx-auto px-4 sm:px-5">
        <div className="flex justify-between items-center py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-primary no-underline">
            <i className="fas fa-brain text-2xl sm:text-3xl" />
            <span className="hidden xs:inline">AI Gateway</span>
            <span className="xs:hidden">AIG</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex gap-6 xl:gap-8">
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

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex gap-3 items-center">
            {variant === 'dashboard' && isLoggedIn ? (
              <>
                <span className="text-text-secondary mr-2 hidden lg:inline text-sm">{currentUser?.email}</span>
                <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                  <i className="fas fa-sign-out-alt" /> <span className="hidden sm:inline">退出</span>
                </button>
              </>
            ) : isLoggedIn ? (
              <>
                <Link href="/dashboard" className="btn-secondary no-underline text-sm py-2 px-4">
                  <i className="fas fa-tachometer-alt" /> <span className="hidden sm:inline">控制台</span>
                </Link>
                <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                  <i className="fas fa-sign-out-alt" /> <span className="hidden sm:inline">退出</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary no-underline text-sm py-2 px-4">登录</Link>
                <Link href="/register" className="btn-primary no-underline text-sm py-2 px-4">注册</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`} />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border py-4 animate-slide-down">
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-3 px-4 rounded-lg transition-colors no-underline ${
                    pathname === link.href ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-dark-light hover:text-text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border mt-2 pt-4 flex flex-col gap-2">
                {variant === 'dashboard' && isLoggedIn ? (
                  <>
                    <span className="text-text-secondary px-4 text-sm">{currentUser?.email}</span>
                    <button onClick={handleLogout} className="btn-secondary justify-center">
                      <i className="fas fa-sign-out-alt" /> 退出
                    </button>
                  </>
                ) : isLoggedIn ? (
                  <>
                    <Link href="/dashboard" className="btn-secondary no-underline justify-center">
                      <i className="fas fa-tachometer-alt" /> 控制台
                    </Link>
                    <button onClick={handleLogout} className="btn-secondary justify-center">
                      <i className="fas fa-sign-out-alt" /> 退出
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="btn-secondary no-underline justify-center">登录</Link>
                    <Link href="/register" className="btn-primary no-underline justify-center">注册</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
