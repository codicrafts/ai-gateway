'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { showNotification } from '@/store/slices/notificationSlice';
import { validateEmail } from '@/utils/helpers';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetch(`/api/tables/users?search=${session.user.email}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data && res.data.length > 0) {
            const user = res.data[0];
            localStorage.setItem('currentUser', JSON.stringify(user));
            dispatch(setUser(user));
            dispatch(showNotification({ message: '登录成功！正在跳转...' }));
            setTimeout(() => router.push('/dashboard'), 1000);
          }
        })
        .catch(() => {});
    }
  }, [status, session, dispatch, router]);

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    try {
      const result = await signIn(provider, { callbackUrl: '/dashboard', redirect: false });
      if (result?.error) {
        dispatch(showNotification({ message: 'OAuth 未配置，请使用邮箱登录', type: 'error' }));
        setOauthLoading(null);
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch {
      dispatch(showNotification({ message: 'OAuth 未配置，请使用邮箱登录', type: 'error' }));
      setOauthLoading(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      dispatch(showNotification({ message: '请输入有效的邮箱地址', type: 'error' }));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/tables/users?search=${email}`);
      const result = await response.json();
      if (!result.data || result.data.length === 0) {
        dispatch(showNotification({ message: '邮箱或密码错误', type: 'error' }));
        setLoading(false);
        return;
      }
      const user = result.data[0];
      if (user.password && atob(user.password) !== password) {
        dispatch(showNotification({ message: '邮箱或密码错误', type: 'error' }));
        setLoading(false);
        return;
      }
      if (!user.password && user.provider) {
        dispatch(showNotification({ message: `此账户使用 ${user.provider} 登录，请点击上方按钮`, type: 'error' }));
        setLoading(false);
        return;
      }
      dispatch(showNotification({ message: '登录成功！正在跳转...' }));
      localStorage.setItem('currentUser', JSON.stringify(user));
      if (rememberMe) localStorage.setItem('rememberMe', 'true');
      dispatch(setUser(user));
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      dispatch(showNotification({ message: '登录失败，请稍后重试', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-dark/80 border border-border rounded-2xl p-12 max-w-[450px] w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 text-3xl font-bold text-primary mb-4">
            <i className="fas fa-brain" /><span>AI Gateway</span>
          </div>
          <h1 className="text-3xl mb-2">欢迎回来</h1>
          <p className="text-text-secondary">登录您的账户继续使用</p>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={!!oauthLoading}
            className="flex items-center justify-center gap-2 py-3 border border-border rounded-lg bg-transparent text-text-primary cursor-pointer transition-all hover:bg-dark-light hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'google' ? <i className="fas fa-spinner fa-spin" /> : <i className="fab fa-google" />}
            <span>使用 Google 登录</span>
          </button>
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={!!oauthLoading}
            className="flex items-center justify-center gap-2 py-3 border border-border rounded-lg bg-transparent text-text-primary cursor-pointer transition-all hover:bg-dark-light hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'github' ? <i className="fas fa-spinner fa-spin" /> : <i className="fab fa-github" />}
            <span>使用 GitHub 登录</span>
          </button>
        </div>

        <div className="flex items-center text-center my-6 text-text-secondary">
          <div className="flex-1 border-b border-border" />
          <span className="px-4">或使用邮箱登录</span>
          <div className="flex-1 border-b border-border" />
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label className="block mb-2 font-medium" htmlFor="email">邮箱地址</label>
            <input id="email" type="email" className="form-control" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-6">
            <label className="block mb-2 font-medium" htmlFor="password">密码</label>
            <input id="password" type="password" className="form-control" required placeholder="请输入密码" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex justify-between items-center mb-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              <span>记住我</span>
            </label>
            <a href="#" className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); dispatch(showNotification({ message: '密码找回功能正在开发中', type: 'error' })); }}>忘记密码？</a>
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin" /> 加载中...</> : <><i className="fas fa-sign-in-alt" /> 登录</>}
          </button>
        </form>

        <div className="text-center mt-6 text-text-secondary">
          还没有账户？ <Link href="/register" className="text-primary hover:underline">立即注册</Link>
        </div>
      </div>
    </div>
  );
}
