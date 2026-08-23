import type { DesignToken, NumericUsage } from '../shared/types';

export function frequencyTokens(
  usages: NumericUsage[],
  prefix: string,
  minCount = 2,
): DesignToken[] {
  const grouped = new Map<
    string,
    { value: string; px: number | null; count: number; properties: Set<string> }
  >();
  for (const usage of usages) {
    const key = usage.px !== null ? `${usage.px}px` : usage.value;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += usage.count;
      usage.properties.forEach((p) => existing.properties.add(p));
    } else {
      grouped.set(key, {
        value: key,
        px: usage.px,
        count: usage.count,
        properties: new Set(usage.properties),
      });
    }
  }

  const ranked = [...grouped.values()].sort(
    (a, b) => b.count - a.count || (a.px ?? 0) - (b.px ?? 0),
  );
  return ranked
    .map((item, index) => ({
      id: `${prefix}_${index + 1}`,
      name: `${prefix}-${index + 1}`,
      nameInferred: true,
      value: item.value,
      px: item.px,
      count: item.count,
      properties: [...item.properties],
    }))
    .filter((token) => token.count >= minCount || ranked.length <= 12);
}
