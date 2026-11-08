'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, LogIn, Mail, UserPlus } from 'lucide-react';
import { toast } from '@/lib/notify';
import {
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import AppModal from '@/components/AppModal';

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
};

export default function AuthModal({ open, onClose, initialMode = 'signin' }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setForgotMode(false);
      setAcceptedTerms(false);
    } else {
      setAwaitingEmailConfirm(false);
      setConfirmEmail('');
      setBusy(false);
      setForgotMode(false);
      setAcceptedTerms(false);
    }
  }, [open, initialMode]);

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
    if (!acceptedTerms) {
      toast.error('Please confirm you have read the Terms and Conditions.');
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter your account email address.');
      return;
    }
    setBusy(true);
    const result = await requestPasswordReset(email.trim());
    setBusy(false);
    if (result.ok) {
      toast.success(result.message);
      setForgotMode(false);
    } else {
      toast.error(result.message);
    }
  };

  const title = awaitingEmailConfirm
    ? 'Confirm your email'
    : forgotMode
      ? 'Forgot password'
      : mode === 'signup'
        ? 'Create account'
        : 'Logger In';

  const subtitle = awaitingEmailConfirm
    ? 'One more step to open your workshop.'
    : forgotMode
      ? 'Enter your email and we will send a reset link.'
      : mode === 'signup'
        ? "Your workshop, finally under control. No cost. No fuss, no commitment. Just your email and you're in!"
        : 'Use your email to open your workshop.';

  return (
    <AppModal open={open} onClose={onClose} title={title} subtitle={subtitle} size="md">
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
            Didn&apos;t get it? Check spam/junk. Each email can only register one Logger account. If
            this address is already registered, Logger In instead.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Got it
          </button>
        </div>
      ) : forgotMode ? (
        <form onSubmit={(e) => void handleForgotPassword(e)} className="space-y-3">
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
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2.5 disabled:opacity-40 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5" /> Send reset link
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setForgotMode(false)}
            className="w-full text-xs font-bold text-gray-400 hover:text-orange-400 cursor-pointer bg-transparent border-0 p-0"
          >
            Back to Logger In
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            if (mode === 'signup') {
              e.preventDefault();
              void handleSignUp();
            } else {
              void handleSignIn(e);
            }
          }}
          className="space-y-3"
        >
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
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="Password (min 6)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {mode === 'signin' ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setForgotMode(true)}
                className="text-[11px] font-bold text-orange-400 hover:text-orange-300 cursor-pointer bg-transparent border-0 p-0"
              >
                Forgot password?
              </button>
            </div>
          ) : (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-600 bg-[#121417] text-orange-600 focus:ring-orange-500"
              />
              <span className="text-[11px] leading-relaxed text-gray-400">
                I have read and agree to the{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-orange-400 hover:text-orange-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-orange-400 hover:text-orange-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                setMode('signin');
                void handleSignIn(e);
              }}
              className={`px-4 py-2.5 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'signin'
                  ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Logger In
            </button>
            <button
              type="button"
              disabled={busy || (mode === 'signup' && !acceptedTerms)}
              onClick={() => {
                setMode('signup');
                if (mode === 'signup') void handleSignUp();
              }}
              className={`px-4 py-2.5 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'signup'
                  ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Create account
            </button>
          </div>
        </form>
      )}
    </AppModal>
  );
}
