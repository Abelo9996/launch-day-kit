import { spawn } from 'node:child_process';

// Runs one agent invocation, streaming stdout/stderr lines to onLine.
export function run(inv, { onLine, onExit }) {
  let child;
  try {
    child = spawn(inv.command, inv.args, { cwd: inv.cwd, env: inv.env, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    onLine(`[failed to start: ${e.message}]`);
    onExit(-1);
    return { kill() {} };
  }
  let done = false;
  const buffers = { out: '', err: '' };
  const feed = (key) => (chunk) => {
    buffers[key] += chunk.toString('utf8');
    const parts = buffers[key].split(/\r?\n/);
    buffers[key] = parts.pop();
    for (const p of parts) onLine(p);
  };
  child.stdout.on('data', feed('out'));
  child.stderr.on('data', feed('err'));
  child.on('error', (e) => {
    if (done) return;
    done = true;
    onLine(`[failed to start "${inv.command}": ${e.code || e.message}]`);
    onExit(-1);
  });
  child.on('close', (code, signal) => {
    if (done) return;
    done = true;
    for (const k of ['out', 'err']) if (buffers[k]) onLine(buffers[k]);
    onExit(signal ? signal : code);
  });
  if (inv.stdin != null) child.stdin.end(inv.stdin);
  else child.stdin.end();
  return {
    kill() {
      if (!done) child.kill('SIGTERM');
    },
  };
}
