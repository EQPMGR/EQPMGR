/**
 * How a part is named on screen: brand + series + model, e.g. "RockShox Lyrik Base"
 * or "Shimano Deore M6200". Skips repeats, so a series that already starts with the
 * brand ("Giant Sport") or a model that already contains the series isn't doubled.
 */
export function componentLabel(part: { brand?: string | null; series?: string | null; model?: string | null }): string {
  const words: string[] = [];
  const has = (s: string) => words.join(' ').toLowerCase().includes(s.toLowerCase());
  for (const raw of [part.brand, part.series, part.model]) {
    let piece = (raw ?? '').trim();
    if (!piece) continue;
    // Drop a leading repeat of an earlier piece ("Giant" + "Giant Sport", "Crest" + "Crest 34 RCL").
    for (const prev of [...words].reverse()) {
      if (piece.toLowerCase().startsWith(prev.toLowerCase() + ' ')) { piece = piece.slice(prev.length).trim(); break; }
    }
    if (piece && !has(piece)) words.push(piece);
  }
  return words.join(' ');
}
