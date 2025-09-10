// Build extension for E2E: copy files to dist-e2e and widen matches to localhost
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const distDir = path.join(root, 'dist-e2e');

const files = [
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'performance-monitor.js',
  'debug-tools.js',
];

const dirs = ['icons'];

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

function buildManifest() {
  const srcPath = path.join(root, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

  const localhost = 'http://localhost:5173/*';

  // host_permissions
  manifest.host_permissions = manifest.host_permissions || [];
  if (!manifest.host_permissions.includes(localhost)) {
    manifest.host_permissions.push(localhost);
  }

  // content_scripts matches
  if (Array.isArray(manifest.content_scripts)) {
    for (const cs of manifest.content_scripts) {
      cs.matches = cs.matches || [];
      if (!cs.matches.includes(localhost)) cs.matches.push(localhost);
    }
  }

  // web_accessible_resources matches
  if (Array.isArray(manifest.web_accessible_resources)) {
    for (const war of manifest.web_accessible_resources) {
      war.matches = war.matches || [];
      if (!war.matches.includes(localhost)) war.matches.push(localhost);
    }
  }

  // Write manifest
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

function main() {
  rmrf(distDir);
  fs.mkdirSync(distDir, { recursive: true });

  // Manifest with localhost added
  buildManifest();

  // Copy whitelisted files & dirs
  for (const f of files) {
    const src = path.join(root, f);
    if (fs.existsSync(src)) {
      copyFile(src, path.join(distDir, f));
    }
  }
  for (const d of dirs) {
    const srcDir = path.join(root, d);
    if (fs.existsSync(srcDir)) {
      copyDir(srcDir, path.join(distDir, d));
    }
  }

  console.log('[e2e] Extension built to', distDir);
}

main();

