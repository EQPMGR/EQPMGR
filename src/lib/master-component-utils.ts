import type { MasterComponent } from '@/lib/types';

type Db = any;

// Includes series, so "Shimano / 105" and "Shimano / Tiagra" front brakes get
// different slugs. (Before 2026-11-19 series was left out; older rows keep
// their old slugs, so never treat a slug match alone as proof two parts are
// the same: check isSameCatalogPart.)
export const createComponentSlug = (component: Partial<MasterComponent>) => {
  const idString = [component.brand, component.name, component.series, component.model]
    .filter(Boolean)
    .join('-');

  if (!idString) return null;

  return idString
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// A "+" is part of a name: RockShox Deluxe Select+ is not Deluxe Select.
const normPart = (value: unknown) => String(value ?? '').toLowerCase().replace(/\+/g, 'plus').replace(/[^a-z0-9]/g, '');

/**
 * True only when two parts are the same catalog part: same brand, slot (name),
 * series and model, ignoring case and punctuation. A blank only equals a blank,
 * so "Shimano / Front Brake" (no series) is not "Shimano / 105 / Front Brake".
 */
export const isSameCatalogPart = (a: Record<string, any>, b: Record<string, any>) =>
  (['brand', 'name', 'series', 'model'] as const).every((field) => normPart(a[field]) === normPart(b[field]));

export const getCanonicalComponentKey = (component: Record<string, any>) => {
  const fields = [
    component.name,
    component.brand,
    component.series,
    component.model,
    component.system,
    component.size,
    component.chainring1,
    component.chainring2,
    component.chainring3,
  ];

  return fields.map((value) => String(value || '').trim().toLowerCase()).join('|');
};

export const findExistingMasterComponent = async (db: Db, component: Record<string, any>) => {
  if (!component) return null;

  const slug = createComponentSlug(component as Partial<MasterComponent>);
  if (slug) {
    try {
      const slugQuery = await db.getDocs(
        'masterComponents',
        { type: 'where', field: 'slug', op: '==', value: slug }
      );

      const sameSlug = slugQuery.docs.find((doc: any) => isSameCatalogPart(doc.data || {}, component));
      if (sameSlug) {
        return { id: sameSlug.id, data: sameSlug.data };
      }
    } catch (error: any) {
      console.warn('Slug lookup failed for masterComponents, continuing without slug dedupe:', error?.message || error);
    }
  }

  const constraints: Array<{ type: 'where'; field: string; op: '=='; value: any }> = [];
  ['brand', 'series', 'model', 'system', 'name', 'size'].forEach((field) => {
    const value = component[field];
    if (value !== undefined && value !== null && value !== '') {
      constraints.push({ type: 'where', field, op: '==', value });
    }
  });

  if (constraints.length === 0) {
    return null;
  }

  const results = (await db.getDocs('masterComponents', ...constraints)) as any;
  if (results.empty) {
    return null;
  }

  return results.docs.find((doc: any) => {
    const data = doc.data || {};
    return [
      'size',
      'chainring1',
      'chainring2',
      'chainring3',
    ].every((field) => {
      const rawValue = component[field];
      if (rawValue === undefined || rawValue === null || rawValue === '') {
        return !data[field];
      }
      return String(data[field]) === String(rawValue);
    });
  }) || null;
};
