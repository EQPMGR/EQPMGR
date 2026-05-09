import { SimulateWearInput, SimulateWearOutput } from '@/lib/ai-types';

const INTENSITY_FACTORS: Record<string, number> = {
  low: 0.85,
  medium: 1,
  high: 1.25,
};

const DEFAULT_BASE_KM = 12000;

const COMPONENT_BASE_LIFESPANS = [
  { match: /chain/i, baseKm: 3500, category: 'Drivetrain' },
  { match: /cassette/i, baseKm: 8000, category: 'Drivetrain' },
  { match: /chainring|chain ring/i, baseKm: 18000, category: 'Drivetrain' },
  { match: /jockey|pulley/i, baseKm: 6000, category: 'Drivetrain' },
  { match: /cable|wire/i, baseKm: 5000, category: 'Controls' },
  { match: /brake pad/i, baseKm: 3000, category: 'Brakes' },
  { match: /rotor/i, baseKm: 18000, category: 'Brakes' },
  { match: /brake lever/i, baseKm: 20000, category: 'Brakes' },
  { match: /rim/i, baseKm: 25000, category: 'Wheelset' },
  { match: /hub/i, baseKm: 20000, category: 'Wheelset' },
  { match: /tire/i, baseKm: 4000, category: 'Wheelset' },
  { match: /tube/i, baseKm: 4000, category: 'Wheelset' },
  { match: /fork/i, baseKm: 35000, category: 'Frameset' },
  { match: /frame/i, baseKm: 50000, category: 'Frameset' },
  { match: /stem/i, baseKm: 25000, category: 'Cockpit' },
  { match: /handlebar/i, baseKm: 25000, category: 'Cockpit' },
  { match: /seatpost/i, baseKm: 30000, category: 'Cockpit' },
  { match: /saddle/i, baseKm: 12000, category: 'Cockpit' },
  { match: /grip|bar tape/i, baseKm: 6000, category: 'Cockpit' },
  { match: /bottom bracket/i, baseKm: 12000, category: 'Drivetrain' },
  { match: /rear derailleur|front derailleur/i, baseKm: 12000, category: 'Drivetrain' },
  { match: /shock|suspension/i, baseHours: 50, category: 'Suspension' },
  { match: /dropper/i, baseHours: 100, category: 'Suspension' },
];

const WEATHER_FACTORS: Array<{ match: RegExp; factor: number }> = [
  { match: /mud|grit|sand|filth|dirty/i, factor: 1.35 },
  { match: /rain|wet|sleet|storm/i, factor: 1.25 },
  { match: /snow|ice|slush/i, factor: 1.45 },
  { match: /wind|breeze/i, factor: 1.05 },
  { match: /hot|heat/i, factor: 1.1 },
  { match: /cold|chill|freezing/i, factor: 1.1 },
];

const EQUIPMENT_TYPE_ADJUSTMENTS: Array<{ match: RegExp; factor: number }> = [
  { match: /gravel|cyclocross/i, factor: 1.15 },
  { match: /mtb|mountain/i, factor: 1.2 },
  { match: /road/i, factor: 1.0 },
  { match: /running/i, factor: 1.0 },
];

function parseWearAndTearData(raw?: string) {
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
        currentWear: Number.isFinite(wear) ? Math.max(0, Math.min(100, wear)) : 0,
      };
    });
  } catch {
    return [];
  }
}

function parseManufacturerGuidelines(raw?: string) {
  if (!raw) return {};

  try {
    const value = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? value : {};
  } catch {
    return {};
  }
}

function getBaseLife(componentName: string) {
  const normalized = componentName.trim();
  const match = COMPONENT_BASE_LIFESPANS.find(entry => entry.match.test(normalized));
  if (match) {
    return {
      baseKm: match.baseKm || DEFAULT_BASE_KM,
      baseHours: match.baseHours,
      category: match.category,
    };
  }

  return {
    baseKm: DEFAULT_BASE_KM,
    baseHours: undefined,
    category: 'General',
  };
}

function getWeatherFactor(conditions: string) {
  let factor = 1;
  for (const entry of WEATHER_FACTORS) {
    if (entry.match.test(conditions)) {
      factor = Math.max(factor, entry.factor);
    }
  }
  return factor;
}

function getEquipmentTypeFactor(equipmentType: string) {
  const normalized = equipmentType || '';
  for (const entry of EQUIPMENT_TYPE_ADJUSTMENTS) {
    if (entry.match.test(normalized)) {
      return entry.factor;
    }
  }
  return 1;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function buildRecommendation(componentName: string, wear: number) {
  if (wear >= 95) {
    return `Replace ${componentName} immediately; it is at ${wear.toFixed(0)}% wear.`;
  }
  if (wear >= 85) {
    return `Inspect ${componentName} before your next ride; it is at ${wear.toFixed(0)}% wear.`;
  }
  if (wear >= 70) {
    return `Monitor ${componentName} closely; it is at ${wear.toFixed(0)}% wear.`;
  }
  return '';
}

export function simulateWear(input: SimulateWearInput): SimulateWearOutput {
  const {
    equipmentType,
    workoutType,
    distance,
    duration,
    intensity,
    environmentalConditions,
    wearAndTearData,
    manufacturerGuidelines,
  } = input;

  const parsedWearData = parseWearAndTearData(wearAndTearData);
  const weatherFactor = getWeatherFactor(environmentalConditions || '');
  const equipmentFactor = getEquipmentTypeFactor(equipmentType);
  const intensityFactor = INTENSITY_FACTORS[intensity] ?? 1;
  const isRunningWorkout = /run|jog|trail/i.test(workoutType);
  const durationHours = Math.max(0.1, duration / 60);

  const parsedGuidelines = parseManufacturerGuidelines(manufacturerGuidelines);
  const guidelineNotes: string[] = [];
  if (parsedGuidelines.chain) guidelineNotes.push('Manufacturer guidelines include chain care details.');
  if (parsedGuidelines.cassette) guidelineNotes.push('Manufacturer guidelines include cassette care details.');

  const componentWear = parsedWearData.map((component) => {
    const baseline = getBaseLife(component.name);
    const baseKm = baseline.baseKm ?? DEFAULT_BASE_KM;

    const distanceFactor = isRunningWorkout
      ? Math.min(1, distance / 10)
      : Math.max(0.01, distance / baseKm);

    const timeFactor = baseline.baseHours
      ? Math.min(1, durationHours / (baseline.baseHours || 1))
      : 0;

    let deltaWear = 0;
    if (baseline.baseHours) {
      deltaWear = timeFactor * 100 * intensityFactor * weatherFactor * equipmentFactor;
    } else {
      deltaWear = distanceFactor * 100 * intensityFactor * weatherFactor * equipmentFactor;
    }

    if (/brake pad/i.test(component.name) && !/road|mtb|mountain/i.test(equipmentType)) {
      deltaWear *= 1.05;
    }

    if (/tire/i.test(component.name) && /gravel|cyclocross/i.test(equipmentType)) {
      deltaWear *= 1.15;
    }

    if (/chain/i.test(component.name) && /mud|rain|wet/i.test(environmentalConditions)) {
      deltaWear *= 1.15;
    }

    if (/suspension|shock|fork/i.test(component.name)) {
      deltaWear *= 1.1;
    }

    const newWear = clamp(component.currentWear + deltaWear, 0, 100);

    return {
      componentName: component.name,
      wearPercentage: Number(newWear.toFixed(2)),
    };
  });

  const totalWear = componentWear.length
    ? componentWear.reduce((sum, item) => sum + item.wearPercentage, 0) / componentWear.length
    : 0;

  const recommendations = componentWear
    .map((item) => buildRecommendation(item.componentName, item.wearPercentage))
    .filter(Boolean);

  if (weatherFactor > 1.1) {
    recommendations.unshift(
      `Weather conditions indicate accelerated wear. Conditions were reported as: ${environmentalConditions}.`
    );
  }

  if (intensity === 'high') {
    recommendations.unshift('High-intensity activity increases wear and may shorten component life.');
  }

  if (!recommendations.length) {
    recommendations.push('No immediate replacement is required. Keep monitoring component wear over time.');
  }

  if (guidelineNotes.length) {
    recommendations.push(...guidelineNotes);
  }

  return {
    wearPercentage: Number(clamp(totalWear, 0, 100).toFixed(2)),
    componentWear,
    recommendations,
  };
}
