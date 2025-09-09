// Build script to prepare a clean Chrome extension folder without dev/test files
// Usage: node scripts/build-extension.js

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist');

const files = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'performance-monitor.js',
  'debug-tools.js',
];

const dirs = [
  'icons',
];

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.lstatSync(p);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p)) {
      rmrf(path.join(p, entry));
    }
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  for (const entry of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, entry);
    const dest = path.join(destDir, entry);
    const stat = fs.lstatSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      copyDir(src, dest);
    } else {
      copyFile(src, dest);
    }
  }
}

function main() {
  // Clean dist
  rmrf(distDir);
  fs.mkdirSync(distDir, { recursive: true });

  // Copy whitelisted files
  for (const f of files) {
    const src = path.join(root, f);
    if (!fs.existsSync(src)) {
      console.warn(`[build-extension] skip missing file: ${f}`);
      continue;
    }
    copyFile(src, path.join(distDir, f));
  }

  // Copy whitelisted directories
  for (const d of dirs) {
    const srcDir = path.join(root, d);
    if (!fs.existsSync(srcDir)) continue;
    copyDir(srcDir, path.join(distDir, d));
  }

  console.log('Extension built to', distDir);
}

main();

