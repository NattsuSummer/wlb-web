import { useEffect, useRef, useState } from 'react';
import { ApiError, del, get, patch, put } from '../api';
import { useApp } from '../app-context';
import { Badges } from '../components/course-ui';
import { ErrorNote, Icon, Modal, Spinner } from '../components/ui';
import { dayNames, type Key } from '../i18n';
import { renderMarkdown, tintColors, youtubeId } from '../lib/courses';
import {
  fmtNum, hh, itemKindFor, MEAL_TYPES, MUSCLES, sectionsFor,
  type Day, type ItemKind, type PlanDetail, type PlanKind, type RoutineItem, type RoutineList, type RoutinePlan, type Totals, type WeekLink,
} from '../lib/routines';
import { useLoad } from '../lib/use-load';
import { Link, navigate } from '../router';
import { downloadJson } from './course';

const tabFromUrl = (): PlanKind => (new URLSearchParams(location.search).get('tab') === 'meal' ? 'meal' : 'workout');

export function KindBox({ kind, size = 44 }: { kind: ItemKind | PlanKind; size?: number }) {
  const c = tintColors(kind === 'meal' ? 'f' : 'w');
  return (
    <span className="cat-box" aria-hidden="true" style={{ width: size, height: size, background: c.bg, color: c.ink }}>
      <Icon name={kind === 'meal' ? 'bowl' : 'dumbbell'} size={Math.round(size * 0.5)} />
    </span>
  );
}

function AddMenu({ kind }: { kind: PlanKind }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const items: [string, Key, Key][] = kind === 'workout'
    ? [['/routines/new/workout', 'r.newWorkout', 'r.newWorkoutSub'], ['/routines/new/exercise', 'r.newExercise', 'r.newExerciseSub']]
    : [['/routines/new/meal-plan', 'r.newMealPlan', 'r.newMealPlanSub'], ['/routines/new/meal', 'r.newMeal', 'r.newMealSub']];
  return (
    <div ref={ref} style={{ position: 'relative' }} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button type="button" className="btn primary" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}><Icon name="plus" />{t('r.add')}</button>
      {open && (
        <div className="menu">
          {items.map(([href, a, b]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{t(a)}<span>{t(b)}</span></Link>)}
          <Link href="/routines/import" onClick={() => setOpen(false)}>{t('r.importJson')}<span>{t('r.importJsonSub')}</span></Link>
        </div>
      )}
    </div>
  );
}

export function MacroBar({ totals }: { totals: Pick<Totals, 'split' | 'protein' | 'carbs' | 'fat'> }) {
  const { t } = useApp();
  const parts = [['protein', 'w'], ['carbs', 'f'], ['fat', 'r']] as const;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="bar" style={{ display: 'flex', height: 10 }} role="img" aria-label={parts.map(([k]) => `${t(`r.${k}` as Key)} ${totals.split[k]}%`).join(', ')}>
        {parts.map(([k, tint]) => <span key={k} style={{ width: `${totals.split[k]}%`, background: tintColors(tint).solid }} />)}
      </div>
      <div className="hstack" style={{ gap: 14, fontSize: 13 }}>
        {parts.map(([k, tint]) => (
          <span key={k} className="hstack" style={{ gap: 6 }}>
            <span className="dot" style={{ background: tintColors(tint).solid }} />{t(`r.${k}` as Key)} <strong>{fmtNum(totals[k])} g</strong> <span className="muted">{totals.split[k]}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanCard({ p }: { p: RoutinePlan }) {
  const { t, lang } = useApp();
  const short = dayNames(lang, 'short');
  return (
    <Link href={`/routines/plans/${p.id}`} className="ccard">
      <KindBox kind={p.kind} />
      <span className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
        <span className="hstack" style={{ gap: 6 }}><span className="s">{t('r.entries', { n: p.entryCount })}</span><Badges c={p} /></span>
        <span className="t">{p.title}</span>
        <span className="s">
          {p.kind === 'workout'
            ? <>{t('r.minutes', { n: p.minutes ?? 0 })}{p.muscles?.length ? ` · ${p.muscles.map((m) => t(`r.muscle.${m}` as Key)).join(', ')}` : ''}</>
            : <><strong style={{ color: 'var(--ink)' }}>{p.totals?.calories ?? 0} kcal</strong> · P {fmtNum(p.totals?.protein)} · C {fmtNum(p.totals?.carbs)} · F {fmtNum(p.totals?.fat)}</>}
        </span>
        {p.myDays?.length ? (
          <span className="hstack" style={{ gap: 4 }}>
            {[...new Set(p.myDays.map((d) => d.weekday))].map((d) => <span key={d} className="badge in_progress">{short[d]}</span>)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function ItemCard({ it }: { it: RoutineItem }) {
  const { t } = useApp();
  const d = it.data;
  return (
    <Link href={`/routines/items/${it.id}`} className="ccard" style={{ padding: 12 }}>
      {it.images[0] ? <img src={it.images[0].url} alt="" referrerPolicy="no-referrer" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10 }} /> : <KindBox kind={it.kind} />}
      <span className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
        <span className="t" style={{ fontSize: 15 }}>{it.title} <Badges c={it} /></span>
        <span className="s">
          {it.kind === 'exercise'
            ? (d.muscles ?? []).map((m) => t(`r.muscle.${m}` as Key)).join(', ') || '—'
            : <>{d.calories !== null ? `${d.calories} kcal` : '– kcal'} · P {fmtNum(d.protein)} g</>}
        </span>
      </span>
    </Link>
  );
}

export function RoutinesPage() {
  const { t, lang } = useApp();
  const [kind, setKind] = useState<PlanKind>(tabFromUrl);
  const [filter, setFilter] = useState<string>('all');
  const r = useLoad(() => get<RoutineList>('/api/routines'), []);
  const week = useLoad(() => get<{ links: WeekLink[] }>('/api/routines/week'), []);
  const long = dayNames(lang, 'long');

  function choose(k: PlanKind) {
    setKind(k);
    setFilter('all');
    history.replaceState(null, '', k === 'meal' ? '/routines?tab=meal' : '/routines');
  }

  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const plans = r.data.plans.filter((p) => p.kind === kind);
  const itemKind = itemKindFor(kind);
  const filters = kind === 'workout' ? MUSCLES : MEAL_TYPES;
  const items = r.data.items.filter((i) => i.kind === itemKind && (filter === 'all' || (kind === 'workout' ? i.data.muscles : i.data.mealTypes)?.includes(filter)));
  const used = new Set(r.data.items.filter((i) => i.kind === itemKind).flatMap((i) => (kind === 'workout' ? i.data.muscles : i.data.mealTypes) ?? []));
  const links = (week.data?.links ?? []).filter((l) => l.plan.kind === kind);

  return (
    <>
      <div className="between">
        <div className="stack" style={{ gap: 4 }}>
          <h1>{t('r.title')}</h1>
          <p className="muted" style={{ fontSize: 14 }}>{t('r.sub')}</p>
        </div>
        <AddMenu kind={kind} />
      </div>

      <div className="seg" role="tablist" aria-label={t('r.title')} style={{ alignSelf: 'flex-start' }}>
        {(['workout', 'meal'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => choose(k)}>
            <Icon name={k === 'meal' ? 'bowl' : 'dumbbell'} size={16} /> {t(`r.tab.${k}`)}
          </button>
        ))}
      </div>

      <section className="card stack" aria-labelledby="week-h">
        <h2 id="week-h">{t('r.myWeek')}</h2>
        {!links.length ? <p className="muted">{t('r.myWeekEmpty')}</p> : (
          <div className="week-links">
            {long.map((name, d) => {
              const today = links.filter((l) => l.weekday === d);
              return (
                <div key={d} className="stack" style={{ gap: 6, minWidth: 0 }}>
                  <strong style={{ fontSize: 13 }}>{name}</strong>
                  {today.length ? today.map((l, i) => (
                    <Link key={i} href={`/routines/plans/${l.plan.id}`} className="week-link">
                      <span className="muted" style={{ fontSize: 12 }}>{l.hour === null ? t('r.allDay') : hh(l.hour)}</span>
                      <span style={{ overflowWrap: 'anywhere' }}>{l.plan.title}</span>
                    </Link>
                  )) : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="stack" aria-labelledby="plans-h">
        <h2 id="plans-h">{t('r.plans')}</h2>
        {!plans.length ? <p className="muted">{t('r.plansEmpty')}</p> : <div className="course-grid">{plans.map((p) => <PlanCard key={p.id} p={p} />)}</div>}
      </section>

      <section className="stack" aria-labelledby="lib-h">
        <h2 id="lib-h">{t(`r.library.${itemKind}` as Key)}</h2>
        {used.size > 0 && (
          <div className="pills" role="group">
            <button type="button" className="pill" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('r.filterAll')}</button>
            {filters.filter((f) => used.has(f)).map((f) => (
              <button key={f} type="button" className="pill" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {t((kind === 'workout' ? `r.muscle.${f}` : `r.meal.${f}`) as Key)}
              </button>
            ))}
          </div>
        )}
        {!items.length ? <p className="muted">{t('r.libraryEmpty')}</p> : <div className="course-grid">{items.map((i) => <ItemCard key={i.id} it={i} />)}</div>}
      </section>
      <p className="muted" style={{ fontSize: 12 }}>{t('r.disclaimer')}</p>
    </>
  );
}

// ---------- owner actions shared by plan and item pages ----------
function OwnerActions({ what, id, title, status, visibility, canEdit, onChanged }: {
  what: 'items' | 'plans'; id: number; title: string; status: string; visibility: string; canEdit: boolean; onChanged: () => void;
}) {
  const { t, toast } = useApp();
  const [confirm, setConfirm] = useState(false);
  async function change(body: Record<string, unknown>) {
    try { await patch(`/api/routines/${what}/${id}`, body); onChanged(); toast(t('common.saved')); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  async function remove() {
    try { await del(`/api/routines/${what}/${id}`); toast(t('common.saved')); navigate('/routines', true); }
    catch (e) { setConfirm(false); toast(e instanceof ApiError && e.code === 'item_in_use' ? t('r.inUse') : e instanceof Error ? e.message : t('common.error')); }
  }
  async function exportJson() {
    try { downloadJson(title, await get(`/api/routines/${what}/${id}/export`)); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  return (
    <div className="hstack">
      {canEdit && <Link className="btn" href={`/routines/${what}/${id}/edit`}><Icon name="edit" />{t('r.edit')}</Link>}
      {canEdit && (status === 'draft'
        ? <button type="button" className="btn" onClick={() => change({ status: 'published' })}>{t('c.publish')}</button>
        : <button type="button" className="btn" onClick={() => change({ status: 'draft' })}>{t('c.unpublish')}</button>)}
      {canEdit && <button type="button" className="btn" onClick={() => change({ visibility: visibility === 'group' ? 'private' : 'group' })}>{visibility === 'group' ? t('c.makePrivate') : t('c.makeGroup')}</button>}
      <button type="button" className="btn" onClick={exportJson}><Icon name="download" />JSON</button>
      {canEdit && <button type="button" className="btn danger-ghost" onClick={() => setConfirm(true)}><Icon name="trash" />{t('r.delete')}</button>}
      {confirm && (
        <Modal labelledBy="rdel-h" narrow onClose={() => setConfirm(false)}>
          <h2 id="rdel-h">{t('r.delete')}</h2>
          <p>{t('r.confirmDelete', { title })}</p>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn danger" onClick={remove}>{t('common.delete')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- plan page ----------
function DaysPanel({ planId, initial, onSaved }: { planId: number; initial: Day[]; onSaved: (d: Day[]) => void }) {
  const { t, lang, toast } = useApp();
  const long = dayNames(lang, 'long');
  const short = dayNames(lang, 'short');
  const [days, setDays] = useState<number[]>([...new Set(initial.map((d) => d.weekday))]);
  const [hour, setHour] = useState<string>(initial[0]?.hour === null || initial[0] === undefined ? '' : String(initial[0].hour));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const body = { days: days.sort().map((weekday) => ({ weekday, hour: hour === '' ? null : Number(hour) })) };
      const r = await put<{ myDays: Day[] }>(`/api/routines/plans/${planId}/days`, body);
      onSaved(r.myDays);
      toast(t('common.saved'));
    } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); } finally { setBusy(false); }
  }
  return (
    <section className="card stack" aria-labelledby="days-h">
      <h2 id="days-h">{t('r.linkDays')}</h2>
      <p className="muted" style={{ fontSize: 13 }}>{t('r.linkSub')}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
        {short.map((n, d) => {
          const on = days.includes(d);
          return (
            <button key={d} type="button" aria-pressed={on} aria-label={long[d]} className="btn small"
              style={{ padding: 0, ...(on ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', fontWeight: 600 } : {}) }}
              onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}>{n}</button>
          );
        })}
      </div>
      <label className="field">{t('r.time')}
        <select className="input" value={hour} onChange={(e) => setHour(e.target.value)}>
          <option value="">{t('r.allDay')}</option>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
        </select>
      </label>
      <div><button type="button" className="btn primary" disabled={busy} onClick={save}>{t('r.saveDays')}</button></div>
    </section>
  );
}

function entryDetail(e: PlanDetail['entries'][number], t: (k: Key, v?: Record<string, string | number>) => string) {
  const out: string[] = [];
  if (e.item.kind === 'exercise') {
    const sets = e.sets ?? e.item.data.sets;
    const reps = e.reps ?? e.item.data.reps;
    const secs = e.seconds ?? e.item.data.seconds;
    if (sets) out.push(t('r.sets', { n: sets }));
    if (reps) out.push(t('r.reps', { n: reps }));
    if (secs) out.push(t('r.seconds', { n: secs }));
    if (e.restSeconds) out.push(t('r.rest', { n: e.restSeconds }));
  } else {
    const k = e.servings ?? 1;
    if (k !== 1) out.push(t('r.servings', { n: fmtNum(k) }));
    if (e.item.data.calories !== null) out.push(`${Math.round(e.item.data.calories * k)} kcal`);
    if (e.item.data.protein !== null) out.push(`P ${fmtNum(e.item.data.protein * k)} g`);
  }
  return out.join(' · ');
}

export function RoutinePlanPage({ id }: { id: number }) {
  const { t, lang } = useApp();
  const r = useLoad(() => get<PlanDetail>(`/api/routines/plans/${id}`), [id]);
  if (r.error) return r.error instanceof ApiError && r.error.status === 404 ? <div className="empty-state">{t('r.notFound')}</div> : <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const { plan: p, entries, myDays } = r.data;
  const long = dayNames(lang, 'long');
  const sections = sectionsFor(p.kind);

  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb"><Link href={p.kind === 'meal' ? '/routines?tab=meal' : '/routines'}>{t('r.title')}</Link></nav>
      <div className="row">
        <section className="grow card stack" style={{ gap: 16 }}>
          <div className="hstack" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <KindBox kind={p.kind} size={56} />
            <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
              <span className="hstack" style={{ gap: 6 }}>
                <span className="muted" style={{ fontSize: 13 }}>{t(`r.tab.${p.kind}`)} · {t('r.entries', { n: p.entryCount })}{p.creatorName ? ` · ${t('c.by', { name: p.creatorName })}` : ''}</span>
                <Badges c={p} />
              </span>
              <h1 style={{ overflowWrap: 'anywhere' }}>{p.title}</h1>
              {p.description && <p className="ink2">{p.description}</p>}
            </div>
          </div>
          {p.status === 'draft' && <div className="note warn">{t('r.draftNote')}</div>}
          {p.kind === 'meal' && p.totals ? (
            <div className="card-sub stack" style={{ gap: 10 }}>
              <div className="between"><strong>{t('r.totals')}</strong><span style={{ fontSize: 22, fontWeight: 700 }}>{p.totals.calories} kcal</span></div>
              <MacroBar totals={p.totals} />
              {p.totals.itemsWithoutCalories > 0 && <span className="muted" style={{ fontSize: 12 }}>{t('r.missingKcal', { n: p.totals.itemsWithoutCalories })}</span>}
            </div>
          ) : (
            <div className="hstack" style={{ gap: 8 }}>
              <span className="chip gray">{t('r.minutes', { n: p.minutes ?? 0 })}</span>
              {p.muscles?.map((m) => <span key={m} className="chip gray">{t(`r.muscle.${m}` as Key)}</span>)}
            </div>
          )}
          <OwnerActions what="plans" id={p.id} title={p.title} status={p.status} visibility={p.visibility} canEdit={p.canEdit} onChanged={r.reload} />
        </section>
        <div className="side stack">
          <DaysPanel key={JSON.stringify(myDays)} planId={p.id} initial={myDays} onSaved={(d) => r.setData({ ...r.data!, myDays: d })} />
          <p className="muted" style={{ fontSize: 13 }}>
            {myDays.length ? t('r.linkedOn', { days: myDays.map((d) => `${long[d.weekday]}${d.hour === null ? '' : ` ${hh(d.hour)}`}`).join(', ') }) : t('r.notLinked')}
          </p>
        </div>
      </div>

      {sections.map((sec) => {
        const list = entries.filter((e) => e.section === sec);
        if (!list.length) return null;
        return (
          <section key={sec} className="stack" aria-labelledby={`sec-${sec}`}>
            <div className="between">
              <h2 id={`sec-${sec}`}>{t((p.kind === 'meal' ? `r.meal.${sec}` : `r.sec.${sec}`) as Key)}</h2>
              {p.kind === 'meal' && p.totals?.bySection[sec] !== undefined && <span className="muted mono">{Math.round(p.totals.bySection[sec]!)} kcal</span>}
            </div>
            <ol className="card tight" style={{ listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {list.map((e, i) => {
                const body = (
                  <>
                    {e.item.image ? <img src={e.item.image.url} alt="" referrerPolicy="no-referrer" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                      : <span className="mark">{i + 1}</span>}
                    <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <strong style={{ overflowWrap: 'anywhere' }}>{e.item.title}</strong>
                      <span className="muted" style={{ fontSize: 13 }}>{entryDetail(e, t)}</span>
                      {e.note && <span className="ink2" style={{ fontSize: 13 }}>{e.note}</span>}
                    </span>
                  </>
                );
                return (
                  <li key={e.id}>
                    {e.item.viewable
                      ? <Link href={`/routines/items/${e.item.id}`} className="entry-row">{body}</Link>
                      : <div className="entry-row">{body}</div>}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <p className="muted" style={{ fontSize: 12 }}>{t('r.disclaimer')}</p>
    </>
  );
}

// ---------- item page ----------
export function RoutineItemPage({ id }: { id: number }) {
  const { t } = useApp();
  const r = useLoad(() => get<{ item: RoutineItem; usedIn: { id: number; title: string; kind: PlanKind }[] }>(`/api/routines/items/${id}`), [id]);
  if (r.error) return r.error instanceof ApiError && r.error.status === 404 ? <div className="empty-state">{t('r.notFound')}</div> : <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const { item: it, usedIn } = r.data;
  const d = it.data;
  const videos = it.links.filter((l) => youtubeId(l.url));
  const macroKcal = d.protein !== null && d.carbs !== null && d.fat !== null ? d.protein * 4 + d.carbs * 4 + d.fat * 9 : 0;
  const split = macroKcal ? { protein: Math.round(((d.protein ?? 0) * 4 / macroKcal) * 100), carbs: Math.round(((d.carbs ?? 0) * 4 / macroKcal) * 100), fat: Math.round(((d.fat ?? 0) * 9 / macroKcal) * 100) } : null;

  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb"><Link href={it.kind === 'meal' ? '/routines?tab=meal' : '/routines'}>{t('r.title')}</Link></nav>
      <div className="row">
        <article className="grow stack" style={{ gap: 16, minWidth: 0 }}>
          <section className="card stack" style={{ gap: 14 }}>
            <div className="hstack" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <KindBox kind={it.kind} size={56} />
              <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
                <span className="hstack" style={{ gap: 6 }}>
                  <span className="muted" style={{ fontSize: 13 }}>{t(it.kind === 'meal' ? 'r.library.meal' : 'r.library.exercise')}{it.creatorName ? ` · ${t('c.by', { name: it.creatorName })}` : ''}</span>
                  <Badges c={it} />
                </span>
                <h1 style={{ overflowWrap: 'anywhere' }}>{it.title}</h1>
                {it.description && <p className="ink2">{it.description}</p>}
              </div>
            </div>
            <div className="hstack" style={{ gap: 8 }}>
              {it.kind === 'exercise' ? (
                <>
                  {d.muscles?.map((m) => <span key={m} className="chip gray">{t(`r.muscle.${m}` as Key)}</span>)}
                  {d.equipment && <span className="chip gray">{t('r.equipment')}: {d.equipment}</span>}
                  {(d.sets || d.reps || d.seconds) && (
                    <span className="chip gray">{t('r.suggested')}: {[d.sets && t('r.sets', { n: d.sets }), d.reps && t('r.reps', { n: d.reps }), d.seconds && t('r.seconds', { n: d.seconds })].filter(Boolean).join(' · ')}</span>
                  )}
                </>
              ) : d.mealTypes?.map((m) => <span key={m} className="chip gray">{t(`r.meal.${m}` as Key)}</span>)}
            </div>
            {it.status === 'draft' && <div className="note warn">{t('r.draftNote')}</div>}
            <OwnerActions what="items" id={it.id} title={it.title} status={it.status} visibility={it.visibility} canEdit={it.canEdit} onChanged={r.reload} />
          </section>

          {it.images.map((im, i) => (
            <figure key={i} className="lesson-img"><img src={im.url} alt={im.alt} loading="lazy" referrerPolicy="no-referrer" />{im.alt && <figcaption>{im.alt}</figcaption>}</figure>
          ))}
          {videos.map((l, i) => (
            <div key={i} className="video"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(l.url)}`} title={l.title} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen /></div>
          ))}
          {it.kind === 'meal' && d.ingredients?.length > 0 && (
            <section className="card stack" aria-labelledby="ing-h">
              <h2 id="ing-h">{t('r.ingredients')}</h2>
              <ul style={{ margin: 0, paddingLeft: 20 }}>{d.ingredients.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          )}
          {it.bodyMd && (
            <section className="card stack" aria-labelledby="how-h">
              <h2 id="how-h">{t(it.kind === 'meal' ? 'r.howCook' : 'r.howTo')}</h2>
              <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(it.bodyMd) }} />
            </section>
          )}
          {it.links.length > 0 && (
            <section className="stack" style={{ gap: 8 }}>
              {it.links.map((l, i) => <a key={i} className="linkrow" href={l.url} target="_blank" rel="noopener noreferrer"><Icon name={youtubeId(l.url) ? 'play' : 'link'} /><span>{l.title}</span></a>)}
            </section>
          )}
        </article>
        <aside className="side stack">
          {it.kind === 'meal' && (
            <section className="card stack" aria-labelledby="nut-h">
              <div className="between"><h2 id="nut-h">{t('r.calories')}</h2><span className="muted" style={{ fontSize: 12 }}>{t('r.perServing')}{d.servingNote ? ` (${d.servingNote})` : ''}</span></div>
              <span style={{ fontSize: 28, fontWeight: 700 }}>{d.calories ?? '–'} kcal</span>
              {split && <MacroBar totals={{ split, protein: d.protein ?? 0, carbs: d.carbs ?? 0, fat: d.fat ?? 0 }} />}
            </section>
          )}
          <section className="card stack" aria-labelledby="used-h">
            <h2 id="used-h">{t('r.usedInPlans')}</h2>
            {usedIn.length ? usedIn.map((p) => <Link key={p.id} href={`/routines/plans/${p.id}`}>{p.title}</Link>) : <span className="muted">—</span>}
          </section>
          <p className="muted" style={{ fontSize: 12 }}>{t('r.disclaimer')}</p>
        </aside>
      </div>
    </>
  );
}
