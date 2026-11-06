// Course editor: one JSON document (the import format) edited either as a form or as raw JSON, with live
// server validation and a learner preview. Used by "new", "edit" and the JSON import dialog.
import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { API_URL, ApiError, get, post, put } from '../api';
import { useApp } from '../app-context';
import { CatBox, LessonBody, useCourseCats } from '../components/course-ui';
import { ErrorNote, Icon, Spinner } from '../components/ui';
import type { Key } from '../i18n';
import type { Issue, Pack, Validation } from '../lib/courses';
import { useLoad } from '../lib/use-load';
import { Link, navigate } from '../router';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;
type Mode = 'form' | 'json';

const EMPTY: Doc = { title: '', description: '', category: '', level: 'beginner', visibility: 'group', lessons: [{ title: '', content: '' }] };
const pretty = (d: unknown) => JSON.stringify(d, null, 2);

function parseDoc(text: string): { doc: Doc | null; error: string | null } {
  try {
    const v = JSON.parse(text);
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return { doc: null, error: 'top level must be an object { … }' };
    return { doc: v, error: null };
  } catch (e) {
    return { doc: null, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------- pages ----------
export function NewCoursePage() {
  const { t } = useApp();
  return <CourseEditor title={t('e.newTitle')} initial={EMPTY} onDone={(id) => navigate(`/courses/${id}`, true)} />;
}

export function EditCoursePage({ id }: { id: number }) {
  const { t } = useApp();
  const r = useLoad(() => get<Doc>(`/api/courses/${id}/export`), [id]);
  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  return <CourseEditor title={t('e.editTitle')} initial={r.data} courseId={id} onDone={() => navigate(`/courses/${id}`, true)} />;
}

export function ImportPage() {
  const { t, toast } = useApp();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [tab, setTab] = useState<'guide' | 'mcp' | 'token'>('guide');
  const guide = useLoad(() => fetch(`${API_URL}/api/import/guide.md`).then((r) => r.text()), []);
  const guideUrl = `${API_URL}/api/import/guide.md`;

  function open() {
    const p = parseDoc(text);
    setError(p.error ? t('e.badJson', { msg: p.error }) : null);
    if (p.doc) setDoc(p.doc);
  }
  async function loadExample() {
    const md = guide.data ?? '';
    const m = md.match(/```json\n([\s\S]*?)\n```/);
    if (m) { setText(m[1]!); setError(null); }
  }
  async function copy(s: string) {
    try { await navigator.clipboard.writeText(s); toast(t('e.copied')); } catch { toast(t('common.error')); }
  }

  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb"><Link href="/courses">{t('c.title')}</Link></nav>
      <div className="stack" style={{ gap: 4 }}>
        <h1>{t('e.importTitle')}</h1>
        <p className="muted" style={{ fontSize: 14 }}>{t('e.importSub')}</p>
      </div>
      <div className="row">
        <section className="grow card stack">
          <div className="between">
            <label id="paste-h" htmlFor="json-in" style={{ fontWeight: 600 }}>{t('e.paste')}</label>
            <button type="button" className="btn small" onClick={loadExample} disabled={!guide.data}>{t('e.loadExample')}</button>
          </div>
          <textarea id="json-in" className="input code" spellCheck={false} value={text} placeholder='{ "title": "…", "lessons": [ … ] }'
            onChange={(e) => { setText(e.target.value); setError(null); }} />
          {error && <div className="note err" role="alert">{error}</div>}
          <div><button type="button" className="btn primary" disabled={!text.trim()} onClick={open}>{t('e.check')}</button></div>
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
          {tab === 'mcp' && <p className="note info">{t('e.mcpSoon')}</p>}
          {tab === 'token' && (
            <>
              <p className="ink2" style={{ fontSize: 14 }}>{t('e.tokenHelp', { url: `${API_URL}/api/import/course` })}</p>
              <Link className="btn" href="/settings">{t('settings.account')} →</Link>
            </>
          )}
        </section>
      </div>

      {doc && (
        <div className="overlay" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="ed-h" style={{ maxWidth: 1240 }}>
            <CourseEditor title={t('e.importTitle')} initial={doc} headingId="ed-h" inDialog
              onCancel={(latest) => { setText(pretty(latest)); setDoc(null); }}
              onDone={(id) => navigate(`/courses/${id}`, true)} />
          </div>
        </div>
      )}
    </>
  );
}

// ---------- the editor ----------
function CourseEditor({ title, initial, courseId, onDone, onCancel, headingId = 'editor-h', inDialog }: {
  title: string; initial: Doc; courseId?: number; onDone: (id: number) => void; onCancel?: (latest: Doc) => void; headingId?: string; inDialog?: boolean;
}) {
  const { t, toast } = useApp();
  const [doc, setDoc] = useState<Doc>(initial);
  const [mode, setMode] = useState<Mode>('form');
  const [jsonText, setJsonText] = useState(pretty(initial));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [check, setCheck] = useState<Validation | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const packs = useLoad(() => get<{ packs: Pack[] }>('/api/packs').then((r) => r.packs), []);

  const update = (d: Doc) => { setDoc(d); setDirty(true); };

  // live validation (debounced)
  const seq = useRef(0);
  useEffect(() => {
    const n = ++seq.current;
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const v = await post<Validation>('/api/import/validate', doc);
        if (n === seq.current) setCheck(v);
      } catch { /* keep the last result */ } finally { if (n === seq.current) setChecking(false); }
    }, 400);
    return () => clearTimeout(id);
  }, [doc]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function switchMode(m: Mode) {
    if (m === mode) return;
    if (m === 'json') { setJsonText(pretty(doc)); setJsonError(null); }
    setMode(m);
  }
  function onJson(text: string) {
    setJsonText(text);
    const p = parseDoc(text);
    setJsonError(p.error);
    if (p.doc) update(p.doc);
  }

  async function save(status?: 'draft') {
    setSaving(true);
    try {
      const q = status ? `?status=${status}` : '';
      const res = courseId ? await put<{ id: number }>(`/api/courses/${courseId}${q}`, doc) : await post<{ id: number }>(`/api/courses${q}`, doc);
      setDirty(false);
      toast(t('e.saved'));
      onDone(res.id);
    } catch (e) {
      if (e instanceof ApiError && e.details?.errors) setCheck({ errors: e.details.errors, warnings: e.details.warnings ?? [], draft: null });
      toast(e instanceof Error ? e.message : t('common.error'));
    } finally { setSaving(false); }
  }

  const errors = check?.errors ?? [];
  const canSave = !jsonError && !!check && errors.length === 0 && !checking && !saving;

  return (
    <>
      <div className="between">
        <h1 id={headingId} style={{ fontSize: inDialog ? 22 : undefined }}>{title}</h1>
        <div className="seg" role="tablist" aria-label={t('e.modeForm')}>
          <button type="button" role="tab" aria-selected={mode === 'form'} onClick={() => switchMode('form')}>{t('e.modeForm')}</button>
          <button type="button" role="tab" aria-selected={mode === 'json'} onClick={() => switchMode('json')}>{t('e.modeJson')}</button>
        </div>
      </div>

      <Checks check={check} checking={checking} jsonError={jsonError} />

      <div className="editor">
        <div className="stack" style={{ minWidth: 0 }}>
          {mode === 'form'
            ? <CourseForm doc={doc} onChange={update} packs={packs.data ?? []} issues={errors} />
            : (
              <>
                <label className="sr-only" htmlFor="json-edit">JSON</label>
                <textarea id="json-edit" className="input code" spellCheck={false} value={jsonText} onChange={(e) => onJson(e.target.value)} style={{ minHeight: 560 }} />
              </>
            )}
        </div>
        <aside className="editor-preview card stack" aria-label={t('e.preview')}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{t('e.preview')}</span>
          <Preview doc={doc} />
        </aside>
      </div>

      <div className="hstack" style={{ justifyContent: 'flex-end', ...(inDialog ? { position: 'sticky', bottom: -24, background: 'var(--surface)', padding: '12px 0' } : {}) }}>
        {onCancel ? <button type="button" className="btn" onClick={() => onCancel(doc)}>{t('common.cancel')}</button>
          : <button type="button" className="btn" onClick={() => { if (!dirty || window.confirm(t('e.leave'))) history.back(); }}>{t('common.cancel')}</button>}
        {!courseId && <button type="button" className="btn" disabled={!canSave} onClick={() => save('draft')}>{t('e.saveDraft')}</button>}
        <button type="button" className="btn primary" disabled={!canSave} onClick={() => save()}>{t('e.save')}</button>
      </div>
    </>
  );
}

// Server messages are English; translate the common ones for Thai readers.
const TH_ISSUES: [RegExp, string][] = [
  [/^is required$/, 'ต้องกรอก'],
  [/^must be text$/, 'ต้องเป็นข้อความ'],
  [/^is too long \(max (\d+) characters\)$/, 'ยาวเกินไป (สูงสุด $1 ตัวอักษร)'],
  [/^must be an http\(s\) URL$/, 'ต้องเป็นลิงก์ http(s)'],
  [/^must be one of: (.+)$/, 'ต้องเป็นค่าใดค่าหนึ่ง: $1'],
  [/^Unknown category "(.+?)"\..*$/, 'ไม่รู้จักหมวด "$1" เลือกจากรายการหมวด'],
  [/^A course needs at least one lesson$/, 'คอร์สต้องมีอย่างน้อย 1 บท'],
  [/^needs 2–(\d+) choices$/, 'ต้องมี 2–$1 ตัวเลือก'],
  [/^needs 1–(\d+) items$/, 'ต้องมี 1–$1 รายการ'],
  [/^must be the index .*$/, 'เลือกข้อที่ถูก (เลขลำดับเริ่มที่ 0 หรือข้อความตรงกับตัวเลือก)'],
  [/^must be a whole number from 1 to 600$/, 'ต้องเป็นจำนวนเต็ม 1–600'],
  [/^must be a whole number ≥ 1$/, 'ต้องเป็นจำนวนเต็มตั้งแต่ 1'],
  [/^A short description helps .*$/, 'ใส่คำอธิบายสั้น ๆ ช่วยให้คนอื่นตัดสินใจเรียนได้ง่ายขึ้น'],
  [/^No category: .*$/, 'ไม่ได้เลือกหมวด จะแสดงในหมวด "อื่นๆ"'],
  [/^Pack "(.+)" does not exist yet and will be created$/, 'ยังไม่มี Pack "$1" จะสร้างให้ใหม่'],
  [/^No order in pack: .*$/, 'ไม่ได้ใส่ลำดับใน Pack จะต่อท้ายสุด'],
  [/^Two lessons have the same title$/, 'มีบทชื่อซ้ำกัน'],
  [/^Lesson has no content, links or images$/, 'บทนี้ยังไม่มีเนื้อหา ลิงก์ หรือรูป'],
  [/^No exercises in this course.*$/, 'คอร์สนี้ไม่มีแบบฝึก (ไม่เป็นไร แค่แจ้งให้รู้)'],
  [/^Top level must be a JSON object$/, 'ต้องเป็น JSON object { … }'],
];
export function issueText(msg: string, lang: string) {
  if (lang !== 'th') return msg;
  for (const [re, th] of TH_ISSUES) if (re.test(msg)) return msg.replace(re, th);
  return msg;
}

function Checks({ check, checking, jsonError }: { check: Validation | null; checking: boolean; jsonError: string | null }) {
  const { t, lang } = useApp();
  if (jsonError) return <div className="note err" role="alert">{t('e.badJson', { msg: jsonError })}</div>;
  if (!check) return <div className="note info">{t('e.checking')}</div>;
  const list = (items: Issue[]) => (
    <ul className="issues">{items.map((i, k) => <li key={k}>{i.path && <code>{i.path}</code>} {issueText(i.message, lang)}</li>)}</ul>
  );
  return (
    <div className="stack" style={{ gap: 8 }} aria-live="polite">
      {check.errors.length > 0 && <div className="note err stack" style={{ gap: 6 }}><strong>{t('e.errors', { n: check.errors.length })}</strong>{list(check.errors)}</div>}
      {check.warnings.length > 0 && <div className="note warn stack" style={{ gap: 6 }}><strong>{t('e.warnings', { n: check.warnings.length })}</strong>{list(check.warnings)}</div>}
      {!check.errors.length && !check.warnings.length && <div className="note ok">{checking ? t('e.checking') : t('e.allGood')}</div>}
    </div>
  );
}

// ---------- form ----------
const lines = (arr: any[] | undefined, a: string, b: string) => (arr ?? []).map((x) => (typeof x === 'string' ? x : [x?.[a] ?? '', x?.[b] ?? ''].filter(Boolean).join(' | '))).join('\n');
function parseLines(text: string, first: 'title' | 'url'): any[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [x, ...rest] = l.split('|').map((s) => s.trim());
    const y = rest.join('|').trim();
    if (first === 'title') return y ? { title: x, url: y } : { url: x };
    return y ? { url: x, alt: y } : { url: x };
  });
}

function CourseForm({ doc, onChange, packs, issues }: { doc: Doc; onChange: (d: Doc) => void; packs: Pack[]; issues: Issue[] }) {
  const { t, lang } = useApp();
  const cats = useCourseCats();
  const set = (k: string, v: unknown) => onChange({ ...doc, [k]: v });
  const lessons: Doc[] = Array.isArray(doc.lessons) ? doc.lessons : [];
  const setLessons = (ls: Doc[]) => set('lessons', ls);
  const err = (path: string) => issues.find((i) => i.path === path)?.message;

  const pack = typeof doc.pack === 'string' ? { title: doc.pack } : doc.pack ?? null;
  const packTitle = pack?.title ?? packs.find((p) => p.id === pack?.id)?.title ?? '';
  const known = packs.some((p) => p.title.toLowerCase() === String(packTitle).toLowerCase());
  const [newPack, setNewPack] = useState(!!packTitle && !known);
  const catValue = (() => {
    const c = doc.category;
    const found = cats.list.find((x) => x.id === c || [x.nameEn, x.nameTh].some((n) => typeof c === 'string' && n.toLowerCase() === c.toLowerCase()));
    return found ? String(found.id) : '';
  })();

  return (
    <div className="stack">
      <Field label={t('f.title')} error={err('title')}>
        <input className="input" value={doc.title ?? ''} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label={t('f.description')} error={err('description')}>
        <textarea className="input" rows={2} value={doc.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </Field>
      <div className="grid2">
        <Field label={t('f.category')} error={err('category')}>
          <select className="input" value={catValue} onChange={(e) => set('category', cats.byId.get(Number(e.target.value))?.nameEn ?? '')}>
            <option value="">{t('c.other')}</option>
            {cats.list.map((c) => <option key={c.id} value={c.id}>{lang === 'en' ? c.nameEn : c.nameTh}</option>)}
          </select>
        </Field>
        <Field label={t('f.level')} error={err('level')}>
          <select className="input" value={doc.level ?? 'beginner'} onChange={(e) => set('level', e.target.value)}>
            {['beginner', 'intermediate', 'advanced'].map((l) => <option key={l} value={l}>{t(`c.level.${l}` as Key)}</option>)}
          </select>
        </Field>
        <Field label={t('f.visibility')} error={err('visibility')}>
          <select className="input" value={doc.visibility ?? 'group'} onChange={(e) => set('visibility', e.target.value)}>
            <option value="group">{t('f.vis.group')}</option>
            <option value="private">{t('f.vis.private')}</option>
          </select>
        </Field>
      </div>
      <div className="grid2">
        <Field label={t('f.pack')} error={err('pack.title') ?? err('pack')}>
          <select className="input" value={newPack ? '__new' : known ? packs.find((p) => p.title.toLowerCase() === String(packTitle).toLowerCase())!.title : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__new') { setNewPack(true); set('pack', { title: '', order: pack?.order ?? null }); }
              else { setNewPack(false); set('pack', v ? { title: v, order: pack?.order ?? null } : undefined); }
            }}>
            <option value="">{t('f.noPack')}</option>
            {packs.map((p) => <option key={p.id} value={p.title}>{p.title}</option>)}
            <option value="__new">{t('f.newPack')}</option>
          </select>
        </Field>
        {newPack && (
          <Field label={t('f.newPackName')}>
            <input className="input" value={packTitle} onChange={(e) => set('pack', { ...pack, title: e.target.value, id: undefined })} />
          </Field>
        )}
        {pack && (
          <Field label={t('f.order')} error={err('pack.order')}>
            <input className="input" type="number" min={1} value={pack.order ?? ''} onChange={(e) => set('pack', { ...pack, order: e.target.value ? Number(e.target.value) : null })} />
          </Field>
        )}
      </div>
      <Field label={t('f.cover')} error={err('coverUrl')}>
        <input className="input" type="url" value={doc.coverUrl ?? ''} placeholder="https://…" onChange={(e) => set('coverUrl', e.target.value || undefined)} />
      </Field>

      <h2 style={{ marginTop: 8 }}>{t('c.lessonsH')}</h2>
      {err('lessons') && <div className="note err">{issueText(err('lessons')!, lang)}</div>}
      {lessons.map((l, i) => (
        <LessonForm key={i} i={i} l={l} total={lessons.length} issues={issues}
          onChange={(nl) => setLessons(lessons.map((x, k) => (k === i ? nl : x)))}
          onRemove={() => setLessons(lessons.filter((_, k) => k !== i))}
          onMove={(dir) => { const a = [...lessons]; const j = i + dir; [a[i], a[j]] = [a[j]!, a[i]!]; setLessons(a); }} />
      ))}
      <div><button type="button" className="btn" onClick={() => setLessons([...lessons, { title: '', content: '' }])}>{t('f.addLesson')}</button></div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const { lang } = useApp();
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-invalid'?: boolean }>, { id, 'aria-invalid': !!error || undefined })
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {error && <span style={{ color: 'var(--danger-ink)', fontWeight: 400 }}>{issueText(error, lang)}</span>}
    </div>
  );
}

function LessonForm({ i, l, total, issues, onChange, onRemove, onMove }: {
  i: number; l: Doc; total: number; issues: Issue[]; onChange: (l: Doc) => void; onRemove: () => void; onMove: (dir: 1 | -1) => void;
}) {
  const { t } = useApp();
  const p = `lessons[${i}]`;
  const errs = issues.filter((x) => x.path.startsWith(p + '.') || x.path === p);
  const err = (f: string) => issues.find((x) => x.path === `${p}.${f}`)?.message;
  const set = (k: string, v: unknown) => onChange({ ...l, [k]: v });
  const ex: Doc[] = Array.isArray(l.exercises) ? l.exercises : [];
  const setEx = (a: Doc[]) => set('exercises', a.length ? a : undefined);
  const [linksText, setLinksText] = useState(lines(l.links, 'title', 'url'));
  const [imagesText, setImagesText] = useState(lines(l.images, 'url', 'alt'));

  return (
    <details className="lesson-edit" open={i === 0 || errs.length > 0}>
      <summary>
        <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {t('f.lesson', { n: i + 1 })}{l.title ? ` · ${l.title}` : ''}{errs.length > 0 && <span style={{ color: 'var(--danger-ink)' }}> · {errs.length} !</span>}
        </span>
        <span className="hstack" style={{ gap: 4, flexWrap: 'nowrap' }} onClick={(e) => e.preventDefault()}>
          <button type="button" className="btn icon small" aria-label={t('f.up')} title={t('f.up')} disabled={i === 0} onClick={() => onMove(-1)}><Icon name="up" size={16} /></button>
          <button type="button" className="btn icon small" aria-label={t('f.down')} title={t('f.down')} disabled={i === total - 1} onClick={() => onMove(1)}><Icon name="down" size={16} /></button>
          <button type="button" className="btn icon small danger-ghost" aria-label={t('f.removeLesson')} title={t('f.removeLesson')} onClick={onRemove}><Icon name="trash" size={16} /></button>
        </span>
      </summary>
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0, 3fr) minmax(90px, 1fr)' }}>
        <Field label={t('f.lessonTitle')} error={err('title')}><input className="input" value={l.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label={t('f.minutes')} error={err('minutes')}>
          <input className="input" type="number" min={1} max={600} value={l.minutes ?? ''} onChange={(e) => set('minutes', e.target.value ? Number(e.target.value) : undefined)} />
        </Field>
      </div>
      <Field label={t('f.content')} error={err('content')}>
        <textarea className="input code" style={{ minHeight: 140, whiteSpace: 'pre-wrap' }} value={l.content ?? l.contentMd ?? ''} onChange={(e) => onChange({ ...l, content: e.target.value, contentMd: undefined })} />
      </Field>
      <Field label={t('f.links')} error={issues.find((x) => x.path.startsWith(`${p}.links`))?.message}>
        <textarea className="input" rows={2} value={linksText} placeholder="YouTube | https://youtu.be/…"
          onChange={(e) => { setLinksText(e.target.value); const v = parseLines(e.target.value, 'title'); set('links', v.length ? v : undefined); }} />
      </Field>
      <Field label={t('f.images')} error={issues.find((x) => x.path.startsWith(`${p}.images`))?.message}>
        <textarea className="input" rows={2} value={imagesText} placeholder="https://… | …"
          onChange={(e) => { setImagesText(e.target.value); const v = parseLines(e.target.value, 'url'); set('images', v.length ? v : undefined); }} />
      </Field>

      <strong style={{ fontSize: 14 }}>{t('f.exercises')}</strong>
      {ex.map((x, j) => (
        <ExerciseForm key={j} x={x} path={`${p}.exercises[${j}]`} issues={issues}
          onChange={(nx) => setEx(ex.map((y, k) => (k === j ? nx : y)))} onRemove={() => setEx(ex.filter((_, k) => k !== j))} />
      ))}
      <div className="hstack">
        <button type="button" className="btn small" onClick={() => setEx([...ex, { type: 'mcq', prompt: '', choices: ['', ''], answer: 0 }])}>{t('f.addMcq')}</button>
        <button type="button" className="btn small" onClick={() => setEx([...ex, { type: 'checklist', prompt: '', items: [''] }])}>{t('f.addChecklist')}</button>
        <button type="button" className="btn small" onClick={() => setEx([...ex, { type: 'text', prompt: '' }])}>{t('f.addText')}</button>
      </div>
    </details>
  );
}

function ExerciseForm({ x, path, issues, onChange, onRemove }: { x: Doc; path: string; issues: Issue[]; onChange: (x: Doc) => void; onRemove: () => void }) {
  const { t, lang } = useApp();
  const set = (k: string, v: unknown) => onChange({ ...x, [k]: v });
  const errs = issues.filter((i) => i.path.startsWith(path));
  const choices: string[] = Array.isArray(x.choices) ? x.choices : [];
  const answer = typeof x.answer === 'number' ? x.answer : choices.indexOf(x.answer);
  const [itemsText, setItemsText] = useState((Array.isArray(x.items) ? x.items : []).join('\n'));
  const type = x.type === 'mcq' || x.type === 'checklist' ? x.type : 'text';
  return (
    <div className="ex-edit">
      <div className="between">
        <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{t(`l.type.${type}` as Key)}</span>
        <button type="button" className="btn small danger-ghost" onClick={onRemove}>{t('f.remove')}</button>
      </div>
      <Field label={t('f.prompt')}><input className="input" value={x.prompt ?? x.question ?? ''} onChange={(e) => onChange({ ...x, prompt: e.target.value, question: undefined })} /></Field>
      {type === 'mcq' && (
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
          <legend className="field" style={{ marginBottom: 6 }}>{t('f.choices')}</legend>
          {choices.map((c, k) => (
            <div key={k} className="hstack" style={{ flexWrap: 'nowrap' }}>
              <input type="radio" name={`${path}-ans`} aria-label={`${t('f.correct')}: ${t('f.choice', { n: k + 1 })}`} checked={answer === k} onChange={() => set('answer', k)} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
              <input className="input" aria-label={t('f.choice', { n: k + 1 })} value={c} onChange={(e) => set('choices', choices.map((y, m) => (m === k ? e.target.value : y)))} />
              <button type="button" className="btn icon small" aria-label={t('f.remove')} disabled={choices.length <= 2}
                onClick={() => onChange({ ...x, choices: choices.filter((_, m) => m !== k), answer: answer > k ? answer - 1 : answer === k ? 0 : answer })}><Icon name="x" size={16} /></button>
            </div>
          ))}
          <div><button type="button" className="btn small" disabled={choices.length >= 8} onClick={() => set('choices', [...choices, ''])}>{t('f.addChoice')}</button></div>
        </fieldset>
      )}
      {type === 'checklist' && (
        <Field label={t('f.items')}>
          <textarea className="input" rows={3} value={itemsText} onChange={(e) => { setItemsText(e.target.value); set('items', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)); }} />
        </Field>
      )}
      {type === 'text' && (
        <Field label={t('f.sample')}><textarea className="input" rows={2} value={x.sample ?? ''} onChange={(e) => set('sample', e.target.value || undefined)} /></Field>
      )}
      {errs.length > 0 && <ul className="issues" style={{ color: 'var(--danger-ink)' }}>{errs.map((e, k) => <li key={k}>{issueText(e.message, lang)}</li>)}</ul>}
    </div>
  );
}

// ---------- learner preview ----------
function Preview({ doc }: { doc: Doc }) {
  const { t, lang } = useApp();
  const cats = useCourseCats();
  const lessons: Doc[] = Array.isArray(doc.lessons) ? doc.lessons : [];
  const [i, setI] = useState(0);
  const idx = Math.min(i, Math.max(0, lessons.length - 1));
  const l = lessons[idx] ?? {};
  const cat = useMemo(() => cats.list.find((c) => c.id === doc.category || [c.nameEn, c.nameTh].some((n) => typeof doc.category === 'string' && n.toLowerCase() === doc.category.toLowerCase())), [cats.list, doc.category]);
  const toLinks = (a: unknown) => (Array.isArray(a) ? a : []).map((x: any) => (typeof x === 'string' ? { title: x, url: x } : { title: x?.title || x?.url || '', url: String(x?.url ?? '') })).filter((x) => /^https?:\/\//.test(x.url));
  const toImages = (a: unknown) => (Array.isArray(a) ? a : []).map((x: any) => (typeof x === 'string' ? { url: x, alt: '' } : { url: String(x?.url ?? ''), alt: x?.alt ?? '' })).filter((x) => /^https?:\/\//.test(x.url));
  const ex: Doc[] = Array.isArray(l.exercises) ? l.exercises : [];

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="hstack" style={{ flexWrap: 'nowrap', gap: 12 }}>
        <CatBox cat={cat} />
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <span className="muted" style={{ fontSize: 12 }}>{cat ? (lang === 'en' ? cat.nameEn : cat.nameTh) : t('c.other')} · {t(`c.level.${['beginner', 'intermediate', 'advanced'].includes(doc.level) ? doc.level : 'beginner'}` as Key)}</span>
          <strong style={{ fontSize: 17, overflowWrap: 'anywhere' }}>{doc.title || '—'}</strong>
        </div>
      </div>
      {doc.description && <p className="ink2" style={{ fontSize: 14 }}>{doc.description}</p>}
      {lessons.length > 1 && (
        <label className="field">{t('c.lessonsH')}
          <select className="input" aria-label={t('c.lessonsH')} value={idx} onChange={(e) => setI(Number(e.target.value))}>
            {lessons.map((x, k) => <option key={k} value={k}>{k + 1}. {x?.title || '—'}</option>)}
          </select>
        </label>
      )}
      {lessons.length > 0 && (
        <div className="card-sub">
          <LessonBody index={idx} total={lessons.length} lesson={{
            title: String(l.title ?? ''), minutes: Number.isInteger(l.minutes) ? l.minutes : null,
            contentMd: String(l.content ?? l.contentMd ?? ''), links: toLinks(l.links), images: toImages(l.images),
          }} />
        </div>
      )}
      {ex.length > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <strong>{t('l.exercises')}</strong>
          {ex.map((x, k) => {
            const type = x.type === 'mcq' || x.type === 'checklist' ? x.type : 'text';
            const choices: string[] = Array.isArray(x.choices) ? x.choices : [];
            const ans = typeof x.answer === 'number' ? x.answer : choices.indexOf(x.answer);
            return (
              <fieldset key={k} className="ex">
                <legend>{k + 1} · {t(`l.type.${type}` as Key)}</legend>
                <p style={{ fontWeight: 600 }}>{x.prompt || x.question || '—'}</p>
                {type === 'mcq' && choices.map((c, m) => <div key={m} className={`choice${m === ans ? ' right' : ''}`}>{m === ans ? '✓ ' : ''}{c}</div>)}
                {type === 'checklist' && (Array.isArray(x.items) ? x.items : []).map((it: string, m: number) => <label key={m} className="check"><input type="checkbox" disabled /><span>{it}</span></label>)}
                {type === 'text' && <textarea className="input" rows={2} disabled placeholder={t('l.textPh')} />}
              </fieldset>
            );
          })}
        </div>
      )}
    </div>
  );
}
