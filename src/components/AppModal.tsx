'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Wider dialog for forms with more fields; `app` matches main computer layout (max-w-6xl) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'app';
  /** Hide the X button (e.g. forced confirm) */
  hideClose?: boolean;
};

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  app: 'max-w-6xl',
};

/**
 * Shared Logger modal — always centered, dark workshop styling.
 */
export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  hideClose = false,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hideClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, hideClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
    >
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-default"
        onClick={hideClose ? undefined : onClose}
      />
      <div
        className={`relative w-full ${SIZE_CLASS[size]} bg-[#1e2228] border border-gray-700/80 rounded-2xl shadow-2xl shadow-black/50 p-6 space-y-5 text-gray-100 max-h-[min(92vh,900px)] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-4">
          <div className="min-w-0">
            <BrandLogo size="md" className="mb-2" />
            <h2 id="app-modal-title" className="text-base font-black text-white tracking-wide">
              {title.replace(/^(TimberVault|Logger)\s*[·•\-–—:]?\s*/i, '')}
            </h2>
            {subtitle ? <p className="text-xs text-gray-400 mt-1">{subtitle}</p> : null}
          </div>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Prefer `notify.confirm()` from `@/lib/notify` for new code (same centered style). */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AppModal open={open} onClose={onCancel} title={title} size="sm" hideClose>
      <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">{message}</p>
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex-1 px-4 py-2.5 text-white text-xs font-bold rounded-xl cursor-pointer ${
            danger
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/20'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </AppModal>
  );
}
