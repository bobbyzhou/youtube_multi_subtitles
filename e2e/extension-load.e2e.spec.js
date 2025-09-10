const path = require('path');
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

const distPath = path.join(process.cwd(), 'dist-e2e');

async function buildExtensionIfNeeded() {
  if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'manifest.json'))) {
    require('child_process').execSync('node e2e/build-extension.js', { stdio: 'inherit' });
  }
}

test.describe('Extension loads and injects content script', () => {
  let context;

  test.beforeAll(async () => {
    await buildExtensionIfNeeded();

    const userDataDir = path.join(__dirname, '.pw-user');
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${distPath}`,
        `--load-extension=${distPath}`
      ]
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('loads MV3 service worker for the extension', async () => {
    await expect.poll(() => {
      const workers = context.serviceWorkers();
      return workers.some(sw => sw.url().startsWith('chrome-extension://'));
    }, { timeout: 10000 }).toBe(true);
  });

  test('opens popup page via extension id', async () => {
    // Derive extension id from the service worker URL
    const sw = context.serviceWorkers().find(sw => sw.url().startsWith('chrome-extension://'));
    expect(sw, 'service worker not found').toBeTruthy();
    const url = new URL(sw.url());
    const extensionId = url.hostname;

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'load' });

    // Basic assertions: popup loads and has expected header text
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.header h1')).toHaveText(/YouTube双语字幕/);
  });

  test('injects on /watch and exposes global (grant host permission via popup)', async () => {
    // 1) Derive extension id from service worker URL
    const sw = context.serviceWorkers().find(sw => sw.url().startsWith('chrome-extension://'));
    expect(sw, 'service worker not found').toBeTruthy();
    const extensionId = new URL(sw.url()).hostname;

    // 2) Open popup and request host permission for localhost via a user-gesture click
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'load' });
    await popup.evaluate(() => {
      const btn = document.createElement('button');
      btn.id = 'e2e-request-perm';
      btn.textContent = 'Grant host perm';
      btn.onclick = async () => {
        try {
          const granted = await chrome.permissions.request({ origins: ['http://localhost:5173/*'] });
          // expose result for the test to read
          window.__permGranted = granted;
        } catch (e) {
          window.__permError = String(e);
        }
      };
      document.body.appendChild(btn);
    });
    await popup.click('#e2e-request-perm');
    await expect.poll(async () => popup.evaluate(() => Boolean(window.__permGranted))).toBe(true);

    // 3) Navigate to localhost watch page and wait for content script globals
    const page = await context.newPage();
    page.on('console', m => console.log('[page console]', m.type(), m.text()));
    await page.goto('http://localhost:5173/watch?v=abc', { waitUntil: 'load' });

    // 4) Assert that content script injected container into page DOM (content scripts run in isolated world)
    const container = page.locator('.bilingual-subtitles-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // Ensure container has expected structure
    await expect(page.locator('.bilingual-subtitles-container .subtitle-inner')).toBeVisible();

    // Note: Globals defined in content script are not visible to page JS context by design (isolated world),
    // so we validate via DOM effects instead of window.* checks.
  });
});

