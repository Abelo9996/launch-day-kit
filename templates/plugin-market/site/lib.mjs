// Pure functions shared by the browser and the tests.

export function repoSlug(url) {
  const m = /^https:\/\/(?:github\.com|gitlab\.com|codeberg\.org)\/([^/]+\/[^/#?]+?)(?:\.git)?\/?$/.exec(url || '');
  return m ? m[1] : url;
}

export function installCommand(registry, plugin) {
  if (plugin.install) return plugin.install;
  return (registry.installTemplate || '{repo}').split('{repo}').join(repoSlug(plugin.repo)).split('{id}').join(plugin.id);
}

export function normalize(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

// Every whitespace-separated term must match name, id, description, author, category or a tag.
export function search(plugins, { q = '', category = '', sort = 'name' } = {}) {
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  let out = plugins.filter((p) => {
    if (category && p.category !== category) return false;
    const hay = normalize([p.name, p.id, p.description, p.author, p.category, ...(p.tags || [])].join(' '));
    return terms.every((t) => hay.includes(t));
  });
  const score = (p) => {
    const n = normalize(p.name);
    return terms.reduce((s, t) => s + (n.startsWith(t) ? 3 : n.includes(t) ? 2 : 0), 0);
  };
  out = out.slice().sort((a, b) => {
    if (terms.length) {
      const d = score(b) - score(a);
      if (d) return d;
    }
    if (sort === 'newest') return String(b.added || '').localeCompare(String(a.added || '')) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
  return out;
}

export function parseHash(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  return { q: params.get('q') || '', category: params.get('c') || '', sort: params.get('s') || 'name' };
}

export function toHash({ q, category, sort }) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (category) p.set('c', category);
  if (sort && sort !== 'name') p.set('s', sort);
  const s = p.toString();
  return s ? '#' + s : '';
}
