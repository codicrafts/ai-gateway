'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { showNotification } from '@/store/slices/notificationSlice';
import { validateEmail, validatePassword, generateUUID } from '@/utils/helpers';

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetch(`/api/tables/users?search=${session.user.email}`).then((r) => r.json()).then((res) => {
        if (res.data && res.data.length > 0) {
          const user = res.data[0];
          localStorage.setItem('currentUser', JSON.stringify(user));
          dispatch(setUser(user));
          dispatch(showNotification({ message: '注册成功！正在跳转...' }));
          setTimeout(() => router.push('/dashboard'), 1000);
        }
      }).catch(() => {});
    }
  }, [status, session, dispatch, router]);

  const handleOAuthRegister = async (provider: 'google' | 'github') => {
    setOauthLoading(provider);
    try {
      const result = await signIn(provider, { callbackUrl: '/dashboard', redirect: false });
      if (result?.error) { dispatch(showNotification({ message: 'OAuth 未配置，请使用邮箱注册', type: 'error' })); setOauthLoading(null); }
      else if (result?.url) { router.push(result.url); }
    } catch { dispatch(showNotification({ message: 'OAuth 未配置，请使用邮箱注册', type: 'error' })); setOauthLoading(null); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) { dispatch(showNotification({ message: '请输入有效的邮箱地址', type: 'error' })); return; }
    if (password !== confirmPassword) { dispatch(showNotification({ message: '两次输入的密码不一致', type: 'error' })); return; }
    if (!validatePassword(password)) { dispatch(showNotification({ message: '密码至少需要8个字符', type: 'error' })); return; }

    setLoading(true);
    try {
      const existing = await fetch(`/api/tables/users?search=${email}`);
      const existingData = await existing.json();
      if (existingData.data && existingData.data.length > 0) { dispatch(showNotification({ message: '该邮箱已被注册', type: 'error' })); setLoading(false); return; }

      const newUser = { id: generateUUID(), username, email, password: btoa(password), balance: 5.00, created_at: new Date().toISOString() };
      const response = await fetch('/api/tables/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });

      if (response.ok) {
        const userData = await response.json();
        dispatch(showNotification({ message: '注册成功！正在跳转...' }));
        localStorage.setItem('currentUser', JSON.stringify(userData));
        dispatch(setUser(userData));
        setTimeout(() => router.push('/dashboard'), 1500);
      } else { throw new Error('注册失败'); }
    } catch { dispatch(showNotification({ message: '注册失败，请稍后重试', type: 'error' })); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="bg-dark/80 border border-border rounded-2xl p-6 sm:p-10 lg:p-12 max-w-[450px] w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-primary mb-3 sm:mb-4"><i className="fas fa-brain" /><span>AI Gateway</span></div>
          <h1 className="text-2xl sm:text-3xl mb-2">创建账户</h1>
          <p className="text-text-secondary text-sm sm:text-base">开始使用最好的AI API平台</p>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button onClick={() => handleOAuthRegister('google')} disabled={!!oauthLoading} className="flex items-center justify-center gap-2 py-2.5 sm:py-3 border border-border rounded-lg bg-transparent text-text-primary cursor-pointer transition-all hover:bg-dark-light hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
            {oauthLoading === 'google' ? <i className="fas fa-spinner fa-spin" /> : <i className="fab fa-google" />}<span>使用 Google 注册</span>
          </button>
          <button onClick={() => handleOAuthRegister('github')} disabled={!!oauthLoading} className="flex items-center justify-center gap-2 py-2.5 sm:py-3 border border-border rounded-lg bg-transparent text-text-primary cursor-pointer transition-all hover:bg-dark-light hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base">
            {oauthLoading === 'github' ? <i className="fas fa-spinner fa-spin" /> : <i className="fab fa-github" />}<span>使用 GitHub 注册</span>
          </button>
        </div>

        <div className="flex items-center text-center my-4 sm:my-6 text-text-secondary text-sm"><div className="flex-1 border-b border-border" /><span className="px-3 sm:px-4">或使用邮箱注册</span><div className="flex-1 border-b border-border" /></div>

        <form onSubmit={handleRegister}>
          <div className="mb-4 sm:mb-6"><label className="block mb-2 font-medium text-sm sm:text-base">用户名</label><input type="text" className="form-control text-sm sm:text-base" required placeholder="请输入用户名" minLength={3} value={username} onChange={(e) => setUsername(e.target.value)} /></div>
          <div className="mb-4 sm:mb-6"><label className="block mb-2 font-medium text-sm sm:text-base">邮箱地址</label><input type="email" className="form-control text-sm sm:text-base" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="mb-4 sm:mb-6"><label className="block mb-2 font-medium text-sm sm:text-base">密码</label><input type="password" className="form-control text-sm sm:text-base" required placeholder="至少8个字符" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="mb-4 sm:mb-6"><label className="block mb-2 font-medium text-sm sm:text-base">确认密码</label><input type="password" className="form-control text-sm sm:text-base" required placeholder="再次输入密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
          <button type="submit" className="btn-primary w-full justify-center mt-2 sm:mt-4 text-sm sm:text-base" disabled={loading}>{loading ? <><i className="fas fa-spinner fa-spin" /> 加载中...</> : <><i className="fas fa-user-plus" /> 注册账户</>}</button>
        </form>

        <div className="text-center mt-4 sm:mt-6 text-text-secondary text-sm sm:text-base">已有账户？ <Link href="/login" className="text-primary hover:underline">立即登录</Link></div>
      </div>
    </div>
  );
}
