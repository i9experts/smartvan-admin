'use client';

import { useState } from 'react';
import AuthShell from '@/components/AuthShell';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { staffApi } from '@/lib/api';

// Maps each permission to the first page a staff member with that
// permission should land on after logging in.
const PERMISSION_LANDING_PAGE: Record<string, string> = {
  view_dashboard: '/dashboard',
  manage_students: '/students',
  manage_fleet: '/vans',
  manage_parents: '/parents',
  manage_routes: '/routes',
  view_alerts: '/alerts',
  manage_complaints: '/complaints',
  manage_fees: '/fees',
  view_fleet_health: '/fleet',
  view_attendance: '/attendance',
  view_analytics: '/analytics',
};

export default function StaffLoginPage() {
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
      const res = await staffApi.login(email, password);
      const token = res.data?.data?.token;
      const user = res.data?.data?.user;
      if (!token) { setError('No token received'); setLoading(false); return; }

      localStorage.setItem('smartvan_token', token);
      localStorage.setItem('smartvan_user', JSON.stringify(user ?? {}));

      const permissions: string[] = user?.permissions ?? [];
      const landing = permissions
        .map((p) => PERMISSION_LANDING_PAGE[p])
        .find((page) => !!page);

      window.location.href = landing ?? '/no-access';
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Invalid credentials');
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge="Staff Portal"
      title="Staff Login"
      subtitle="Sign in to your SmartVan staff account"
      footer={<>
            <p>SmartVan Staff Portal · {new Date().getFullYear()}</p>
      </>}
      alt={{ prefix: 'School admin?', label: 'Sign in here', href: '/auth/login' }}
    >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="you@yourschool.com"
                autoComplete="off"
                className="w-full px-4 py-3 border border-white/25 rounded-xl text-sm text-white placeholder:text-white/40 bg-transparent focus:outline-none focus:border-[#FEC610] focus:ring-1 focus:ring-[#FEC610] transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 border border-white/25 rounded-xl text-sm text-white placeholder:text-white/40 bg-transparent focus:outline-none focus:border-[#FEC610] focus:ring-1 focus:ring-[#FEC610] transition"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/15 text-red-200 border border-red-400/30 rounded-xl text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 bg-[#FEC610] text-[#0B1B3F] font-semibold rounded-xl hover:bg-[#f2b900] transition disabled:opacity-60 flex items-center justify-center gap-2"
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
