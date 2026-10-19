// Admin bulk import: adds bike models to the shared catalog from saved spec
// pages, without adding them to anyone's garage. Runs locally only (it uses the
// service-role key from .env.local); there is no web endpoint for this.
//
// 1. Save each bike's spec page as a .txt file in scripts/catalog-import/pages/
//    (gitignored). Optional header lines before a "---" line give hints:
//      brand: Norco
//      model: Fluid A1
//      year: 2025
//      type: Trail
//      ---
//      <pasted page text>
// 2. npx tsx scripts/catalog-import/run.mts extract [--max 20]
//    Reads each page with the AI (Haiku 5.5) and writes <name>.json next to it.
//    Pages that already have a .json are skipped, so nothing is paid for twice.
// 3. Check and correct the .json files by hand (compare with the page).
// 4. npx tsx scripts/catalog-import/run.mts save
//    Saves each .json to the catalog as the admin; bikes already in the catalog
//    are skipped. Writes <name>.saved so a re-run won't save it again.
//
// Cost guardrails: every AI call is logged in bike_imports (it shows on Admin ->
// Field data) and counts toward the site-wide daily AI cap; the kill switch
// BIKE_IMPORT_AI_DISABLED=1 stops it; --max caps one run (default 20, hard max 50).
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const pagesDir = join(here, 'pages');

// Load .env.local without printing anything from it.
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const { extractBikeSpecs, toFormComponent, SPEC_MODEL } = await import('../../src/lib/spec-extract.ts');
const { saveBikeModel, createBikeModelSlug } = await import('../../src/lib/bike-model-save.ts');
const { ADMIN_ALLOWED_EMAILS } = await import('../../src/lib/admin-access.ts');
const { BIKE_TYPES } = await import('../../src/lib/constants.ts');

const command = process.argv[2];
const maxArg = process.argv.indexOf('--max');
const max = Math.min(50, maxArg > 0 ? Number(process.argv[maxArg + 1]) || 20 : 20);
const SITE_DAILY_AI_LIMIT = Number(process.env.BIKE_IMPORT_SITE_DAILY_LIMIT) || 100;

if (command !== 'extract' && command !== 'save') {
  console.log('Usage: npx tsx scripts/catalog-import/run.mts extract [--max 20] | save');
  process.exit(1);
}
if (!existsSync(pagesDir)) {
  console.log(`No pages folder yet. Put spec pages (.txt) in ${pagesDir}`);
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data: admin, error: adminError } = await supabase.from('app_users').select('id').eq('email', ADMIN_ALLOWED_EMAILS[0]).single();
if (adminError || !admin) throw new Error('Admin user not found in app_users');

function readPage(file: string) {
  const raw = readFileSync(join(pagesDir, file), 'utf8');
  const split = raw.match(/^((?:[a-z]+:.*\n)+)---\n/i);
  const hints: Record<string, string> = {};
  if (split) for (const line of split[1].trim().split('\n')) {
    const [k, ...v] = line.split(':');
    hints[k.trim().toLowerCase()] = v.join(':').trim();
  }
  return { text: (split ? raw.slice(split[0].length) : raw).trim(), hints };
}

if (command === 'extract') {
  if (process.env.BIKE_IMPORT_AI_DISABLED === '1') throw new Error('AI import is turned off (BIKE_IMPORT_AI_DISABLED=1)');
  const todo = readdirSync(pagesDir).filter((f) => f.endsWith('.txt') && !existsSync(join(pagesDir, f.replace(/\.txt$/, '.json'))));
  console.log(`${todo.length} page(s) to read; this run reads up to ${max}.`);

  for (const file of todo.slice(0, max)) {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count, error } = await supabase.from('bike_imports').select('id', { count: 'exact', head: true }).eq('method', 'ai').gte('created_at', since);
    if (error || (count ?? 0) >= SITE_DAILY_AI_LIMIT) { console.log('Stopping: site-wide daily AI limit reached (or it could not be checked).'); break; }

    const { text, hints } = readPage(file);
    if (text.length > 30_000) { console.log(`✗ ${file}: over 30,000 characters; trim it to the spec section`); continue; }
    const { data: reserved, error: reserveError } = await supabase.from('bike_imports')
      .insert({ user_id: admin.id, method: 'ai', model: SPEC_MODEL, input_chars: text.length }).select('id').single();
    if (reserveError) throw reserveError;

    const year = Number(hints.year);
    const started = Date.now();
    const extraction = await extractBikeSpecs(text, { brand: hints.brand, model: hints.model, modelYear: Number.isInteger(year) ? year : undefined });
    await supabase.from('bike_imports').update({
      method: extraction.method,
      model: extraction.method === 'ai' ? SPEC_MODEL : null,
      input_tokens: extraction.usage?.inputTokens ?? null,
      output_tokens: extraction.usage?.outputTokens ?? null,
      duration_ms: Date.now() - started,
      parts_found: extraction.bike.components.length,
      fallback_reason: extraction.fallbackReason ?? null,
    }).eq('id', reserved.id);

    const bike = extraction.bike;
    const values = {
      brand: bike.brand ?? '',
      model: bike.model ?? '',
      modelYear: bike.modelYear ?? null,
      type: hints.type || bike.bikeType || '',
      isEbike: bike.isEbike,
      wheelsetSetup: 'tubes',
      components: bike.components.map(toFormComponent),
      warnings: bike.warnings,
      method: extraction.method,
    };
    writeFileSync(join(pagesDir, file.replace(/\.txt$/, '.json')), JSON.stringify(values, null, 2));
    console.log(`${extraction.method === 'ai' ? '✓' : '!'} ${file}: ${values.brand} ${values.model} ${values.modelYear ?? '(no year)'} · ${values.components.length} parts`
      + (extraction.fallbackReason ? ` · parser fallback: ${extraction.fallbackReason}` : '')
      + (bike.warnings.length ? `\n    check: ${bike.warnings.join('; ')}` : ''));
  }
}

if (command === 'save') {
  const todo = readdirSync(pagesDir).filter((f) => f.endsWith('.json') && !existsSync(join(pagesDir, f.replace(/\.json$/, '.saved'))));
  const nextYear = new Date().getFullYear() + 1;
  for (const file of todo) {
    const { warnings: _w, method: _m, ...values } = JSON.parse(readFileSync(join(pagesDir, file), 'utf8'));
    const problems = [
      !values.brand && 'no brand',
      !values.model && 'no model',
      !(values.modelYear >= 1980 && values.modelYear <= nextYear) && 'no valid year (add "year: 2025" to the page header or the .json)',
      !(BIKE_TYPES as readonly string[]).includes(values.type) && `type must be one of: ${BIKE_TYPES.join(', ')}`,
      !values.components?.length && 'no parts',
    ].filter(Boolean);
    if (problems.length) { console.log(`✗ ${file}: ${problems.join('; ')}`); continue; }

    const { data: existing } = await supabase.from('bike_models').select('id').eq('slug', createBikeModelSlug(values)).maybeSingle();
    if (existing) { console.log(`- ${file}: already in the catalog`); writeFileSync(join(pagesDir, file.replace(/\.json$/, '.saved')), existing.id); continue; }

    try {
      const { bikeModelId } = await saveBikeModel(supabase, { uid: admin.id, values, addToGarage: false });
      writeFileSync(join(pagesDir, file.replace(/\.json$/, '.saved')), bikeModelId);
      console.log(`✓ ${file}: saved ${values.brand} ${values.model} ${values.modelYear}`);
    } catch (error: any) {
      console.log(`✗ ${file}: ${error.message}`);
    }
  }
}
