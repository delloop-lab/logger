'use client';

import React, { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
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
    const result = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (result.ok) {
      toast.success(result.message);
      setPassword('');
      if (result.message.includes('Signed in') || result.message.includes('signed in')) {
        onClose();
      }
    } else {
      toast.error(result.message);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Sign in"
      subtitle="Use your email to open your workshop."
      size="md"
    >
      {!isSupabaseConfigured() ? (
        <p className="text-xs text-orange-400">Supabase is not configured in this environment.</p>
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
