// One project: header (links, sprint, next dates) + tabs. Settings live here too.
import { useState } from 'react';
import { ApiError, del, get, patch, put } from '../api';
import { useApp } from '../app-context';
import { ErrorNote, Icon, Modal, Spinner } from '../components/ui';
import { dayNames, type Key } from '../i18n';
import { hh, type CalendarEntry, type Member, type ProjectDetail, type WorkDays, type Link as RefLink } from '../lib/projects';
import { useLoad } from '../lib/use-load';
import { Link, navigate } from '../router';
import { useFmtDate } from './body';
import { CalendarTab, RetroTab, VersionsTab } from './project-plan';
import { BoardTab, DailyTab, SprintTab } from './project-work';
import { cleanRefs, DaysPicker, daysText, MemberChip, RefsEditor, useUsers } from './projects';

const TABS = ['daily', 'board', 'sprint', 'versions', 'calendar', 'retro', 'settings'] as const;
type Tab = (typeof TABS)[number];
const tabFromUrl = (): Tab => { const v = new URLSearchParams(location.search).get('tab'); return (TABS as readonly string[]).includes(v ?? '') ? (v as Tab) : 'daily'; };

export function entryLabel(e: CalendarEntry, t: (k: Key, v?: Record<string, string | number>) => string) {
  return e.auto || !e.title ? (e.kind === 'sprint' ? e.title : e.kind === 'review' ? t('p.ev.reviewAuto') : t(`p.ev.${e.kind}` as Key)) + (e.kind === 'cut' || e.kind === 'release' ? ` ${e.title}` : '')
    : e.kind === 'cut' || e.kind === 'release' ? `${t(`p.ev.${e.kind}` as Key)} ${e.title}` : e.title;
}

export interface TabProps { d: ProjectDetail; reload: () => void }

export function ProjectPage({ id }: { id: number }) {
  const { t, me } = useApp();
  const fmt = useFmtDate();
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const r = useLoad(() => get<ProjectDetail>(`/api/projects/${id}`), [id]);
  if (r.error) return r.error instanceof ApiError && r.error.status === 404 ? <div className="empty-state">{t('p.notFound')}</div> : <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const d = r.data;
  const p = d.project;
  const s = d.sprint;
  const choose = (k: Tab) => { setTab(k); history.replaceState(null, '', k === 'daily' ? `/projects/${id}` : `/projects/${id}?tab=${k}`); };
  const working = d.members.filter((m) => d.workingToday.includes(m.userId));
  const next = d.upcoming[0];

  return (
    <>
      <nav className="crumbs" aria-label="breadcrumb"><Link href="/projects">{t('p.title')}</Link></nav>
      <section className="card stack" style={{ gap: 14 }}>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 6, minWidth: 0, flex: 1 }}>
            <h1 style={{ overflowWrap: 'anywhere' }}>{p.name}{p.archived && <span className="badge" style={{ marginLeft: 8, verticalAlign: 'middle' }}>{t('p.archived')}</span>}</h1>
            {p.description && <p className="ink2" style={{ whiteSpace: 'pre-wrap' }}>{p.description}</p>}
          </div>
        </div>
        {(p.repoUrl || p.refs.length > 0) && (
          <div className="hstack" style={{ gap: 8 }}>
            {p.repoUrl && <a className="chip link-chip" href={p.repoUrl} target="_blank" rel="noopener noreferrer"><Icon name="code" size={14} />{t('p.repoShort')}</a>}
            {p.refs.map((x, i) => <a key={i} className="chip link-chip" href={x.url} target="_blank" rel="noopener noreferrer"><Icon name="link" size={14} />{x.title}</a>)}
          </div>
        )}
        <div className="proj-stats">
          <div><span className="muted">{t('p.sprintNow')}</span><strong>Sprint {s.no}</strong><span className="muted">{fmt(s.start)} – {fmt(s.end)}</span></div>
          <div><span className="muted">{t('p.versionNow')}</span><strong>{t('p.weekOf', { n: s.sprintInVersion, of: p.versionWeeks })}</strong><span className="muted">{t('p.cutOn', { date: fmt(s.versionCutDate) })}</span></div>
          <div><span className="muted">{t('p.progress')}</span><strong>{d.tasks.done}/{d.tasks.total}</strong><span className="muted">{t('p.backlogN', { n: d.tasks.backlog })}</span></div>
          <div><span className="muted">{t('p.next')}</span><strong style={{ fontSize: 15 }}>{next ? entryLabel(next, t) : '—'}</strong><span className="muted">{next ? `${fmt(next.date)}${next.hour !== null ? ` ${hh(next.hour)}` : ''}` : ''}</span></div>
        </div>
        {working.length > 0 && <div className="muted" style={{ fontSize: 13 }}>{t('p.workingToday')}: {working.map((m) => m.displayName).join(', ')}</div>}
      </section>

      <div className="tabs-scroll">
        <div className="seg" role="tablist" aria-label={p.name}>
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => choose(k)}>
              {t(`p.tab.${k}` as Key)}{k === 'daily' && !d.myDailyDone && d.workingToday.includes(me?.id ?? -1) ? ' •' : ''}
            </button>
          ))}
        </div>
      </div>

      {tab === 'daily' && <DailyTab d={d} reload={r.reload} />}
      {tab === 'board' && <BoardTab d={d} reload={r.reload} />}
      {tab === 'sprint' && <SprintTab d={d} reload={r.reload} />}
      {tab === 'versions' && <VersionsTab d={d} reload={r.reload} />}
      {tab === 'calendar' && <CalendarTab d={d} reload={r.reload} />}
      {tab === 'retro' && <RetroTab d={d} reload={r.reload} />}
      {tab === 'settings' && <SettingsTab d={d} reload={r.reload} />}
    </>
  );
}

// ---------- settings ----------
function SettingsTab({ d, reload }: TabProps) {
  const { t, lang, me, toast } = useApp();
  const short = dayNames(lang, 'short');
  const p = d.project;
  const users = useUsers();
  const [f, setF] = useState({ name: p.name, description: p.description, repoUrl: p.repoUrl, sprintAnchor: p.sprintAnchor, versionWeeks: String(p.versionWeeks), reviewHour: String(p.reviewHour), retroHour: String(p.retroHour) });
  const [refs, setRefs] = useState<RefLink[]>(p.refs);
  const [members, setMembers] = useState<Member[]>(d.members);
  const mine = d.members.find((m) => m.userId === me?.id);
  const [myDays, setMyDays] = useState<WorkDays>(mine?.days ?? { weekly: [], alternate: null });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); toast(t('common.saved')); reload(); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); } finally { setBusy(false); }
  }
  const saveInfo = (e: React.FormEvent) => { e.preventDefault(); run(() => patch(`/api/projects/${p.id}`, { ...f, versionWeeks: Number(f.versionWeeks), reviewHour: Number(f.reviewHour), retroHour: Number(f.retroHour), refs: cleanRefs(refs) })); };
  const saveMembers = () => run(() => put(`/api/projects/${p.id}/members`, { members: members.map((m) => ({ userId: m.userId, role: m.role })) }));
  const notIn = (users.data ?? []).filter((u) => !members.some((m) => m.userId === u.id));
  const hours = Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>);

  return (
    <div className="row">
      <div className="grow stack" style={{ minWidth: 0 }}>
        {d.canManage ? (
          <form className="card stack" onSubmit={saveInfo} aria-labelledby="ps-h">
            <h2 id="ps-h">{t('p.info')}</h2>
            <label className="field">{t('p.name')}<input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label className="field">{t('p.description')}<textarea className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <label className="field">{t('p.repo')}<input className="input" placeholder="https://github.com/…" value={f.repoUrl} onChange={(e) => setF({ ...f, repoUrl: e.target.value })} /></label>
            <RefsEditor value={refs} onChange={setRefs} />
            <h3 style={{ marginTop: 8 }}>{t('p.rhythm')}</h3>
            <div className="form-grid2">
              <label className="field">{t('p.anchor')}<input className="input" type="date" required value={f.sprintAnchor} onChange={(e) => setF({ ...f, sprintAnchor: e.target.value })} /></label>
              <label className="field">{t('p.versionWeeks')}<input className="input" type="number" min={1} max={12} value={f.versionWeeks} onChange={(e) => setF({ ...f, versionWeeks: e.target.value })} /></label>
              <label className="field">{t('p.reviewHour')}<select className="input" value={f.reviewHour} onChange={(e) => setF({ ...f, reviewHour: e.target.value })}>{hours}</select></label>
              <label className="field">{t('p.retroHour')}<select className="input" value={f.retroHour} onChange={(e) => setF({ ...f, retroHour: e.target.value })}>{hours}</select></label>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{t('p.rhythmHint')}</span>
            <div><button type="submit" className="btn primary" disabled={busy}>{t('common.save')}</button></div>
          </form>
        ) : <div className="note info">{t('p.ownersOnly')}</div>}

        <section className="card stack" aria-labelledby="pm-h">
          <h2 id="pm-h">{t('p.members')}</h2>
          {members.map((m) => (
            <div key={m.userId} className="between member-row">
              <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                <MemberChip m={m} />
                <span className="muted" style={{ fontSize: 12 }}>{daysText(m.days, short, t)}</span>
              </span>
              {d.canManage ? (
                <span className="hstack" style={{ gap: 6 }}>
                  <select className="input small" aria-label={t('p.role')} value={m.role} onChange={(e) => setMembers(members.map((x) => (x.userId === m.userId ? { ...x, role: e.target.value as Member['role'] } : x)))}>
                    <option value="owner">{t('p.owner')}</option><option value="member">{t('p.member')}</option>
                  </select>
                  <button type="button" className="btn small danger-ghost" aria-label={`${t('common.delete')} ${m.displayName}`} onClick={() => setMembers(members.filter((x) => x.userId !== m.userId))}><Icon name="x" size={14} /></button>
                </span>
              ) : <span className="badge">{t(m.role === 'owner' ? 'p.owner' : 'p.member')}</span>}
            </div>
          ))}
          {d.canManage && (
            <>
              {notIn.length > 0 && (
                <label className="field">{t('p.addMember')}
                  <select className="input" value="" onChange={(e) => { const u = notIn.find((x) => x.id === Number(e.target.value)); if (u) setMembers([...members, { userId: u.id, role: 'member', days: { weekly: [], alternate: null }, displayName: u.displayName, avatarColor: u.avatarColor }]); }}>
                    <option value="">—</option>
                    {notIn.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                  </select>
                </label>
              )}
              <div><button type="button" className="btn primary" disabled={busy} onClick={saveMembers}>{t('p.saveMembers')}</button></div>
            </>
          )}
        </section>
      </div>

      <div className="side stack">
        {mine && (
          <section className="card stack" aria-labelledby="pd-h">
            <h2 id="pd-h">{t('p.myDays')}</h2>
            <p className="muted" style={{ fontSize: 13 }}>{t('p.myDaysHint')}</p>
            <DaysPicker value={myDays} onChange={setMyDays} />
            <div><button type="button" className="btn primary" disabled={busy} onClick={() => run(() => put(`/api/projects/${p.id}/my-days`, { days: myDays }))}>{t('common.save')}</button></div>
          </section>
        )}
        {d.canManage && (
          <section className="card stack">
            <button type="button" className="btn" disabled={busy} onClick={() => run(() => patch(`/api/projects/${p.id}`, { archived: !p.archived }))}>{t(p.archived ? 'p.unarchive' : 'p.archive')}</button>
            <button type="button" className="btn danger-ghost" onClick={() => setConfirm(true)}><Icon name="trash" />{t('p.delete')}</button>
          </section>
        )}
      </div>
      {confirm && (
        <Modal labelledBy="pdel-h" narrow onClose={() => setConfirm(false)}>
          <h2 id="pdel-h">{t('p.delete')}</h2>
          <p>{t('p.confirmDelete', { name: p.name })}</p>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn danger" onClick={async () => { try { await del(`/api/projects/${p.id}`); navigate('/projects', true); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); } }}>{t('common.delete')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
