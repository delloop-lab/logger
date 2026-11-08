'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import AppModal from '@/components/AppModal';
import { toast } from '@/lib/notify';
import { updatePassword } from '@/lib/supabase/auth';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Shown when the user lands from a Supabase password-recovery email (/app?reset=1).
 */
export default function PasswordResetModal() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let wantsReset = false;
    try {
      wantsReset = new URLSearchParams(window.location.search).get('reset') === '1';
    } catch {
      wantsReset = false;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || (wantsReset && event === 'SIGNED_IN')) {
        setOpen(true);
      }
    });

    if (wantsReset) {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) setOpen(true);
      })();
    }

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const clearResetParam = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      params.delete('reset');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.ok) {
      toast.success(result.message);
      setOpen(false);
      clearResetParam();
      setPassword('');
      setConfirm('');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={() => {
        setOpen(false);
        clearResetParam();
      }}
      title="Set a new password"
      subtitle="Choose a new password for your Logger account."
      size="md"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">New password</label>
          <input
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6)"
            className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Confirm password</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-2.5 disabled:opacity-40 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-2"
        >
          <KeyRound className="w-3.5 h-3.5" /> Update password
        </button>
      </form>
    </AppModal>
  );
}
