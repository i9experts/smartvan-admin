'use client';

import { useState } from 'react';
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSendOtp() {
    if (!email) { setError('Enter your email address.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Could not send a reset code. Check the email and try again.'); setLoading(false); return; }
      setStep('reset');
      setLoading(false);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!otp || !newPassword) { setError('Enter the code and a new password.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Could not reset the password. Check the code and try again.'); setLoading(false); return; }
      setDone(true);
      setLoading(false);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <a href="/auth/login" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft size={15} /> Back to login
        </a>

        {done ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={22} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1.5">Password reset</h2>
            <p className="text-sm text-gray-500 mb-6">Your password has been updated. Sign in with your new password.</p>
            <a href="/auth/login" className="inline-block w-full py-3 bg-[#1B3B69] text-white font-semibold rounded-xl hover:bg-[#162356] transition">
              Go to login
            </a>
          </div>
        ) : step === 'email' ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5">Reset your password</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your admin email and we&apos;ll send you a reset code.</p>
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                placeholder="admin@school.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
              />
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm"><AlertCircle size={16} />{error}</div>}
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-3 bg-[#1B3B69] text-white font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" />Sending…</> : 'Send reset code'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-1.5">Enter the code</h2>
            <p className="text-sm text-gray-500 mb-6">We sent a code to <span className="font-medium text-gray-700">{email}</span>. Enter it below with your new password.</p>
            <div className="space-y-4">
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
              />
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm"><AlertCircle size={16} />{error}</div>}
              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full py-3 bg-[#1B3B69] text-white font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" />Resetting…</> : 'Reset password'}
              </button>
              <button onClick={() => { setStep('email'); setError(''); }} className="w-full text-xs text-gray-400 hover:text-gray-600">
                Use a different email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
