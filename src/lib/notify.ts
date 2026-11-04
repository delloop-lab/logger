/**
 * Single centered workshop alert API (replaces react-hot-toast + window.confirm).
 */

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

export const notify = {
  success(message: string, title = defaultTitle('success')) {
    return push({ kind: 'success', title, message });
  },
  error(message: string, title = defaultTitle('error')) {
    return push({ kind: 'error', title, message });
  },
  info(message: string, title = defaultTitle('info')) {
    return push({ kind: 'info', title, message });
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

/**
 * Drop-in for react-hot-toast call sites.
 * Prefer `notify.*` for new code.
 */
export const toast = {
  success(message: string) {
    return notify.success(message);
  },
  error(message: string) {
    return notify.error(message);
  },
};
