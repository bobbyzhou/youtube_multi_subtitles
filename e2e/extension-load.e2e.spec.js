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

  test.fixme('injects on /watch and exposes global', async () => {
    const page = await context.newPage();
    await page.goto('http://localhost:5173/watch?v=abc', { waitUntil: 'domcontentloaded' });

    // Wait for content script globals exposed by content.js
    await expect.poll(async () => page.evaluate(() => {
      return typeof window.bilingualSubtitles !== 'undefined' && typeof window.BilingualSubtitles !== 'undefined';
    })).toBe(true);

    // Force a minimal render to the container and assert DOM
    await page.evaluate(() => {
      window.bilingualSubtitles.startSubtitleExtraction?.();
      window.bilingualSubtitles.displayBilingualSubtitles?.('Hello');
    });

    const container = page.locator('.bilingual-subtitles-container');
    await expect(container).toBeVisible({ timeout: 5000 });

    const original = page.locator('.bilingual-subtitles-container .original-subtitle');
    await expect(original).toContainText('Hello');
  });
});

