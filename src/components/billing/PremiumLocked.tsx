'use client';

import { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface PremiumLockedProps {
  featureLabel: string;
  description: string;
}

/** Shown in place of a gated page's real content — matches the backend's
 * FEATURE_LOCKED error, which is the actual enforcement; this is just the
 * friendly front door to it (a client could still be blocked server-side
 * even if this component were somehow bypassed). */
export function PremiumLocked({ featureLabel, description }: PremiumLockedProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Billing is deliberately never delegable to school_staff — only the
  // school's own admin account can start a Premium checkout.
  const canUpgrade = user?.role === 'admin';

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/billing/premium/create-checkout', {});
      const url = res.data?.sessionUrl;
      if (url) {
        window.location.href = url;
      } else {
        setError('Could not start checkout. Please try again.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-[#FEC610]/15 flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-[#1B3B69]" />
        </div>
        <h2 className="text-lg font-bold text-[#1B3B69] mb-2">{featureLabel} is a Premium feature</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {canUpgrade ? (
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1B3B69] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] transition-colors disabled:opacity-50"
          >
            <Sparkles size={15} /> {loading ? 'Starting checkout…' : 'Unlock Premium'}
          </button>
        ) : (
          <div className="bg-gray-50 border border-gray-200 text-gray-500 text-sm rounded-xl px-4 py-3">
            Ask your school's admin to upgrade to Premium to unlock this.
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          Premium unlocks Analytics, AI Route Optimization, Safety Checklist Compliance,
          Ratings Log, Complaints &amp; Reports, and Fee Management.
        </p>
      </div>
    </div>
  );
}
