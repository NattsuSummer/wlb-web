import { useEffect, useRef, useState } from 'react';
import { get } from '../api';
import { useApp } from '../app-context';
import { CatBox, CourseLink, Progress, StateBadge, useCourseCats } from '../components/course-ui';
import { ErrorNote, Icon, Spinner } from '../components/ui';
import type { Catalog, CourseCard } from '../lib/courses';
import { useLoad } from '../lib/use-load';
import { Link } from '../router';

export function AddCourseMenu() {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button type="button" className="btn primary" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <Icon name="plus" />{t('c.add')}
      </button>
      {open && (
        <div className="menu">
          <Link href="/courses/new" onClick={() => setOpen(false)}>{t('c.addWeb')}<span>{t('c.addWebSub')}</span></Link>
          <Link href="/courses/import" onClick={() => setOpen(false)}>{t('c.addJson')}<span>{t('c.addJsonSub')}</span></Link>
        </div>
      )}
    </div>
  );
}

export function CoursesPage() {
  const { t, lang } = useApp();
  const cats = useCourseCats();
  const r = useLoad(() => get<Catalog>('/api/courses'), []);
  const [filter, setFilter] = useState<number | 'all'>('all');

  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const { packs, singles, inProgress } = r.data;
  const match = (c: { categoryId: number | null }) => filter === 'all' || c.categoryId === filter;
  const usedCats = new Set([...singles, ...packs.flatMap((p) => p.courses)].map((c) => c.categoryId).concat(packs.map((p) => p.categoryId)));
  const filters = cats.list.filter((c) => usedCats.has(c.id));
  const shownPacks = packs.filter((p) => match(p) || p.courses.some(match));
  const shownSingles = singles.filter(match);
  const shownProgress = inProgress.filter(match);
  const nothing = !packs.length && !singles.length;

  return (
    <>
      <div className="between">
        <div className="stack" style={{ gap: 4 }}>
          <h1>{t('c.title')}</h1>
          <p className="muted" style={{ fontSize: 14 }}>{t('c.sub')}</p>
        </div>
        <AddCourseMenu />
      </div>

      {filters.length > 0 && (
        <div className="pills" role="group" aria-label={t('f.category')}>
          <button type="button" className="pill" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('c.all')}</button>
          {filters.map((c) => (
            <button key={c.id} type="button" className="pill" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>{lang === 'en' ? c.nameEn : c.nameTh}</button>
          ))}
        </div>
      )}

      {nothing && <div className="empty-state">{t('c.emptyAll')}</div>}

      {shownProgress.length > 0 && (
        <section className="stack" aria-labelledby="cont-h">
          <h2 id="cont-h">{t('c.continuing')}</h2>
          <div className="course-grid">
            {shownProgress.map((c) => (
              <CourseLink key={c.id} c={c} cat={cats.byId.get(c.categoryId ?? -1)} sub={t('c.progress', { done: c.progress.done, total: c.progress.total })} />
            ))}
          </div>
        </section>
      )}

      {shownPacks.length > 0 && (
        <section className="stack" aria-labelledby="pack-h">
          <h2 id="pack-h">{t('c.packs')}</h2>
          {shownPacks.map((p) => {
            const cat = cats.byId.get(p.categoryId ?? p.courses[0]?.categoryId ?? -1);
            return (
              <article key={p.id} className="card stack">
                <div className="hstack" style={{ gap: 14, flexWrap: 'nowrap' }}>
                  <CatBox cat={cat} />
                  <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: 17, overflowWrap: 'anywhere' }}>{p.title}</h3>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {cats.name(cat?.id ?? null) ?? t('c.other')} · {t('c.coursesN', { n: p.courses.length })}
                    </span>
                  </div>
                  {p.courses.length > 0 && <span className="mono muted" style={{ fontSize: 13 }}>{p.progress.done}/{p.progress.total}</span>}
                </div>
                {p.courses.length === 0 ? <span className="muted">{t('c.emptyPack')}</span> : (
                  <ol className="pack-steps">
                    {p.courses.map((c, i) => <PackStep key={c.id} c={c} n={i + 1} />)}
                  </ol>
                )}
              </article>
            );
          })}
        </section>
      )}

      {(shownSingles.length > 0 || (!nothing && filter !== 'all')) && (
        <section className="stack" aria-labelledby="single-h">
          <h2 id="single-h">{t('c.singles')}</h2>
          {shownSingles.length === 0 ? <p className="muted">{t('c.emptyCat')}</p> : (
            <div className="course-grid">
              {shownSingles.map((c) => <CourseLink key={c.id} c={c} cat={cats.byId.get(c.categoryId ?? -1)} />)}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function PackStep({ c, n }: { c: CourseCard; n: number }) {
  const { t } = useApp();
  return (
    <li>
      <Link href={`/courses/${c.id}`}>
        <span className="between" style={{ gap: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>{t('c.order', { n })}</span>
          <span className="hstack" style={{ gap: 4 }}>
            {c.status === 'draft' && <span className="badge draft">{t('c.draft')}</span>}
            <StateBadge state={c.progress.state} />
          </span>
        </span>
        <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{c.title}</span>
        <span className="muted" style={{ fontSize: 13 }}>{t('c.lessons', { n: c.lessonCount })}</span>
        <Progress percent={c.progress.percent} />
      </Link>
    </li>
  );
}
