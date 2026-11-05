'use client';

import React, { useEffect, useState } from 'react';
import { LogIn, Mail, UserPlus } from 'lucide-react';
import { toast } from '@/lib/notify';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import AppModal from '@/components/AppModal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AuthModal({ open, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  useEffect(() => {
    if (!open) {
      setAwaitingEmailConfirm(false);
      setConfirmEmail('');
      setBusy(false);
    }
  }, [open]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Enter email and password.');
      return;
    }
    setBusy(true);
    const result = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (result.ok) {
      toast.success(result.message);
      setPassword('');
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error('Use a valid email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    const result = await signUpWithEmail(email.trim().toLowerCase(), password);
    setBusy(false);
    if (result.ok) {
      setPassword('');
      // Email confirmation required (no session yet).
      if (!result.message.toLowerCase().includes('signed in')) {
        setConfirmEmail(email.trim().toLowerCase());
        setAwaitingEmailConfirm(true);
        return;
      }
      toast.success(result.message);
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={awaitingEmailConfirm ? 'Confirm your email' : 'Sign in'}
      subtitle={
        awaitingEmailConfirm
          ? 'One more step to open your workshop.'
          : 'Use your email to open your workshop.'
      }
      size="md"
    >
      {!isSupabaseConfigured() ? (
        <p className="text-xs text-orange-400">Supabase is not configured in this environment.</p>
      ) : awaitingEmailConfirm ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-orange-100 flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" /> Check your email
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="font-mono text-white">{confirmEmail}</span>. Open that message and
              confirm your address before signing in.
            </p>
          </div>
          <p className="text-[11px] text-gray-500">
            Didn&apos;t get it? Check spam/junk. Each email can only register one Logger
            account. If this address is already registered, sign in instead.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Got it
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignIn} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password (min 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSignUp}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" /> Create account
            </button>
          </div>
        </form>
      )}
    </AppModal>
  );
}
