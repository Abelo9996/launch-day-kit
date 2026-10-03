import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint, slugify } from '../scripts/lint-list.mjs';
import { checkOffline } from '../scripts/check-links.mjs';

const good = `# X

## Contents

- [Clients and GUIs](#clients-and-guis)

## Clients and GUIs

- [A](https://a.dev) - Does a thing.
`;

test('accepts a well formed list', () => assert.deepEqual(lint(good), []));

test('slugify matches GitHub anchors', () => {
  assert.equal(slugify('Plugins and Skills'), 'plugins-and-skills');
  assert.equal(slugify('官方资源'), '官方资源');
});

test('flags bad entries, duplicates and missing TOC sections', () => {
  const bad = good + '- [B](https://a.dev/) - does a thing\n- B https://b.dev\n\n## Extra\n\n- [C](https://c.dev) - Ok.\n';
  const errors = lint(bad).join('\n');
  assert.match(errors, /end with a period/);
  assert.match(errors, /capital letter/);
  assert.match(errors, /duplicate link/);
  assert.match(errors, /entry must be/);
  assert.match(errors, /"Extra" missing from contents/);
});

test('offline link check catches broken anchors and missing files', () => {
  const errs = checkOffline('# A\n[x](#nope) [y](MISSING.md) [z](#a)\n', 'R.md', () => false);
  assert.equal(errs.length, 2);
});
