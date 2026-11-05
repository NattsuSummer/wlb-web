// Client-side mirror of the backend schedule logic (for instant previews; the server re-checks).
import type { Slot, Week } from '../api';

export const idx = (weekday: number, hour: number) => weekday * 24 + hour;
export const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function sameSlot(a: Slot | null | undefined, b: Slot | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.description === b.description && a.categoryIds.length === b.categoryIds.length && a.categoryIds.every((c, i) => c === b.categoryIds[i]);
}

export const normalize = (categoryIds: number[], description: string): Slot => ({
  categoryIds: [...new Set(categoryIds)].sort((a, b) => a - b),
  description: description.trim(),
});

export interface Range { days: number[]; from: number; to: number }
export interface Change { weekday: number; from: number; to: number; before: Slot }

export function inRange(r: Range, d: number, h: number) {
  return r.days.includes(d) && h >= r.from && h < r.to;
}

export function plan(week: Week, r: Range, value: Slot | null) {
  const after = week.slice();
  const overwrites: Change[] = [];
  let overwriteCount = 0, fillCount = 0, unchangedCount = 0;
  for (const d of [...r.days].sort()) {
    for (let h = r.from; h < r.to; h++) {
      const before = week[idx(d, h)] ?? null;
      after[idx(d, h)] = value;
      if (sameSlot(before, value)) { unchangedCount++; continue; }
      if (!before) { fillCount++; continue; }
      if (!value) continue;
      overwriteCount++;
      const last = overwrites[overwrites.length - 1];
      if (last && last.weekday === d && last.to === h && sameSlot(last.before, before)) last.to = h + 1;
      else overwrites.push({ weekday: d, from: h, to: h + 1, before });
    }
  }
  return { after, overwrites, overwriteCount, fillCount, unchangedCount };
}

export function blockAt(week: Week, d: number, h: number) {
  const slot = week[idx(d, h)] ?? null;
  if (!slot) return null;
  let from = h, to = h + 1;
  while (from > 0 && sameSlot(week[idx(d, from - 1)], slot)) from--;
  while (to < 24 && sameSlot(week[idx(d, to)], slot)) to++;
  return { from, to, slot };
}

/** Consecutive runs of identical cells for one day (empty runs included). */
export function dayRuns(week: Week, d: number): { from: number; to: number; slot: Slot | null }[] {
  const out: { from: number; to: number; slot: Slot | null }[] = [];
  for (let h = 0; h < 24; h++) {
    const s = week[idx(d, h)] ?? null;
    const last = out[out.length - 1];
    if (last && sameSlot(last.slot, s)) last.to = h + 1;
    else out.push({ from: h, to: h + 1, slot: s });
  }
  return out;
}

/** Bangkok time (UTC+7, no DST). weekday 0 = Monday. */
export function bangkokNow(date = new Date()) {
  const d = new Date(date.getTime() + 7 * 3600 * 1000);
  return { weekday: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours(), minute: d.getUTCMinutes(), date: d };
}

export function fmtDuration(min: number, lang: 'th' | 'en') {
  const h = Math.floor(min / 60), m = min % 60;
  if (lang === 'en') return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min';
  return [h ? `${h} ชม.` : '', m ? `${m} นาที` : ''].filter(Boolean).join(' ') || '0 นาที';
}

export const fmtHours = (x: number) => (Math.abs(x - Math.round(x)) < 0.001 ? String(Math.round(x)) : x.toFixed(1));
