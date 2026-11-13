// Project tabs for day-to-day work: daily check-ins (chat), the task board, and the weekly sprint review/planning.
import { useEffect, useState } from 'react';
import { del, get, patch, post, put } from '../api';
import { useApp } from '../app-context';
import { Avatar, ErrorNote, Icon, Modal, Spinner } from '../components/ui';
import type { Key } from '../i18n';
import { LOADS, pts, SIZES, STATUSES, type Dailies, type Load, type Member, type SprintDetail, type Task, type TaskStatus } from '../lib/projects';
import { useLoad } from '../lib/use-load';
import { useFmtDate } from './body';
import type { TabProps } from './project';
import { MemberChip } from './projects';

const memberOf = (members: Member[], id: number | null) => members.find((m) => m.userId === id);
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });

// ---------- daily ----------
export function DailyTab({ d, reload }: TabProps) {
  const { t, me, toast } = useApp();
  const fmt = useFmtDate();
  const pid = d.project.id;
  const r = useLoad(() => get<Dailies>(`/api/projects/${pid}/dailies`), [pid]);
  const isMember = d.members.some((m) => m.userId === me?.id);
  const [form, setForm] = useState({ prevText: '', prevDone: null as boolean | null, nextText: '', blocker: '' });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!r.data || ready) return;
    const mine = r.data.dailies.find((x) => x.userId === me?.id && x.date === r.data!.today);
    setForm(mine ? { prevText: mine.prevText, prevDone: mine.prevDone, nextText: mine.nextText, blocker: mine.blocker } : { prevText: r.data.myLastPlan?.text ?? '', prevDone: null, nextText: '', blocker: '' });
    setReady(true);
  }, [r.data, ready, me?.id]);

  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const data = r.data;
  const postedToday = data.dailies.some((x) => x.userId === me?.id && x.date === data.today);
  const workingToday = (data.workdays[data.today] ?? []).includes(me?.id ?? -1);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { r.setData(await put<Dailies>(`/api/projects/${pid}/dailies/${data.today}`, form)); toast(t('common.saved')); reload(); }
    catch (x) { toast(x instanceof Error ? x.message : t('common.error')); } finally { setBusy(false); }
  }
  async function reply(did: number) {
    const text = (replyTo[did] ?? '').trim();
    if (!text) return;
    try { await post(`/api/projects/${pid}/dailies/${did}/replies`, { text }); setReplyTo({ ...replyTo, [did]: '' }); r.reload(); }
    catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }

  const dates = [...new Set([...data.dailies.map((x) => x.date), ...Object.keys(data.workdays).filter((k) => data.workdays[k]!.length && k <= data.today)])].sort().reverse().slice(0, 14);

  return (
    <div className="row">
      <div className="grow stack" style={{ minWidth: 0 }}>
        {dates.length === 0 && <div className="empty-state">{t('p.d.empty')}</div>}
        {dates.map((date) => {
          const list = data.dailies.filter((x) => x.date === date);
          const missing = (data.workdays[date] ?? []).filter((u) => !list.some((x) => x.userId === u)).map((u) => memberOf(d.members, u)?.displayName).filter(Boolean);
          if (!list.length && !missing.length) return null;
          return (
            <section key={date} className="stack" style={{ gap: 8 }} aria-label={fmt(date, true)}>
              <div className="day-sep"><span>{date === data.today ? t('p.d.today') : fmt(date, true)}</span></div>
              {list.map((x) => {
                const m = memberOf(d.members, x.userId);
                return (
                  <article key={x.id} className={`chat${x.userId === me?.id ? ' mine' : ''}`}>
                    <div className="between" style={{ gap: 8 }}>
                      {m ? <MemberChip m={m} size={28} /> : <span>?</span>}
                      <span className="muted" style={{ fontSize: 12 }}>{timeOf(x.createdAt)}</span>
                    </div>
                    {x.prevText && (
                      <div className="chat-line"><span className="chat-k">{t('p.d.prev')}</span>
                        <span style={{ whiteSpace: 'pre-wrap' }}>{x.prevText}{x.prevDone !== null && <span className={`badge ${x.prevDone ? 'done' : 'in_progress'}`} style={{ marginLeft: 6 }}>{t(x.prevDone ? 'p.d.done' : 'p.d.notDone')}</span>}</span></div>
                    )}
                    <div className="chat-line"><span className="chat-k">{t('p.d.next')}</span><strong style={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>{x.nextText}</strong></div>
                    {x.blocker && <div className="chat-line blocker"><span className="chat-k">{t('p.d.blocker')}</span><span style={{ whiteSpace: 'pre-wrap' }}>{x.blocker}</span></div>}
                    {x.replies.map((rp) => {
                      const rm = memberOf(d.members, rp.userId);
                      return <div key={rp.id} className="chat-reply"><strong>{rm?.displayName ?? '?'}</strong> {rp.text}</div>;
                    })}
                    <form className="hstack" style={{ gap: 6, flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); reply(x.id); }}>
                      <input className="input small" aria-label={t('p.d.reply')} placeholder={t('p.d.reply')} value={replyTo[x.id] ?? ''} onChange={(e) => setReplyTo({ ...replyTo, [x.id]: e.target.value })} />
                      <button type="submit" className="btn small" disabled={!(replyTo[x.id] ?? '').trim()}>{t('p.d.send')}</button>
                    </form>
                  </article>
                );
              })}
              {missing.length > 0 && <div className="muted" style={{ fontSize: 13 }}>{t('p.d.missing', { names: missing.join(', ') })}</div>}
            </section>
          );
        })}
      </div>

      {isMember && (
        <form className="side card stack daily-form" onSubmit={save} aria-labelledby="dly-h">
          <h2 id="dly-h">{t(postedToday ? 'p.d.editToday' : 'p.d.formTitle')}</h2>
          {!postedToday && <p className="muted" style={{ fontSize: 13 }}>{t(workingToday ? 'p.d.formSubWork' : 'p.d.formSub')}</p>}
          <label className="field">{t('p.d.prevQ')}
            <textarea className="input" rows={3} value={form.prevText} onChange={(e) => setForm({ ...form, prevText: e.target.value })} />
            {data.myLastPlan && !postedToday && <span className="muted" style={{ fontSize: 12 }}>{t('p.d.fromLast', { date: fmt(data.myLastPlan.date) })}</span>}
          </label>
          <div className="seg" role="group" aria-label={t('p.d.prevDoneQ')}>
            <button type="button" aria-pressed={form.prevDone === true} onClick={() => setForm({ ...form, prevDone: form.prevDone === true ? null : true })}>{t('p.d.done')}</button>
            <button type="button" aria-pressed={form.prevDone === false} onClick={() => setForm({ ...form, prevDone: form.prevDone === false ? null : false })}>{t('p.d.notDone')}</button>
          </div>
          <label className="field">{t('p.d.nextQ')}<textarea className="input" rows={3} required value={form.nextText} onChange={(e) => setForm({ ...form, nextText: e.target.value })} /></label>
          <label className="field">{t('p.d.blockerQ')}<input className="input" value={form.blocker} onChange={(e) => setForm({ ...form, blocker: e.target.value })} /></label>
          <div><button type="submit" className="btn primary" disabled={busy || !form.nextText.trim()}>{t('p.d.post')}</button></div>
        </form>
      )}
    </div>
  );
}

// ---------- board ----------
type View = 'current' | 'next' | 'backlog';

export function TaskModal({ task, d, onClose, onSaved }: { task: Task; d: TabProps['d']; onClose: () => void; onSaved: () => void }) {
  const { t, toast } = useApp();
  const [f, setF] = useState({ ...task });
  const [busy, setBusy] = useState(false);
  const cur = d.sprint.no;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await patch(`/api/projects/${d.project.id}/tasks/${task.id}`, { title: f.title, description: f.description, assigneeId: f.assigneeId, size: f.size, status: f.status, sprintNo: f.sprintNo, versionId: f.versionId });
      onSaved(); onClose();
    } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); } finally { setBusy(false); }
  }
  async function remove() {
    try { await del(`/api/projects/${d.project.id}/tasks/${task.id}`); onSaved(); onClose(); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }
  const sprints = [...new Set([task.sprintNo, cur - 1, cur, cur + 1, cur + 2].filter((x): x is number => x !== null && x > 0))].sort((a, b) => a - b);
  return (
    <Modal labelledBy="task-h" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <h2 id="task-h">{t('p.b.editTask')}</h2>
        <label className="field">{t('p.b.taskTitle')}<input className="input" required maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label className="field">{t('p.description')}<textarea className="input" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <div className="form-grid2">
          <label className="field">{t('p.b.assignee')}
            <select className="input" value={f.assigneeId ?? ''} onChange={(e) => setF({ ...f, assigneeId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">—</option>{d.members.map((m) => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
            </select></label>
          <label className="field">{t('p.b.size')}
            <select className="input" value={f.size ?? ''} onChange={(e) => setF({ ...f, size: (e.target.value || null) as Task['size'] })}>
              <option value="">—</option>{SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select></label>
          <label className="field">{t('p.b.status')}
            <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as TaskStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`p.st.${s}` as Key)}</option>)}
            </select></label>
          <label className="field">Sprint
            <select className="input" value={f.sprintNo ?? ''} onChange={(e) => setF({ ...f, sprintNo: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{t('p.b.backlog')}</option>{sprints.map((n) => <option key={n} value={n}>Sprint {n}{n === cur ? ` (${t('p.b.now')})` : ''}</option>)}
            </select></label>
          <label className="field">Version
            <select className="input" value={f.versionId ?? ''} onChange={(e) => setF({ ...f, versionId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">—</option>{d.versions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select></label>
        </div>
        <div className="between">
          <button type="button" className="btn danger-ghost" onClick={remove}><Icon name="trash" />{t('common.delete')}</button>
          <span className="hstack">
            <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn primary" disabled={busy || !f.title.trim()}>{t('common.save')}</button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

function TaskCard({ task, d, onOpen, onMove }: { task: Task; d: TabProps['d']; onOpen: () => void; onMove?: (s: TaskStatus) => void }) {
  const { t } = useApp();
  const m = memberOf(d.members, task.assigneeId);
  const v = d.versions.find((x) => x.id === task.versionId);
  const i = STATUSES.indexOf(task.status);
  return (
    <div className={`task${task.status === 'done' ? ' done' : ''}`}>
      <button type="button" className="task-title" onClick={onOpen}>{task.title}</button>
      <div className="between" style={{ gap: 6 }}>
        <span className="hstack" style={{ gap: 4 }}>
          {task.size && <span className="chip gray">{task.size}</span>}
          {v && <span className="chip gray">{v.name}</span>}
        </span>
        <span className="hstack" style={{ gap: 4, flexWrap: 'nowrap' }}>
          {m && <span title={m.displayName}><Avatar user={{ id: m.userId, displayName: m.displayName ?? '?', avatarColor: m.avatarColor ?? null }} size={22} /></span>}
          {onMove && i > 0 && <button type="button" className="btn small icon" aria-label={t(`p.st.${STATUSES[i - 1]}` as Key)} onClick={() => onMove(STATUSES[i - 1]!)}>‹</button>}
          {onMove && i < 2 && <button type="button" className="btn small icon" aria-label={t(`p.st.${STATUSES[i + 1]}` as Key)} onClick={() => onMove(STATUSES[i + 1]!)}>›</button>}
        </span>
      </div>
    </div>
  );
}

export function BoardTab({ d, reload }: TabProps) {
  const { t, me, toast } = useApp();
  const pid = d.project.id;
  const r = useLoad(() => get<{ tasks: Task[] }>(`/api/projects/${pid}/tasks`), [pid]);
  const [view, setView] = useState<View>('current');
  const [open, setOpen] = useState<Task | null>(null);
  const [nt, setNt] = useState({ title: '', assigneeId: '', size: '' });
  const cur = d.sprint.no;
  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const tasks = r.data.tasks;
  const sprintNo = view === 'current' ? cur : view === 'next' ? cur + 1 : null;
  const shown = tasks.filter((x) => x.sprintNo === sprintNo && (view !== 'backlog' || x.status !== 'done'));
  const refresh = () => { r.reload(); reload(); };

  async function change(task: Task, body: Partial<Task>) {
    r.setData({ tasks: tasks.map((x) => (x.id === task.id ? { ...x, ...body } : x)) });
    try { await patch(`/api/projects/${pid}/tasks/${task.id}`, body); refresh(); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); r.reload(); }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await post(`/api/projects/${pid}/tasks`, { title: nt.title, assigneeId: nt.assigneeId ? Number(nt.assigneeId) : null, size: nt.size || null, sprintNo });
      setNt({ ...nt, title: '' }); refresh();
    } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }
  const myPts = (s: number | null) => tasks.filter((x) => x.sprintNo === s && x.assigneeId === me?.id).reduce((a, x) => a + pts(x), 0);

  return (
    <>
      <div className="between">
        <div className="seg" role="tablist" aria-label={t('p.tab.board')}>
          {(['current', 'next', 'backlog'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}>
              {k === 'backlog' ? `${t('p.b.backlog')} (${tasks.filter((x) => x.sprintNo === null && x.status !== 'done').length})` : `Sprint ${k === 'current' ? cur : cur + 1}${k === 'current' ? ` · ${t('p.b.now')}` : ''}`}
            </button>
          ))}
        </div>
        {view !== 'backlog' && <span className="muted" style={{ fontSize: 13 }}>{t('p.b.myPoints', { n: myPts(sprintNo) })}</span>}
      </div>

      <form className="card tight add-task" onSubmit={add}>
        <input className="input" aria-label={t('p.b.taskTitle')} placeholder={t('p.b.addPlaceholder')} value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })} />
        <select className="input" aria-label={t('p.b.assignee')} value={nt.assigneeId} onChange={(e) => setNt({ ...nt, assigneeId: e.target.value })}>
          <option value="">{t('p.b.assignee')}</option>{d.members.map((m) => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
        </select>
        <select className="input" aria-label={t('p.b.size')} value={nt.size} onChange={(e) => setNt({ ...nt, size: e.target.value })}>
          <option value="">{t('p.b.size')}</option>{SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="btn primary" disabled={!nt.title.trim()}><Icon name="plus" />{t('p.b.add')}</button>
      </form>

      {view === 'backlog' ? (
        <section className="card stack" aria-label={t('p.b.backlog')}>
          {!shown.length ? <p className="muted">{t('p.b.backlogEmpty')}</p> : shown.map((x) => (
            <div key={x.id} className="between backlog-row">
              <TaskCard task={x} d={d} onOpen={() => setOpen(x)} />
              <span className="hstack" style={{ gap: 6 }}>
                <button type="button" className="btn small" onClick={() => change(x, { sprintNo: cur })}>→ Sprint {cur}</button>
                <button type="button" className="btn small" onClick={() => change(x, { sprintNo: cur + 1 })}>→ Sprint {cur + 1}</button>
              </span>
            </div>
          ))}
        </section>
      ) : (
        <div className="board">
          {STATUSES.map((s) => {
            const col = shown.filter((x) => x.status === s);
            return (
              <section key={s} className="board-col" aria-label={t(`p.st.${s}` as Key)}>
                <h3 className="between"><span>{t(`p.st.${s}` as Key)}</span><span className="muted">{col.length} · {col.reduce((a, x) => a + pts(x), 0)} pt</span></h3>
                {col.map((x) => <TaskCard key={x.id} task={x} d={d} onOpen={() => setOpen(x)} onMove={(st) => change(x, { status: st })} />)}
              </section>
            );
          })}
        </div>
      )}
      <p className="muted" style={{ fontSize: 12 }}>{t('p.b.sizeHint')}</p>
      {open && <TaskModal task={open} d={d} onClose={() => setOpen(null)} onSaved={refresh} />}
    </>
  );
}

// ---------- sprint review + planning ----------
export function SprintTab({ d, reload }: TabProps) {
  const { t, me, toast } = useApp();
  const fmt = useFmtDate();
  const pid = d.project.id;
  const [no, setNo] = useState(d.sprint.no);
  const r = useLoad(() => get<SprintDetail>(`/api/projects/${pid}/sprints/${no}`), [pid, no]);
  const [vote, setVote] = useState<{ load: Load | null; note: string }>({ load: null, note: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const mine = r.data?.reviews.find((x) => x.userId === me?.id);
    setVote({ load: mine?.load ?? null, note: mine?.note ?? '' });
  }, [r.data, me?.id]);
  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const s = r.data;
  const isMember = d.members.some((m) => m.userId === me?.id);
  const pct = s.totals.plannedPoints ? Math.round((s.totals.donePoints / s.totals.plannedPoints) * 100) : 0;

  async function saveVote() {
    if (!vote.load) return;
    setBusy(true);
    try { r.setData(await put<SprintDetail>(`/api/projects/${pid}/sprints/${no}/review`, vote)); toast(t('common.saved')); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); } finally { setBusy(false); }
  }
  async function carry() {
    setBusy(true);
    try { const x = await post<{ moved: number }>(`/api/projects/${pid}/sprints/${no}/carry-over`, {}); toast(t('p.s.moved', { n: x.moved })); r.reload(); reload(); }
    catch (x) { toast(x instanceof Error ? x.message : t('common.error')); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="between">
        <div className="hstack" style={{ gap: 8 }}>
          <button type="button" className="btn small" aria-label={t('p.s.prev')} disabled={no <= 1} onClick={() => setNo(no - 1)}>‹</button>
          <h2 style={{ margin: 0 }}>Sprint {s.sprint.no}</h2>
          <button type="button" className="btn small" aria-label={t('p.s.nextSprint')} onClick={() => setNo(no + 1)}>›</button>
          <span className="muted">{fmt(s.sprint.start)} – {fmt(s.sprint.end)}{no === d.sprint.no ? ` · ${t('p.b.now')}` : ''}</span>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{t('p.s.versionSlot', { slot: s.sprint.version.slot, cut: fmt(s.sprint.version.cutDate) })}</span>
      </div>

      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="card stat"><span className="muted">{t('p.s.planned')}</span><strong>{s.totals.planned}</strong><span className="muted">{s.totals.plannedPoints} pt</span></div>
        <div className="card stat"><span className="muted">{t('p.s.done')}</span><strong>{s.totals.done}</strong><span className="muted">{s.totals.donePoints} pt · {pct}%</span></div>
        <div className="card stat"><span className="muted">{t('p.s.carry')}</span><strong>{s.totals.carry}</strong>
          {s.totals.carry > 0 && <button type="button" className="btn small" disabled={busy} onClick={carry}>{t('p.s.carryBtn', { n: s.next.no })}</button>}</div>
        <div className="card stat"><span className="muted">{t('p.s.votes')}</span><strong>{s.reviews.length}/{d.members.length}</strong>
          <span className="muted">{LOADS.map((l) => `${t(`p.load.${l}` as Key)} ${s.reviews.filter((x) => x.load === l).length}`).join(' · ')}</span></div>
      </div>

      <div className="row">
        <section className="grow card stack" aria-labelledby="rev-h" style={{ minWidth: 0 }}>
          <h2 id="rev-h">{t('p.s.review')}</h2>
          <div className="table-wrap">
            <table style={{ minWidth: 520 }}>
              <thead><tr><th>{t('p.members')}</th><th>{t('p.s.workdays')}</th><th>{t('p.s.doneOfPlanned')}</th><th>{t('p.s.load')}</th><th>{t('p.d.note')}</th></tr></thead>
              <tbody>
                {s.people.map((pp) => {
                  const m = memberOf(d.members, pp.userId);
                  const rv = s.reviews.find((x) => x.userId === pp.userId);
                  return (
                    <tr key={pp.userId}>
                      <td>{m ? <MemberChip m={m} /> : pp.displayName}</td>
                      <td>{pp.workdays}</td>
                      <td>{pp.done}/{pp.planned} <span className="muted">({pp.donePoints}/{pp.plannedPoints} pt)</span></td>
                      <td>{rv ? <span className={`badge load-${rv.load}`}>{t(`p.load.${rv.load}` as Key)}</span> : <span className="muted">—</span>}</td>
                      <td style={{ maxWidth: 220, overflowWrap: 'anywhere' }}>{rv?.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {s.tasks.filter((x) => x.status !== 'done').length > 0 && (
            <details>
              <summary>{t('p.s.unfinished')}</summary>
              <ul>{s.tasks.filter((x) => x.status !== 'done').map((x) => <li key={x.id}>{x.title} <span className="muted">({memberOf(d.members, x.assigneeId)?.displayName ?? '—'})</span></li>)}</ul>
            </details>
          )}
        </section>

        {isMember && (
          <section className="side card stack" aria-labelledby="myv-h">
            <h2 id="myv-h">{t('p.s.myVote')}</h2>
            <div className="seg" role="group" aria-label={t('p.s.load')}>
              {LOADS.map((l) => <button key={l} type="button" aria-pressed={vote.load === l} onClick={() => setVote({ ...vote, load: l })}>{t(`p.load.${l}` as Key)}</button>)}
            </div>
            <label className="field">{t('p.d.note')}<textarea className="input" rows={3} value={vote.note} onChange={(e) => setVote({ ...vote, note: e.target.value })} /></label>
            <div><button type="button" className="btn primary" disabled={busy || !vote.load} onClick={saveVote}>{t('common.save')}</button></div>
          </section>
        )}
      </div>

      <section className="card stack" aria-labelledby="plan-h">
        <h2 id="plan-h">{t('p.s.planning', { n: s.next.no })}</h2>
        <p className="muted" style={{ fontSize: 13 }}>{t('p.s.planningHint', { from: fmt(s.next.start), to: fmt(s.next.end) })}</p>
        <div className="cap-grid">
          {s.people.map((pp) => {
            const m = memberOf(d.members, pp.userId);
            const cap = pp.nextWorkdays.length * 2;
            const over = pp.nextPlannedPoints > cap;
            return (
              <div key={pp.userId} className="card-sub stack" style={{ gap: 6 }}>
                {m && <MemberChip m={m} />}
                <span style={{ fontSize: 13 }}>{t('p.s.daysNext', { n: pp.nextWorkdays.length })}{pp.nextWorkdays.length ? ` (${pp.nextWorkdays.map((x) => fmt(x)).join(', ')})` : ''}</span>
                <span className="bar" aria-hidden="true"><span style={{ width: `${cap ? Math.min(100, Math.round((pp.nextPlannedPoints / cap) * 100)) : 0}%`, background: over ? 'var(--danger)' : undefined }} /></span>
                <span className={over ? '' : 'muted'} style={{ fontSize: 12, color: over ? 'var(--danger-ink)' : undefined }}>{t('p.s.capacity', { pts: pp.nextPlannedPoints, cap })}{over ? ` · ${t('p.s.tooMuch')}` : ''}</span>
              </div>
            );
          })}
        </div>
        <span className="muted" style={{ fontSize: 12 }}>{t('p.s.capHint')}</span>
      </section>
    </>
  );
}
