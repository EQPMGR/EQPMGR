import { GenerateMaintenanceScheduleInput, GenerateMaintenanceScheduleOutput } from '@/lib/ai-types';

const parseNumberField = (value: any) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseWearAndTearData = (raw?: string) => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((entry: any) => {
      const name = String(entry.name || '').trim();
      const wear = typeof entry.wear === 'string'
        ? parseFloat(entry.wear.replace('%', '').trim())
        : Number(entry.wear || 0);

      return {
        name,
        wearPercentage: Number.isFinite(wear) ? Math.max(0, Math.min(100, wear)) : 0,
        expectedReplacementKm: parseNumberField(entry.expectedReplacementKm),
        currentDistance: parseNumberField(entry.currentDistance),
        installedAtDistance: parseNumberField(entry.installedAtDistance),
      };
    });
  } catch {
    return [];
  }
};

const parseManufacturerGuidelines = (raw?: string) => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeComponent = (name: string) => name.toLowerCase();

const getUrgency = (wear: number, remainingKm?: number) => {
  if (remainingKm !== undefined) {
    if (remainingKm <= 0) return 'High' as const;
    if (remainingKm <= 500) return 'High' as const;
    if (remainingKm <= 1500) return 'Medium' as const;
  }

  if (wear >= 85) return 'High' as const;
  if (wear >= 65) return 'Medium' as const;
  return 'Low' as const;
};

const getComponentAction = (name: string, wear: number, remainingKm?: number) => {
  if (remainingKm !== undefined) {
    if (remainingKm <= 0) return `Replace ${name} now`;
    if (remainingKm <= 500) return `Replace ${name} soon`;
    if (remainingKm <= 1500) return `Inspect ${name}`;
  }

  if (wear >= 85) return `Replace ${name} soon`;
  if (wear >= 65) return `Inspect ${name}`;
  return `Monitor ${name}`;
};

const buildScheduleItem = (
  name: string,
  wear: number,
  expectedReplacementKm?: number,
  currentDistance?: number,
  installedAtDistance?: number
) => {
  const remainingDistance = typeof expectedReplacementKm === 'number'
    ? typeof currentDistance === 'number'
      ? expectedReplacementKm - currentDistance
      : undefined
    : undefined;

  const urgency = getUrgency(wear, remainingDistance);
  const action = getComponentAction(name, wear, remainingDistance);
  const reasonParts = [`Current wear is ${wear.toFixed(0)}%`];

  if (typeof remainingDistance === 'number') {
    reasonParts.push(
      `Estimated ${Math.max(0, remainingDistance).toFixed(0)} km remaining before expected replacement.`
    );
  } else if (typeof expectedReplacementKm === 'number') {
    reasonParts.push(
      `Expected replacement life is ${expectedReplacementKm.toFixed(0)} km, but current mileage is not available.`
    );
  }

  if (/chain|cassette|chainring|derailleur/i.test(name) && wear >= 65) {
    reasonParts.push('Drivetrain components wear faster under load and should be inspected regularly.');
  }
  if (/brake pad|rotor|brake lever/i.test(name) && wear >= 65) {
    reasonParts.push('Brake components are safety-critical and should be replaced before they deteriorate further.');
  }
  if (/tire|rim|hub/i.test(name) && wear >= 65) {
    reasonParts.push('Wheelset wear can affect handling; check for cuts or damage on every ride.');
  }
  if (/suspension|fork|shock/i.test(name) && wear >= 65) {
    reasonParts.push('Suspension service intervals are usually time- or hour-based, not just wear-based.');
  }

  if (typeof installedAtDistance === 'number' && typeof currentDistance === 'number') {
    const lifetimeDistance = currentDistance - installedAtDistance;
    if (lifetimeDistance > 0) {
      reasonParts.push(`This part has been installed for ${lifetimeDistance.toFixed(0)} km.`);
    }
  }

  return {
    component: name,
    action,
    reason: reasonParts.join(' '),
    urgency,
  };
};

const buildGuidelineItems = (guidelines: Record<string, any>) => {
  return Object.entries(guidelines).map(([key, value]) => {
    return {
      component: key,
      action: typeof value === 'string' ? value : 'Follow manufacturer guideline',
      reason: 'Manufacturer guideline provided for this component.',
      urgency: 'Low' as const,
    };
  });
};

export function generateMaintenanceSchedule(input: GenerateMaintenanceScheduleInput): GenerateMaintenanceScheduleOutput {
  const { equipmentType, wearAndTearData, manufacturerGuidelines } = input;

  const wearData = parseWearAndTearData(wearAndTearData);
  const guidelines = parseManufacturerGuidelines(manufacturerGuidelines);

  const componentItems = wearData.map((entry) => buildScheduleItem(entry.name, entry.wearPercentage));
  const guidelineItems = buildGuidelineItems(guidelines);

  const items = [...componentItems];

  guidelineItems.forEach((guidelineItem) => {
    const existingIndex = items.findIndex(
      (item) => item.component.toLowerCase() === guidelineItem.component.toLowerCase()
    );
    if (existingIndex === -1) {
      items.push(guidelineItem);
    } else if (items[existingIndex].urgency === 'Low' && guidelineItem.urgency !== 'Low') {
      items[existingIndex] = guidelineItem;
    }
  });

  if (!items.length) {
    items.push({
      component: equipmentType,
      action: 'Keep an eye on general maintenance',
      reason: 'No component wear data was available. Check gear periodically.',
      urgency: 'Low' as const,
    });
  }

  const maintenanceSchedule = JSON.stringify(items, null, 2);

  return { maintenanceSchedule };
}
