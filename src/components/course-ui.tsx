import type { ReactNode } from 'react';
import { get } from '../api';
import { useApp } from '../app-context';
import type { Key } from '../i18n';
import { renderMarkdown, tintColors, youtubeId, type CourseCard, type CourseCategory, type CourseState } from '../lib/courses';
import { useLoad } from '../lib/use-load';
import { Link } from '../router';
import { Icon, type IconName } from './ui';

let catsCache: Promise<CourseCategory[]> | null = null;
/** Course categories rarely change: load once per page load (admin edits call resetCourseCats). */
export function useCourseCats() {
  const { lang } = useApp();
  const r = useLoad(() => (catsCache ??= get<{ categories: CourseCategory[] }>('/api/course-categories').then((x) => x.categories).catch((e) => { catsCache = null; throw e; })), []);
  const list = r.data ?? [];
  const byId = new Map(list.map((c) => [c.id, c]));
  const name = (id: number | null) => {
    const c = id === null ? undefined : byId.get(id);
    return c ? (lang === 'en' ? c.nameEn : c.nameTh) : null;
  };
  return { list, byId, name, loading: r.loading };
}
export const resetCourseCats = () => { catsCache = null; };

const ICONS = new Set(['speech', 'music', 'brush', 'code', 'sigma', 'flask', 'heart', 'chef', 'coin', 'chart', 'camera', 'gamepad', 'sprout', 'book']);

export function CatBox({ cat, size = 44 }: { cat: CourseCategory | undefined | null; size?: number }) {
  const c = tintColors(cat?.tint);
  const icon = (cat && ICONS.has(cat.icon) ? cat.icon : 'book') as IconName;
  return (
    <span className="cat-box" aria-hidden="true" style={{ width: size, height: size, background: c.bg, color: c.ink }}>
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function StateBadge({ state }: { state: CourseState }) {
  const { t } = useApp();
  return <span className={`badge ${state}`}>{t(`c.state.${state}` as Key)}</span>;
}

export function Badges({ c }: { c: Pick<CourseCard, 'status' | 'visibility'> }) {
  const { t } = useApp();
  return (
    <>
      {c.status === 'draft' && <span className="badge draft">{t('c.draft')}</span>}
      {c.visibility === 'private' && <span className="badge private">{t('c.private')}</span>}
    </>
  );
}

export function Progress({ percent, label }: { percent: number; label?: string }) {
  return (
    <div className="bar thin" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className="fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function CourseLink({ c, cat, sub }: { c: CourseCard; cat: CourseCategory | undefined; sub?: ReactNode }) {
  const { t, lang } = useApp();
  const level = t(`c.level.${c.level}` as Key);
  return (
    <Link href={`/courses/${c.id}`} className="ccard">
      <CatBox cat={cat} />
      <span className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
        <span className="hstack" style={{ gap: 6 }}>
          <span className="s">{cat ? (lang === 'en' ? cat.nameEn : cat.nameTh) : t('c.other')} · {level}</span>
          <Badges c={c} />
        </span>
        <span className="t">{c.title}</span>
        <span className="s">{sub ?? <>{t('c.lessons', { n: c.lessonCount })}{c.creatorName ? ` · ${t('c.by', { name: c.creatorName })}` : ''}</>}</span>
        {c.progress.state !== 'not_started' && (
          <span className="hstack" style={{ gap: 8 }}>
            <span style={{ flex: 1 }}><Progress percent={c.progress.percent} /></span>
            <StateBadge state={c.progress.state} />
          </span>
        )}
      </span>
    </Link>
  );
}

// ---------- lesson content (used by the lesson page and the editor preview) ----------
export interface LessonContent {
  title: string;
  minutes: number | null;
  contentMd: string;
  links: { title: string; url: string }[];
  images: { url: string; alt: string }[];
}

export function LessonBody({ lesson, index, total }: { lesson: LessonContent; index: number; total: number }) {
  const { t } = useApp();
  const videos = lesson.links.filter((l) => youtubeId(l.url));
  return (
    <section className="stack" style={{ gap: 16 }}>
      <div className="stack" style={{ gap: 6 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          {t('c.lessonOf', { i: index + 1, n: total })}{lesson.minutes ? ` · ${t('c.minutes', { n: lesson.minutes })}` : ''}
        </span>
        <h1>{lesson.title || '—'}</h1>
      </div>
      {lesson.contentMd && <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.contentMd) }} />}
      {lesson.images.map((im, i) => (
        <figure key={i} className="lesson-img">
          <img src={im.url} alt={im.alt} loading="lazy" referrerPolicy="no-referrer" />
          {im.alt && <figcaption>{im.alt}</figcaption>}
        </figure>
      ))}
      {videos.map((l, i) => (
        <div key={`v${i}`} className="video">
          <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId(l.url)}`} title={l.title} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      ))}
      {lesson.links.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 15 }}>{t('l.links')}</h2>
          {lesson.links.map((l, i) => (
            <a key={i} className="linkrow" href={l.url} target="_blank" rel="noopener noreferrer">
              <Icon name={youtubeId(l.url) ? 'play' : 'link'} />
              <span>{l.title}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
