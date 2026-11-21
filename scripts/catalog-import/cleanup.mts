// One-off catalog cleanup (2026-11-20). Local, admin only; uses the service-role key.
//   npx tsx scripts/catalog-import/cleanup.mts            shows the plan, changes nothing
//   npx tsx scripts/catalog-import/cleanup.mts --apply    backs up every touched row, then applies
// 1. Frames: every catalog bike's frame becomes <brand> <family> <material> (frames.tsv),
//    shared by the build levels of one family. Riders' bikes from that model follow.
// 2. "+" fixes: links that lost a "+" (Deluxe Select+ saved as Deluxe Select) are
//    pointed at the right part, using the hand-checked .json files.
// 3. Merges: the same product saved twice (one with the series, one without, or
//    CUES vs Linkglide naming) becomes one part. Every link moves to the kept row.
// 4. Parts nothing points at any more are deleted.
// Riders' parts keep their wear: moving a part to another catalog row resets wear
// (components_set_wear_baseline), so the old wear numbers are written back after.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const { createComponentSlug } = await import('../../src/lib/master-component-utils.ts');
const { ADMIN_ALLOWED_EMAILS } = await import('../../src/lib/admin-access.ts');
const APPLY = process.argv.includes('--apply');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function all(t: string, cols = '*') {
  let out: any[] = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await s.from(t).select(cols).range(f, f + 999);
    if (error) { if (/does not exist|schema cache/i.test(error.message)) return []; throw error; }
    out = out.concat(data); if (data.length < 1000) break;
  }
  return out;
}
const { data: admin } = await s.from('app_users').select('id').eq('email', ADMIN_ALLOWED_EMAILS[0]).single();
const masters = await all('master_components', 'id,name,brand,series,model,size,system,slug');
const bmc = await all('bike_model_components');
const comps = await all('components', 'id,equipment_id,master_component_id,name,size,wear_km,wear_hours,adjusted_km,wear_percentage');
const equipment = await all('equipment', 'id,master_bike_model_id,brand,model,model_year');
const bikes = await all('bike_models', 'id,brand,model,model_year');
// Other tables that point at a catalog part, and the column that does it.
const OTHER_REFS: [string, string][] = [['component_replacement_events', 'master_component_id'], ['component_failures', 'component_id'], ['component_lifespan_stats', 'component_id'], ['lifespan_observations', 'master_component_id']];
const otherRefs = new Map<string, any[]>();
for (const [t, col] of OTHER_REFS) otherRefs.set(t, await all(t, `id,${col}`).catch(() => []));

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');
const normNoPlus = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const same = (a: any, b: any) => ['brand', 'name', 'series', 'model'].every((k) => norm(a[k]) === norm(b[k]));
const byId = new Map(masters.map((m) => [m.id, m]));
const slugs = new Set(masters.map((m) => m.slug).filter(Boolean));
const created: any[] = [];
function findOrCreate(want: { name: string; brand: string | null; series: string | null; model: string | null; system: string }) {
  const hit = masters.find((m) => same(m, want)) ?? created.find((m) => same(m, want));
  if (hit) return hit;
  const base = createComponentSlug(want) ?? randomUUID(); let slug = base, n = 1;
  while (slugs.has(slug)) slug = `${base}-${++n}`;
  slugs.add(slug);
  const row = { id: randomUUID(), ...want, slug, created_by: admin!.id, isNew: true };
  created.push(row); return row;
}
const label = (m: any) => [m.brand, m.series, m.model].filter(Boolean).join(' / ') || '(blank)';

// Planned link moves: bmc rows and rider components, old master -> new master.
const bmcMoves = new Map<string, { to: string; size?: string | null }>();
const compMoves = new Map<string, string>();
// Garage bikes made from a catalog bike. Most older ones don't record which, so
// fall back to the same brand, model and year.
const bikeEquip = (bikeId: string) => {
  const b = bikes.find((x) => x.id === bikeId);
  return new Set(equipment.filter((e) => e.master_bike_model_id === bikeId || (!e.master_bike_model_id && b
    && normNoPlus(e.brand) === normNoPlus(b.brand) && normNoPlus(e.model) === normNoPlus(b.model) && e.model_year === b.model_year)).map((e) => e.id));
};
function moveBikePart(bikeId: string, row: any, to: string, carrySize: string | null) {
  if (row.master_component_id === to) return;
  bmcMoves.set(row.id, { to, size: row.size ? undefined : carrySize });
  const eq = bikeEquip(bikeId);
  for (const c of comps) if (eq.has(c.equipment_id) && c.master_component_id === row.master_component_id && c.name === row.component_name) compMoves.set(c.id, to);
}

// 1. Frames
const report: string[] = [];
for (const line of readFileSync(join(here, 'frames.tsv'), 'utf8').trim().split('\n')) {
  const [brand, model, year, family, material] = line.split('|');
  const bike = bikes.find((b) => b.brand === brand && b.model === model && String(b.model_year) === year);
  if (!bike) { report.push(`! frames.tsv: no catalog bike ${brand} ${model} ${year}`); continue; }
  const row = bmc.find((r) => r.bike_model_id === bike.id && (byId.get(r.master_component_id)?.name ?? r.component_name) === 'Frame');
  const target = findOrCreate({ name: 'Frame', brand, series: family, model: material, system: 'Frameset' });
  if (!row) { report.push(`! ${brand} ${model} ${year}: no frame part; adding one`); bmcMoves.set(`new:${bike.id}`, { to: target.id }); continue; }
  const old = byId.get(row.master_component_id);
  if (old?.id !== target.id) {
    report.push(`frame  ${brand} ${model} ${year}: ${label(old)} -> ${label(target)}${(target as any).isNew ? ' (new)' : ''}`);
    moveBikePart(bike.id, row, target.id, old?.size ?? null);
  }
}

// 2. "+" fixes from the hand-checked files
const P = join(here, 'pages');
for (const f of readdirSync(P).filter((f) => f.endsWith('.saved'))) {
  const bikeId = readFileSync(join(P, f), 'utf8').trim();
  const jf = join(P, f.replace(/\.saved$/, '.json')); if (!existsSync(jf)) continue;
  const checked = JSON.parse(readFileSync(jf, 'utf8'));
  for (const row of bmc.filter((r) => r.bike_model_id === bikeId)) {
    const m = byId.get(row.master_component_id); if (!m || m.name === 'Frame') continue;
    const c = checked.components.find((x: any) => x.name === m.name && normNoPlus(x.brand) === normNoPlus(m.brand) && normNoPlus(`${x.series ?? ''}${x.model ?? ''}`) === normNoPlus(`${m.series ?? ''}${m.model ?? ''}`));
    if (!c || norm(`${c.series ?? ''}${c.model ?? ''}`) === norm(`${m.series ?? ''}${m.model ?? ''}`)) continue;
    const target = findOrCreate({ name: m.name, brand: c.brand ?? null, series: c.series ?? null, model: c.model ?? null, system: m.system });
    report.push(`plus   ${checked.brand} ${checked.model}: ${m.name} ${label(m)} -> ${label(target)}`);
    moveBikePart(bikeId, row, target.id, null);
  }
}

// 3. Merges: same brand + slot + product code; one has no series, or the series are
//    the same apart from case / CUES-vs-Linkglide naming; models equal apart from a
//    Shimano/SRAM prefix (CS-, RD-, CN-, ...).
const code = (m: any) => normNoPlus(m.model).replace(/^(cs|rd|fd|fc|st|sl|bl|br|sm|rt|cn|hg)(?=[a-z]?\d)/, '');
const seriesKey = (v: any) => normNoPlus(v).replace(/^linkglide$/, 'cues').replace(/^cues\d+$/, 'cues');
const mergeInto = new Map<string, string>();
const groups = new Map<string, any[]>();
for (const m of masters) {
  if (!m.model || !/\d/.test(m.model) || m.name === 'Frame') continue;
  const k = `${normNoPlus(m.brand)}|${m.name}|${code(m)}`; groups.set(k, [...(groups.get(k) ?? []), m]);
}
for (const g of groups.values()) {
  if (g.length < 2) continue;
  const named = g.filter((m) => m.series); const keys = new Set(named.map((m) => seriesKey(m.series)));
  if (keys.size > 1) continue;                      // different series: not sure it's one product
  if (g.some((m) => norm(m.model).includes('plus') !== norm(g[0].model).includes('plus'))) continue;
  const uses = (m: any) => bmc.filter((r) => r.master_component_id === m.id).length;
  const keep = [...g].sort((a, b) => Number(!!b.series) - Number(!!a.series) || uses(b) - uses(a))[0];
  for (const m of g) if (m.id !== keep.id) { mergeInto.set(m.id, keep.id); report.push(`merge  ${m.name}: ${label(m)} -> ${label(keep)}`); }
}

// What each row will point at once everything above is done.
const finalTarget = (id: string) => mergeInto.get(id) ?? id;
const finalBmc = bmc.map((r) => finalTarget(bmcMoves.get(r.id)?.to ?? r.master_component_id));
const finalComps = comps.map((c) => finalTarget(compMoves.get(c.id) ?? c.master_component_id));
const used = new Set<string>([...finalBmc, ...finalComps].filter(Boolean));
for (const [t, col] of OTHER_REFS) for (const r of otherRefs.get(t)!) if (r[col]) used.add(finalTarget(r[col]));
const toDelete = masters.filter((m) => !used.has(m.id));

const ridersMoved = new Set([...compMoves.keys(), ...comps.filter((c) => mergeInto.has(c.master_component_id)).map((c) => c.id)]);
console.log(report.sort().join('\n'));
console.log(`\nSummary: ${created.length} new parts · ${bmcMoves.size} catalog links moved · ${mergeInto.size} parts merged · ${ridersMoved.size} riders' parts moved (wear kept) · ${toDelete.length} unused parts deleted`);
console.log(`Parts before ${masters.length}, after ${masters.length + created.length - toDelete.length}`);
if (process.argv.includes("--list")) for (const m of toDelete) console.log("  del", m.name, "|", label(m));
if (!APPLY) { console.log('\nDry run: nothing changed. Add --apply to do it.'); process.exit(0); }

// ---- apply ----
const backup = { at: new Date().toISOString(), masters: toDelete.concat(masters.filter((m) => mergeInto.has(m.id))), bmc: bmc.filter((r) => bmcMoves.has(r.id) || mergeInto.has(r.master_component_id)), comps: comps.filter((c) => ridersMoved.has(c.id)), otherRefs: Object.fromEntries([...otherRefs].map(([t, rows]) => [t, rows.filter((r) => mergeInto.has(r[OTHER_REFS.find(([x]) => x === t)![1]]))])) };
const bpath = join(process.env.BACKUP_DIR ?? here, `cleanup-backup-${Date.now()}.json`);
writeFileSync(bpath, JSON.stringify(backup, null, 1)); console.log('Backup:', bpath);
const ok = (r: { error: any }, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); };

for (const m of created) { const { isNew, ...row } = m as any; ok(await s.from('master_components').insert(row), `insert ${label(m)}`); }
for (const [key, mv] of bmcMoves) {
  if (key.startsWith('new:')) { ok(await s.from('bike_model_components').insert({ id: randomUUID(), bike_model_id: key.slice(4), master_component_id: mv.to, component_name: 'Frame', system: 'Frameset' }), 'add frame'); continue; }
  ok(await s.from('bike_model_components').update({ master_component_id: finalTarget(mv.to), ...(mv.size !== undefined && mv.size ? { size: mv.size } : {}) }).eq('id', key), `move link ${key}`);
}
for (const [id, keep] of mergeInto) {
  ok(await s.from('bike_model_components').update({ master_component_id: keep }).eq('master_component_id', id), 'merge links');
  for (const [t, col] of OTHER_REFS) if (otherRefs.get(t)!.some((r) => r[col] === id)) ok(await s.from(t).update({ [col]: keep }).eq(col, id), `merge ${t}`);
}
for (const c of comps.filter((c) => ridersMoved.has(c.id))) {
  const to = finalTarget(compMoves.get(c.id) ?? c.master_component_id);
  ok(await s.from('components').update({ master_component_id: to }).eq('id', c.id), 'move rider part');
  // Put the wear back: the trigger zeroed it because the catalog row changed.
  ok(await s.from('components').update({ wear_km: c.wear_km, wear_hours: c.wear_hours, adjusted_km: c.adjusted_km, wear_percentage: c.wear_percentage }).eq('id', c.id), 'restore wear');
}
for (const m of toDelete) ok(await s.from('master_components').delete().eq('id', m.id), `delete ${label(m)}`);
console.log('Done.');
