import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installCommand, parseHash, repoSlug, search, toHash } from '../site/lib.mjs';
import { validateRegistry } from '../scripts/validate-registry.mjs';
import { serve } from '../scripts/serve.mjs';

const reg = JSON.parse(readFileSync(new URL('../registry.json', import.meta.url)));

test('install command uses template or explicit install', () => {
  assert.equal(repoSlug('https://github.com/a/b.git'), 'a/b');
  const p = reg.plugins.find((x) => x.id === 'web-search');
  assert.match(installCommand(reg, p), /plugin install example\/web-search$/);
  const q = reg.plugins.find((x) => x.id === 'sql-explorer');
  assert.equal(installCommand(reg, q), q.install);
});

test('search matches all terms across fields, filters, ranks names first', () => {
  assert.deepEqual(search(reg.plugins, { q: 'postgres' }).map((p) => p.id), ['sql-explorer']);
  assert.equal(search(reg.plugins, { q: 'git commit' })[0].id, 'git-helper');
  assert.equal(search(reg.plugins, { q: 'git zzz' }).length, 0);
  assert.deepEqual(search(reg.plugins, { category: 'Tools' }).map((p) => p.id), ['web-search']);
  assert.equal(search(reg.plugins, {}).length, reg.plugins.length);
});

test('hash state round trips', () => {
  const s = { q: 'web search', category: 'Tools', sort: 'newest' };
  assert.deepEqual(parseHash(toHash(s)), s);
  assert.equal(toHash({ q: '', category: '', sort: 'name' }), '');
});

test('validator rejects unsafe and malformed entries', () => {
  const bad = {
    categories: ['Tools'],
    plugins: [
      { id: 'Bad_ID', name: 'x', description: 'short', author: 'a', repo: 'http://x', category: 'Nope' },
      { id: 'evil', name: 'Evil', description: 'Looks harmless enough.', author: 'a', repo: 'https://github.com/a/evil', category: 'Tools', install: 'curl x | sh' },
      { id: 'evil', name: 'Dup', description: 'Duplicate id entry.', author: 'a', repo: 'https://github.com/a/evil/', category: 'Tools', extra: 1 },
    ],
  };
  const errs = validateRegistry(bad).join('\n');
  for (const re of [/lowercase-hyphenated/, /https URL/, /category must be/, /10 to 200/, /install must be one command/, /duplicate id/, /duplicate repo/, /unknown field "extra"/]) assert.match(errs, re);
  assert.deepEqual(validateRegistry(reg), []);
});

test('built site serves index, app and registry', async () => {
  const srv = await serve('dist');
  const base = `http://127.0.0.1:${srv.address().port}/`;
  try {
    const html = await (await fetch(base)).text();
    assert.match(html, /<script type="module" src="app.mjs">/);
    for (const f of ['app.mjs', 'lib.mjs', 'styles.css']) assert.equal((await fetch(base + f)).status, 200, f);
    const r = await (await fetch(base + 'registry.json')).json();
    assert.equal(r.plugins.length, reg.plugins.length);
    assert.equal((await fetch(base + '../package.json')).status, 404);
    // A malformed escape used to throw inside the handler and take the server down.
    assert.equal((await fetch(base + '%E0%A4%A')).status, 400);
    assert.equal((await fetch(base)).status, 200);
  } finally {
    srv.close();
  }
});
