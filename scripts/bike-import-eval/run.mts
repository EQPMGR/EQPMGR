// Scores the bike importer against hand-checked answers.
//   npx tsx scripts/bike-import-eval/run.mts            (AI if ANTHROPIC_API_KEY is set, else parser)
//   npx tsx scripts/bike-import-eval/run.mts --parser   (force the rule-based parser)
// Each AI run costs a fraction of a cent per fixture (Claude Haiku 5.5).
// Scoring per expected part: found in the right slot, brand right, model hint present
// (normalized, inside series + model). Phantom parts (slots the bike doesn't have) are penalized.
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const forceParser = process.argv.includes('--parser');
if (forceParser) delete process.env.ANTHROPIC_API_KEY;
const { extractBikeSpecs } = await import('../../src/lib/spec-extract.ts');

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const expected = JSON.parse(readFileSync(join(here, 'expected.json'), 'utf8'));

let total = 0, correct = 0, phantoms = 0;
for (const file of readdirSync(join(here, 'fixtures')).filter((f) => f.endsWith('.txt'))) {
  const key = file.replace(/\.txt$/, '');
  const exp = expected[key];
  if (!exp) continue;
  const run = await extractBikeSpecs(readFileSync(join(here, 'fixtures', file), 'utf8'));
  const bike = run.bike;
  let t = 0, c = 0;
  const misses: string[] = [];

  const check = (ok: boolean, label: string) => { t++; if (ok) c++; else misses.push(label); };
  check(norm(bike.brand) === norm(exp.bike.brand), `bike brand (${bike.brand})`);
  check(norm(bike.model).includes(norm(exp.bike.model)), `bike model (${bike.model})`);
  check(bike.isEbike === exp.bike.isEbike, `e-bike flag (${bike.isEbike})`);

  for (const [slot, brand, hint] of exp.parts as [string, string | null, string][]) {
    const part = bike.components.find((p) => p.slot === slot);
    check(!!part, `${slot}: missing`);
    if (!part) { t += 2; misses.push(`${slot}: brand`, `${slot}: model`); continue; }
    if (brand !== null) check(norm(part.brand) === norm(brand), `${slot}: brand ${part.brand ?? '-'} ≠ ${brand}`);
    check(!hint || norm(`${part.series ?? ''}${part.model ?? ''}${part.spec ?? ''}`).includes(norm(hint)), `${slot}: model "${[part.series, part.model].filter(Boolean).join(' ')}" lacks ${hint}`);
  }
  const allowed = new Set([...(exp.parts as any[]).map((p) => p[0]), 'Other', 'Chainring']);
  const extra = bike.components.filter((p) => !allowed.has(p.slot));
  const forbidden = bike.components.filter((p) => (exp.mustNotInclude ?? []).includes(p.slot));
  phantoms += extra.length + forbidden.length;

  total += t; correct += c;
  console.log(`\n${key} [${run.method}${run.fallbackReason ? `: ${run.fallbackReason}` : ''}] ${Math.round((c / t) * 100)}% (${c}/${t})`
    + (run.usage ? ` · ${run.usage.inputTokens} in / ${run.usage.outputTokens} out tokens` : ''));
  if (extra.length) console.log(`  phantom parts: ${extra.map((p) => p.slot).join(', ')}`);
  for (const m of misses) console.log(`  ✗ ${m}`);
}
console.log(`\nOVERALL ${Math.round((correct / total) * 100)}% (${correct}/${total}) · phantom parts: ${phantoms}`);
