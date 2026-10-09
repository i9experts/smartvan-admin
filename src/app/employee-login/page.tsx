'use client';

import { useState } from 'react';
import AuthShell from '@/components/AuthShell';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { employeeApi } from '@/lib/api';

export default function EmployeeLoginPage() {
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
      const res = await employeeApi.login(email, password);
      const token = res.data?.data?.token;
      const user = res.data?.data?.user;
      if (!token) { setError('No token received'); setLoading(false); return; }
      localStorage.setItem('smartvan_token', token);
      localStorage.setItem('smartvan_user', JSON.stringify(user ?? {}));
      window.location.href = '/employee/tickets';
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Invalid credentials');
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge="Team Portal"
      title="Team Login"
      subtitle="Sign in to your SmartVan team account"
      footer={<>
            <p>SmartVan Team Portal · {new Date().getFullYear()}</p>
      </>}
    >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="you@smartvan.pk"
                autoComplete="off"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30 bg-white text-gray-900"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 bg-[#1B3B69] text-white font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
    </AuthShell>
  );
}
