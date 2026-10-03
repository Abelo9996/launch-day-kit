#!/usr/bin/env node
// Stand-in for a real CLI agent: echoes the prompt from argv or stdin.
let prompt = process.argv.slice(2).join(' ');
if (!prompt) {
  let raw = '';
  for await (const c of process.stdin) raw += c;
  prompt = raw.trim();
}
console.log(`agent got: ${prompt}`);
console.log('step 1 ok');
if (prompt.includes('fail')) process.exit(3);
