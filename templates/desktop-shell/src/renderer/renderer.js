/* global Terminal, FitAddon */
const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Menlo, Consolas, "DejaVu Sans Mono", monospace',
  theme: { background: '#0f1115', foreground: '#d7dae0', cursor: '#7aa2f7' },
  scrollback: 10000,
  allowProposedApi: true,
});
const fit = new FitAddon.FitAddon();
term.loadAddon(fit);
term.open(document.getElementById('terminal'));
fit.fit();

const banner = document.getElementById('banner');
let smokeChecked = false;

function showBanner(text) {
  banner.textContent = text;
  banner.hidden = !text;
}

function bufferText() {
  const b = term.buffer.active;
  const lines = [];
  for (let i = 0; i < b.length; i++) lines.push(b.getLine(i)?.translateToString(true) || '');
  return lines.join('\n');
}

async function start() {
  term.reset();
  const res = await window.agent.start({ cols: term.cols, rows: term.rows });
  if (!res.ok) {
    showBanner(`${res.error}. Set "command" in ${res.configPath} or the AGENT_CMD env var.`);
    return;
  }
  document.getElementById('title').textContent = res.title;
  document.getElementById('command').textContent = res.command;
  if (res.configError) showBanner(`Config error, using defaults: ${res.configError}`);
  else if (res.usingShell) showBanner(`No agent command set, running your shell. Set "command" in ${res.configPath} (Config button).`);
  else showBanner('');
  term.focus();
}

window.agent.onData((data) => {
  term.write(data, () => {
    if (!smokeChecked && bufferText().includes('smoke-marker-42')) {
      smokeChecked = true;
      window.agent.smokeSeen();
    }
  });
});
window.agent.onExit((code) => term.write(`\r\n\x1b[90m[process exited with code ${code}. Press Restart or Cmd/Ctrl+R]\x1b[0m\r\n`));
window.agent.onRestart(start);
term.onData((d) => window.agent.input(d));
new ResizeObserver(() => {
  fit.fit();
  window.agent.resize({ cols: term.cols, rows: term.rows });
}).observe(document.getElementById('terminal'));
document.getElementById('restart').onclick = start;
document.getElementById('config').onclick = () => window.agent.openConfig();

start();
