// Projects list + "new project" form, and small pieces shared by the project pages.
import { useState } from 'react';
import { get, post, type MemberCard, type User } from '../api';
import { useApp } from '../app-context';
import { Avatar, ErrorNote, Icon, Modal, Spinner } from '../components/ui';
import { dayNames } from '../i18n';
import type { Link as RefLink, Member, ProjectListItem, WorkDays } from '../lib/projects';
import { useLoad } from '../lib/use-load';
import { Link, navigate } from '../router';
import { useFmtDate } from './body';

export function useUsers() {
  return useLoad(() => get<{ members: MemberCard[] }>('/api/users').then((r) => r.members.map((m) => m.user)), []);
}

export function MemberChip({ m, size = 24 }: { m: Pick<Member, 'userId' | 'displayName' | 'avatarColor'>; size?: number }) {
  return (
    <span className="hstack" style={{ gap: 6, flexWrap: 'nowrap', minWidth: 0 }}>
      <Avatar user={{ id: m.userId, displayName: m.displayName ?? '?', avatarColor: m.avatarColor ?? null }} size={size} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.displayName}</span>
    </span>
  );
}

export function Avatars({ members, max = 5 }: { members: Member[]; max?: number }) {
  return (
    <span className="avatars" aria-label={members.map((m) => m.displayName).join(', ')}>
      {members.slice(0, max).map((m) => <Avatar key={m.userId} user={{ id: m.userId, displayName: m.displayName ?? '?', avatarColor: m.avatarColor ?? null }} size={26} />)}
      {members.length > max && <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>+{members.length - max}</span>}
    </span>
  );
}

/** Weekly work days plus an optional pair that swaps every sprint (e.g. Thu one week, Fri the next). */
export function DaysPicker({ value, onChange }: { value: WorkDays; onChange: (v: WorkDays) => void }) {
  const { t, lang } = useApp();
  const short = dayNames(lang, 'short');
  const long = dayNames(lang, 'long');
  const alt = value.alternate;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="field">
        <span>{t('p.weekly')}</span>
        <div className="day-toggles" role="group" aria-label={t('p.weekly')}>
          {short.map((n, d) => {
            const on = value.weekly.includes(d);
            return <button key={d} type="button" aria-pressed={on} aria-label={long[d]} className="btn small" onClick={() => onChange({ ...value, weekly: on ? value.weekly.filter((x) => x !== d) : [...value.weekly, d].sort() })}>{n}</button>;
          })}
        </div>
      </div>
      <label className="hstack" style={{ gap: 8, fontSize: 14 }}>
        <input type="checkbox" checked={!!alt} onChange={(e) => onChange({ ...value, alternate: e.target.checked ? [3, 4] : null })} />
        {t('p.alternate')}
      </label>
      {alt && (
        <div className="form-grid2">
          {([0, 1] as const).map((i) => (
            <label key={i} className="field">{t(i === 0 ? 'p.altOdd' : 'p.altEven')}
              <select className="input" value={alt[i]} onChange={(e) => { const n: [number, number] = [...alt]; n[i] = Number(e.target.value); onChange({ ...value, alternate: n }); }}>
                {long.map((n, d) => <option key={d} value={d}>{n}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function daysText(days: WorkDays, short: string[], t: (k: 'p.noDays') => string) {
  const parts = days.weekly.map((d) => short[d]);
  if (days.alternate) parts.push(`${short[days.alternate[0]]}/${short[days.alternate[1]]}`);
  return parts.length ? parts.join(' · ') : t('p.noDays');
}

export function RefsEditor({ value, onChange }: { value: RefLink[]; onChange: (v: RefLink[]) => void }) {
  const { t } = useApp();
  return (
    <div className="field">
      <span>{t('p.refs')}</span>
      <div className="stack" style={{ gap: 6 }}>
        {value.map((r, i) => (
          <div key={i} className="ref-row">
            <input className="input" aria-label={t('p.refTitle')} placeholder={t('p.refTitle')} value={r.title} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
            <input className="input" aria-label="URL" placeholder="https://…" value={r.url} onChange={(e) => onChange(value.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" className="btn small danger-ghost" aria-label={t('common.delete')} onClick={() => onChange(value.filter((_, k) => k !== i))}><Icon name="trash" size={14} /></button>
          </div>
        ))}
        <div><button type="button" className="btn small" onClick={() => onChange([...value, { title: '', url: '' }])}><Icon name="plus" size={14} />{t('p.addRef')}</button></div>
      </div>
    </div>
  );
}

export const cleanRefs = (refs: RefLink[]) => refs.filter((r) => r.url.trim()).map((r) => ({ title: r.title.trim(), url: r.url.trim() }));

function NewProject({ onClose }: { onClose: () => void }) {
  const { t, me, toast } = useApp();
  const users = useUsers();
  const [f, setF] = useState({ name: '', description: '', repoUrl: '', sprintAnchor: '' });
  const [refs, setRefs] = useState<RefLink[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [days, setDays] = useState<WorkDays>({ weekly: [], alternate: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await post<{ id: number }>('/api/projects', { ...f, sprintAnchor: f.sprintAnchor || undefined, refs: cleanRefs(refs), memberIds, myDays: days });
      toast(t('common.saved'));
      navigate(`/projects/${r.id}`);
    } catch (x) { setErr(x instanceof Error ? x.message : t('common.error')); } finally { setBusy(false); }
  }
  const others = (users.data ?? []).filter((u: User) => u.id !== me?.id);
  return (
    <Modal labelledBy="np-h" onClose={onClose}>
      <form className="stack" onSubmit={create}>
        <h2 id="np-h">{t('p.new')}</h2>
        <label className="field">{t('p.name')}<input className="input" required maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="field">{t('p.description')}<textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <label className="field">{t('p.repo')}<input className="input" placeholder="https://github.com/…" value={f.repoUrl} onChange={(e) => setF({ ...f, repoUrl: e.target.value })} /></label>
        <RefsEditor value={refs} onChange={setRefs} />
        <div className="field">
          <span>{t('p.members')}</span>
          {users.error ? <ErrorNote error={users.error} onRetry={users.reload} /> : !users.data ? <Spinner /> : (
            <div className="pills" role="group" aria-label={t('p.members')}>
              {others.map((u) => {
                const on = memberIds.includes(u.id);
                return <button key={u.id} type="button" className="pill" aria-pressed={on} onClick={() => setMemberIds(on ? memberIds.filter((x) => x !== u.id) : [...memberIds, u.id])}>{u.displayName}</button>;
              })}
            </div>
          )}
          <span className="muted" style={{ fontSize: 12 }}>{t('p.membersHint')}</span>
        </div>
        <label className="field">{t('p.anchor')}<input className="input" type="date" value={f.sprintAnchor} onChange={(e) => setF({ ...f, sprintAnchor: e.target.value })} />
          <span className="muted" style={{ fontSize: 12 }}>{t('p.anchorHint')}</span></label>
        <div className="field"><span>{t('p.myDays')}</span><DaysPicker value={days} onChange={setDays} /></div>
        {err && <div className="note warn" role="alert">{err}</div>}
        <div className="hstack" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn primary" disabled={busy || !f.name.trim()}>{t('p.create')}</button>
        </div>
      </form>
    </Modal>
  );
}

export function ProjectsPage() {
  const { t } = useApp();
  const fmt = useFmtDate();
  const r = useLoad(() => get<{ projects: ProjectListItem[] }>('/api/projects'), []);
  const [creating, setCreating] = useState(false);
  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const list = r.data.projects;
  return (
    <>
      <div className="between">
        <div className="stack" style={{ gap: 4 }}>
          <h1>{t('p.title')}</h1>
          <p className="muted" style={{ fontSize: 14 }}>{t('p.sub')}</p>
        </div>
        <button type="button" className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" />{t('p.new')}</button>
      </div>
      {!list.length ? <div className="empty-state">{t('p.empty')}</div> : (
        <div className="course-grid">
          {list.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="ccard" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <span className="between" style={{ flexWrap: 'nowrap' }}>
                <span className="t" style={{ overflowWrap: 'anywhere' }}>{p.name}</span>
                {p.archived ? <span className="badge">{t('p.archived')}</span> : !p.mine ? <span className="badge">{t('p.notMember')}</span> : null}
              </span>
              {p.description && <span className="s" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</span>}
              <span className="hstack" style={{ gap: 8, fontSize: 13 }}>
                <span className="chip gray">Sprint {p.sprint.no}</span>
                <span className="muted">{fmt(p.sprint.start)} – {fmt(p.sprint.end)}</span>
              </span>
              <span className="bar" aria-hidden="true"><span style={{ width: `${p.tasks.total ? Math.round((p.tasks.done / p.tasks.total) * 100) : 0}%` }} /></span>
              <span className="between" style={{ fontSize: 13 }}>
                <span className="muted">{t('p.doneOf', { done: p.tasks.done, total: p.tasks.total })}</span>
                <Avatars members={p.members} />
              </span>
            </Link>
          ))}
        </div>
      )}
      {creating && <NewProject onClose={() => setCreating(false)} />}
    </>
  );
}
