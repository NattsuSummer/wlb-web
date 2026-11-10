// Body stats: weekly check-ins (weight, height, waist, body fat), a goal, a line chart and the history.
// Private to the signed-in user.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { del, get, put } from '../api';
import { useApp } from '../app-context';
import { ErrorNote, Icon, Modal, Spinner } from '../components/ui';
import type { Key } from '../i18n';
import { useLoad } from '../lib/use-load';

export interface BodyEntry { date: string; weightKg: number; heightCm: number | null; waistCm: number | null; bodyFat: number | null; note: string }
interface Summary {
  latest: BodyEntry | null; heightCm: number | null; bmi: number | null; startWeightKg: number | null; changeKg: number | null;
  lastWeekChangeKg: number | null; avgPerWeekKg: number | null; toGoalKg: number | null; daysSinceLast: number | null; due: boolean; nextDue: string;
}
export interface BodyStats { today: string; entries: BodyEntry[]; goal: { targetWeightKg: number | null }; summary: Summary }

type Metric = 'weightKg' | 'waistCm' | 'bodyFat' | 'bmi';
const METRICS: Metric[] = ['weightKg', 'waistCm', 'bodyFat', 'bmi'];
const RANGE: Record<string, [number, number]> = { weightKg: [20, 400], heightCm: [80, 250], waistCm: [30, 250], bodyFat: [2, 75] };
const UNIT: Record<Metric, string> = { weightKg: 'kg', waistCm: 'cm', bodyFat: '%', bmi: '' };

const r1 = (n: number) => Math.round(n * 10) / 10;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(1)}`;
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** Asian BMI cut-offs (WHO 2004). */
function bmiClass(b: number): Key {
  if (b < 18.5) return 'b.bmi.under';
  if (b < 23) return 'b.bmi.normal';
  if (b < 25) return 'b.bmi.over';
  if (b < 30) return 'b.bmi.obese1';
  return 'b.bmi.obese2';
}

export function useFmtDate() {
  const { lang } = useApp();
  return (d: string, withYear = false) => new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB',
    { day: 'numeric', month: 'short', ...(withYear ? { year: '2-digit' } : {}), timeZone: 'UTC' });
}

// ---------- chart ----------
interface Point { date: string; t: number; v: number }

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(r1(v));
  return out;
}

function LineChart({ points, unit, goal, label }: { points: Point[]; unit: string; goal: number | null; label: string }) {
  const { t } = useApp();
  const fmt = useFmtDate();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240, padL = 44, padR = 16, padT = 16, padB = 28;
  // Scale to the data so the trend stays readable; a goal outside the range is marked at the edge.
  const vals = points.map((p) => p.v);
  const ticks = niceTicks(Math.min(...vals) - 0.5, Math.max(...vals) + 0.5);
  const yMin = ticks[0]!, yMax = ticks[ticks.length - 1]!;
  const t0 = points[0]!.t, t1 = points[points.length - 1]!.t;
  const x = (tt: number) => (t1 === t0 ? padL + (w - padL - padR) / 2 : padL + ((tt - t0) / (t1 - t0)) * (w - padL - padR));
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  // x labels: first, last and up to 3 in between, skipping ones that would collide
  const xl: number[] = [];
  const maxLabels = Math.max(2, Math.floor((w - padL - padR) / 70));
  const stepIdx = Math.max(1, Math.ceil((points.length - 1) / (maxLabels - 1)));
  for (let i = 0; i < points.length; i += stepIdx) xl.push(i);
  if (xl[xl.length - 1] !== points.length - 1) { if (xl.length > 1 && x(points[points.length - 1]!.t) - x(points[xl[xl.length - 1]!]!.t) < 56) xl.pop(); xl.push(points.length - 1); }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.t) - px) < Math.abs(x(points[best]!.t) - px)) best = i; });
    setHover(best);
  }
  const hp = hover !== null ? points[hover] : null;
  const prev = hover !== null && hover > 0 ? points[hover - 1] : null;

  return (
    <div ref={box} className="chart-box">
      <svg width={w} height={H} role="img" aria-label={`${label}: ${points.map((p) => `${fmt(p.date)} ${p.v}${unit}`).join(', ')}`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ display: 'block', touchAction: 'pan-y' }}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} className="grid" />
            <text x={padL - 8} y={y(v)} dy="0.32em" textAnchor="end" className="tick">{v}</text>
          </g>
        ))}
        {xl.map((i) => (
          <text key={i} x={x(points[i]!.t)} y={H - 8} textAnchor={i === 0 && points.length > 1 ? 'start' : i === points.length - 1 && points.length > 1 ? 'end' : 'middle'} className="tick">{fmt(points[i]!.date)}</text>
        ))}
        {goal !== null && (goal < yMin || goal > yMax) && (
          <text x={w - padR} y={goal < yMin ? H - padB - 6 : padT + 10} textAnchor="end" className="tick">{t('b.goalLine', { n: goal })} {goal < yMin ? '↓' : '↑'}</text>
        )}
        {goal !== null && goal >= yMin && goal <= yMax && (
          <g>
            <line x1={padL} x2={w - padR} y1={y(goal)} y2={y(goal)} className="goal" />
            <text x={w - padR} y={y(goal) - 6} textAnchor="end" className="tick">{t('b.goalLine', { n: goal })}</text>
          </g>
        )}
        <path d={path} className="series" />
        {points.map((p, i) => <circle key={p.date} cx={x(p.t)} cy={y(p.v)} r={hover === i ? 6 : 4} className="dot" />)}
        {hp && <line x1={x(hp.t)} x2={x(hp.t)} y1={padT} y2={H - padB} className="cross" />}
      </svg>
      {hp && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hp.t), 70), w - 70), top: Math.max(y(hp.v) - 12, 0) }}>
          <span className="muted">{fmt(hp.date, true)}</span>
          <strong>{hp.v} {unit}</strong>
          {prev && <span className="muted">{signed(r1(hp.v - prev.v))} {unit}</span>}
        </div>
      )}
    </div>
  );
}

// ---------- panel ----------
export function BodyPanel() {
  const { t, toast } = useApp();
  const fmt = useFmtDate();
  const r = useLoad(() => get<BodyStats>('/api/body'), []);
  const [metric, setMetric] = useState<Metric>('weightKg');
  const [form, setForm] = useState({ date: '', weightKg: '', heightCm: '', waistCm: '', bodyFat: '', note: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const reset = (d: BodyStats) => {
    setEditing(null);
    setErrors({});
    setForm({ date: d.today, weightKg: '', heightCm: str(d.summary.heightCm), waistCm: '', bodyFat: '', note: '' });
    setGoal(str(d.goal.targetWeightKg));
  };
  useEffect(() => { if (r.data && !form.date) reset(r.data); }, [r.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const d = r.data;
  const s = d.summary;
  const entries = d.entries;

  async function run(fn: () => Promise<BodyStats>, after?: (n: BodyStats) => void) {
    setBusy(true);
    try {
      const n = await fn();
      r.setData(n);
      after?.(n);
      toast(t('common.saved'));
    } catch (e) {
      const field = (e as { details?: { field?: string } }).details?.field;
      if (field) setErrors({ [field]: RANGE[field] ? t('b.range', { min: RANGE[field]![0], max: RANGE[field]![1] }) : e instanceof Error ? e.message : '' });
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally { setBusy(false); }
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const body = { weightKg: numOrNull(form.weightKg), heightCm: numOrNull(form.heightCm), waistCm: numOrNull(form.waistCm), bodyFat: numOrNull(form.bodyFat), note: form.note };
    run(() => put<BodyStats>(`/api/body/entries/${form.date}`, body), reset);
  }
  function edit(x: BodyEntry) {
    setEditing(x.date);
    setErrors({});
    setForm({ date: x.date, weightKg: str(x.weightKg), heightCm: str(x.heightCm ?? s.heightCm), waistCm: str(x.waistCm), bodyFat: str(x.bodyFat), note: x.note });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // chart series: BMI uses the latest height known at or before each entry
  let h: number | null = null;
  const series: Record<Metric, Point[]> = { weightKg: [], waistCm: [], bodyFat: [], bmi: [] };
  for (const e of entries) {
    if (e.heightCm !== null) h = e.heightCm;
    const tt = Date.parse(`${e.date}T00:00:00Z`);
    series.weightKg.push({ date: e.date, t: tt, v: e.weightKg });
    if (e.waistCm !== null) series.waistCm.push({ date: e.date, t: tt, v: e.waistCm });
    if (e.bodyFat !== null) series.bodyFat.push({ date: e.date, t: tt, v: e.bodyFat });
    if (h !== null) series.bmi.push({ date: e.date, t: tt, v: r1(e.weightKg / (h / 100) ** 2) });
  }
  const pts = series[metric];
  const field = (k: keyof typeof form, label: Key, extra: Record<string, unknown> = {}) => (
    <label className="field">
      {t(label)}
      <input className="input" value={form[k]} onChange={(e) => { setForm({ ...form, [k]: e.target.value }); if (errors[k]) setErrors({}); }} aria-invalid={errors[k] ? true : undefined} {...extra} />
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );
  const delta = (n: number | null) => (n === null ? '—' : `${signed(n)} kg`);

  return (
    <>
      {s.due && (
        <div className="note warn between" role="status">
          <span><strong>{t(s.latest ? 'b.due' : 'b.dueFirst')}</strong>{s.daysSinceLast !== null && <> · {t('b.dueDays', { n: s.daysSinceLast })}</>}</span>
          <button type="button" className="btn small" onClick={() => { reset(d); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); formRef.current?.querySelector<HTMLInputElement>('input[name="weight"]')?.focus({ preventScroll: true }); }}>{t('b.recordNow')}</button>
        </div>
      )}

      <div className="stat-row">
        <div className="card stat">
          <span className="muted">{t('b.latest')}</span>
          <strong>{s.latest ? `${s.latest.weightKg} kg` : '—'}</strong>
          <span className="muted">{s.latest ? fmt(s.latest.date, true) : ''}{!s.due && s.latest ? ` · ${t('b.nextDue', { date: fmt(s.nextDue) })}` : ''}</span>
        </div>
        <div className="card stat">
          <span className="muted">{t('b.change')}</span>
          <strong>{delta(s.changeKg)}</strong>
          <span className="muted">{s.avgPerWeekKg !== null ? t('b.perWeek', { n: signed(s.avgPerWeekKg) }) : ''}</span>
        </div>
        <div className="card stat">
          <span className="muted">{t('b.lastWeek')}</span>
          <strong>{delta(s.lastWeekChangeKg)}</strong>
        </div>
        <div className="card stat">
          <span className="muted">{t('b.bmi')}</span>
          <strong>{s.bmi ?? '—'}</strong>
          <span className="muted">{s.bmi !== null ? t(bmiClass(s.bmi)) : ''}</span>
        </div>
        <div className="card stat">
          <span className="muted">{t('b.toGoal')}</span>
          <strong>{s.toGoalKg === null ? '—' : s.toGoalKg <= 0 ? t('b.goalReached') : `${s.toGoalKg} kg`}</strong>
          <span className="muted">{d.goal.targetWeightKg !== null ? `${t('b.goal')}: ${d.goal.targetWeightKg}` : ''}</span>
        </div>
      </div>

      <div className="row">
        <section className="grow card stack" aria-labelledby="bchart-h" style={{ minWidth: 0 }}>
          <div className="between">
            <h2 id="bchart-h">{t('b.chart')}</h2>
            <div className="seg" role="group" aria-label={t('b.chart')}>
              {METRICS.map((m) => <button key={m} type="button" aria-pressed={metric === m} onClick={() => { setMetric(m); }}>{t(`b.metric.${m}`)}</button>)}
            </div>
          </div>
          {pts.length ? (
            <LineChart key={metric} points={pts} unit={UNIT[metric]} goal={metric === 'weightKg' ? d.goal.targetWeightKg : null} label={t(`b.metric.${metric}`)} />
          ) : <div className="empty-state" style={{ padding: 32 }}>{t('b.chartEmpty')}</div>}
          {metric === 'bmi' && <p className="muted" style={{ fontSize: 12 }}>{t('b.bmiNote')}</p>}
        </section>

        <div className="side stack">
          <form ref={formRef} className="card stack" onSubmit={save} aria-labelledby="brec-h">
            <h2 id="brec-h">{t('b.record')}</h2>
            {editing && <div className="note info">{t('b.editing', { date: fmt(editing, true) })}</div>}
            {field('date', 'b.date', { type: 'date', max: d.today, required: true, readOnly: !!editing })}
            {field('weightKg', 'b.weight', { inputMode: 'decimal', required: true, name: 'weight' })}
            <div className="form-grid3" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {field('heightCm', 'b.height', { inputMode: 'decimal' })}
              {field('waistCm', 'b.waist', { inputMode: 'decimal' })}
              {field('bodyFat', 'b.fat', { inputMode: 'decimal' })}
            </div>
            {field('note', 'b.note', { maxLength: 300 })}
            <div className="hstack">
              <button type="submit" className="btn primary" disabled={busy || !form.weightKg || !form.date}>{t('b.save')}</button>
              {editing && <button type="button" className="btn" onClick={() => reset(d)}>{t('b.cancelEdit')}</button>}
            </div>
          </form>
          <form className="card stack" onSubmit={(e) => { e.preventDefault(); run(() => put<BodyStats>('/api/body/goal', { targetWeightKg: numOrNull(goal) })); }}>
            <label className="field">{t('b.goal')}
              <input className="input" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </label>
            <div><button type="submit" className="btn" disabled={busy}>{t('b.saveGoal')}</button></div>
          </form>
          <p className="muted" style={{ fontSize: 12 }}><Icon name="lock" size={12} /> {t('b.private')}</p>
        </div>
      </div>

      <section className="card stack" aria-labelledby="bhist-h">
        <h2 id="bhist-h">{t('b.history')}</h2>
        {!entries.length ? <p className="muted">{t('b.empty')}</p> : (
          <div className="table-wrap">
            <table style={{ minWidth: 600 }}>
              <thead>
                <tr><th>{t('b.date')}</th><th>{t('b.metric.weightKg')}</th><th>±</th><th>{t('b.metric.waistCm')}</th><th>{t('b.metric.bodyFat')}</th><th>{t('b.note')}</th><th><span className="sr-only">{t('b.edit')}</span></th></tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((e, i, arr) => {
                  const older = arr[i + 1];
                  return (
                    <tr key={e.date}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(e.date, true)}</td>
                      <td><strong>{e.weightKg}</strong></td>
                      <td className="muted">{older ? signed(r1(e.weightKg - older.weightKg)) : ''}</td>
                      <td>{e.waistCm ?? '—'}</td>
                      <td>{e.bodyFat ?? '—'}</td>
                      <td style={{ overflowWrap: 'anywhere', maxWidth: 220 }}>{e.note}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button type="button" className="btn small" onClick={() => edit(e)}>{t('b.edit')}</button>{' '}
                        <button type="button" className="btn small danger-ghost" aria-label={`${t('b.delete')} ${fmt(e.date, true)}`} onClick={() => setConfirm(e.date)}><Icon name="trash" size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirm && (
        <Modal labelledBy="bdel-h" narrow onClose={() => setConfirm(null)}>
          <h2 id="bdel-h">{t('b.delete')}</h2>
          <p>{t('b.confirmDelete', { date: fmt(confirm, true) })}</p>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setConfirm(null)}>{t('common.cancel')}</button>
            <button type="button" className="btn danger" onClick={() => { const dd = confirm; setConfirm(null); run(() => del<BodyStats>(`/api/body/entries/${dd}`), reset); }}>{t('common.delete')}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
