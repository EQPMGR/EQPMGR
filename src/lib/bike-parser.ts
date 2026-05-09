import type { ExtractBikeDetailsOutput } from './ai-types';

const KNOWN_BRANDS = [
  'SRAM', 'Shimano', 'Campagnolo', 'Pinarello', 'Trek', 'Specialized', 'Giant', 'Canyon', 'Santa Cruz', 'Fox',
  'RockShox', 'Enve', 'WTB', 'Maxxis', 'Vittoria', 'Pirelli', 'Continental', 'DT Swiss', 'Zipp', 'Reynolds',
  'Cane Creek', 'Bosch', 'BMC', 'Orbea', 'Scott', 'Cannondale', 'Tifosi', 'Garmin', 'Bosch', 'FSA', 'Roval',
  'Easton', 'PRO', 'Thomson', 'Niner', 'Mavic', 'Hope', 'SR Suntour', 'BMC', 'Selle Italia', 'Prologo', 'E*thirteen', 'Magura',
  'Norco', 'Hayes', 'Bontrager', 'Clement', 'Alex',
];

const COMPONENT_PATTERNS: Array<{ regex: RegExp; name: string; system: ExtractBikeDetailsOutput['components'][number]['system'] }> = [
  { regex: /rear derailleur/i, name: 'Rear Derailleur', system: 'Drivetrain' },
  { regex: /front derailleur/i, name: 'Front Derailleur', system: 'Drivetrain' },
  { regex: /derailleur/i, name: 'Derailleur', system: 'Drivetrain' },
  { regex: /fork/i, name: 'Fork', system: 'Frameset' },
  { regex: /frame|frameset/i, name: 'Frame', system: 'Frameset' },
  { regex: /headset/i, name: 'Headset', system: 'Frameset' },
  { regex: /suspension|shock/i, name: 'Suspension', system: 'Frameset' },
  { regex: /cassette|freewheel/i, name: 'Cassette', system: 'Drivetrain' },
  { regex: /chainrings?|chain ring|chainring/i, name: 'Chainring', system: 'Drivetrain' },
  { regex: /chain tensioner|tensioner/i, name: 'Chain Tensioner', system: 'Drivetrain' },
  { regex: /b\/?b|bottom bracket/i, name: 'Bottom Bracket', system: 'Drivetrain' },
  { regex: /\bchain(?:set)?\b/i, name: 'Chain', system: 'Drivetrain' },
  { regex: /crankset|crank/i, name: 'Crankset', system: 'Drivetrain' },
  { regex: /shifter|shift[\/\- ]?brake|shift lever|shift\/brake/i, name: 'Shifter', system: 'Drivetrain' },
  { regex: /skewer/i, name: 'Skewer', system: 'Wheelset' },
  { regex: /brake levers?|lever/i, name: 'Brake Lever', system: 'Brakes' },
  { regex: /brake caliper/i, name: 'Brake Caliper', system: 'Brakes' },
  { regex: /brake rotor/i, name: 'Brake Rotor', system: 'Brakes' },
  { regex: /front brake|rear brake/i, name: 'Brake', system: 'Brakes' },
  { regex: /brake/i, name: 'Brake', system: 'Brakes' },
  { regex: /handlebar\s+tape|\bbar tape\b/i, name: 'Bar Tape', system: 'Cockpit' },
  { regex: /tire|tyre/i, name: 'Tire', system: 'Wheelset' },
  { regex: /wheel/i, name: 'Wheel', system: 'Wheelset' },
  { regex: /rim/i, name: 'Rim', system: 'Wheelset' },
  { regex: /hub/i, name: 'Hub', system: 'Wheelset' },
  { regex: /handlebar/i, name: 'Handlebar', system: 'Cockpit' },
  { regex: /\bstem\b/i, name: 'Stem', system: 'Cockpit' },
  { regex: /seat post clamp|seatpost clamp/i, name: 'Seatpost Clamp', system: 'Cockpit' },
  { regex: /seatpost|seat post/i, name: 'Seatpost', system: 'Cockpit' },
  { regex: /saddle/i, name: 'Saddle', system: 'Cockpit' },
  { regex: /motor/i, name: 'Motor', system: 'E-Bike' },
  { regex: /battery/i, name: 'Battery', system: 'E-Bike' },
  { regex: /charger/i, name: 'Charger', system: 'E-Bike' },
  { regex: /controller/i, name: 'Controller', system: 'E-Bike' },
  { regex: /display/i, name: 'Display', system: 'E-Bike' },
  { regex: /suspension|shock/i, name: 'Suspension', system: 'Frameset' },
  { regex: /grip|grips/i, name: 'Grips', system: 'Cockpit' },
];

const SIZE_REGEX = /(\b\d+(?:-\d+)?T\b|\b\d+(?:\.\d+)?(?:mm|cm|in|")\b|\b700x\d+[a-z]?\b|\b700 x \d+[a-z]?\b|\b29x\d+\b|\b27\.5x\d+\b|\b\d+\/\d+\b)/i;
const YEAR_REGEX = /\b(19|20)\d{2}\b/;
const CHAINRING_REGEX = /(\d{1,2})(?:\s*[\/-]\s*(\d{1,2}))(?:\s*[\/-]\s*(\d{1,2}))?/;const SHIMANO_SERIES = [
  'Dura-Ace', 'Ultegra', '105', 'Tiagra', 'Sora', 'Claris',
  'XTR', 'Deore XT', 'SLX', 'Deore', 'U4000', 'U6000', 'U8000',
  'M9000', 'M9100', 'M8000', 'M8100', 'M7000', 'M7100', 'M6000', 'M6100',
];
const SHIMANO_MODEL_CODE = /\b(?:ST|FD|RD|FC|BR|CS|CN|SM|FH|RH)-[A-Z0-9]+\b/i;
const SHIMANO_CODE_SERIES_MAP: Array<{ pattern: RegExp; series: string }> = [
  { pattern: /\b(?:ST|FD|RD|FC|BR|CS|CN|SM|FH|RH)-?9(?:000|100|200)\b/i, series: 'Dura-Ace' },
  { pattern: /\b(?:ST|FD|RD|FC|BR|CS|CN|SM|FH|RH)-?8(?:000|100)\b/i, series: 'Ultegra' },
  { pattern: /\b(?:ST|FD|RD|FC|BR|CS|CN|SM|FH|RH)-?7(?:000|100)\b/i, series: '105' },
  { pattern: /\b(?:ST|FD|RD|FC|BR|CS|CN|SM|FH|RH)-?4(?:600|700)\b/i, series: 'Tiagra' },
  { pattern: /\b(?:ST|FD|RD|FC|BR|CS|CN|SM|FH|RH)-?3(?:000|500)\b/i, series: 'Sora' },
  { pattern: /\b(?:ST|FD|RD|FC|BR|CS|CN|SM|FH|RH)-?2(?:000|400)\b/i, series: 'Claris' },
  { pattern: /\b(?:RD|FC|CS|CN|FH|SM)-?M9(?:000|100)\b/i, series: 'XTR' },
  { pattern: /\b(?:RD|FC|CS|CN|FH|SM)-?M8(?:000|100)\b/i, series: 'Deore XT' },
  { pattern: /\b(?:RD|FC|CS|CN|FH|SM)-?M7(?:000|100)\b/i, series: 'SLX' },
  { pattern: /\b(?:RD|FC|CS|CN|FH|SM)-?M6(?:000|100)\b/i, series: 'Deore' },
  { pattern: /\b(?:RD|FC|CS|CN|FH|SM)-?U(?:400|600|800)\b/i, series: 'CUES' },
];
const SECTION_HEADINGS = ['frameset', 'wheels', 'drivetrain', 'components', 'suspension', 'weight', 'e-system', 'battery', 'wheels', 'drink', 'paint color'];

function normalizeLine(text: string) {
  return text
    .replace(/[\u2022•*]/g, '')
    .replace(/^[\-\*\s\d\.]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldMergeLineWithNext(line: string, nextLine: string) {
  if (!line || !nextLine) return false;
  const normalizedLine = normalizeLine(line);
  const normalizedNext = normalizeLine(nextLine);
  if (!normalizedLine || !normalizedNext) return false;
  if (/[:\t]/.test(line)) return false;
  if (/^Size\b/i.test(normalizedLine)) return false;
  if (SECTION_HEADINGS.includes(normalizedLine.toLowerCase())) return false;
  if (SECTION_HEADINGS.includes(normalizedNext.toLowerCase())) return false;
  if (/^Size\b/i.test(normalizedNext)) return false;
  if (normalizedLine.length > 30) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9\s\-\/]*$/.test(normalizedLine)) return false;
  if (/\b(?:and|with|or|mm|x|speed|size|degrees?)\b/i.test(normalizedLine)) return false;
  if (/^[A-Za-z]{1,2}$/.test(normalizedLine)) return false;
  return true;
}

function escapeRegExp(value: string) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function detectBrand(line: string) {
  const cleaned = line.replace(/[:\-]/g, ' ').trim();
  const startMatch = KNOWN_BRANDS.find((brand) => new RegExp(`^${escapeRegExp(brand)}(?=\s|$)`, 'i').test(cleaned));
  if (startMatch) return startMatch;

  const sortedBrands = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  return sortedBrands.find((brand) => new RegExp(`\\b${escapeRegExp(brand)}\\b`, 'i').test(cleaned));
}

function parseShimanoSeriesModel(candidate: string) {
  const codeMatch = candidate.match(SHIMANO_MODEL_CODE);
  const seriesMatch = SHIMANO_SERIES.find((series) => new RegExp(`\\b${series.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(candidate));
  if (!codeMatch) return null;

  const rawCode = codeMatch[0].toUpperCase();
  const inferredSeries = SHIMANO_CODE_SERIES_MAP.find((entry) => entry.pattern.test(rawCode))?.series;
  if (seriesMatch || inferredSeries) {
    return {
      series: seriesMatch || inferredSeries || undefined,
      model: rawCode,
    };
  }

  return {
    series: undefined,
    model: rawCode,
  };
}

function parseSeriesAndModel(text: string, brand?: string, componentName?: string) {
  let candidate = text;
  if (brand) {
    const escapedBrand = brand.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    candidate = candidate.replace(new RegExp(`\\b${escapedBrand}\\b`, 'i'), '').trim();
    candidate = candidate.replace(/^[\s:\-–]+/, '').trim();
  }
  if (componentName) {
    const escapedComponentName = componentName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s*');
    candidate = candidate.replace(new RegExp(`\\b${escapedComponentName}(?:s)?\\b`, 'gi'), '').trim();
  }
  candidate = candidate.replace(/^[\s:\-–]+/, '').trim();
  candidate = candidate.replace(/^(front|rear)\s+/i, '').trim();
  candidate = candidate.replace(/^[\s:\-–]+/, '').trim();
  candidate = candidate.replace(/\b(front|rear)\s*$/i, '').trim();
  candidate = candidate.replace(/^[\s:\-–]+/, '').trim();
  candidate = candidate.replace(/^(part|strip|kit|set|size)\b\s*/i, '').trim();
  candidate = candidate.replace(/\b\d+(?:\s*[-]?\s*|\s+)speed\b/gi, '').trim();
  candidate = candidate.replace(/\b(Disc|Hydraulic|Mechanical|Tubeless|Wire|Brake|Carbon|Aluminum|Mirror|Black|White|Silver|Red|Blue|Yellow|Orange|Green|Grey|Gray)\b/gi, '').trim();
  candidate = candidate.replace(/(?:\bw\/|\bwith\b).*$/i, '').trim();
  const isTire = componentName ? /tire|tyre/i.test(componentName) : false;
  if (isTire) {
    const tireSizePattern = /\b\d+-\d+T\b|\b\d+(?:\.\d+)?\s*x\s*\d+[a-z]?\b|\b700x\d+[a-z]?\b|\b700 x \d+[a-z]?\b|\b29x\d+\b|\b27\.5x\d+\b/i;
    const sizeless = candidate.replace(tireSizePattern, '').replace(/^[\s:\-–]+/, '').replace(/[\s:\-–]+$/, '').trim();
    return { series: undefined, model: sizeless || candidate, candidate };
  }
  candidate = candidate.replace(/;.*$/, '').trim();
  candidate = candidate.replace(/^[sS]\b\s*/i, '').trim();
  candidate = candidate.replace(/[\-\s]+$/g, '').trim();
  candidate = candidate.replace(/\s+/g, ' ').trim();

  if (!candidate) return { series: undefined, model: undefined, candidate: undefined };

  const shimanoParsed = parseShimanoSeriesModel(candidate);
  if (shimanoParsed) {
    return { ...shimanoParsed, candidate };
  }

  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return { series: undefined, model: words[0], candidate };
  }

  const dashSplit = candidate.split(/\s+-\s+/);
  if (dashSplit.length >= 2) {
    return {
      series: dashSplit.slice(0, -1).join(' - ').trim() || undefined,
      model: dashSplit.slice(-1)[0].trim() || undefined,
    };
  }

  const last = words[words.length - 1];
  if (/\d/.test(last) || /[A-Z]{2,}/.test(last)) {
    return { series: words.slice(0, -1).join(' ').trim() || undefined, model: last, candidate };
  }

  return { series: candidate, model: undefined, candidate };
}

function normalizeComponentFields(component: ExtractBikeDetailsOutput['components'][number], normalized: string, bikeBrand?: string) {
  if (!component.brand && bikeBrand) {
    component.brand = bikeBrand;
  }

  const modelPreferred = new Set(['Frame', 'Fork', 'Headset', 'Bottom Bracket', 'Crankset', 'Chain', 'Rim', 'Hub', 'Cassette', 'Brake Rotor']);
  if (modelPreferred.has(component.name) && component.series && !component.model) {
    component.model = component.series;
    component.series = undefined;
  }
  const noSeriesComponents = new Set(['Seatpost', 'Saddle', 'Seatpost Clamp', 'Grips', 'Tire']);
  if (noSeriesComponents.has(component.name)) {
    component.series = undefined;
  }

  if (component.name === 'Crankset' && component.series && component.model && SIZE_REGEX.test(component.model)) {
    component.model = component.series;
    component.series = undefined;
    component.size = undefined;
  }

  if (component.name === 'Cassette' && component.series && !component.model) {
    component.model = component.series;
    component.series = undefined;
  }

  if (['Rim', 'Hub'].includes(component.name) && component.model && component.series) {
    component.series = undefined;
  }

  const brandSeriesComponents = new Set(['Seatpost', 'Stem', 'Saddle', 'Grips', 'Handlebar', 'Seatpost Clamp', 'Brake']);
  const partBrand = component.brand || bikeBrand;
  if (partBrand && component.series && !component.model && new RegExp(`^${escapeRegExp(partBrand)}\\b`, 'i').test(component.series)) {
    const remainder = component.series.replace(new RegExp(`^${escapeRegExp(partBrand)}\\b\\s*`, 'i'), '').trim();
    if (remainder) {
      component.model = remainder;
      component.series = partBrand;
    }
  }

  if (partBrand && brandSeriesComponents.has(component.name)) {
    if (!component.model && component.series) {
      component.model = component.series;
      component.series = partBrand;
    }

    if (component.series && component.model && component.series !== partBrand && !SIZE_REGEX.test(component.model)) {
      component.model = `${component.series} ${component.model}`.trim();
      component.series = partBrand;
    }

    if (component.name === 'Seatpost' && component.model && SIZE_REGEX.test(component.model) && component.series && component.series !== partBrand) {
      const inferredSeries = component.series;
      component.series = partBrand;
      component.model = inferredSeries;
    }

    if (component.name === 'Stem' && component.model && SIZE_REGEX.test(component.model) && component.series) {
      component.model = `${component.series} ${component.model}`.trim();
      component.series = partBrand;
    }
  }

  if (component.name === 'Headset' && component.series && !component.model) {
    component.model = component.series;
    component.series = undefined;
  }

  return component;
}

function parseChainringValues(line: string, componentName?: string) {
  if (!componentName || !/(crankset|chainring|chain set|chainring)/i.test(componentName)) {
    return {};
  }

  const match = line.match(CHAINRING_REGEX);
  if (!match) return {};
  const [_, first, second, third] = match;
  return {
    chainring1: first,
    chainring2: second,
    chainring3: third,
  };
}

function detectComponent(line: string) {
  for (const pattern of COMPONENT_PATTERNS) {
    const match = line.match(pattern.regex);
    if (match) {
      return { pattern, matchedText: match[0] };
    }
  }
  return null;
}

function parseComponentLine(line: string, bikeBrand?: string) {
  const normalized = normalizeLine(line);
  if (!normalized) return null;
  if (SECTION_HEADINGS.includes(normalized.toLowerCase())) return null;
  if (/\b(?:n\/a|na)\b/i.test(normalized) && normalized.split(/\s+/).length <= 3) return null;
  if (/\bchain keeper\b/i.test(normalized) && !/\bframe\b/i.test(normalized) && !/\bfork\b/i.test(normalized) && !/\bchainring\b/i.test(normalized)) return null;
  if (/^max chainring size\b/i.test(normalized)) return null;
  if (/\bmax\b.*\bsize\b/i.test(normalized) || /\bsize\b.*\bmax\b/i.test(normalized)) return null;
  if (/\brotor size\b/i.test(normalized)) return null;
  if (/\bmax\b.*\bbrake rotor\b/i.test(normalized)) return null;
  if (/^weight\b/i.test(normalized)) return null;
  if (/\b(?:shifter casing|shift cable|shifter cable|cable casing|cable housing|casing housing|kevlar reinforced housing|brake cable)\b/i.test(normalized)) return null;
  if (/\bheadset spacer\b/i.test(normalized)) return null;

  let componentMatch = detectComponent(normalized);
  if (componentMatch?.pattern.name === 'Brake' && /\b(?:rotor|centerlock|6[-\s]*bolt)\b/i.test(normalized) && /\b\d+(?:mm)\b/i.test(normalized)) {
    componentMatch = {
      pattern: { regex: /\b(?:rotor|centerlock|6[-\s]*bolt)\b/i, name: 'Brake Rotor', system: 'Brakes' },
      matchedText: 'Brake Rotor',
    };
  } else if (!componentMatch && /\b(?:rotor|centerlock|6[-\s]*bolt)\b/i.test(normalized) && /\b\d+(?:mm)\b/i.test(normalized)) {
    componentMatch = {
      pattern: { regex: /\b(?:rotor|centerlock|6[-\s]*bolt)\b/i, name: 'Brake Rotor', system: 'Brakes' },
      matchedText: 'Brake Rotor',
    };
  }
  const name = componentMatch?.pattern.name || normalized;
  const system = componentMatch?.pattern.system || 'Accessories';
  const brand = detectBrand(normalized);
  const size = SIZE_REGEX.exec(normalized)?.[0];
  const componentText = componentMatch?.matchedText || componentMatch?.pattern.name;
  const { series, model } = parseSeriesAndModel(normalized, brand, componentText);
  const chainringValues = parseChainringValues(normalized, componentMatch?.pattern.name);

  let finalName = name;
  const locationMatch = normalized.match(/\b(front|rear)\b/i);
  if (locationMatch && !/^(Front|Rear)\b/i.test(name) && /(wheel|hub|brake|rotor|shifter|tire|skewer|rim|seatpost|saddle)/i.test(name)) {
    finalName = `${locationMatch[1][0].toUpperCase()}${locationMatch[1].slice(1).toLowerCase()} ${name}`;
  }

  const component: ExtractBikeDetailsOutput['components'][number] = normalizeComponentFields({
    name: finalName,
    brand: brand || undefined,
    series: series || undefined,
    model: model || undefined,
    system,
    size: size || undefined,
    chainring1: chainringValues.chainring1 || undefined,
    chainring2: chainringValues.chainring2 || undefined,
    chainring3: chainringValues.chainring3 || undefined,
  }, normalized, bikeBrand);

  return component;
}

function titleLineToBikeInfo(line: string) {
  const normalized = normalizeLine(line);
  const yearMatch = normalized.match(YEAR_REGEX);
  const year = yearMatch ? Number(yearMatch[0]) : undefined;

  const brand = detectBrand(normalized);
  let model: string | undefined;

  if (brand) {
    const remainder = normalized.replace(new RegExp(`^${brand}`, 'i'), '').trim();
    model = remainder.replace(YEAR_REGEX, '').trim() || undefined;
  } else {
    const titleParts = normalized.split(/\s{2,}| - |:/).map((part) => part.trim()).filter(Boolean);
    if (titleParts.length >= 2) {
      model = titleParts.slice(1).join(' ');
    }
  }

  return { brand, model, year };
}

export function parseBikeText(rawText: string, overrides?: { brand?: string; model?: string; modelYear?: number }): ExtractBikeDetailsOutput {
  const text = rawText
    .replace(/\r\n/g, '\n')
    .trim();

  const rawLines = text
    .split(/\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const current = rawLines[i];
    const next = rawLines[i + 1];
    if (shouldMergeLineWithNext(current, next)) {
      segments.push(`${current} ${next}`);
      i += 1;
      continue;
    }
    segments.push(current);
  }

  const normalizedSegments = segments
    .flatMap((line) => line.split(/\||\u2022|\u2023|\u25E6/))
    .map((line) => normalizeLine(line.replace(/\t/g, ' ')))
    .filter(Boolean);

  let brand: string | undefined;
  let model: string | undefined;
  let modelYear: number | undefined;

  for (const line of segments) {
    const brandMatch = line.match(/(?:Brand|Manufacturer)[:\-]\s*(.+)/i);
    if (brandMatch) brand = brandMatch[1].trim();
    const modelMatch = line.match(/(?:Model|Model Name|Model:)[:\-]?\s*(.+)/i);
    if (modelMatch) model = modelMatch[1].trim();
    const yearMatch = line.match(/(?:Model Year|Year|Released)[:\-]?\s*(19|20)\d{2}/i) ?? line.match(YEAR_REGEX);
    if (yearMatch && !modelYear) modelYear = Number(yearMatch[0]);
  }

  if ((!brand || !model) && segments.length > 0) {
    const titleInfo = titleLineToBikeInfo(segments[0]);
    brand = brand || titleInfo.brand;
    model = model || titleInfo.model;
    modelYear = modelYear || titleInfo.year;
  }

  if (overrides?.brand) brand = overrides.brand;
  if (overrides?.model) model = overrides.model;
  if (typeof overrides?.modelYear === 'number') modelYear = overrides.modelYear;

  const components: ExtractBikeDetailsOutput['components'] = [];
  for (const line of segments) {
    const maybeComponent = parseComponentLine(line, brand);
    if (!maybeComponent) continue;

    const isLikelyComponent = COMPONENT_PATTERNS.some((pattern) => pattern.regex.test(line));
    if (!isLikelyComponent) {
      if (!line.match(/(?:drive|groupset|wheel|tire|brake|fork|frame|seatpost|saddle|battery|motor|charger)/i)) {
        continue;
      }
    }

    if (maybeComponent.name && maybeComponent.system) {
      components.push(maybeComponent);
    }
  }

  return {
    brand: brand || undefined,
    model: model || undefined,
    modelYear: modelYear || undefined,
    components,
  };
}
