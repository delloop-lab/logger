/**
 * Cursor afterShellExecution hook: after a successful `git push`, bump APP_VERSION.
 * Reads hook JSON from stdin; prints optional additional_context.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function isGitPush(command) {
  if (!command || typeof command !== 'string') return false;
  // Match git push / git.exe push, including PowerShell wrappers with git push inside
  return /\bgit(?:\.exe)?\s+push\b/i.test(command);
}

function exitOk(payload = {}) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

const raw = readStdin();
let payload = {};
try {
  payload = raw ? JSON.parse(raw) : {};
} catch {
  exitOk({});
}

const command = payload.command ?? payload.tool_input?.command ?? '';
const exitCode =
  payload.exit_code ??
  payload.exitCode ??
  payload.tool_output?.exit_code ??
  payload.status ??
  0;

if (!isGitPush(command) || Number(exitCode) !== 0) {
  exitOk({});
}

const bumpScript = path.join(root, 'scripts', 'bump-version.mjs');
const result = spawnSync(process.execPath, [bumpScript], {
  cwd: root,
  encoding: 'utf8',
});

if (result.status !== 0) {
  exitOk({
    additional_context: `Version bump after push failed: ${result.stderr || result.stdout || 'unknown error'}`,
  });
}

const msg = (result.stdout || '').trim() || 'Version bumped after git push.';
exitOk({
  additional_context: `${msg} Commit src/lib/version.ts when ready so the next push publishes the new build number.`,
});
