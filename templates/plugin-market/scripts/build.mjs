#!/usr/bin/env node
// Copies the static site plus registry.json into dist/ for GitHub Pages.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('site', 'dist', { recursive: true });
cpSync('registry.json', 'dist/registry.json');
writeFileSync('dist/.nojekyll', '');
console.log('built dist/');
