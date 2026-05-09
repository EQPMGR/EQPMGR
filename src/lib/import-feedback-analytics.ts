import { getServerDb } from '@/backend';

type FeedbackRecord = {
  id?: string;
  userId: string;
  bikeModelId: string;
  equipmentId: string;
  source: string;
  rawText: string;
  parsedOutput: any;
  finalOutput: any;
  createdAt: string;
};

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const extractComponentKey = (component: any) => {
  if (!component) return '';
  return normalizeString(component.name) || normalizeString(component.model) || normalizeString(component.series);
};

export async function getImportFeedbackRecords(limit = 1000) {
  const db = await getServerDb();
  const snapshot = await db.getDocs('importTextFeedback', { type: 'orderBy', field: 'createdAt', direction: 'desc' }, { type: 'limit', value: limit });
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data })) as FeedbackRecord[];
}

export function analyzeImportFeedback(records: FeedbackRecord[]) {
  const stats = {
    totalFeedback: records.length,
    brandCorrections: 0,
    modelCorrections: 0,
    yearCorrections: 0,
    addedComponents: new Map<string, number>(),
    removedComponents: new Map<string, number>(),
    componentFieldChanges: new Map<string, number>(),
    topComponentRenames: new Map<string, number>(),
  };

  const mapIncrement = (map: Map<string, number>, key: string) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  };

  for (const record of records) {
    const parsed = record.parsedOutput || {};
    const final = record.finalOutput || {};

    if (normalizeString(parsed.brand) !== normalizeString(final.brand)) stats.brandCorrections += 1;
    if (normalizeString(parsed.model) !== normalizeString(final.model)) stats.modelCorrections += 1;
    if (String(parsed.modelYear || '') !== String(final.modelYear || '')) stats.yearCorrections += 1;

    const parsedComponents = Array.isArray(parsed.components) ? parsed.components : [];
    const finalComponents = Array.isArray(final.components) ? final.components : [];

    const parsedByName = new Map<string, any>();
    for (const comp of parsedComponents) {
      const key = extractComponentKey(comp);
      if (!key) continue;
      parsedByName.set(key, comp);
    }

    const finalByName = new Map<string, any>();
    for (const comp of finalComponents) {
      const key = extractComponentKey(comp);
      if (!key) continue;
      finalByName.set(key, comp);
    }

    for (const key of Array.from(finalByName.keys())) {
      if (!parsedByName.has(key)) {
        mapIncrement(stats.addedComponents, key);
      }
    }
    for (const key of Array.from(parsedByName.keys())) {
      if (!finalByName.has(key)) {
        mapIncrement(stats.removedComponents, key);
      }
    }

    for (const key of Array.from(finalByName.keys())) {
      const finalComp = finalByName.get(key);
      const parsedComp = parsedByName.get(key);
      if (!parsedComp || !finalComp) continue;
      const changedFields = ['name', 'brand', 'series', 'model', 'size'].filter((field) => normalizeString(parsedComp[field]) !== normalizeString(finalComp[field]));
      if (changedFields.length > 0) {
        mapIncrement(stats.componentFieldChanges, `${key}:${changedFields.join(',')}`);
      }
    }

    for (const parsedKey of Array.from(parsedByName.keys())) {
      const parsedComp = parsedByName.get(parsedKey);
      if (!parsedComp) continue;
      for (const finalKey of Array.from(finalByName.keys())) {
        const finalComp = finalByName.get(finalKey);
        if (!finalComp) continue;
        if (parsedKey !== finalKey && normalizeString(parsedComp.brand) === normalizeString(finalComp.brand)) {
          if (normalizeString(parsedComp.model) === normalizeString(finalComp.model) || normalizeString(parsedComp.series) === normalizeString(finalComp.series)) {
            mapIncrement(stats.topComponentRenames, `${parsedKey} → ${finalKey}`);
          }
        }
      }
    }
  }

  const toTopList = (map: Map<string, number>, limit = 10) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));

  return {
    totalFeedback: stats.totalFeedback,
    brandCorrections: stats.brandCorrections,
    modelCorrections: stats.modelCorrections,
    yearCorrections: stats.yearCorrections,
    topAddedComponents: toTopList(stats.addedComponents),
    topRemovedComponents: toTopList(stats.removedComponents),
    topComponentFieldChanges: toTopList(stats.componentFieldChanges),
    topComponentRenames: toTopList(stats.topComponentRenames),
  };
}
