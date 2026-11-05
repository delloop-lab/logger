/**
 * Workshop notifications:
 * - success / error / info → lightweight corner toasts (react-hot-toast)
 * - confirm / choice → centered modal dialogs (NotifyHost)
 */
import hotToast from 'react-hot-toast';

export type NotifyKind = 'success' | 'error' | 'info' | 'confirm' | 'choice';

export type NotifyAction = {
  id: string;
  label: string;
  /** Primary / emphasized button */
  primary?: boolean;
  danger?: boolean;
};

export type NotifyRequest = {
  id: string;
  kind: NotifyKind;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  actions?: NotifyAction[];
  resolve?: (ok: boolean) => void;
  resolveChoice?: (actionId: string | null) => void;
};

type Listener = (queue: NotifyRequest[]) => void;

let queue: NotifyRequest[] = [];
const listeners = new Set<Listener>();

function emit() {
  const snapshot = [...queue];
  listeners.forEach((fn) => fn(snapshot));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function push(entry: Omit<NotifyRequest, 'id'> & { id?: string }) {
  const item: NotifyRequest = { id: entry.id || uid(), ...entry };
  queue = [...queue, item];
  emit();
  return item.id;
}

export function subscribeNotify(listener: Listener): () => void {
  listeners.add(listener);
  listener([...queue]);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotifyQueue() {
  return [...queue];
}

/** Dismiss current head (or by id). For confirm, pass ok. For choice, pass action id via dismissChoice. */
export function dismissNotify(id: string, ok = false) {
  const item = queue.find((q) => q.id === id);
  if (item?.resolve) item.resolve(ok);
  if (item?.resolveChoice) item.resolveChoice(null);
  queue = queue.filter((q) => q.id !== id);
  emit();
}

export function dismissChoice(id: string, actionId: string | null) {
  const item = queue.find((q) => q.id === id);
  if (item?.resolveChoice) item.resolveChoice(actionId);
  queue = queue.filter((q) => q.id !== id);
  emit();
}

function defaultTitle(kind: NotifyKind): string {
  switch (kind) {
    case 'success':
      return 'Done';
    case 'error':
      return 'Something went wrong';
    case 'confirm':
      return 'Please confirm';
    case 'choice':
      return 'Choose an option';
    default:
      return 'Notice';
  }
}

const toastStyle = {
  background: '#1e2228',
  color: '#f3f4f6',
  border: '1px solid #374151',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: 600,
} as const;

export const notify = {
  success(message: string, _title = defaultTitle('success')) {
    return hotToast.success(message, { style: toastStyle, duration: 3200 });
  },
  error(message: string, _title = defaultTitle('error')) {
    return hotToast.error(message, { style: toastStyle, duration: 4200 });
  },
  info(message: string, _title = defaultTitle('info')) {
    return hotToast(message, { style: toastStyle, duration: 3500 });
  },
  confirm(options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      push({
        kind: 'confirm',
        title: options.title || defaultTitle('confirm'),
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        danger: options.danger,
        resolve,
      });
    });
  },
  /** Multi-button alert. Resolves to action id, or null if dismissed. */
  choice(options: {
    title?: string;
    message: string;
    actions: NotifyAction[];
  }): Promise<string | null> {
    return new Promise((resolve) => {
      push({
        kind: 'choice',
        title: options.title || defaultTitle('choice'),
        message: options.message,
        actions: options.actions,
        resolveChoice: resolve,
      });
    });
  },
};

/** Drop-in for call sites — lightweight corner toasts only. */
export const toast = {
  success(message: string) {
    return notify.success(message);
  },
  error(message: string) {
    return notify.error(message);
  },
};
