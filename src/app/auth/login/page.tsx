'use client';

import { useState } from 'react';
import AuthShell from '@/components/AuthShell';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Invalid credentials'); setLoading(false); return; }
      const token = data.data?.token;
      const user = data.data?.user;
      if (!token) { setError('No token received'); setLoading(false); return; }
      localStorage.setItem('smartvan_token', token);
      localStorage.setItem('smartvan_user', JSON.stringify(user ?? {}));
      document.cookie = `smartvan_token=${token}; path=/; max-age=${30*24*60*60}; SameSite=Lax`;
      window.location.href = user?.role === 'superadmin' ? '/super-admin' : '/dashboard';
    } catch (e) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge="Admin Portal"
      title="Welcome back"
      subtitle="Sign in to your admin dashboard"
      footer={<>
            <p>SmartVan Admin · {new Date().getFullYear()}</p>
      </>}
      alt={{ prefix: 'Staff member?', label: 'Sign in here', href: '/staff-login' }}
    >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleLogin()} placeholder="admin@school.com" className="w-full px-4 py-3 border border-white/25 rounded-xl text-sm text-white placeholder:text-white/40 bg-transparent focus:outline-none focus:border-[#FEC610] focus:ring-1 focus:ring-[#FEC610] transition" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-white/80">Password</label>
                <a href="/auth/forgot-password" className="text-xs text-[#FEC610] font-medium hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input type={showPassword?'text':'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleLogin()} placeholder="••••••••" className="w-full px-4 py-3 pr-11 border border-white/25 rounded-xl text-sm text-white placeholder:text-white/40 bg-transparent focus:outline-none focus:border-[#FEC610] focus:ring-1 focus:ring-[#FEC610] transition" />
                <button type="button" onClick={() => setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            {error && <div className="flex items-center gap-2 p-3 bg-red-500/15 text-red-200 border border-red-400/30 rounded-xl text-sm"><AlertCircle size={16}/>{error}</div>}
            <button onClick={handleLogin} disabled={loading} className="w-full py-3 bg-[#FEC610] text-[#0B1B3F] font-semibold rounded-xl hover:bg-[#f2b900] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={18} className="animate-spin"/>Signing in…</> : 'Sign In'}
            </button>
          </div>
    </AuthShell>
  );
}
