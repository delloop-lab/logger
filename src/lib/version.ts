/** Display channel — keep in sync with footer / Help. */
export const APP_CHANNEL = 'BETA' as const;

/**
 * App build version: major.minor.build
 * Bumped by `npm run version:bump` (and after successful `git push` via Cursor hook).
 */
export const APP_VERSION = '1.06.004';

export function formatAppVersion(version = APP_VERSION, channel = APP_CHANNEL): string {
  return `${channel} ${version}`;
}
