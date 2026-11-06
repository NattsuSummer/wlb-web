import { useState } from 'react';
import { put, type ScheduleView, type Summary, type Week } from '../api';
import { useApp } from '../app-context';
import { useCat } from '../components/ui';
import { dayNames } from '../i18n';
import { fmtHours, idx } from '../lib/schedule';

/** Horizontal bars: planned % per category with the target as a tick. */
export function BalanceBars({ summary }: { summary: Summary }) {
  const cat = useCat();
  const max = Math.max(50, ...summary.categories.map((c) => Math.max(c.pct, c.target)));
  return (
    <div className="stack" style={{ gap: 12 }}>
      {summary.categories.map((c) => (
        <div key={c.categoryId} className="balrow">
          <span className="bal-label">{cat.catName(c.categoryId)}</span>
          <div className="bar" style={{ height: 14, overflow: 'visible' }}>
            <span style={{ width: `${(c.pct / max) * 100}%`, background: cat.one(c.categoryId).solid }} />
            {summary.targetsSet && <span aria-hidden="true" style={{ position: 'absolute', top: -4, bottom: -4, width: 3, borderRadius: 2, background: 'var(--ink)', left: `calc(${(c.target / max) * 100}% - 1px)` }} />}
          </div>
          <span className="mono ink2 bal-num">{c.pct.toFixed(1)}%{summary.targetsSet ? ` / ${c.target}%` : ''}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut + table + target editor. */
export function SummaryCard({ view, userId, onChange }: { view: ScheduleView; userId: number; onChange: (v: ScheduleView) => void }) {
  const { t, categories, toast } = useApp();
  const cat = useCat();
  const [draft, setDraft] = useState<Record<number, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const s = view.summary;
  if (!s) return <section className="card"><span className="muted">{t('sum.hidden')}</span></section>;

  let acc = 0;
  const stops: string[] = [];
  for (const c of s.categories) {
    if (c.hours <= 0) continue;
    const pct = (c.hours / 168) * 100;
    stops.push(`${cat.one(c.categoryId).solid} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
    acc += pct;
  }
  if (acc < 100) stops.push(`var(--subtle) ${acc.toFixed(2)}% 100%`);

  const total = draft ? Object.values(draft).reduce((a, b) => a + b, 0) : 0;
  const draftOk = draft !== null && (total === 100 || total === 0);

  async function saveTargets(next: Record<number, number>) {
    setBusy(true);
    try {
      const r = await put<Omit<ScheduleView, 'user' | 'editable'>>(`/api/schedules/${userId}/targets`, { targets: next });
      onChange({ ...view, ...r });
      setDraft(null);
      toast(t('common.saved'));
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="sum-h" className="card stack" style={{ gap: 16 }}>
      <div className="between">
        <h2 id="sum-h" style={{ fontSize: 17 }}>{t('sum.title')}</h2>
        {view.editable && !draft && (
          <button type="button" className="btn small" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderColor: 'transparent', fontWeight: 600 }}
            onClick={() => setDraft(Object.fromEntries(categories.map((c) => [c.id, Number(view.targets?.[c.id] ?? 0)])))}>
            {t('sum.setTargets')}
          </button>
        )}
      </div>

      {draft ? (
        <div className="stack">
          <span className="ink2" style={{ fontSize: 13 }}>{t('sum.targetsHelp')}</span>
          {categories.map((c) => {
            const v = draft[c.id] ?? 0;
            const share = s.categories.find((x) => x.categoryId === c.id);
            const set = (n: number) => setDraft({ ...draft, [c.id]: Math.max(0, Math.min(100, Number.isFinite(n) ? Math.round(n) : 0)) });
            return (
              <div key={c.id} className="stack" style={{ gap: 4 }}>
                <div className="between">
                  <label htmlFor={`tg-${c.id}`} className="hstack" style={{ fontWeight: 500, fontSize: 14 }}><span className="dot" style={{ background: cat.one(c.id).solid }} />{cat.catName(c.id)}</label>
                  <span className="hstack" style={{ gap: 4 }}>
                    <input id={`tg-${c.id}`} className="input mono" type="number" min={0} max={100} value={v} onChange={(e) => set(Number(e.target.value))} style={{ width: 72, minHeight: 40, textAlign: 'right', padding: 8 }} />
                    <span className="muted">%</span>
                  </span>
                </div>
                <input type="range" min={0} max={100} value={v} onChange={(e) => set(Number(e.target.value))} aria-label={`${cat.catName(c.id)} %`} style={{ width: '100%', accentColor: cat.one(c.id).solid }} />
                <span className="muted" style={{ fontSize: 12 }}>{t('sum.approx', { h: ((v / 100) * 168).toFixed(1), now: fmtHours(share?.hours ?? 0) })}</span>
              </div>
            );
          })}
          <div className={`note ${draftOk ? 'ok' : 'warn'} between`} style={{ fontSize: 14 }}>
            <span>{t('sum.total')}</span>
            <span className="mono" style={{ fontWeight: 600 }}>{total}% {total === 100 ? '✓' : total === 0 ? '' : total < 100 ? t('sum.missing', { n: 100 - total }) : t('sum.over', { n: total - 100 })}</span>
          </div>
          <div className="hstack">
            <button type="button" className="btn primary" disabled={!draftOk || busy} onClick={() => saveTargets(draft)}>{t('sum.saveTargets')}</button>
            <button type="button" className="btn" onClick={() => setDraft(null)}>{t('common.cancel')}</button>
            <button type="button" className="btn ghost" onClick={() => setDraft(Object.fromEntries(categories.map((c) => [c.id, 0])))}>{t('sum.resetTargets')}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div role="img" aria-label={t('sum.title')} style={{ width: 168, height: 168, borderRadius: '50%', background: `conic-gradient(${stops.join(', ')})`, display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--surface)', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <span><span style={{ fontSize: 22, fontWeight: 700, display: 'block' }}>{s.plannedHours}</span><span className="muted" style={{ fontSize: 12 }}>{t('sum.planned')}</span></span>
              </div>
            </div>
          </div>
          <table className="compact" style={{ fontSize: 13 }}>
            <thead><tr><th style={{ padding: '6px 0' }}>{t('sum.cat')}</th><th className="num">{t('sum.h')}</th><th className="num">{t('sum.real')}</th><th className="num">{t('sum.target')}</th><th className="num" style={{ paddingRight: 0 }}>{t('sum.diff')}</th></tr></thead>
            <tbody>
              {s.categories.map((c) => (
                <tr key={c.categoryId}>
                  <td style={{ padding: '8px 0' }}><span className="hstack" style={{ gap: 8, flexWrap: 'nowrap' }}><span className="dot" style={{ background: cat.one(c.categoryId).solid }} />{cat.catName(c.categoryId)}</span></td>
                  <td className="num">{fmtHours(c.hours)}</td>
                  <td className="num">{c.pct.toFixed(1)}%</td>
                  <td className="num">{s.targetsSet ? `${c.target}%` : '–'}</td>
                  <td className="num" style={{ paddingRight: 0, color: !s.targetsSet || Math.abs(c.diff) < 0.05 ? 'var(--muted)' : c.diff > 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {s.targetsSet ? `${c.diff > 0 ? '+' : ''}${c.diff.toFixed(1)}` : ''}
                  </td>
                </tr>
              ))}
              {s.unplannedHours > 0 && (
                <tr><td style={{ padding: '8px 0' }} className="muted">{t('sum.empty')}</td><td className="num">{s.unplannedHours}</td><td className="num">{((s.unplannedHours / 168) * 100).toFixed(1)}%</td><td className="num">–</td><td /></tr>
              )}
            </tbody>
          </table>
          {!s.targetsSet && <span className="muted" style={{ fontSize: 13 }}>{t('home.noTargets')}</span>}
        </>
      )}
    </section>
  );
}

/** Before/after mini columns for the confirm dialogs. */
export function BeforeAfter({ days, before, after, changed, afterLabel }: {
  days: number[]; before: Week; after: Week; changed: (d: number, h: number) => boolean; afterLabel: string;
}) {
  const { t, lang } = useApp();
  const cat = useCat();
  const names = dayNames(lang, 'long');
  const col = (w: Week, d: number, mark: boolean) => (
    <div className="stack" style={{ gap: 1 }}>
      {Array.from({ length: 24 }, (_, h) => {
        const s = w[idx(d, h)] ?? null;
        const start = h === 0 || JSON.stringify(w[idx(d, h - 1)] ?? null) !== JSON.stringify(s);
        return (
          <span key={h} className={`mini${mark && changed(d, h) ? ' changed' : ''}`} style={{ background: s ? cat.bg(s) : 'var(--surface)', color: cat.ink(s), outline: s ? undefined : '1px dashed var(--line)', outlineOffset: -1 }}>
            {start && s ? s.description || cat.names(s.categoryIds) : ''}
          </span>
        );
      })}
    </div>
  );
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', gap: 14, minWidth: 'max-content' }}>
        <div className="stack" style={{ gap: 1, paddingTop: 42 }}>
          {Array.from({ length: 24 }, (_, h) => <span key={h} className="mono muted" style={{ height: 18, fontSize: 10, display: 'flex', alignItems: 'center' }}>{String(h).padStart(2, '0')}</span>)}
        </div>
        {days.map((d) => (
          <div key={d} className="stack" style={{ gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{names[d]}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '96px 96px', gap: 4 }}>
              <span className="muted" style={{ fontSize: 11, textAlign: 'center' }}>{t('sched.before')}</span>
              <span style={{ fontSize: 11, textAlign: 'center', fontWeight: 600, color: 'var(--accent-ink)' }}>{afterLabel}</span>
              {col(before, d, false)}
              {col(after, d, true)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
