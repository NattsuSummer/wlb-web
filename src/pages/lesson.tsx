import { useEffect, useState } from 'react';
import { ApiError, get, post } from '../api';
import { useApp } from '../app-context';
import { LessonBody, Progress } from '../components/course-ui';
import { Avatar, ErrorNote, Icon, Spinner } from '../components/ui';
import type { Key } from '../i18n';
import type { ExerciseData, LessonView } from '../lib/courses';
import { useLoad } from '../lib/use-load';
import { Link, navigate } from '../router';

export function LessonPage({ id }: { id: number }) {
  const { t, toast } = useApp();
  const r = useLoad(() => get<LessonView>(`/api/lessons/${id}`), [id]);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDismissed(false), [id]);

  if (r.error) return r.error instanceof ApiError && r.error.status === 404 ? <div className="empty-state">{t('l.notFound')}</div> : <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const v = r.data;
  const index = v.outline.findIndex((l) => l.id === id);
  const skippedIds = new Set(v.skipped.map((s) => s.id));
  const exDone = v.exercises.filter((x) => x.myAttempt).length;

  async function toggleDone() {
    setBusy(true);
    try {
      const res = await post<{ progress: { state: string } }>(`/api/lessons/${id}/complete`, { done: !v.completed });
      await r.reload();
      if (!v.completed && res.progress.state === 'done') toast(t('l.courseDone'));
      else if (!v.completed && v.nextId) navigate(`/lessons/${v.nextId}`);
    } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); } finally { setBusy(false); }
  }

  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb">
        <Link href="/courses">{t('c.title')}</Link><span aria-hidden="true">/</span>
        <Link href={`/courses/${v.course.id}`}>{v.course.title}</Link>
      </nav>
      <div className="lesson-layout">
        <aside className="card tight outline stack" aria-label={t('l.outline')} style={{ gap: 10 }}>
          <div className="stack" style={{ gap: 6, padding: '4px 6px' }}>
            <strong style={{ overflowWrap: 'anywhere' }}>{v.course.title}</strong>
            <span className="muted" style={{ fontSize: 13 }}>{t('c.progress', { done: v.progress.done, total: v.progress.total })}</span>
            <Progress percent={v.progress.percent} />
          </div>
          <ol>
            {v.outline.map((l, i) => (
              <li key={l.id}>
                <Link href={`/lessons/${l.id}`} aria-current={l.id === id ? 'page' : undefined}>
                  <span className={`mark${l.completed ? ' done' : skippedIds.has(l.id) ? ' skip' : ''}`}>{l.completed ? '✓' : skippedIds.has(l.id) ? '!' : i + 1}</span>
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{l.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </aside>

        <article className="stack" style={{ gap: 20, minWidth: 0 }}>
          {v.skipped.length > 0 && !dismissed && !v.completed && (
            <div className="note warn between" role="status">
              <span><Icon name="warn" size={16} /> {t('l.skip', { list: v.skipped.map((s) => s.title).join(', ') })}</span>
              <span className="hstack">
                <Link className="btn small" href={`/lessons/${v.skipped[v.skipped.length - 1]!.id}`}>{t('l.goPrev')}</Link>
                <button type="button" className="btn small" onClick={() => setDismissed(true)}>{t('l.stay')}</button>
              </span>
            </div>
          )}

          <div className="card"><LessonBody lesson={v.lesson} index={index} total={v.outline.length} /></div>

          {v.exercises.length > 0 && (
            <section className="card stack" aria-labelledby="ex-h">
              <div className="between">
                <h2 id="ex-h">{t('l.exercises')}</h2>
                <span className="muted mono" style={{ fontSize: 13 }}>{t('l.exDone', { n: exDone, total: v.exercises.length })}</span>
              </div>
              {v.exercises.map((x, i) => (
                <Exercise key={x.id} n={i + 1} x={x} others={v.othersAnswers.filter((a) => a.exerciseId === x.id)} onSaved={r.reload} />
              ))}
            </section>
          )}

          <section className="card between" aria-label={t('l.finishTitle')}>
            <div className="stack" style={{ gap: 2 }}>
              <strong>{v.completed ? t('l.doneLabel') : t('l.finishTitle')}</strong>
              {!v.completed && <span className="muted" style={{ fontSize: 13 }}>{t('l.finishSub')}</span>}
            </div>
            <div className="hstack">
              {v.prevId && <Link className="btn" href={`/lessons/${v.prevId}`}>{t('l.prev')}</Link>}
              <button type="button" className={v.completed ? 'btn' : 'btn primary'} disabled={busy} onClick={toggleDone}>
                {v.completed ? <><Icon name="check" />{t('l.doneLabel')}</> : t('l.markDone')}
              </button>
              {v.nextId ? <Link className="btn" href={`/lessons/${v.nextId}`}>{t('l.next')}</Link> : <Link className="btn" href={`/courses/${v.course.id}`}>{t('l.backCourse')}</Link>}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}

type Ex = LessonView['exercises'][number];

function Exercise({ n, x, others, onSaved }: { n: number; x: Ex; others: LessonView['othersAnswers']; onSaved: () => void }) {
  const { t, toast } = useApp();
  const d = x.data;
  const prev = x.myAttempt?.answer;
  const [pick, setPick] = useState<number | null>(d.type === 'mcq' && typeof prev === 'number' ? prev : null);
  const [checked, setChecked] = useState<number[]>(d.type === 'checklist' && Array.isArray(prev) ? (prev as number[]) : []);
  const [text, setText] = useState<string>(d.type === 'text' && typeof prev === 'string' ? prev : '');
  const [result, setResult] = useState<{ isCorrect: boolean | null; data: ExerciseData } | null>(
    x.myAttempt ? { isCorrect: x.myAttempt.isCorrect, data: d } : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(answer: unknown) {
    setBusy(true);
    try {
      const res = await post<{ isCorrect: boolean | null; data: ExerciseData }>(`/api/exercises/${x.id}/attempt`, { answer });
      setResult(res);
      if (d.type !== 'mcq') toast(t('l.savedAnswer'));
      onSaved();
    } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); } finally { setBusy(false); }
  }

  const label = `${n} · ${t(`l.type.${d.type}` as Key)}`;
  return (
    <fieldset className="ex">
      <legend>{label}</legend>
      <p style={{ fontWeight: 600 }}>{x.prompt}</p>

      {d.type === 'mcq' && (
        <>
          <div className="stack" style={{ gap: 8 }} role="group" aria-label={x.prompt}>
            {d.choices.map((c, i) => {
              const answer = result?.data.type === 'mcq' ? result.data.answer : undefined;
              return (
                <button key={i} type="button" className={`choice${answer === i && result ? ' right' : ''}`} aria-pressed={pick === i} onClick={() => setPick(i)}>{c}</button>
              );
            })}
          </div>
          <div className="hstack">
            <button type="button" className="btn small primary" disabled={pick === null || busy} onClick={() => submit(pick)}>{t('l.check')}</button>
            {result && (
              <span role="status" className={`note ${result.isCorrect ? 'ok' : 'warn'}`}>
                {result.isCorrect ? t('l.right') : t('l.wrong', { a: result.data.type === 'mcq' ? result.data.choices[result.data.answer ?? 0] ?? '' : '' })}
              </span>
            )}
          </div>
        </>
      )}

      {d.type === 'checklist' && (
        <>
          {d.items.map((it, i) => (
            <label key={i} className="check">
              <input type="checkbox" checked={checked.includes(i)} onChange={(e) => setChecked(e.target.checked ? [...checked, i].sort((a, b) => a - b) : checked.filter((c) => c !== i))} />
              <span>{it}</span>
            </label>
          ))}
          <div><button type="button" className="btn small" disabled={busy} onClick={() => submit(checked)}>{t('l.saveList')}</button></div>
        </>
      )}

      {d.type === 'text' && (
        <>
          <label className="sr-only" htmlFor={`ex-${x.id}`}>{x.prompt}</label>
          <textarea id={`ex-${x.id}`} className="input" rows={3} value={text} placeholder={t('l.textPh')} onChange={(e) => setText(e.target.value)} />
          <div><button type="button" className="btn small" disabled={busy || !text.trim()} onClick={() => submit(text)}>{t('l.saveText')}</button></div>
          {result && result.data.type === 'text' && result.data.sample && (
            <div className="stack" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>{t('l.sample')}</span><div className="answer">{result.data.sample}</div></div>
          )}
          {others.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>{t('l.friends')}</span>
              {others.map((o) => (
                <div key={o.user.id} className="hstack" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <Avatar user={o.user} size={28} />
                  <div className="answer" style={{ flex: 1 }}><strong style={{ fontSize: 13 }}>{o.user.displayName}</strong>{'\n'}{String(o.answer)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
