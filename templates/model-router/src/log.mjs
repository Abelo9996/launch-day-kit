import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createLogger(path) {
  if (!path) return () => {};
  mkdirSync(dirname(path), { recursive: true });
  return (entry) => {
    try {
      appendFileSync(path, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('log write failed:', e.message);
    }
  };
}
