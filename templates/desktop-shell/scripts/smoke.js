// Launches the real Electron app in smoke mode: spawns a command in node-pty,
// renders it in xterm.js, and exits 0 once the marker shows up in the terminal buffer.
//
// Second run (macOS and Linux): starts the app with the minimal PATH a GUI launch gets
// and a command that only the login shell's PATH can find, the way a Homebrew or npm
// installed CLI behaves when the app is opened from Finder or the Dock.
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const electron = require('electron');

const root = path.resolve(__dirname, '..');

function launch(label, extraEnv) {
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
  const env = { ...process.env, DESKTOP_SMOKE: '1', ELECTRON_ENABLE_LOGGING: '0', ...extraEnv };
  const child = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  return new Promise((resolve) => {
    child.on('exit', (code) => {
      const ok = code === 0 && out.includes('SMOKE OK');
      if (!ok) {
        console.error(out);
        console.error(`smoke failed (${label}, exit ${code})`);
        process.exit(1);
      }
      console.log(`smoke ok in ${Date.now() - started} ms: ${label}`);
      resolve();
    });
  });
}

function guiLaunchEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'desktop-smoke-'));
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'smoke-agent'), '#!/bin/sh\necho smoke-marker-42\n', { mode: 0o755 });
  // Stands in for a login shell whose rc file adds the agent's install dir to PATH.
  const shell = path.join(dir, 'login-shell');
  fs.writeFileSync(shell, `#!/bin/sh\nPATH="${bin}:$PATH"; export PATH\nshift\nexec /bin/sh -c "$1"\n`, { mode: 0o755 });
  return { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', SHELL: shell, DESKTOP_SMOKE_CMD: 'smoke-agent' };
}

(async () => {
  await launch('electron + node-pty + xterm.js', {});
  if (process.platform !== 'win32') await launch('command found via login shell PATH, as when opened from Finder or the Dock', guiLaunchEnv());
})();
