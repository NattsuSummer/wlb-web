import { useState } from 'react';
import { ApiError, del, get, patch } from '../api';
import { useApp } from '../app-context';
import { Badges, CatBox, Progress, StateBadge } from '../components/course-ui';
import { ErrorNote, Icon, Modal, Spinner } from '../components/ui';
import type { Key } from '../i18n';
import type { CourseDetail } from '../lib/courses';
import { useLoad } from '../lib/use-load';
import { Link, navigate } from '../router';

export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '') || 'course'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CoursePage({ id }: { id: number }) {
  const { t, lang, toast } = useApp();
  const r = useLoad(() => get<CourseDetail>(`/api/courses/${id}`), [id]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (r.error) return r.error instanceof ApiError && r.error.status === 404 ? <div className="empty-state">{t('c.notFound')}</div> : <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const { course: c, category, lessons, pack, skippedCourses, nextLessonId } = r.data;
  const p = c.progress;

  async function change(body: Record<string, unknown>) {
    try { await patch(`/api/courses/${id}`, body); await r.reload(); toast(t('common.saved')); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  async function exportJson() {
    try { downloadJson(c.title, await get(`/api/courses/${id}/export`)); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  async function remove() {
    try { await del(`/api/courses/${id}`); toast(t('c.deleted')); navigate('/courses', true); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }

  const cta = p.state === 'done' ? t('c.review') : p.state === 'in_progress' ? t('c.continue') : t('c.start');
  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb">
        <Link href="/courses">{t('c.title')}</Link>
        {pack && <><span aria-hidden="true">/</span><span>Pack: {pack.title}</span></>}
      </nav>

      <section className="card stack" style={{ gap: 16 }}>
        <div className="hstack" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <CatBox cat={category} size={56} />
          <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
            <span className="hstack" style={{ gap: 6 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {category ? (lang === 'en' ? category.nameEn : category.nameTh) : t('c.other')} · {t(`c.level.${c.level}` as Key)}
                {c.creatorName ? ` · ${t('c.by', { name: c.creatorName })}` : ''}
              </span>
              <Badges c={c} />
            </span>
            <h1 style={{ overflowWrap: 'anywhere' }}>{c.title}</h1>
            {c.description && <p className="ink2">{c.description}</p>}
          </div>
        </div>
        {c.coverUrl && <img src={c.coverUrl} alt="" referrerPolicy="no-referrer" style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12 }} />}
        <div className="stack" style={{ gap: 6 }}>
          <div className="between"><span className="muted" style={{ fontSize: 13 }}>{t('c.progress', { done: p.done, total: p.total })}</span><StateBadge state={p.state} /></div>
          <Progress percent={p.percent} />
        </div>
        {c.status === 'draft' && <div className="note warn">{t('c.draftNote')}</div>}
        {c.status !== 'draft' && c.visibility === 'private' && <div className="note info">{t('c.privateNote')}</div>}
        {skippedCourses.length > 0 && (
          <div className="note warn" role="status">
            <Icon name="warn" size={16} /> {t('c.packSkip', { list: skippedCourses.map((s) => s.title).join(', ') })}{' '}
            <Link href={`/courses/${skippedCourses[0]!.id}`}>{skippedCourses[0]!.title} →</Link>
          </div>
        )}
        <div className="hstack">
          {nextLessonId && <Link className="btn primary" href={`/lessons/${nextLessonId}`}>{cta}</Link>}
          {c.canEdit && (
            <>
              <Link className="btn" href={`/courses/${id}/edit`}><Icon name="edit" />{t('c.edit')}</Link>
              {c.status === 'draft'
                ? <button type="button" className="btn" onClick={() => change({ status: 'published' })}>{t('c.publish')}</button>
                : <button type="button" className="btn" onClick={() => change({ status: 'draft' })}>{t('c.unpublish')}</button>}
              <button type="button" className="btn" onClick={() => change({ visibility: c.visibility === 'group' ? 'private' : 'group' })}>
                {c.visibility === 'group' ? t('c.makePrivate') : t('c.makeGroup')}
              </button>
            </>
          )}
          <button type="button" className="btn" onClick={exportJson}><Icon name="download" />{t('c.export')}</button>
          {c.canEdit && <button type="button" className="btn danger-ghost" onClick={() => setConfirmDelete(true)}><Icon name="trash" />{t('c.delete')}</button>}
        </div>
      </section>

      {pack && pack.courses.length > 1 && (
        <section className="stack" aria-labelledby="pack-h">
          <h2 id="pack-h">Pack: {pack.title}</h2>
          <ol className="pack-steps">
            {pack.courses.map((pc, i) => (
              <li key={pc.id}>
                <Link href={`/courses/${pc.id}`} aria-current={pc.id === id ? 'page' : undefined}>
                  <span className="between"><span className="muted" style={{ fontSize: 12 }}>{t('c.order', { n: i + 1 })}</span><StateBadge state={pc.state} /></span>
                  <span style={{ fontWeight: 600 }}>{pc.title}</span>
                  <Progress percent={pc.percent} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="stack" aria-labelledby="lessons-h">
        <h2 id="lessons-h">{t('c.lessonsH')}</h2>
        <div className="card tight outline" style={{ position: 'static', maxHeight: 'none' }}><ol>
          {lessons.map((l, i) => (
            <li key={l.id}>
              <Link href={`/lessons/${l.id}`}>
                <span className={`mark${l.completed ? ' done' : ''}`}>{l.completed ? '✓' : i + 1}</span>
                <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{l.title}</span>
                <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {l.minutes ? `${l.minutes} ${t('common.minutes')}` : ''}{l.exerciseCount ? `${l.minutes ? ' · ' : ''}${t('c.exercisesN', { n: l.exerciseCount })}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ol></div>
      </section>

      {confirmDelete && (
        <Modal labelledBy="del-h" narrow onClose={() => setConfirmDelete(false)}>
          <h2 id="del-h">{t('c.delete')}</h2>
          <p>{t('c.confirmDelete', { title: c.title })}</p>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn danger" onClick={remove}>{t('common.delete')}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
