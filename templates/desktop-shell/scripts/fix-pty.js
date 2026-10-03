// node-pty ships spawn-helper without the executable bit on some installs,
// which makes every spawn fail with "posix_spawnp failed". Restore it.
const fs = require('node:fs');
const path = require('node:path');

let base;
try {
  base = path.dirname(require.resolve('node-pty/package.json'));
} catch {
  process.exit(0);
}
const candidates = [path.join(base, 'build', 'Release', 'spawn-helper')];
const pre = path.join(base, 'prebuilds');
if (fs.existsSync(pre)) for (const d of fs.readdirSync(pre)) candidates.push(path.join(pre, d, 'spawn-helper'));
for (const f of candidates) {
  if (fs.existsSync(f)) fs.chmodSync(f, 0o755);
}
