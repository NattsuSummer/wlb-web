import { get, type MemberCard, type ScheduleView } from '../api';
import { useApp } from '../app-context';
import { Avatar, ErrorNote, Icon, Spinner, useCat } from '../components/ui';
import { dayNames } from '../i18n';
import { bangkokNow, dayRuns, fmtDuration, hh } from '../lib/schedule';
import { useLoad, useTick } from '../lib/use-load';
import { CatBox, Progress, useCourseCats } from '../components/course-ui';
import { Link } from '../router';
import { BalanceBars } from './schedule-parts';
import { KindBox } from './routines';
import type { WeekLink } from '../lib/routines';

export function HomePage() {
  const { me, t, lang } = useApp();
  const cat = useCat();
  useTick(30000);
  const ccats = useCourseCats();
  const now = useLoad(() => get<{ me: MemberCard | null; others: MemberCard[]; routinesToday?: WeekLink[]; projectsToday?: { id: number; name: string; dailyDone: boolean; sprintNo: number }[]; bodyCheck?: { due: boolean; lastDate: string | null; daysSinceLast: number | null; weightKg: number | null } }>('/api/now'), []);
  const sched = useLoad(() => get<ScheduleView>(`/api/schedules/${me!.id}`), [me?.id]);

  if (now.error) return <ErrorNote error={now.error} onRetry={now.reload} />;
  if (!now.data || !sched.data) return <Spinner />;

  const bkk = bangkokNow();
  const week = sched.data.week!;
  const runs = dayRuns(week, bkk.weekday);
  const curRun = runs.find((r) => bkk.hour >= r.from && bkk.hour < r.to)!;
  const cur = curRun.slot;
  const minutesLeft = (curRun.to - bkk.hour) * 60 - bkk.minute;
  const progress = ((bkk.hour - curRun.from) * 60 + bkk.minute) / ((curRun.to - curRun.from) * 60);
  const next = now.data.me?.now?.next ?? null;
  const days = dayNames(lang, 'long');
  const dateLabel = bkk.date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const nowPct = ((bkk.hour * 60 + bkk.minute) / 1440) * 100;

  return (
    <>
      <div className="row">
        <section aria-label={t('home.now')} className="grow card stack" style={{ gap: 20, padding: 32, background: cur ? cat.bg(cur, '90deg') : 'var(--surface)' }}>
          <div className="between">
            <span style={{ fontWeight: 500 }}>{t('home.now')} · {days[bkk.weekday]} {dateLabel}</span>
            <span className="mono">{String(bkk.hour).padStart(2, '0')}:{String(bkk.minute).padStart(2, '0')}</span>
          </div>
          {cur ? (
            <>
              <div className="stack" style={{ gap: 8 }}>
                <span className="hstack">
                  {cur.categoryIds.map((id) => (
                    <span key={id} className="chip" style={{ background: cat.one(id).solid, color: '#fff', fontSize: 14, padding: '4px 12px' }}>{cat.catName(id)}</span>
                  ))}
                </span>
                <span style={{ fontSize: 'clamp(40px, 7vw, 64px)', lineHeight: 1.1, fontWeight: 700, color: cat.ink(cur) }}>{cur.description || cat.names(cur.categoryIds)}</span>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <div className="bar" style={{ height: 10 }}><span style={{ width: `${Math.round(progress * 100)}%`, background: cat.solid(cur) }} /></div>
                <div className="between" style={{ fontSize: 14 }}>
                  <span className="mono">{hh(curRun.from)} – {hh(curRun.to)}</span>
                  <span style={{ fontWeight: 600 }}>{t('home.left', { t: fmtDuration(minutesLeft, lang) })}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 700 }}>{t('home.free')}</span>
              <Link href="/schedule">{t('home.freeSub')}</Link>
            </div>
          )}
          {next?.slot && (
            <div className="hstack" style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', gap: 12 }}>
              <span className="muted" style={{ fontSize: 13 }}>{t('home.next')}</span>
              <span className="dot" style={{ width: 12, height: 12, background: cat.solid(next.slot) }} />
              <span style={{ fontWeight: 600 }}>
                {hh(next.hour)}{next.weekday !== bkk.weekday ? ` (${t('home.tomorrow')})` : ''} {cat.names(next.slot.categoryIds)}{next.slot.description ? ` · ${next.slot.description}` : ''}
              </span>
            </div>
          )}
        </section>

        <section aria-labelledby="others-h" className="side card stack" style={{ gap: 14 }}>
          <h2 id="others-h">{t('home.others')}</h2>
          {now.data.others.length === 0 && <span className="muted">{t('home.nobody')}</span>}
          {now.data.others.map((m) => <OtherNow key={m.user.id} m={m} />)}
          <span className="muted" style={{ fontSize: 13 }}>{t('home.guide')}</span>
        </section>
      </div>

      <section aria-labelledby="today-h" className="card stack" style={{ gap: 20 }}>
        <div className="between">
          <h2 id="today-h">{t('home.today')}</h2>
          <Link href="/schedule" style={{ fontWeight: 600, textDecoration: 'none' }}>{t('home.week')}</Link>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', height: 44, borderRadius: 10, overflow: 'hidden', gap: 2 }}>
            {runs.map((r) => (
              <span key={r.from} title={`${hh(r.from)}–${hh(r.to)} ${r.slot?.description ?? ''}`}
                style={{ flex: `${r.to - r.from} 1 0`, background: r.slot ? cat.bg(r.slot, '180deg') : 'var(--subtle)', boxShadow: r === curRun ? 'inset 0 0 0 3px var(--accent-ink)' : undefined }} />
            ))}
          </div>
          <span aria-hidden="true" style={{ position: 'absolute', top: -6, bottom: -6, left: `${nowPct}%`, width: 2, background: 'var(--ink)' }} />
          <div className="between mono muted" style={{ fontSize: 12, marginTop: 8 }}><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
        </div>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {runs.filter((r) => r.slot).map((r) => (
            <li key={r.from} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12,
              ...(r === curRun ? { background: cat.bg(r.slot, '90deg'), border: '2px solid var(--accent-ink)' } : { border: '1px solid var(--border)', background: r.to <= bkk.hour ? 'var(--past)' : 'var(--surface)' }) }}>
              <span className="dot" style={{ width: 12, height: 12, marginTop: 5, background: cat.solid(r.slot, '90deg') }} />
              <span className="stack" style={{ gap: 0, minWidth: 0 }}>
                <span className="mono ink2" style={{ fontSize: 13 }}>{hh(r.from)} – {hh(r.to)}</span>
                <span style={{ fontWeight: 600 }}>{r.slot!.description || cat.names(r.slot!.categoryIds)}</span>
                <span className="muted" style={{ fontSize: 13 }}>{cat.names(r.slot!.categoryIds)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="row">
        <section aria-labelledby="bal-h" className="grow card stack">
          <div className="between">
            <h2 id="bal-h">{t('home.balance')}</h2>
            <span className="muted" style={{ fontSize: 13 }}>{sched.data.summary?.targetsSet ? t('home.balanceLegend') : t('home.noTargets')}</span>
          </div>
          {sched.data.summary && <BalanceBars summary={sched.data.summary} />}
        </section>
        <section aria-labelledby="learn-h" className="side card stack">
          <h2 id="learn-h">{t('home.learn')}</h2>
          {now.data.me?.courses?.length ? (
            <div className="stack" style={{ gap: 10 }}>
              {now.data.me.courses.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/courses/${c.id}`} className="ccard" style={{ padding: 12 }}>
                  <CatBox cat={ccats.byId.get(c.categoryId ?? -1)} size={36} />
                  <span className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                    <span className="t" style={{ fontSize: 15 }}>{c.title}</span>
                    <span className="s">{t('c.progress', { done: c.done, total: c.total })}</span>
                    <Progress percent={c.percent} />
                  </span>
                </Link>
              ))}
            </div>
          ) : <span className="muted">{t('home.learnNone')}</span>}
          <Link href="/courses" className="btn ghost" style={{ alignSelf: 'flex-start' }}>{t('home.browse')}</Link>
        </section>
      </div>

      {now.data.projectsToday?.filter((p) => !p.dailyDone).map((p) => (
        <div key={p.id} className="note info between" role="status">
          <span><Icon name="gamepad" size={16} /> <strong>{t('p.homeDaily', { name: p.name })}</strong></span>
          <Link href={`/projects/${p.id}`} className="btn small">{t('p.homeDailyBtn')}</Link>
        </div>
      ))}
      {now.data.bodyCheck && (now.data.bodyCheck.due ? (
        <div className="note warn between" role="status">
          <span><Icon name="scale" size={16} /> <strong>{t(now.data.bodyCheck.lastDate ? 'b.due' : 'b.dueFirst')}</strong></span>
          <Link href="/routines?tab=body" className="btn small">{t('b.recordNow')}</Link>
        </div>
      ) : now.data.bodyCheck.weightKg !== null && (
        <Link href="/routines?tab=body" className="hstack muted" style={{ gap: 8, fontSize: 14, alignSelf: 'flex-start' }}>
          <Icon name="scale" size={16} /> {t('b.homeTitle')} · {t('b.homeLatest', { w: now.data.bodyCheck.weightKg, n: now.data.bodyCheck.daysSinceLast ?? 0 })}
        </Link>
      ))}

      <section aria-labelledby="rt-h" className="card stack">
        <h2 id="rt-h">{t('r.today')}</h2>
        {now.data.routinesToday?.length ? (
          <div className="course-grid">
            {[...now.data.routinesToday].sort((a, b) => (a.hour ?? -1) - (b.hour ?? -1)).map((l, i) => (
              <Link key={i} href={`/routines/plans/${l.plan.id}`} className="ccard" style={{ padding: 12 }}>
                <KindBox kind={l.plan.kind} size={36} />
                <span className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <span className="t" style={{ fontSize: 15 }}>{l.plan.title}</span>
                  <span className="s">
                    {l.hour === null ? t('r.allDay') : hh(l.hour)}
                    {l.plan.kind === 'meal' ? ` · ${l.plan.calories ?? 0} kcal` : ` · ${t('r.minutes', { n: l.plan.minutes ?? 0 })}`}
                    {l.hour === bkk.hour && <> · <strong style={{ color: 'var(--accent)' }}>{t('r.now')}</strong></>}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : <span className="muted">{t('r.todayNone')}</span>}
        <Link href="/routines" className="btn ghost" style={{ alignSelf: 'flex-start' }}>{t('r.browse')}</Link>
      </section>
    </>
  );
}

function OtherNow({ m }: { m: MemberCard }) {
  const { t } = useApp();
  const cat = useCat();
  const cur = m.now?.current ?? null;
  const href = `/schedule/${m.user.username}`;
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'var(--ink)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
      <Avatar user={m.user} />
      <span className="stack" style={{ gap: 0, flex: '1 1 auto', minWidth: 0 }}>
        <span style={{ fontWeight: 600 }}>{m.user.displayName}</span>
        <span className="muted" style={{ fontSize: 14 }}>
          {m.privateMode ? t('members.privateCard') : !m.now ? t('common.hidden') : cur?.slot
            ? `${cur.slot.description || cat.names(cur.slot.categoryIds)} · ${hh(cur.from)}–${hh(cur.to)}`
            : t('members.idle')}
        </span>
      </span>
      {cur?.slot && (
        <span className="hstack" style={{ gap: 4 }}>
          {cur.slot.categoryIds.map((id) => <span key={id} className="chip" style={{ background: cat.one(id).bg, color: cat.one(id).ink }}>{cat.catName(id)}</span>)}
        </span>
      )}
    </Link>
  );
}
