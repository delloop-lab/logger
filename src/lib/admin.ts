/** Emails that always see Admin (also mirrored in SQL is_app_admin). */
export const DEFAULT_ADMIN_EMAILS = ['lou@schillaci.me'] as const;

export function adminEmailAllowlist(): string[] {
  const fromEnv = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const defaults = DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase());
  return Array.from(new Set([...defaults, ...fromEnv]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailAllowlist().includes(email.trim().toLowerCase());
}

export const ADMIN_TAB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'quick-log': 'Quick Log',
  inventory: 'Inventory',
  'cut-list': 'Projects & Cuts',
  matcher: 'What Can I Build?',
  scanner: 'QR Scanner',
  storage: 'Settings',
  admin: 'Admin',
  help: 'Help',
  'getting-started': 'Getting started',
};
