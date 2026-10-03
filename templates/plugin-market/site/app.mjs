import { installCommand, parseHash, search, toHash } from './lib.mjs';

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const k of kids) n.append(k);
  return n;
};

let registry = { plugins: [], categories: [] };
let state = parseHash(location.hash);

async function copy(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = el('textarea', { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = 'Copied';
  btn.classList.add('ok');
  setTimeout(() => { btn.textContent = old; btn.classList.remove('ok'); }, 1200);
}

function card(p) {
  const cmd = installCommand(registry, p);
  const btn = el('button', { className: 'copy', textContent: 'Copy', title: 'Copy install command' });
  btn.addEventListener('click', () => copy(cmd, btn));
  return el('article', { className: 'card' },
    el('header', {},
      el('h2', {}, el('a', { href: p.repo, textContent: p.name, target: '_blank', rel: 'noopener' })),
      el('span', { className: 'cat', textContent: p.category })),
    el('p', { className: 'desc', textContent: p.description }),
    el('div', { className: 'install' }, el('code', { textContent: cmd }), btn),
    el('footer', {},
      el('span', { textContent: `by ${p.author}` }),
      el('span', { className: 'tags', textContent: (p.tags || []).map((t) => '#' + t).join(' ') })));
}

function render() {
  const results = search(registry.plugins, state);
  $('#count').textContent = `${results.length} of ${registry.plugins.length}`;
  $('#grid').replaceChildren(...(results.length ? results.map(card) : [el('p', { className: 'empty', textContent: 'Nothing matches. Try fewer words, or add yours with a PR.' })]));
  for (const b of document.querySelectorAll('.chip')) b.classList.toggle('active', b.dataset.cat === state.category);
  $('#sort').value = state.sort;
  const h = toHash(state);
  if (h !== location.hash) history.replaceState(null, '', h || location.pathname);
}

async function main() {
  const res = await fetch('registry.json', { cache: 'no-cache' });
  registry = await res.json();
  document.title = registry.name;
  $('#name').textContent = registry.name;
  const cats = ['', ...(registry.categories || [...new Set(registry.plugins.map((p) => p.category))])];
  $('#chips').replaceChildren(...cats.map((c) => {
    const b = el('button', { className: 'chip', textContent: c || 'All' });
    b.dataset.cat = c;
    b.addEventListener('click', () => { state = { ...state, category: c }; render(); });
    return b;
  }));
  const q = $('#q');
  q.value = state.q;
  q.addEventListener('input', () => { state = { ...state, q: q.value }; render(); });
  $('#sort').addEventListener('change', (e) => { state = { ...state, sort: e.target.value }; render(); });
  addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
  });
  render();
}

main().catch((e) => {
  $('#grid').textContent = `Could not load registry.json: ${e.message}`;
});
