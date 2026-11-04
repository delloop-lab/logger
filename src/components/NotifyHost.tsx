'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import {
  dismissChoice,
  dismissNotify,
  subscribeNotify,
  type NotifyKind,
  type NotifyRequest,
} from '@/lib/notify';

const KIND_STYLE: Record<
  NotifyKind,
  { icon: React.ElementType; iconClass: string; accent: string; button: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    accent: 'border-emerald-700/50',
    button: 'bg-emerald-600 hover:bg-emerald-500',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-red-400',
    accent: 'border-red-700/50',
    button: 'bg-red-600 hover:bg-red-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-sky-400',
    accent: 'border-sky-700/50',
    button: 'bg-orange-600 hover:bg-orange-500',
  },
  confirm: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    accent: 'border-amber-700/50',
    button: 'bg-orange-600 hover:bg-orange-500',
  },
  choice: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    accent: 'border-amber-700/50',
    button: 'bg-orange-600 hover:bg-orange-500',
  },
};

function AlertCard({ item }: { item: NotifyRequest }) {
  const style = KIND_STYLE[item.kind];
  const Icon = style.icon;
  const isConfirm = item.kind === 'confirm';
  const isChoice = item.kind === 'choice';

  const close = (ok: boolean) => dismissNotify(item.id, ok);
  const choose = (actionId: string | null) => dismissChoice(item.id, actionId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isChoice) choose(null);
        else close(false);
      }
      if (e.key === 'Enter' && !isConfirm && !isChoice) close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item.id, isConfirm, isChoice]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`notify-title-${item.id}`}
      aria-describedby={`notify-msg-${item.id}`}
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-default"
        onClick={() => (isChoice ? choose(null) : close(false))}
      />
      <div
        className={`relative w-full max-w-md bg-[#1e2228] border ${style.accent} rounded-2xl shadow-2xl shadow-black/50 p-6 space-y-5 text-gray-100`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-4">
          <div className="flex items-start gap-3 min-w-0">
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconClass}`} />
            <div className="min-w-0">
              <h2
                id={`notify-title-${item.id}`}
                className="text-base font-black text-white tracking-wide"
              >
                {item.title}
              </h2>
            </div>
          </div>
          {!isConfirm && !isChoice && (
            <button
              type="button"
              onClick={() => close(false)}
              className="shrink-0 text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p
          id={`notify-msg-${item.id}`}
          className="text-sm text-gray-300 whitespace-pre-line leading-relaxed max-h-[40vh] overflow-y-auto"
        >
          {item.message}
        </p>

        <div className="flex flex-col gap-2 pt-1">
          {isChoice &&
            (item.actions || []).map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => choose(action.id)}
                className={`w-full px-4 py-2.5 text-white text-xs font-bold rounded-xl cursor-pointer ${
                  action.danger
                    ? 'bg-red-600 hover:bg-red-500'
                    : action.primary
                      ? style.button
                      : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {action.label}
              </button>
            ))}

          {isConfirm && (
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {item.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`flex-1 px-4 py-2.5 text-white text-xs font-bold rounded-xl cursor-pointer ${
                  item.danger ? 'bg-red-600 hover:bg-red-500' : style.button
                }`}
              >
                {item.confirmLabel || 'Confirm'}
              </button>
            </div>
          )}

          {!isConfirm && !isChoice && (
            <button
              type="button"
              onClick={() => close(true)}
              className={`w-full px-4 py-2.5 text-white text-xs font-bold rounded-xl cursor-pointer ${style.button}`}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Renders the front-most notification as a centered workshop modal. */
export default function NotifyHost() {
  const [queue, setQueue] = useState<NotifyRequest[]>([]);

  useEffect(() => subscribeNotify(setQueue), []);

  const current = queue[0];
  if (!current) return null;
  return <AlertCard item={current} />;
}
