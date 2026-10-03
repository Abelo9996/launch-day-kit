import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { buildInvocation } from './config.mjs';
import { newSession } from './sessions.mjs';
import { run as defaultRun } from './runner.mjs';

const h = React.createElement;

export const KEYS = [
  ['enter', 'send'],
  ['tab', 'next session'],
  ['ctrl+n', 'new'],
  ['ctrl+x', 'stop'],
  ['ctrl+d', 'delete'],
  ['pgup/pgdn', 'scroll'],
  ['ctrl+c', 'quit'],
];

export function App({ config, store, run = defaultRun, rows: fixedRows }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const rows = fixedRows || stdout?.rows || 30;
  const [sessions, setSessions] = useState(() => {
    const loaded = store.load();
    return loaded.length ? loaded : [newSession(1)];
  });
  const [active, setActive] = useState(0);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(null); // session id
  const [scroll, setScroll] = useState(0);
  const proc = useRef(null);

  useEffect(() => { store.save(sessions); }, [sessions]);

  const appendLines = (id, lines) =>
    setSessions((all) => all.map((s) => (s.id === id ? { ...s, lines: [...s.lines, ...lines].slice(-config.maxLines) } : s)));

  const send = (prompt) => {
    const s = sessions[active];
    if (!prompt.trim() || running) return;
    if (s.lines.length === 0 && s.name.startsWith('session ')) {
      setSessions((all) => all.map((x) => (x.id === s.id ? { ...x, name: prompt.slice(0, 24) } : x)));
    }
    appendLines(s.id, [`> ${prompt}`]);
    setRunning(s.id);
    setScroll(0);
    proc.current = run(buildInvocation(config, prompt, s.id), {
      onLine: (line) => appendLines(s.id, [line]),
      onExit: (code) => {
        appendLines(s.id, [code === 0 ? '' : `[exit ${code}]`, '']);
        proc.current = null;
        setRunning(null);
      },
    });
  };

  useInput((ch, key) => {
    if (key.ctrl && ch === 'n') {
      setSessions((all) => [...all, newSession(all.length + 1)]);
      setActive(sessions.length);
      setScroll(0);
    } else if (key.ctrl && ch === 'x') {
      proc.current?.kill();
    } else if (key.ctrl && ch === 'd') {
      if (running === sessions[active].id) return;
      const next = sessions.filter((_, i) => i !== active);
      setSessions(next.length ? next : [newSession(1)]);
      setActive(Math.max(0, active - 1));
    } else if (key.tab) {
      const d = key.shift ? -1 : 1;
      setActive((a) => (a + d + sessions.length) % sessions.length);
      setScroll(0);
    } else if (key.pageUp) {
      setScroll((s) => s + 10);
    } else if (key.pageDown) {
      setScroll((s) => Math.max(0, s - 10));
    } else if (key.return) {
      send(input);
      setInput('');
    } else if (key.backspace || key.delete) {
      setInput((v) => v.slice(0, -1));
    } else if (key.escape) {
      setInput('');
    } else if (ch && !key.ctrl && !key.meta) {
      setInput((v) => v + ch);
    }
  });

  const session = sessions[active] || sessions[0];
  const bodyRows = Math.max(5, rows - 7);
  const end = Math.max(0, session.lines.length - scroll);
  const visible = session.lines.slice(Math.max(0, end - bodyRows), end);
  const status = running === session.id ? 'running' : running ? 'busy in other session' : 'idle';

  return h(Box, { flexDirection: 'column' },
    h(Box, { flexDirection: 'row', height: bodyRows + 2 },
      h(Box, { flexDirection: 'column', width: 28, borderStyle: 'round', borderColor: 'gray', paddingX: 1 },
        h(Text, { bold: true }, 'Sessions'),
        ...sessions.map((s, i) =>
          h(Text, { key: s.id, color: i === active ? 'cyan' : undefined, wrap: 'truncate' },
            `${i === active ? '>' : ' '} ${i + 1} ${s.name}${running === s.id ? ' *' : ''}`))),
      h(Box, { flexDirection: 'column', flexGrow: 1, borderStyle: 'round', borderColor: running === session.id ? 'yellow' : 'gray', paddingX: 1 },
        h(Text, { bold: true }, `${config.title} | ${session.name} | ${status}${scroll ? ` | scrolled ${scroll}` : ''}`),
        ...visible.map((line, i) => h(Text, { key: i, wrap: 'truncate-end' }, line || ' ')))),
    h(Box, { borderStyle: 'round', borderColor: 'cyan', paddingX: 1 },
      h(Text, null, '> ', input || h(Text, { dimColor: true }, running ? 'running... ctrl+x to stop' : 'type a prompt, enter to send'))),
    h(Text, { dimColor: true }, ' ' + KEYS.map(([k, v]) => `${k} ${v}`).join('  ')));
}
