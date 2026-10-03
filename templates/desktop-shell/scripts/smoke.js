// Launches the real Electron app in smoke mode: spawns a command in node-pty,
// renders it in xterm.js, and exits 0 once the marker shows up in the terminal buffer.
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const electron = require('electron');

const root = path.resolve(__dirname, '..');
const args = [root];
let cmd = electron;
if (process.platform === 'linux') {
  args.push('--no-sandbox', '--disable-gpu');
  if (!process.env.DISPLAY && spawnSync('which', ['xvfb-run']).status === 0) {
    args.unshift(electron);
    args.unshift('-a');
    cmd = 'xvfb-run';
  }
}
const started = Date.now();
const child = spawn(cmd, args, { env: { ...process.env, DESKTOP_SMOKE: '1', ELECTRON_ENABLE_LOGGING: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
let out = '';
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { out += d; });
child.on('exit', (code) => {
  const ok = code === 0 && out.includes('SMOKE OK');
  if (!ok) {
    console.error(out);
    console.error(`smoke failed (exit ${code})`);
    process.exit(1);
  }
  console.log(`smoke ok in ${Date.now() - started} ms: electron + node-pty + xterm.js`);
});
