// Category colours are stored as the original pastel hex (e.g. #C1E6FF).
// bg/ink adapt to the theme through CSS variables; solid is a stronger tone for bars and dots.

function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return [0, 0, 50];
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x!, 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s * 100, l * 100];
}

export interface CatColors { bg: string; ink: string; solid: string }

export function catColors(hex: string): CatColors {
  const [h, s] = hexToHsl(hex);
  const solid = `hsl(${Math.round(h)} ${Math.round(Math.min(70, Math.max(35, s * 0.7)))}% 52%)`;
  // light theme: the original pastel · dark theme: the solid tone mixed into the dark ground
  const base = `color-mix(in srgb, ${hex} var(--cat-pastel-w), ${solid})`;
  return {
    bg: `color-mix(in srgb, ${base} var(--cat-bg-pct), var(--ground))`,
    ink: `color-mix(in srgb, ${hex} var(--cat-ink-pct), var(--cat-ink-base))`,
    solid,
  };
}

/** CSS background for a slot with one or more categories: equal stripes. */
export function splitBg(colors: string[], dir: '90deg' | '180deg', kind: 'bg' | 'solid' = 'bg'): string {
  if (colors.length === 0) return 'transparent';
  const c = colors.map((hex) => catColors(hex)[kind]);
  if (c.length === 1) return c[0]!;
  const n = c.length;
  return `linear-gradient(${dir}, ${c.map((x, i) => `${x} ${(i * 100) / n}% ${((i + 1) * 100) / n}%`).join(', ')})`;
}
