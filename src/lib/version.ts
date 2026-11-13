/** Display channel — keep in sync with footer / Help. */
export const APP_CHANNEL = 'BETA' as const;

/**
 * App build version: minor.build (e.g. 09.560).
 * Displayed as `BETA V.09.560`.
 * Bumped by `npm run version:bump` (+010 on the build segment) after successful push.
 */
export const APP_VERSION = '09.820';

export function formatAppVersion(version = APP_VERSION, channel = APP_CHANNEL): string {
  return `${channel} V.${version}`;
}
