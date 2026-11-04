/**
 * Bumps APP_VERSION in src/lib/version.ts (last segment: 1.06.000 → 1.06.001).
 * Run after a successful push: npm run version:bump
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionFile = path.join(root, 'src', 'lib', 'version.ts');

const source = fs.readFileSync(versionFile, 'utf8');
const match = source.match(/export const APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/);

if (!match) {
  console.error('Could not find APP_VERSION in src/lib/version.ts');
  process.exit(1);
}

const major = Number(match[1]);
const minor = Number(match[2]);
const build = Number(match[3]) + 1;
const next = `${major}.${String(minor).padStart(2, '0')}.${String(build).padStart(3, '0')}`;

const updated = source.replace(
  /export const APP_VERSION = '\d+\.\d+\.\d+'/,
  `export const APP_VERSION = '${next}'`
);

fs.writeFileSync(versionFile, updated, 'utf8');
console.log(`Version bumped: ${match[1]}.${match[2]}.${match[3]} → ${next}`);
