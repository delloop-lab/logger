/**
 * Capture desktop Help screenshots (1440×900) while signed in.
 * Usage: set TIMBERVAULT_AUTH_JSON then: node scripts/capture-help-screens.mjs
 * Does not print or persist the auth token.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'help');
const authFile = process.env.TIMBERVAULT_AUTH_FILE;
const authJson = process.env.TIMBERVAULT_AUTH_JSON || (authFile ? fs.readFileSync(authFile, 'utf8') : '');
const baseUrl = process.env.TIMBERVAULT_URL || 'http://localhost:3000';

if (!authJson) {
  console.error('Missing TIMBERVAULT_AUTH_JSON or TIMBERVAULT_AUTH_FILE');
  process.exit(1);
}

const tabs = [
  { name: 'Dashboard', file: 'help-tab-dashboard.png' },
  { name: 'Quick Log', file: 'help-tab-quick-log.png' },
  { name: 'Inventory', file: 'help-tab-inventory.png' },
  { name: 'Projects & Cuts', file: 'help-tab-projects-cuts.png' },
  { name: 'What Can I Build?', file: 'help-tab-what-can-i-build.png' },
  { name: 'QR Scanner', file: 'help-tab-qr-scanner.png' },
  { name: 'Settings', file: 'help-tab-settings.png' },
];

async function redactPii(page) {
  await page.evaluate(() => {
    if (!document.getElementById('tv-help-pii-blur')) {
      const style = document.createElement('style');
      style.id = 'tv-help-pii-blur';
      style.textContent =
        '.tv-pii-blur{filter:blur(8px)!important;user-select:none!important;}';
      document.head.appendChild(style);
    }
    document.querySelectorAll('.tv-pii-blur').forEach((el) => el.classList.remove('tv-pii-blur'));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const t = n.textContent || '';
      if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(t) && n.parentElement) {
        const el = n.parentElement;
        el.classList.add('tv-pii-blur');
        if (el.childNodes.length === 1) {
          el.textContent = t.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '••••@••••.•••');
        }
      }
    }
  });
}

async function clickTab(page, label) {
  const btn = page.locator('button[data-nav-tab]', { hasText: label }).first();
  await btn.click();
  await page.waitForTimeout(500);
}

// Prefer system Chrome so we don't wait on Playwright's Chromium download.
const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.evaluate((token) => {
  localStorage.setItem('sb-ixxutrrpwdiqyjzieped-auth-token', token);
}, authJson);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const signedOut = await page.getByRole('button', { name: 'Log in' }).count();
if (signedOut > 0) {
  console.error('Still signed out after injecting auth token');
  await browser.close();
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const tab of tabs) {
  await clickTab(page, tab.name);
  await page.evaluate(() => window.scrollTo(0, 0));

  // Quick Log: show Description field (Salvaged / Furniture Teardown)
  if (tab.name === 'Quick Log') {
    const source = page.locator('label', { hasText: 'Source / Origin' }).locator('..').locator('select');
    if ((await source.count()) > 0) {
      await source.selectOption({ label: 'Furniture Teardown' });
      await page.waitForTimeout(200);
    }
  }

  // Settings: bring lumber types into view under the fold when possible
  if (tab.name === 'Settings') {
    const lumberHeading = page.getByText('Lumber types', { exact: false }).first();
    if ((await lumberHeading.count()) > 0) {
      await lumberHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      // Prefer showing units + lumber block: scroll back slightly from bottom
      await page.evaluate(() => window.scrollBy(0, -80));
    }
  }

  await redactPii(page);
  await page.waitForTimeout(200);
  const dest = path.join(outDir, tab.file);
  await page.screenshot({ path: dest, type: 'png', fullPage: false });
  console.log('wrote', tab.file);
}

await browser.close();
console.log('done');
