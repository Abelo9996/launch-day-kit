import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export function newSession(n) {
  return { id: randomUUID(), name: `session ${n}`, created: new Date().toISOString(), lines: [] };
}

export function fileStore(path) {
  return {
    load() {
      try {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
      } catch {}
      return [];
    },
    save(sessions) {
      try {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(sessions.map((s) => ({ ...s, lines: s.lines.slice(-2000) }))));
      } catch {}
    },
  };
}

export function memoryStore(initial = []) {
  let data = initial;
  return { load: () => data, save: (s) => { data = s; } };
}
