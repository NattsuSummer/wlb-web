import { useMemo, useState } from 'react';
import { ApiError, get, post, put, type Cell, type MemberCard, type ScheduleView, type Slot } from '../api';
import { useApp } from '../app-context';
import { ErrorNote, Icon, Modal, Spinner, useCat } from '../components/ui';
import { dayNames } from '../i18n';
import { bangkokNow, blockAt, hh, idx, inRange, normalize, plan, sameSlot, type Range } from '../lib/schedule';
import { useLoad } from '../lib/use-load';
import { BeforeAfter, SummaryCard } from './schedule-parts';
import type { WeekLink } from '../lib/routines';
import { Link } from '../router';

interface Orig { d: number; from: number; to: number }

export function SchedulePage({ username }: { username?: string }) {
  const { me, t } = useApp();
  // resolve /schedule/:username → user id
  const target = useLoad(async () => {
    if (!username || username === me!.username) return me!.id;
    const r = await get<{ members: MemberCard[] }>('/api/users');
    const m = r.members.find((x) => x.user.username.toLowerCase() === username.toLowerCase());
    if (!m) throw new ApiError(404, 'not_found', 'User not found');
    return m.user.id;
  }, [username, me?.id]);
  const view = useLoad(async () => (target.data ? get<ScheduleView>(`/api/schedules/${target.data}`) : null), [target.data]);

  if (target.error || view.error) return <ErrorNote error={target.error ?? view.error} onRetry={() => { target.reload(); view.reload(); }} />;
  if (!view.data) return <Spinner />;
  const v = view.data;
  const isMe = v.user.id === me!.id;

  return (
    <>
      <div className="between">
        <div className="stack" style={{ gap: 4 }}>
          <h1>{isMe ? t('sched.mine') : t('sched.of', { name: v.user.displayName })}</h1>
          <p className="muted" style={{ fontSize: 14 }}>{v.editable ? t('sched.sub') : t('sched.readonly')}</p>
        </div>
        {!isMe && !v.editable && <span className="chip gray"><Icon name="lock" size={12} />{t('sched.readonly')}</span>}
      </div>
      {v.week ? <Editor view={v} onChange={(nv) => view.setData(nv)} /> : <div className="empty-state">{t('sched.hiddenAll', { name: v.user.displayName })}</div>}
    </>
  );
}

function Editor({ view, onChange }: { view: ScheduleView; onChange: (v: ScheduleView) => void }) {
  const { t, lang, categories, toast, me } = useApp();
  const cat = useCat();
  const week = view.week!;
  const uid = view.user.id;
  const mine = uid === me?.id;
  const rweek = useLoad(() => (mine ? get<{ links: WeekLink[] }>('/api/routines/week') : Promise.resolve({ links: [] as WeekLink[] })), [mine]);
  const rlinks = rweek.data?.links ?? [];
  const routinesAt = (d: number, h: number) => rlinks.filter((l) => l.weekday === d && l.hour === h);
  const editable = view.editable;
  const longDays = dayNames(lang, 'long');
  const shortDays = dayNames(lang, 'short');
  const today = bangkokNow();

  // selection
  const [range, setRange] = useState<Range>({ days: [today.weekday], from: today.hour, to: Math.min(24, today.hour + 1) });
  const [ks, setKs] = useState<number[]>(() => week[idx(today.weekday, today.hour)]?.categoryIds ?? (categories[0] ? [categories[0].id] : []));
  const [desc, setDesc] = useState(() => week[idx(today.weekday, today.hour)]?.description ?? '');
  const [orig, setOrig] = useState<Orig | null>(() => {
    const b = blockAt(week, today.weekday, today.hour);
    return b ? { d: today.weekday, from: b.from, to: b.to } : null;
  });
  const [confirm, setConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const value: Slot | null = ks.length ? normalize(ks, desc) : null;
  const p = useMemo(() => (value && range.days.length ? plan(week, range, value) : null), [week, range, value?.description, value?.categoryIds.join()]);

  const origSlot = orig ? week[idx(orig.d, orig.from)] ?? null : null;
  const origRange: Range | null = orig && origSlot ? { days: [orig.d], from: orig.from, to: orig.to } : null;
  const cleared = useMemo(() => (origRange ? plan(week, origRange, null).after : null), [week, orig?.d, orig?.from, orig?.to]);
  const origLabel = origSlot && orig ? `${cat.names(origSlot.categoryIds)}${origSlot.description ? ' · ' + origSlot.description : ''} (${longDays[orig.d]} ${hh(orig.from)}–${hh(orig.to)})` : '';

  function pick(d: number, h: number) {
    if (!editable) return;
    const b = blockAt(week, d, h);
    if (b) {
      setRange({ days: [d], from: b.from, to: b.to });
      setKs(b.slot.categoryIds);
      setDesc(b.slot.description);
      setOrig({ d, from: b.from, to: b.to });
    } else {
      setRange({ days: [d], from: h, to: h + 1 });
      setOrig(null);
    }
  }

  async function applyRange() {
    if (!value) return;
    setBusy(true);
    try {
      const r = await put<ScheduleView & { undo: Cell[]; overwriteCount: number; fillCount: number }>(`/api/schedules/${uid}/range`, {
        ...range, categoryIds: value.categoryIds, description: value.description, confirmOverwrite: true,
      });
      onChange({ ...view, ...r });
      setConfirm(false);
      if (range.days.length === 1) setOrig({ d: range.days[0]!, from: range.from, to: range.to });
      const msg = r.overwriteCount ? t('sched.savedOver', { n: r.overwriteCount }) : t('sched.savedFill', { n: r.fillCount });
      toast(msg, { label: t('common.undo'), run: () => undo(r.undo) });
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  async function undo(cells: Cell[]) {
    try {
      const r = await put<Omit<ScheduleView, 'user' | 'editable'>>(`/api/schedules/${uid}/cells`, { cells });
      onChange({ ...view, ...r });
      toast(t('sched.undone'));
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function doClear() {
    if (!origRange) return;
    setBusy(true);
    try {
      const r = await post<ScheduleView & { undo: Cell[]; clearedCount: number }>(`/api/schedules/${uid}/clear`, origRange);
      onChange({ ...view, ...r });
      setClearConfirm(false);
      setOrig(null);
      toast(t('sched.cleared', { n: r.clearedCount }), { label: t('common.undo'), run: () => undo(r.undo) });
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!p || (p.overwriteCount === 0 && p.fillCount === 0)) return;
    if (p.overwriteCount > 0) setConfirm(true);
    else applyRange();
  }

  const hours = range.to - range.from;
  const affectedDays = p ? [...new Set(p.overwrites.map((o) => o.weekday))] : [];

  return (
    <div className="row">
      <section aria-label={t('nav.schedule')} className="grow card" style={{ padding: 16, overflowX: 'auto' }}>
        <div className="week">
          <div className="week-row">
            <span />
            {longDays.map((n, d) => <span key={d} className={`week-head${d === today.weekday ? ' today' : ''}`}>{n}</span>)}
          </div>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="week-row">
              <span className="week-hour">{hh(h)}</span>
              {Array.from({ length: 7 }, (_, d) => {
                const s = week[idx(d, h)] ?? null;
                const start = h === 0 || !sameSlot(week[idx(d, h - 1)], s);
                const end = h === 23 || !sameSlot(week[idx(d, h + 1)], s);
                const sel = editable && inRange(range, d, h);
                const changed = sel && value !== null && !sameSlot(s, value);
                const isNow = d === today.weekday && h === today.hour;
                const oldBg = s ? cat.one(s.categoryIds[0]!).bg : 'var(--surface)';
                const bg = changed ? `repeating-linear-gradient(135deg, ${cat.one(value!.categoryIds[0]!).bg} 0 6px, ${oldBg} 6px 12px)` : cat.bg(s);
                return (
                  <button key={d} type="button" disabled={!editable}
                    className={`cell${s ? '' : ' empty'}${sel ? ' sel' : isNow ? ' now' : ''}`}
                    aria-label={`${longDays[d]} ${hh(h)} ${s ? `${cat.names(s.categoryIds)} ${s.description}` : t('sum.empty')}${routinesAt(d, h).map((l) => ` · ${l.plan.title}`).join('')}`}
                    onClick={() => pick(d, h)}
                    style={{ background: bg, color: cat.ink(s), borderRadius: `${start ? '6px 6px' : '0 0'} ${end ? '6px 6px' : '0 0'}` }}>
                    {start && s ? s.description || cat.names(s.categoryIds) : ''}
                    {routinesAt(d, h).length > 0 && (
                      <span className="rmark" aria-hidden="true" title={routinesAt(d, h).map((l) => l.plan.title).join(', ')}>
                        <Icon name={routinesAt(d, h)[0]!.plan.kind === 'meal' ? 'bowl' : 'dumbbell'} size={11} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {editable && (
            <div className="hstack ink2" style={{ gap: 16, marginTop: 10, fontSize: 12 }}>
              <span className="hstack" style={{ gap: 6 }}><span style={{ width: 18, height: 12, borderRadius: 3, boxShadow: 'inset 0 0 0 2px var(--ink)' }} />{t('sched.legendSel')}</span>
              <span className="hstack" style={{ gap: 6 }}><span style={{ width: 18, height: 12, borderRadius: 3, background: 'repeating-linear-gradient(135deg, var(--subtle) 0 4px, var(--line) 4px 8px)' }} />{t('sched.legendChange')}</span>
              <span className="hstack" style={{ gap: 6 }}><span style={{ width: 18, height: 12, borderRadius: 3, background: 'linear-gradient(90deg, var(--line) 0 50%, var(--dash) 50% 100%)' }} />{t('sched.legendMulti')}</span>
              <span className="hstack" style={{ gap: 6 }}><span style={{ width: 18, height: 12, borderRadius: 3, outline: '1px dashed var(--dash)', outlineOffset: -1 }} />{t('sched.legendEmpty')}</span>
            </div>
          )}
        </div>
      </section>

      <div className="side stack" style={{ gap: 20 }}>
        {mine && rlinks.length > 0 && (
          <section aria-labelledby="rw-h" className="card stack" style={{ padding: 20, gap: 8 }}>
            <h2 id="rw-h" style={{ fontSize: 17 }}>{t('r.myWeek')}</h2>
            {rlinks.map((l, i) => (
              <Link key={i} href={`/routines/plans/${l.plan.id}`} className="hstack" style={{ gap: 8, fontSize: 14, flexWrap: 'nowrap' }}>
                <Icon name={l.plan.kind === 'meal' ? 'bowl' : 'dumbbell'} size={14} />
                <span className="muted" style={{ minWidth: 92 }}>{shortDays[l.weekday]} {l.hour === null ? t('r.allDay') : hh(l.hour)}</span>
                <span style={{ overflowWrap: 'anywhere' }}>{l.plan.title}</span>
              </Link>
            ))}
          </section>
        )}
        {editable && (
          <section aria-labelledby="edit-h" className="card stack" style={{ padding: 20 }}>
            <h2 id="edit-h" style={{ fontSize: 17 }}>{t('sched.edit')}</h2>
            <div className="field">{t('sched.days')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
                {shortDays.map((n, d) => {
                  const on = range.days.includes(d);
                  return (
                    <button key={d} type="button" aria-pressed={on} aria-label={longDays[d]} className="btn small"
                      style={{ padding: 0, ...(on ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', fontWeight: 600 } : {}) }}
                      onClick={() => setRange({ ...range, days: on ? range.days.filter((x) => x !== d) : [...range.days, d].sort() })}>{n}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <label className="field">{t('sched.from')}
                <select className="input mono" value={range.from} onChange={(e) => { const f = Number(e.target.value); setRange({ ...range, from: f, to: Math.max(range.to, f + 1) }); }}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
                </select>
              </label>
              <label className="field">{t('sched.to')}
                <select className="input mono" value={range.to} onChange={(e) => { const to = Number(e.target.value); setRange({ ...range, to, from: Math.min(range.from, to - 1) }); }}>
                  {Array.from({ length: 24 }, (_, i) => <option key={i + 1} value={i + 1}>{hh(i + 1)}</option>)}
                </select>
              </label>
            </div>
            <div className="field">{t('sched.cats')}
              <div className="hstack" style={{ gap: 6 }}>
                {categories.map((c) => {
                  const on = ks.includes(c.id);
                  const col = cat.one(c.id);
                  return (
                    <button key={c.id} type="button" aria-pressed={on} onClick={() => { const n = on ? ks.filter((x) => x !== c.id) : [...ks, c.id]; if (n.length) setKs(n); }}
                      style={{ padding: '8px 12px', minHeight: 40, borderRadius: 999, cursor: 'pointer', background: col.bg, color: col.ink, border: `2px solid ${on ? col.ink : 'transparent'}`, fontWeight: on ? 600 : 400, fontSize: 13 }}>
                      {cat.catName(c.id)}
                    </button>
                  );
                })}
              </div>
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {ks.length > 1 ? t('sched.split', { cats: cat.names(normalize(ks, '').categoryIds), m: Math.round(60 / ks.length) }) : t('sched.splitHint')}
              </span>
            </div>
            <label className="field">{t('sched.desc')}
              <input className="input" value={desc} maxLength={80} onChange={(e) => setDesc(e.target.value)} />
            </label>

            {!range.days.length ? <div className="note info">{t('sched.noDays')}</div>
              : p && p.overwriteCount > 0 ? (
                <div className="note warn stack" role="status" style={{ gap: 6 }}>
                  <span className="hstack" style={{ fontWeight: 600 }}><Icon name="warn" size={16} />{t('sched.willOverwrite', { n: p.overwriteCount })}</span>
                  {p.overwrites.map((o, i) => <span key={i} className="mono" style={{ fontSize: 12 }}>· {shortDays[o.weekday]} {hh(o.from)}–{hh(o.to)} {cat.names(o.before.categoryIds)}{o.before.description ? ' · ' + o.before.description : ''}</span>)}
                </div>
              ) : p && p.fillCount > 0 ? <div className="note ok">{t('sched.free', { n: p.fillCount })}</div>
              : <div className="note info">{t('sched.same')}</div>}

            <div className="hstack">
              <button type="button" className="btn primary" style={{ flex: '1 1 auto' }} disabled={busy || !p || (p.overwriteCount === 0 && p.fillCount === 0)} onClick={save}>{t('common.save')}</button>
              <button type="button" className="btn danger-ghost" disabled={busy || !origRange} onClick={() => setClearConfirm(true)}>{t('sched.clear')}</button>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{origRange ? t('sched.clearHint', { what: origLabel }) : t('sched.clearNone')}</span>
            <span className="muted" style={{ fontSize: 12 }}>{hours > 0 && range.days.length ? `${range.days.map((d) => shortDays[d]).join(', ')} · ${hh(range.from)}–${hh(range.to)}` : ''}</span>
          </section>
        )}
        <SummaryCard view={view} userId={uid} onChange={onChange} />
      </div>

      {confirm && p && value && (
        <Modal labelledBy="cf-h" onClose={() => setConfirm(false)}>
          <div className="hstack" style={{ gap: 12, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <span style={{ flex: '0 0 auto', width: 40, height: 40, borderRadius: 10, background: 'var(--warn-bg)', color: 'var(--warn-ink)', display: 'grid', placeItems: 'center' }}><Icon name="warn" size={22} /></span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="cf-h" style={{ fontSize: 20 }}>{t('sched.confirmTitle')}</h2>
              <p className="ink2" style={{ fontSize: 14 }}>{t('sched.confirmSub', { what: `${cat.names(value.categoryIds)}${value.description ? ' · ' + value.description : ''}`, n: p.overwriteCount })}</p>
            </div>
          </div>
          <div className="note warn stack" style={{ gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{t('sched.confirmList')}</span>
            {p.overwrites.map((o, i) => <span key={i} className="mono" style={{ fontSize: 13 }}>· {shortDays[o.weekday]} {hh(o.from)}–{hh(o.to)} {cat.names(o.before.categoryIds)}{o.before.description ? ' · ' + o.before.description : ''}</span>)}
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{t('sched.preview')}</span>
          <BeforeAfter days={affectedDays} before={week} after={p.after} afterLabel={t('sched.after')} changed={(d, h) => inRange(range, d, h) && !sameSlot(week[idx(d, h)], value)} />
          <span className="muted" style={{ fontSize: 12 }}>{t('sched.changedNote')}</span>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn primary" disabled={busy} onClick={applyRange}>{t('sched.confirmBtn')}</button>
          </div>
        </Modal>
      )}

      {clearConfirm && origRange && cleared && orig && (
        <Modal labelledBy="cl-h" narrow onClose={() => setClearConfirm(false)}>
          <div className="hstack" style={{ gap: 12, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <span style={{ flex: '0 0 auto', width: 40, height: 40, borderRadius: 10, background: 'var(--danger-bg)', color: 'var(--danger-ink)', display: 'grid', placeItems: 'center' }}><Icon name="trash" size={20} /></span>
            <div className="stack" style={{ gap: 4 }}>
              <h2 id="cl-h" style={{ fontSize: 20 }}>{t('sched.clearTitle')}</h2>
              <p className="ink2" style={{ fontSize: 14 }}>{t('sched.clearSub', { what: origLabel, n: orig.to - orig.from })}</p>
            </div>
          </div>
          <BeforeAfter days={[orig.d]} before={week} after={cleared} afterLabel={t('sched.afterClear')} changed={(d, h) => inRange(origRange, d, h)} />
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setClearConfirm(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn danger" disabled={busy} onClick={doClear}>{t('sched.clearBtn')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
