// Routine editors: one exercise/meal, one plan, and the JSON import page. All save through the same
// import format the API and the AI guide use, with live server validation.
import { useEffect, useRef, useState } from 'react';
import { API_URL, ApiError, get, post, put } from '../api';
import { useApp } from '../app-context';
import { ErrorNote, Icon, Spinner } from '../components/ui';
import type { Key } from '../i18n';
import type { Validation } from '../lib/courses';
import { fmtNum, itemKindFor, MEAL_TYPES, MUSCLES, sectionsFor, type ItemKind, type PlanKind, type RoutineItem, type RoutineList } from '../lib/routines';
import { useLoad } from '../lib/use-load';
import { Link, navigate } from '../router';
import { Checks, Field } from './course-editor';
import { McpSetup } from './oauth';
import { MacroBar } from './routines';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;
const pretty = (d: unknown) => JSON.stringify(d, null, 2);

const EMPTY_ITEM: Record<ItemKind, Doc> = {
  exercise: { kind: 'exercise', title: '', description: '', muscles: [], equipment: '', instructions: '', visibility: 'group' },
  meal: { kind: 'meal', title: '', description: '', mealTypes: [], serving: '', calories: null, protein: null, carbs: null, fat: null, ingredients: [], steps: '', visibility: 'group' },
};
const EMPTY_PLAN: Record<PlanKind, Doc> = {
  workout: { kind: 'workout', title: '', description: '', visibility: 'group', entries: [] },
  meal: { kind: 'meal', title: '', description: '', visibility: 'group', entries: [] },
};

/** Debounced server validation of the current document. */
function useValidation(doc: unknown) {
  const [check, setCheck] = useState<Validation | null>(null);
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);
  const key = JSON.stringify(doc);
  useEffect(() => {
    const n = ++seq.current;
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const v = await post<Validation>('/api/routines/validate', doc);
        if (n === seq.current) setCheck(v);
      } catch { /* keep the last result */ } finally { if (n === seq.current) setChecking(false); }
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { check, setCheck, checking };
}

function SaveBar({ canSave, isNew, onSave }: { canSave: boolean; isNew: boolean; onSave: (status?: 'draft') => void }) {
  const { t } = useApp();
  return (
    <div className="hstack" style={{ justifyContent: 'flex-end' }}>
      <button type="button" className="btn" onClick={() => history.back()}>{t('common.cancel')}</button>
      {isNew && <button type="button" className="btn" disabled={!canSave} onClick={() => onSave('draft')}>{t('re.saveDraft')}</button>}
      <button type="button" className="btn primary" disabled={!canSave} onClick={() => onSave()}>{t('re.save')}</button>
    </div>
  );
}

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const numStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));

function Chips({ all, value, label, prefix, onChange }: { all: readonly string[]; value: string[]; label: string; prefix: string; onChange: (v: string[]) => void }) {
  const { t } = useApp();
  return (
    <div className="field">
      <span>{label}</span>
      <div className="pills" role="group" aria-label={label}>
        {all.map((m) => {
          const on = value.includes(m);
          return <button key={m} type="button" className="pill" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== m) : [...value, m])}>{t(`${prefix}${m}` as Key)}</button>;
        })}
      </div>
    </div>
  );
}

function VisibilityField({ doc, set }: { doc: Doc; set: (k: string, v: unknown) => void }) {
  const { t } = useApp();
  return (
    <Field label={t('f.visibility')}>
      <select className="input" value={doc.visibility ?? 'group'} onChange={(e) => set('visibility', e.target.value)}>
        <option value="group">{t('f.vis.group')}</option>
        <option value="private">{t('f.vis.private')}</option>
      </select>
    </Field>
  );
}

// ---------- item (exercise / meal) ----------
function ItemEditor({ initial, id }: { initial: Doc; id?: number }) {
  const { t, toast } = useApp();
  const [doc, setDoc] = useState<Doc>(initial);
  const [saving, setSaving] = useState(false);
  const { check, setCheck, checking } = useValidation(doc);
  const set = (k: string, v: unknown) => setDoc({ ...doc, [k]: v });
  const err = (p: string) => check?.errors.find((i) => i.path === p)?.message;
  const meal = doc.kind === 'meal';
  const macroKcal = meal && doc.protein !== null && doc.carbs !== null && doc.fat !== null ? Math.round(doc.protein * 4 + doc.carbs * 4 + doc.fat * 9) : null;

  async function save(status?: 'draft') {
    setSaving(true);
    try {
      let newId = id;
      if (id) await put(`/api/routines/items/${id}`, doc);
      else newId = (await post<{ items: { id: number }[] }>(`/api/routines/import${status ? `?status=${status}` : ''}`, doc)).items[0]!.id;
      toast(t('common.saved'));
      navigate(`/routines/items/${newId}`, true);
    } catch (e) {
      if (e instanceof ApiError && e.details?.errors) setCheck({ errors: e.details.errors, warnings: e.details.warnings ?? [], draft: null });
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally { setSaving(false); }
  }

  const title = id ? t('re.editItem') : t(meal ? 'r.newMeal' : 'r.newExercise');
  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb"><Link href={meal ? '/routines?tab=meal' : '/routines'}>{t('r.title')}</Link></nav>
      <h1>{title}</h1>
      <Checks check={check} checking={checking} jsonError={null} />
      <section className="card stack" style={{ maxWidth: 760 }}>
        <Field label={t('re.title')} error={err('title')}><input className="input" value={doc.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label={t('re.description')} error={err('description')}><input className="input" value={doc.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        {!meal ? (
          <>
            <Chips all={MUSCLES} value={doc.muscles ?? []} label={t('re.muscles')} prefix="r.muscle." onChange={(v) => set('muscles', v)} />
            <Field label={t('re.equipment')}><input className="input" value={doc.equipment ?? ''} onChange={(e) => set('equipment', e.target.value)} /></Field>
            <div className="form-grid3">
              <Field label={t('re.sets')} error={err('sets')}><input className="input" inputMode="numeric" value={numStr(doc.sets)} onChange={(e) => set('sets', numOrNull(e.target.value))} /></Field>
              <Field label={t('re.reps')} error={err('reps')}><input className="input" value={doc.reps ?? ''} onChange={(e) => set('reps', e.target.value || null)} /></Field>
              <Field label={t('re.seconds')} error={err('seconds')}><input className="input" inputMode="numeric" value={numStr(doc.seconds)} onChange={(e) => set('seconds', numOrNull(e.target.value))} /></Field>
            </div>
            <Field label={t('re.instructions')} error={err('instructions')}><textarea className="input" rows={8} value={doc.instructions ?? ''} onChange={(e) => set('instructions', e.target.value)} /></Field>
          </>
        ) : (
          <>
            <Chips all={MEAL_TYPES} value={doc.mealTypes ?? []} label={t('re.mealTypes')} prefix="r.meal." onChange={(v) => set('mealTypes', v)} />
            <Field label={t('re.serving')}><input className="input" value={doc.serving ?? ''} onChange={(e) => set('serving', e.target.value)} /></Field>
            <div className="form-grid4">
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((k) => (
                <Field key={k} label={t(k === 'calories' ? 're.kcal' : `re.${k}`)} error={err(k)}>
                  <input className="input" inputMode="decimal" value={numStr(doc[k])} onChange={(e) => set(k, numOrNull(e.target.value))} />
                </Field>
              ))}
            </div>
            {macroKcal !== null && <span className="muted" style={{ fontSize: 13 }}>{t('re.macroCheck', { n: macroKcal })}</span>}
            <Field label={t('re.ingredients')}>
              <textarea className="input" rows={5} value={(doc.ingredients ?? []).join('\n')} onChange={(e) => set('ingredients', e.target.value.split('\n'))}
                onBlur={() => set('ingredients', (doc.ingredients ?? []).map((s: string) => s.trim()).filter(Boolean))} />
            </Field>
            <div className="form-grid3">
              <Field label={t('re.prep')} error={err('prepMinutes')}><input className="input" inputMode="numeric" value={numStr(doc.prepMinutes)} onChange={(e) => set('prepMinutes', numOrNull(e.target.value))} /></Field>
              <Field label={t('re.cook')} error={err('cookMinutes')}><input className="input" inputMode="numeric" value={numStr(doc.cookMinutes)} onChange={(e) => set('cookMinutes', numOrNull(e.target.value))} /></Field>
              <Field label={t('re.makes')} error={err('makes')}><input className="input" inputMode="numeric" placeholder="1" value={numStr(doc.makes)} onChange={(e) => set('makes', numOrNull(e.target.value))} /></Field>
            </div>
            <Field label={t('re.tools')}>
              <input className="input" value={(doc.tools ?? []).join(', ')} onChange={(e) => set('tools', e.target.value.split(',').map((x) => x.trimStart()))}
                onBlur={() => set('tools', (doc.tools ?? []).map((x: string) => x.trim()).filter(Boolean))} />
            </Field>
            <Field label={t('re.steps')} error={err('steps')}><textarea className="input" rows={8} placeholder={'1. …\n2. …'} value={doc.steps ?? ''} onChange={(e) => set('steps', e.target.value)} /></Field>
            <Field label={t('re.tips')} error={err('tips')}><textarea className="input" rows={3} value={doc.tips ?? ''} onChange={(e) => set('tips', e.target.value)} /></Field>
          </>
        )}
        <Field label={t('f.links')}>
          <textarea className="input" rows={2} placeholder="YouTube | https://youtu.be/…" value={(doc.links ?? []).map((l: Doc) => `${l.title} | ${l.url}`).join('\n')}
            onChange={(e) => set('links', e.target.value.split('\n').map((l) => l.split('|').map((s) => s.trim())).filter(([a]) => a).map(([a, b]) => (b ? { title: a, url: b } : { title: a, url: a })))} />
        </Field>
        <VisibilityField doc={doc} set={set} />
      </section>
      <SaveBar canSave={!!check && !check.errors.length && !checking && !saving} isNew={!id} onSave={save} />
    </>
  );
}

// ---------- plan ----------
function PlanEditor({ initial, id }: { initial: Doc; id?: number }) {
  const { t, lang, toast } = useApp();
  const [doc, setDoc] = useState<Doc>(initial);
  const [saving, setSaving] = useState(false);
  const { check, setCheck, checking } = useValidation(doc);
  const lib = useLoad(() => get<RoutineList>('/api/routines'), []);
  const kind = doc.kind as PlanKind;
  const meal = kind === 'meal';
  const sections = sectionsFor(kind);
  const items = (lib.data?.items ?? []).filter((i) => i.kind === itemKindFor(kind));
  const byId = new Map<number, RoutineItem>(items.map((i) => [i.id, i]));
  const entries: Doc[] = doc.entries ?? [];
  const set = (k: string, v: unknown) => setDoc({ ...doc, [k]: v });
  const setEntry = (i: number, e: Doc) => set('entries', entries.map((x, k) => (k === i ? e : x)));
  const err = (p: string) => check?.errors.find((i) => i.path === p)?.message;

  // live totals for meal plans
  let totals = null as null | { calories: number; protein: number; carbs: number; fat: number; split: { protein: number; carbs: number; fat: number } };
  if (meal) {
    const s = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const e of entries) {
      const it = byId.get(Number(e.itemId));
      if (!it) continue;
      const k = e.servings ?? 1;
      s.calories += (it.data.calories ?? 0) * k; s.protein += (it.data.protein ?? 0) * k; s.carbs += (it.data.carbs ?? 0) * k; s.fat += (it.data.fat ?? 0) * k;
    }
    const mk = s.protein * 4 + s.carbs * 4 + s.fat * 9 || 1;
    totals = { calories: Math.round(s.calories), protein: Math.round(s.protein * 10) / 10, carbs: Math.round(s.carbs * 10) / 10, fat: Math.round(s.fat * 10) / 10,
      split: { protein: Math.round((s.protein * 4 / mk) * 100), carbs: Math.round((s.carbs * 4 / mk) * 100), fat: Math.round((s.fat * 9 / mk) * 100) } };
  }

  async function save(status?: 'draft') {
    setSaving(true);
    try {
      const body = { ...doc, entries: entries.map(({ item: _drop, ...e }) => e) };
      let newId = id;
      if (id) await put(`/api/routines/plans/${id}`, body);
      else newId = (await post<{ plans: { id: number }[] }>(`/api/routines/import${status ? `?status=${status}` : ''}`, body)).plans[0]!.id;
      toast(t('common.saved'));
      navigate(`/routines/plans/${newId}`, true);
    } catch (e) {
      if (e instanceof ApiError && e.details?.errors) setCheck({ errors: e.details.errors, warnings: e.details.warnings ?? [], draft: null });
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally { setSaving(false); }
  }

  const addEntry = () => {
    const last = entries[entries.length - 1];
    set('entries', [...entries, meal ? { section: last?.section ?? 'breakfast', itemId: '', servings: 1 } : { section: last?.section ?? 'main', itemId: '' }]);
  };
  const title = id ? t('re.editPlan') : t(meal ? 'r.newMealPlan' : 'r.newWorkout');
  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb"><Link href={meal ? '/routines?tab=meal' : '/routines'}>{t('r.title')}</Link></nav>
      <h1>{title}</h1>
      <Checks check={check} checking={checking} jsonError={null} />
      <section className="card stack" style={{ maxWidth: 900 }}>
        <Field label={t('re.title')} error={err('title')}><input className="input" value={doc.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label={t('re.description')}><input className="input" value={doc.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <VisibilityField doc={doc} set={set} />
      </section>

      <section className="card stack" style={{ maxWidth: 900 }} aria-labelledby="ent-h">
        <div className="between">
          <h2 id="ent-h">{t('re.entries')}</h2>
          {totals && <strong>{totals.calories} kcal</strong>}
        </div>
        {totals && totals.calories > 0 && <MacroBar totals={totals} />}
        {lib.error ? <ErrorNote error={lib.error} onRetry={lib.reload} /> : !lib.data ? <Spinner /> : !items.length ? (
          <div className="note info">{t('re.needItems')} <Link href={meal ? '/routines/new/meal' : '/routines/new/exercise'}>{t(meal ? 'r.newMeal' : 'r.newExercise')}</Link></div>
        ) : null}
        {entries.map((e, i) => {
          const p = (f: string) => `entries[${i}].${f}`;
          const it = byId.get(Number(e.itemId));
          return (
            <div key={i} className="entry-edit">
              <div className="entry-edit-row">
                <span className="mark">{i + 1}</span>
                <Field label={t('re.section')}>
                  <select className="input" value={e.section} onChange={(ev) => setEntry(i, { ...e, section: ev.target.value })}>
                    {sections.map((s) => <option key={s} value={s}>{t((meal ? `r.meal.${s}` : `r.sec.${s}`) as Key)}</option>)}
                  </select>
                </Field>
                <Field label={t('re.item')} error={err(p('item')) ?? err(p('itemId'))}>
                  <select className="input" value={e.itemId === '' || e.itemId === undefined ? '' : String(e.itemId)}
                    onChange={(ev) => setEntry(i, { ...e, itemId: ev.target.value === '' ? '' : Number(ev.target.value), item: undefined })}>
                    <option value="">{t('re.pick')}</option>
                    {items.map((x) => <option key={x.id} value={x.id}>{x.title}{meal && x.data.calories !== null ? ` · ${x.data.calories} kcal` : ''}</option>)}
                    {e.itemId && !it && <option value={String(e.itemId)}>#{e.itemId} {e.item ?? ''}</option>}
                  </select>
                </Field>
              </div>
              <div className="entry-edit-row">
                {meal ? (
                  <Field label={t('re.servings')} error={err(p('servings'))}>
                    <input className="input" inputMode="decimal" value={numStr(e.servings)} onChange={(ev) => setEntry(i, { ...e, servings: numOrNull(ev.target.value) })} />
                  </Field>
                ) : (
                  <>
                    <Field label={t('re.sets')} error={err(p('sets'))}><input className="input" inputMode="numeric" placeholder={numStr(it?.data.sets)} value={numStr(e.sets)} onChange={(ev) => setEntry(i, { ...e, sets: numOrNull(ev.target.value) ?? undefined })} /></Field>
                    <Field label={t('re.reps')} error={err(p('reps'))}><input className="input" placeholder={it?.data.reps ?? ''} value={e.reps ?? ''} onChange={(ev) => setEntry(i, { ...e, reps: ev.target.value || undefined })} /></Field>
                    <Field label={t('re.seconds')} error={err(p('seconds'))}><input className="input" inputMode="numeric" placeholder={numStr(it?.data.seconds)} value={numStr(e.seconds)} onChange={(ev) => setEntry(i, { ...e, seconds: numOrNull(ev.target.value) ?? undefined })} /></Field>
                    <Field label={t('re.rest')} error={err(p('rest'))}><input className="input" inputMode="numeric" value={numStr(e.rest)} onChange={(ev) => setEntry(i, { ...e, rest: numOrNull(ev.target.value) ?? undefined })} /></Field>
                  </>
                )}
                <Field label={t('re.note')}><input className="input" value={e.note ?? ''} onChange={(ev) => setEntry(i, { ...e, note: ev.target.value || undefined })} /></Field>
              </div>
              <div className="hstack" style={{ gap: 6, justifyContent: 'flex-end' }}>
                {meal && it && <span className="muted" style={{ fontSize: 12, marginRight: 'auto' }}>{Math.round((it.data.calories ?? 0) * (e.servings ?? 1))} kcal · P {fmtNum((it.data.protein ?? 0) * (e.servings ?? 1))} g</span>}
                <button type="button" className="btn small" disabled={i === 0} aria-label="↑" onClick={() => { const n = [...entries]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; set('entries', n); }}>↑</button>
                <button type="button" className="btn small" disabled={i === entries.length - 1} aria-label="↓" onClick={() => { const n = [...entries]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; set('entries', n); }}>↓</button>
                <button type="button" className="btn small danger-ghost" onClick={() => set('entries', entries.filter((_, k) => k !== i))}><Icon name="trash" size={16} />{t('r.delete')}</button>
              </div>
            </div>
          );
        })}
        <div><button type="button" className="btn" disabled={!items.length} onClick={addEntry}>{t('re.addEntry')}</button></div>
      </section>
      <SaveBar canSave={!!check && !check.errors.length && !checking && !saving} isNew={!id} onSave={save} />
    </>
  );
}

// ---------- routes ----------
export function NewRoutinePage({ what }: { what: string }) {
  if (what === 'exercise' || what === 'meal') return <ItemEditor initial={EMPTY_ITEM[what]} />;
  if (what === 'workout') return <PlanEditor initial={EMPTY_PLAN.workout} />;
  if (what === 'meal-plan') return <PlanEditor initial={EMPTY_PLAN.meal} />;
  return <div className="empty-state">404</div>;
}

export function EditRoutinePage({ what, id }: { what: 'items' | 'plans'; id: number }) {
  const { t } = useApp();
  const r = useLoad(() => get<Doc>(`/api/routines/${what}/${id}/export`), [what, id]);
  if (r.error) return r.error instanceof ApiError && r.error.status === 404 ? <div className="empty-state">{t('r.notFound')}</div> : <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  if (what === 'items') {
    const { id: _id, ...doc } = r.data.items?.[0] ?? r.data;
    return <ItemEditor initial={doc} id={id} />;
  }
  const { id: _id, ...doc } = r.data.plans?.[0] ?? r.data;
  return <PlanEditor initial={doc} id={id} />;
}

// ---------- JSON import ----------
export function RoutineImportPage() {
  const { t, toast } = useApp();
  const [text, setText] = useState('');
  const [doc, setDoc] = useState<unknown>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'guide' | 'mcp' | 'token'>('guide');
  const guideUrl = `${API_URL}/api/routines/guide.md`;
  const guide = useLoad(() => fetch(guideUrl).then((r) => r.text()), []);
  const { check, setCheck, checking } = useValidation(doc ?? {});
  const draft = check?.draft as { items?: unknown[]; plans?: unknown[] } | null | undefined;

  function onText(s: string) {
    setText(s);
    if (!s.trim()) { setDoc(null); setJsonError(null); return; }
    try { setDoc(JSON.parse(s)); setJsonError(null); } catch (e) { setJsonError((e as Error).message); }
  }
  function loadExample() {
    const m = (guide.data ?? '').match(/```json\n([\s\S]*?)\n```/);
    if (m) onText(m[1]!);
  }
  async function copy(s: string) {
    try { await navigator.clipboard.writeText(s); toast(t('e.copied')); } catch { toast(t('common.error')); }
  }
  async function doImport(status?: 'draft') {
    setBusy(true);
    try {
      const r = await post<{ items: { id: number }[]; plans: { id: number }[] }>(`/api/routines/import${status ? `?status=${status}` : ''}`, doc);
      toast(t('ri.done'));
      navigate(r.plans[0] ? `/routines/plans/${r.plans[0].id}` : r.items[0] ? `/routines/items/${r.items[0].id}` : '/routines', true);
    } catch (e) {
      if (e instanceof ApiError && e.details?.errors) setCheck({ errors: e.details.errors, warnings: e.details.warnings ?? [], draft: null });
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally { setBusy(false); }
  }
  const ok = !!doc && !jsonError && !!check && !check.errors.length && !checking && !busy;

  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb"><Link href="/routines">{t('r.title')}</Link></nav>
      <div className="stack" style={{ gap: 4 }}>
        <h1>{t('ri.title')}</h1>
        <p className="muted" style={{ fontSize: 14 }}>{t('ri.sub')}</p>
      </div>
      <div className="row">
        <section className="grow card stack">
          <div className="between">
            <label htmlFor="rjson-in" style={{ fontWeight: 600 }}>{t('e.paste')}</label>
            <button type="button" className="btn small" onClick={loadExample} disabled={!guide.data}>{t('e.loadExample')}</button>
          </div>
          <textarea id="rjson-in" className="input code" spellCheck={false} value={text} placeholder='{ "items": [ … ], "plans": [ … ] }' onChange={(e) => onText(e.target.value)} />
          {doc !== null && <Checks check={check} checking={checking} jsonError={jsonError} />}
          {ok && draft && <div className="note info">{t('ri.willCreate', { i: draft.items?.length ?? 0, p: draft.plans?.length ?? 0 })}</div>}
          <div className="hstack">
            <button type="button" className="btn" disabled={!ok} onClick={() => doImport('draft')}>{t('ri.importDraft')}</button>
            <button type="button" className="btn primary" disabled={!ok} onClick={() => doImport()}>{t('ri.import')}</button>
          </div>
        </section>
        <section className="side card stack" aria-label={t('e.guide')}>
          <div className="seg" role="tablist">
            {([['guide', t('e.guide')], ['mcp', t('e.tabMcp')], ['token', t('e.tabToken')]] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          {tab === 'guide' && (
            <>
              <p className="ink2" style={{ fontSize: 14 }}>{t('e.guideSub')}</p>
              {guide.error ? <ErrorNote error={guide.error} onRetry={guide.reload} /> : !guide.data ? <Spinner /> : (
                <>
                  <div className="guide-box" tabIndex={0}>{guide.data}</div>
                  <div><button type="button" className="btn primary" onClick={() => copy(guide.data!)}><Icon name="copy" />{t('e.copy')}</button></div>
                </>
              )}
              <p className="muted" style={{ fontSize: 13 }}>{t('e.guideLink')}<br /><a href={guideUrl} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>{guideUrl}</a></p>
            </>
          )}
          {tab === 'mcp' && <McpSetup example={t('r.mcpExample')} />}
          {tab === 'token' && (
            <>
              <p className="ink2" style={{ fontSize: 14 }}>{t('e.tokenHelp', { url: `${API_URL}/api/routines/import` })}</p>
              <Link className="btn" href="/settings">{t('settings.account')} →</Link>
            </>
          )}
        </section>
      </div>
    </>
  );
}
