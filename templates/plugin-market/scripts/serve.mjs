#!/usr/bin/env node
// Minimal static file server for local preview and the smoke test.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function serve(dir, port = 0) {
  const root = resolve(dir);
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r(srv)));
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const srv = await serve(process.argv[2] || 'dist', Number(process.env.PORT || 4173));
  console.log(`http://127.0.0.1:${srv.address().port}/`);
}
