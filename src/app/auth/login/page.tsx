'use client';

import { useState } from 'react';
import { Eye, EyeOff, Bus, AlertCircle, Loader2 } from 'lucide-react';

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
      const res = await fetch('/backend/Admin/login', {
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
      window.location.href = '/dashboard';
    } catch (e) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden lg:flex lg:w-1/2 bg-[#1B2B6B] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-[#FFB800] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <Bus size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">SmartVan</h1>
          <p className="text-blue-200 text-lg max-w-sm leading-relaxed">School transport management made simple.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-2">Sign in to your admin dashboard</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleLogin()} placeholder="admin@school.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword?'text':'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleLogin()} placeholder="••••••••" className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
                <button type="button" onClick={() => setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm"><AlertCircle size={16}/>{error}</div>}
            <button onClick={handleLogin} disabled={loading} className="w-full py-3 bg-[#1B2B6B] text-white font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={18} className="animate-spin"/>Signing in…</> : 'Sign In'}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">SmartVan Admin · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
