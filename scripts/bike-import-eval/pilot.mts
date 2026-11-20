// Scores the AI importer against the hand-checked catalog pilot bikes.
//   npx tsx scripts/bike-import-eval/pilot.mts [--limit 10] [--only trek] [--out results.json]
//
// Uses the local, gitignored pages in scripts/catalog-import/pages/: each <name>.txt
// (the maker's spec page, as copied) has a <name>.json that was checked by hand
// against the page. Pages are read WITHOUT the brand/model/year hints, like a
// rider pasting a page. One AI call per page: about a third of a cent each,
// so a full run of 51 pages is about $0.17. Nothing is logged or saved.
//
// What it counts, per bike and in total:
//   missing   a part the checked file has that the AI left out
//   phantom   a part the AI added that the checked file doesn't have (e.g. a front
//             shifter on a 1x bike)
//   brand     same part, different brand
//   rings     crankset chainring sizes that don't match (or were dropped)
//   words     same part, but a word or number from the checked series/model is absent
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const pagesDir = join(root, 'scripts/catalog-import/pages');

// Load .env.local without printing anything from it.
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) throw new Error('No ANTHROPIC_API_KEY in .env.local');

const { extractBikeSpecs, toFormComponent } = await import('../../src/lib/spec-extract.ts');

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const limit = Number(arg('--limit')) || Infinity;
const only = arg('--only');
const out = arg('--out');

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (s: unknown) => String(s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1);

/** Accessories with no wear: never counted as missing or phantom. */
const IGNORED = new Set(['other', 'bell', 'kickstand', 'fenders', 'rack', 'lights', 'light', 'reflectors', 'bar tape', 'chain guide', 'display', 'charger', 'dropper remote', 'pedals']);
const key = (name: string) => name.trim().toLowerCase();

function readPage(file: string) {
  const raw = readFileSync(join(pagesDir, file), 'utf8');
  const sep = raw.indexOf('\n---\n');
  return sep >= 0 ? raw.slice(sep + 5) : raw;
}

const files = readdirSync(pagesDir)
  .filter((f) => f.endsWith('.txt') && (!only || f.includes(only)))
  .filter((f) => { try { readFileSync(join(pagesDir, f.replace(/\.txt$/, '.json'))); return true; } catch { return false; } })
  .slice(0, limit);

type Result = { bike: string; method: string; missing: string[]; phantom: string[]; brand: string[]; rings: string[]; words: string[]; outTokens: number };

async function score(file: string): Promise<Result> {
  const name = file.replace(/\.txt$/, '');
  const checked = JSON.parse(readFileSync(join(pagesDir, `${name}.json`), 'utf8'));
  const run = await extractBikeSpecs(readPage(file));
  const got = run.bike.components.map(toFormComponent);

  const want = new Map<string, any>();
  for (const c of checked.components) if (!IGNORED.has(key(c.name))) want.set(key(c.name), c);
  const have = new Map<string, any>();
  for (const c of got) if (!IGNORED.has(key(c.name)) && !have.has(key(c.name))) have.set(key(c.name), c);

  const r: Result = { bike: name, method: run.method, missing: [], phantom: [], brand: [], rings: [], words: [], outTokens: run.usage?.outputTokens ?? 0 };
  for (const [k, w] of want) {
    const h = have.get(k);
    if (!h) { r.missing.push(w.name); continue; }
    if (w.brand && h.brand && norm(w.brand) !== norm(h.brand)) r.brand.push(`${w.name}: ${h.brand} ≠ ${w.brand}`);
    if (w.brand && !h.brand) r.brand.push(`${w.name}: no brand ≠ ${w.brand}`);
    const haystack = norm(`${h.series ?? ''} ${h.model ?? ''} ${h.size ?? ''}`);
    const lacking = words(`${w.series ?? ''} ${w.model ?? ''}`).filter((x) => !haystack.includes(x));
    if (lacking.length) r.words.push(`${w.name}: lacks ${lacking.join(', ')}`);
    if (k === 'crankset') {
      const wr = [w.chainring1, w.chainring2, w.chainring3].filter(Boolean).join('/');
      const hr = [h.chainring1, h.chainring2, h.chainring3].filter(Boolean).join('/');
      if (wr !== hr) r.rings.push(`crankset ${hr || 'none'} ≠ ${wr || 'none'}`);
    }
  }
  for (const [k, h] of have) if (!want.has(k)) r.phantom.push(h.name);
  return r;
}

// A few at a time, so a run of 51 takes a few minutes, not twenty.
const results: Result[] = [];
const queue = [...files];
await Promise.all(Array.from({ length: 5 }, async () => {
  for (let f = queue.shift(); f; f = queue.shift()) {
    const r = await score(f);
    results.push(r);
    const issues = r.missing.length + r.phantom.length + r.brand.length + r.rings.length;
    console.log(`${issues ? '✗' : '✓'} ${r.bike} [${r.method}]${issues ? '' : ''}`);
    for (const m of r.missing) console.log(`    missing: ${m}`);
    for (const p of r.phantom) console.log(`    phantom: ${p}`);
    for (const b of r.brand) console.log(`    brand: ${b}`);
    for (const g of r.rings) console.log(`    rings: ${g}`);
  }
}));

const sum = (k: keyof Result) => results.reduce((n, r) => n + (r[k] as string[]).length, 0);
const tokens = results.reduce((n, r) => n + r.outTokens, 0);
console.log(`\n${results.length} bikes · missing ${sum('missing')} · phantom ${sum('phantom')} · brand ${sum('brand')} · rings ${sum('rings')} · words ${sum('words')} · parser fallbacks ${results.filter((r) => r.method !== 'ai').length} · avg ${Math.round(tokens / Math.max(1, results.length))} output tokens`);
if (out) writeFileSync(out, JSON.stringify(results.sort((a, b) => a.bike.localeCompare(b.bike)), null, 1));
