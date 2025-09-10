// Minimal static server for E2E fixtures
// Serves youtube-like page on /watch and any other path as fallback

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 5173;
const root = process.cwd();
const fixturePath = path.join(root, 'e2e', 'fixtures', 'youtube.html');

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  try {
    const html = fs.readFileSync(fixturePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Fixture not found');
  }
});

server.listen(PORT, () => {
  console.log(`[e2e] fixtures server listening on http://localhost:${PORT}`);
});

