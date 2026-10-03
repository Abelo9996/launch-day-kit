#!/usr/bin/env node
// Validates registry.json. Zero dependencies so it runs in any PR check.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UNSAFE = /[;&|`<>\n\r]|\$\(|\$\{/;
const REQUIRED = ['id', 'name', 'description', 'author', 'repo', 'category'];

export function validateRegistry(reg) {
  const errors = [];
  if (!reg || typeof reg !== 'object') return ['registry must be a JSON object'];
  if (!Array.isArray(reg.plugins)) return ['"plugins" must be an array'];
  if (reg.installTemplate && UNSAFE.test(reg.installTemplate)) errors.push('installTemplate contains shell control characters');
  const cats = Array.isArray(reg.categories) ? reg.categories : null;
  const ids = new Set();
  const repos = new Set();
  reg.plugins.forEach((p, i) => {
    const at = `plugins[${i}]${p && p.id ? ` (${p.id})` : ''}`;
    if (!p || typeof p !== 'object') return errors.push(`${at}: must be an object`);
    for (const k of REQUIRED) if (typeof p[k] !== 'string' || !p[k].trim()) errors.push(`${at}: "${k}" is required`);
    if (p.id && !ID.test(p.id)) errors.push(`${at}: id must be lowercase-hyphenated`);
    if (p.id && ids.has(p.id)) errors.push(`${at}: duplicate id`);
    ids.add(p.id);
    if (p.repo) {
      if (!/^https:\/\/[^\s]+$/.test(p.repo)) errors.push(`${at}: repo must be an https URL`);
      const key = p.repo.toLowerCase().replace(/(\.git)?\/?$/, '');
      if (repos.has(key)) errors.push(`${at}: duplicate repo`);
      repos.add(key);
    }
    if (p.name && p.name.length > 60) errors.push(`${at}: name over 60 characters`);
    if (p.description && (p.description.length > 200 || p.description.length < 10)) errors.push(`${at}: description must be 10 to 200 characters`);
    if (cats && p.category && !cats.includes(p.category)) errors.push(`${at}: category must be one of ${cats.join(', ')}`);
    if (p.install !== undefined && (typeof p.install !== 'string' || UNSAFE.test(p.install))) errors.push(`${at}: install must be one command without ; & | \` $( or redirects`);
    if (p.tags !== undefined) {
      if (!Array.isArray(p.tags) || p.tags.length > 8) errors.push(`${at}: tags must be an array of up to 8`);
      else for (const t of p.tags) if (typeof t !== 'string' || !ID.test(t)) errors.push(`${at}: tag "${t}" must be lowercase-hyphenated`);
    }
    if (p.added !== undefined && !DATE.test(p.added)) errors.push(`${at}: added must be YYYY-MM-DD`);
    const known = new Set([...REQUIRED, 'install', 'tags', 'added', 'version', 'homepage']);
    for (const k of Object.keys(p)) if (!known.has(k)) errors.push(`${at}: unknown field "${k}"`);
  });
  return errors;
}

function main() {
  const file = process.argv[2] || 'registry.json';
  let reg;
  try {
    reg = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`${file}: ${e.message}`);
    process.exit(1);
  }
  const errors = validateRegistry(reg);
  if (errors.length) {
    console.error(errors.map((e) => `${file}: ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`${file}: ${reg.plugins.length} plugins ok`);
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main();
