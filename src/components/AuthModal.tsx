'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { toast } from '@/lib/notify';
import {
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import AppModal from '@/components/AppModal';

export type AuthMode = 'signup' | 'login';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Prefer `login` | `signup`. Legacy `signin` is treated as `login`. */
  initialMode?: AuthMode | 'signin';
};

function normalizeMode(mode: AuthMode | 'signin' | undefined): AuthMode {
  if (mode === 'signup') return 'signup';
  return 'login';
}

export default function AuthModal({ open, onClose, initialMode = 'signup' }: Props) {
  const [mode, setMode] = useState<AuthMode>(() => normalizeMode(initialMode));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(normalizeMode(initialMode));
      setForgotMode(false);
      setAcceptedTerms(false);
      setShowPassword(false);
    } else {
      setAwaitingEmailConfirm(false);
      setConfirmEmail('');
      setBusy(false);
      setForgotMode(false);
      setAcceptedTerms(false);
      setShowPassword(false);
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
        ? 'Create your free account'
        : 'Welcome back';

  const subtitle = awaitingEmailConfirm
    ? 'One more step to open your workshop.'
    : forgotMode
      ? 'Enter your email and we will send a reset link.'
      : mode === 'signup'
        ? 'Your workshop, finally under control. No cost, no credit card, no commitment, save your timber inventory and cut lists across devices.'
        : 'Logger in to access your saved timber rack and cut lists.';

  const freeBadge =
    !awaitingEmailConfirm && !forgotMode ? (
      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-400/90 uppercase">
        100% FREE
      </span>
    ) : null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      badge={freeBadge}
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
            Didn&apos;t get it? Check spam/junk. Each email can only register one Logger account. If
            this address is already registered, Logger In instead.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
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
              className="w-full bg-[#181D23] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-3 disabled:opacity-40 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5" /> Send reset link
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setForgotMode(false)}
            className="w-full text-xs font-bold text-gray-400 hover:text-amber-400 cursor-pointer bg-transparent border-0 p-0"
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
              className="w-full bg-[#181D23] border border-gray-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={
                  mode === 'signup' ? 'Create a password (min 6 chars)' : 'Enter your password'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#181D23] border border-gray-700/80 rounded-xl px-3.5 py-2.5 pr-11 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800/80 cursor-pointer bg-transparent border-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'login' ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setForgotMode(true)}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer bg-transparent border-0 p-0"
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
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-600 bg-[#181D23] text-amber-600 focus:ring-amber-500"
              />
              <span className="text-[11px] leading-relaxed text-gray-400">
                I agree to{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#F59E0B] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  T&amp;Cs
                </a>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={busy || (mode === 'signup' && !acceptedTerms)}
            className="w-full py-3 mt-1 disabled:opacity-40 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl cursor-pointer"
          >
            {mode === 'signup' ? 'Create Free Account →' : 'Logger In →'}
          </button>

          <p className="text-center text-xs text-gray-400 pt-1">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMode('login');
                    setAcceptedTerms(false);
                    setShowPassword(false);
                  }}
                  className="font-bold text-[#F59E0B] hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  Logger In
                </button>
              </>
            ) : (
              <>
                New to Logger?{' '}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMode('signup');
                    setShowPassword(false);
                  }}
                  className="font-bold text-[#F59E0B] hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  Create a free account
                </button>
              </>
            )}
          </p>
        </form>
      )}
    </AppModal>
  );
}
