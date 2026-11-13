// Project tabs for planning ahead: versions (playable builds), the calendar of planned dates, and monthly retros.
import { useEffect, useState } from 'react';
import { del, get, patch, post } from '../api';
import { useApp } from '../app-context';
import { ErrorNote, Icon, Modal, Spinner } from '../components/ui';
import { dayNames, type Key } from '../i18n';
import {
  addDays, EVENT_KINDS, hh, RETRO_COLS, weekdayOf, type CalendarEntry, type EventKind, type Retro, type RetroCol, type RetroDetail, type Task, type Version,
} from '../lib/projects';
import { useLoad } from '../lib/use-load';
import { useFmtDate } from './body';
import { entryLabel, type TabProps } from './project';

// ---------- versions ----------
function VersionModal({ v, d, onClose, onSaved }: { v: Version; d: TabProps['d']; onClose: () => void; onSaved: () => void }) {
  const { t, toast } = useApp();
  const [f, setF] = useState({ ...v, checklistText: v.checklist.map((c) => c.text).join('\n') });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const checklist = f.checklistText.split('\n').map((s) => s.trim()).filter(Boolean).map((text) => ({ text, done: v.checklist.find((c) => c.text === text)?.done ?? false }));
    try {
      await patch(`/api/projects/${d.project.id}/versions/${v.id}`, { name: f.name, goal: f.goal, cutDate: f.cutDate || null, releaseDate: f.releaseDate || null, buildUrl: f.buildUrl, playable: f.playable, notes: f.notes, closed: f.closed, checklist });
      onSaved(); onClose();
    } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); } finally { setBusy(false); }
  }
  async function remove() {
    try { await del(`/api/projects/${d.project.id}/versions/${v.id}`); onSaved(); onClose(); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }
  return (
    <Modal labelledBy="ver-h" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <h2 id="ver-h">{t('p.v.edit')}</h2>
        <div className="form-grid2">
          <label className="field">{t('p.v.name')}<input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field">{t('p.v.build')}<input className="input" placeholder="https://…" value={f.buildUrl} onChange={(e) => setF({ ...f, buildUrl: e.target.value })} /></label>
          <label className="field">{t('p.v.cut')}<input className="input" type="date" value={f.cutDate ?? ''} onChange={(e) => setF({ ...f, cutDate: e.target.value || null })} /></label>
          <label className="field">{t('p.v.release')}<input className="input" type="date" value={f.releaseDate ?? ''} onChange={(e) => setF({ ...f, releaseDate: e.target.value || null })} /></label>
        </div>
        <label className="field">{t('p.v.goal')}<textarea className="input" rows={2} value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></label>
        <label className="field">{t('p.v.checklist')}<textarea className="input" rows={4} placeholder={t('p.v.checklistPh')} value={f.checklistText} onChange={(e) => setF({ ...f, checklistText: e.target.value })} /></label>
        <label className="field">{t('p.v.notes')}<textarea className="input" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
        <div className="field"><span>{t('p.v.playableQ')}</span>
          <div className="seg" role="group" aria-label={t('p.v.playableQ')}>
            {([[null, 'p.v.notYet'], [true, 'p.v.playable'], [false, 'p.v.notPlayable']] as const).map(([val, k]) => (
              <button key={k} type="button" aria-pressed={f.playable === val} onClick={() => setF({ ...f, playable: val })}>{t(k)}</button>
            ))}
          </div>
        </div>
        <label className="hstack" style={{ gap: 8 }}><input type="checkbox" checked={f.closed} onChange={(e) => setF({ ...f, closed: e.target.checked })} />{t('p.v.closed')}</label>
        <div className="between">
          <button type="button" className="btn danger-ghost" onClick={remove}><Icon name="trash" />{t('common.delete')}</button>
          <span className="hstack">
            <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn primary" disabled={busy}>{t('common.save')}</button>
          </span>
        </div>
      </form>
    </Modal>
  );
}

export function VersionsTab({ d, reload }: TabProps) {
  const { t, toast } = useApp();
  const fmt = useFmtDate();
  const pid = d.project.id;
  const tasks = useLoad(() => get<{ tasks: Task[] }>(`/api/projects/${pid}/tasks`), [pid]);
  const [edit, setEdit] = useState<Version | null>(null);
  const [log, setLog] = useState<string | null>(null);

  async function create() {
    try { const r = await post<{ version: Version }>(`/api/projects/${pid}/versions`, {}); reload(); setEdit(r.version); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }
  async function toggle(v: Version, i: number) {
    try { await patch(`/api/projects/${pid}/versions/${v.id}`, { checklist: v.checklist.map((c, k) => (k === i ? { ...c, done: !c.done } : c)) }); reload(); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }
  async function changelog(v: Version) {
    try { setLog((await get<{ markdown: string }>(`/api/projects/${pid}/versions/${v.id}/changelog`)).markdown); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }

  return (
    <>
      <div className="between">
        <p className="muted" style={{ fontSize: 14 }}>{t('p.v.sub', { n: d.project.versionWeeks })}</p>
        <button type="button" className="btn primary" onClick={create}><Icon name="plus" />{t('p.v.new')}</button>
      </div>
      {!d.versions.length ? <div className="empty-state">{t('p.v.empty')}</div> : (
        <div className="version-list">
          {d.versions.map((v) => {
            const vt = (tasks.data?.tasks ?? []).filter((x) => x.versionId === v.id);
            const done = vt.filter((x) => x.status === 'done').length;
            const left = v.cutDate ? Math.round((Date.parse(v.cutDate) - Date.parse(d.today)) / 86_400_000) : null;
            return (
              <article key={v.id} className={`card stack version${v.closed ? ' closed' : ''}`} style={{ gap: 10 }}>
                <div className="between">
                  <h3 style={{ margin: 0 }}>{v.name}</h3>
                  <span className="hstack" style={{ gap: 6 }}>
                    {v.playable === true && <span className="badge done">{t('p.v.playable')}</span>}
                    {v.playable === false && <span className="badge in_progress">{t('p.v.notPlayable')}</span>}
                    {v.closed && <span className="badge">{t('p.v.closedBadge')}</span>}
                    {!v.closed && left !== null && <span className="chip gray">{left >= 0 ? t('p.v.daysLeft', { n: left }) : t('p.v.overdue', { n: -left })}</span>}
                  </span>
                </div>
                {v.goal && <p className="ink2" style={{ whiteSpace: 'pre-wrap' }}>{v.goal}</p>}
                <div className="hstack muted" style={{ gap: 14, fontSize: 13 }}>
                  <span>{t('p.v.cut')}: {v.cutDate ? fmt(v.cutDate, true) : '—'}</span>
                  <span>{t('p.v.release')}: {v.releaseDate ? fmt(v.releaseDate, true) : '—'}</span>
                  <span>{t('p.v.tasks', { done, total: vt.length })}</span>
                </div>
                {v.checklist.length > 0 && (
                  <ul className="checklist">
                    {v.checklist.map((c, i) => (
                      <li key={i}><label className={c.done ? 'done' : undefined}><input type="checkbox" checked={c.done} onChange={() => toggle(v, i)} /><span>{c.text}</span></label></li>
                    ))}
                  </ul>
                )}
                {v.notes && <p className="muted" style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{v.notes}</p>}
                <div className="hstack" style={{ gap: 6 }}>
                  <button type="button" className="btn small" onClick={() => setEdit(v)}><Icon name="edit" size={14} />{t('p.v.editBtn')}</button>
                  <button type="button" className="btn small" onClick={() => changelog(v)}>{t('p.v.changelog')}</button>
                  {v.buildUrl && <a className="btn small" href={v.buildUrl} target="_blank" rel="noopener noreferrer"><Icon name="play" size={14} />{t('p.v.openBuild')}</a>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {edit && <VersionModal v={edit} d={d} onClose={() => setEdit(null)} onSaved={reload} />}
      {log !== null && (
        <Modal labelledBy="log-h" onClose={() => setLog(null)}>
          <h2 id="log-h">{t('p.v.changelog')}</h2>
          <pre className="guide-box" style={{ whiteSpace: 'pre-wrap' }}>{log}</pre>
          <div className="hstack" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => { navigator.clipboard.writeText(log).then(() => toast(t('e.copied')), () => {}); }}><Icon name="copy" />{t('e.copy')}</button>
            <button type="button" className="btn primary" onClick={() => setLog(null)}>{t('common.close')}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------- calendar ----------
interface Cal { from: string; to: string; today: string; entries: CalendarEntry[]; workdays: Record<string, number[]> }

export function CalendarTab({ d, reload }: TabProps) {
  const { t, lang, toast } = useApp();
  const fmt = useFmtDate();
  const pid = d.project.id;
  const [month, setMonth] = useState(d.today.slice(0, 7));
  const first = `${month}-01`;
  const gridStart = addDays(first, -weekdayOf(first));
  const gridEnd = addDays(gridStart, 41);
  const r = useLoad(() => get<Cal>(`/api/projects/${pid}/calendar?from=${gridStart}&to=${gridEnd}`), [pid, gridStart]);
  const [sel, setSel] = useState(d.today);
  const [ev, setEv] = useState({ kind: 'meeting' as EventKind, title: '', hour: '', note: '' });
  const short = dayNames(lang, 'short');
  const monthName = new Date(`${first}T00:00:00Z`).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shift = (n: number) => { const [y, m] = month.split('-').map(Number); const dt = new Date(Date.UTC(y!, m! - 1 + n, 1)); setMonth(dt.toISOString().slice(0, 7)); };

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    try { await post(`/api/projects/${pid}/events`, { kind: ev.kind, title: ev.title, date: sel, hour: ev.hour === '' ? null : Number(ev.hour), note: ev.note }); setEv({ ...ev, title: '', note: '' }); r.reload(); reload(); }
    catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }
  async function removeEvent(eid: number) {
    try { await del(`/api/projects/${pid}/events/${eid}`); r.reload(); reload(); } catch (x) { toast(x instanceof Error ? x.message : t('common.error')); }
  }

  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  const cal = r.data;
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const at = (date: string) => (cal?.entries ?? []).filter((e) => e.date === date);
  const memberName = (id: number) => d.members.find((m) => m.userId === id)?.displayName ?? '?';

  return (
    <div className="row">
      <section className="grow card stack" style={{ minWidth: 0 }} aria-label={monthName}>
        <div className="between">
          <div className="hstack" style={{ gap: 8 }}>
            <button type="button" className="btn small" aria-label={t('p.c.prevMonth')} onClick={() => shift(-1)}>‹</button>
            <h2 style={{ margin: 0, minWidth: 150, textAlign: 'center' }}>{monthName}</h2>
            <button type="button" className="btn small" aria-label={t('p.c.nextMonth')} onClick={() => shift(1)}>›</button>
          </div>
          <button type="button" className="btn small" onClick={() => { setMonth(d.today.slice(0, 7)); setSel(d.today); }}>{t('p.c.today')}</button>
        </div>
        {!cal ? <Spinner /> : (
          <div className="month" role="grid">
            {short.map((n) => <div key={n} className="month-h" role="columnheader">{n}</div>)}
            {days.map((date) => {
              const list = at(date).filter((e) => e.kind !== 'sprint');
              const sprint = at(date).find((e) => e.kind === 'sprint');
              const wd = cal.workdays[date] ?? [];
              return (
                <button key={date} type="button" role="gridcell" aria-selected={sel === date}
                  className={`month-c${date.slice(0, 7) !== month ? ' out' : ''}${date === cal.today ? ' today' : ''}`}
                  aria-label={`${fmt(date, true)}${list.length ? `: ${list.map((e) => entryLabel(e, t)).join(', ')}` : ''}`}
                  onClick={() => setSel(date)}>
                  <span className="between" style={{ width: '100%' }}><span className="month-n">{Number(date.slice(8))}</span>{sprint && <span className="sprint-tag">{sprint.title.replace('Sprint ', 'S')}</span>}</span>
                  {list.slice(0, 3).map((e, i) => <span key={i} className={`ev ev-${e.kind}`}>{entryLabel(e, t)}</span>)}
                  {list.length > 3 && <span className="muted" style={{ fontSize: 10 }}>+{list.length - 3}</span>}
                  {wd.length > 0 && <span className="wd-dots" aria-hidden="true">{wd.map((u) => <i key={u} title={memberName(u)} />)}</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="hstack muted legend" style={{ gap: 12, fontSize: 12 }}>
          {(['review', 'retro', 'cut', 'release', 'meeting'] as const).map((k) => <span key={k} className="hstack" style={{ gap: 4 }}><span className={`ev-dot ev-${k}`} />{t(`p.ev.${k}` as Key)}</span>)}
          <span className="hstack" style={{ gap: 4 }}><span className="wd-dots"><i /></span>{t('p.c.workday')}</span>
        </div>
      </section>

      <aside className="side stack">
        <section className="card stack" aria-labelledby="sel-h">
          <h2 id="sel-h">{fmt(sel, true)}</h2>
          {!at(sel).length ? <p className="muted">{t('p.c.nothing')}</p> : at(sel).map((e, i) => (
            <div key={i} className="between" style={{ alignItems: 'flex-start' }}>
              <span className="stack" style={{ gap: 2 }}>
                <span className="hstack" style={{ gap: 6 }}><span className={`ev-dot ev-${e.kind}`} /><strong>{entryLabel(e, t)}</strong></span>
                <span className="muted" style={{ fontSize: 12 }}>{e.hour !== null ? hh(e.hour) : t('p.c.allDay')}{e.auto ? ` · ${t('p.c.auto')}` : ''}{e.note && !e.auto ? ` · ${e.note}` : ''}</span>
              </span>
              {e.eventId && <button type="button" className="btn small danger-ghost" aria-label={t('common.delete')} onClick={() => removeEvent(e.eventId!)}><Icon name="trash" size={14} /></button>}
            </div>
          ))}
          {(cal?.workdays[sel] ?? []).length > 0 && <p className="muted" style={{ fontSize: 13 }}>{t('p.c.working', { names: (cal?.workdays[sel] ?? []).map(memberName).join(', ') })}</p>}
        </section>
        <form className="card stack" onSubmit={addEvent} aria-labelledby="addev-h">
          <h2 id="addev-h">{t('p.c.add')}</h2>
          <div className="form-grid2">
            <label className="field">{t('p.c.kind')}
              <select className="input" value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value as EventKind })}>
                {EVENT_KINDS.map((k) => <option key={k} value={k}>{t(`p.ev.${k}` as Key)}</option>)}
              </select></label>
            <label className="field">{t('p.c.time')}
              <select className="input" value={ev.hour} onChange={(e) => setEv({ ...ev, hour: e.target.value })}>
                <option value="">{t('p.c.allDay')}</option>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hh(h)}</option>)}
              </select></label>
          </div>
          <label className="field">{t('p.c.title')}<input className="input" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} /></label>
          <label className="field">{t('p.d.note')}<input className="input" value={ev.note} onChange={(e) => setEv({ ...ev, note: e.target.value })} /></label>
          <span className="muted" style={{ fontSize: 12 }}>{t('p.c.moveHint')}</span>
          <div><button type="submit" className="btn primary">{t('p.c.addOn', { date: fmt(sel) })}</button></div>
        </form>
      </aside>
    </div>
  );
}

// ---------- retro ----------
function RetroBoard({ d, rid, onChanged }: { d: TabProps['d']; rid: number; onChanged: () => void }) {
  const { t, toast } = useApp();
  const pid = d.project.id;
  const r = useLoad(() => get<RetroDetail>(`/api/projects/${pid}/retros/${rid}`), [pid, rid]);
  const [draft, setDraft] = useState<Record<RetroCol, { text: string; anonymous: boolean }>>({ good: { text: '', anonymous: false }, bad: { text: '', anonymous: false }, vent: { text: '', anonymous: true } });
  useEffect(() => {
    if (r.data?.retro.phase !== 'write') return;
    const id = setInterval(r.reload, 15000); // see how many cards others wrote
    return () => clearInterval(id);
  }, [r.data?.retro.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const x = r.data;
  const phase = x.retro.phase;
  const name = (id: number | null) => (id === null ? t('p.r.anon') : d.members.find((m) => m.userId === id)?.displayName ?? '?');

  async function run(fn: () => Promise<RetroDetail | unknown>) {
    try { const n = await fn(); if (n && typeof n === 'object' && 'retro' in n) r.setData(n as RetroDetail); else r.reload(); onChanged(); }
    catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  const base = `/api/projects/${pid}/retros/${rid}`;
  const nextPhase = phase === 'write' ? 'reveal' : phase === 'reveal' ? 'closed' : null;

  return (
    <div className="stack">
      <div className="note warn retro-rules"><strong>{t('p.r.rulesTitle')}</strong> {t('p.r.rules')}</div>
      <div className="between">
        <ol className="phases" aria-label={t('p.r.phase')}>
          {(['write', 'reveal', 'closed'] as const).map((ph) => <li key={ph} aria-current={phase === ph ? 'step' : undefined}>{t(`p.r.ph.${ph}` as Key)}</li>)}
        </ol>
        {nextPhase && <button type="button" className="btn primary" onClick={() => run(() => patch(base, { phase: nextPhase }))}>{t(nextPhase === 'reveal' ? 'p.r.reveal' : 'p.r.close')}</button>}
        {phase === 'closed' && <button type="button" className="btn small" onClick={() => run(() => patch(base, { phase: 'reveal' }))}>{t('p.r.reopen')}</button>}
      </div>
      {phase === 'write' && <p className="muted" style={{ fontSize: 13 }}>{t('p.r.hidden', { n: x.counts.good + x.counts.bad + x.counts.vent, people: x.writers })}</p>}
      <div className="retro-cols">
        {RETRO_COLS.map((col) => {
          const cards = x.cards.filter((c) => c.col === col).sort((a, b) => (phase === 'write' ? 0 : b.votes - a.votes));
          return (
            <section key={col} className={`retro-col rc-${col}`} aria-labelledby={`rc-${col}`}>
              <h3 id={`rc-${col}`} className="between"><span>{t(`p.r.col.${col}` as Key)}</span><span className="muted">{x.counts[col]}</span></h3>
              {cards.map((c) => (
                <div key={c.id} className="retro-card">
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{c.text}</p>
                  <div className="between" style={{ gap: 6 }}>
                    <span className="muted" style={{ fontSize: 12 }}>{c.mine ? `${t('p.r.me')}${c.anonymous ? ` · ${t('p.r.anon')}` : ''}` : name(c.userId)}</span>
                    <span className="hstack" style={{ gap: 4 }}>
                      {phase === 'reveal' && <button type="button" className="btn small" aria-pressed={c.voted} onClick={() => run(() => post(`${base}/cards/${c.id}/vote`, {}))}>▲ {c.votes}</button>}
                      {phase === 'closed' && c.votes > 0 && <span className="chip gray">▲ {c.votes}</span>}
                      {phase !== 'write' && !c.actionTaskId && <button type="button" className="btn small" onClick={() => run(() => post(`${base}/cards/${c.id}/action`, {}))}>{t('p.r.toAction')}</button>}
                      {c.actionTaskId && <span className="badge done">{t('p.r.isAction')}</span>}
                      {(c.mine || x.canManage) && phase !== 'closed' && <button type="button" className="btn small danger-ghost" aria-label={t('common.delete')} onClick={() => run(() => del(`${base}/cards/${c.id}`))}><Icon name="trash" size={12} /></button>}
                    </span>
                  </div>
                </div>
              ))}
              {phase !== 'closed' && (
                <form className="stack" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); const dr = draft[col]; run(async () => { const n = await post(`${base}/cards`, { col, text: dr.text, anonymous: dr.anonymous }); setDraft({ ...draft, [col]: { ...dr, text: '' } }); return n; }); }}>
                  <textarea className="input" rows={2} aria-label={t(`p.r.col.${col}` as Key)} placeholder={t(`p.r.ph.${col}` as Key)} value={draft[col].text} onChange={(e) => setDraft({ ...draft, [col]: { ...draft[col], text: e.target.value } })} />
                  <div className="between">
                    <label className="hstack" style={{ gap: 6, fontSize: 13 }}><input type="checkbox" checked={draft[col].anonymous} onChange={(e) => setDraft({ ...draft, [col]: { ...draft[col], anonymous: e.target.checked } })} />{t('p.r.anonQ')}</label>
                    <button type="submit" className="btn small primary" disabled={!draft[col].text.trim()}>{t('p.r.addCard')}</button>
                  </div>
                </form>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function RetroTab({ d }: TabProps) {
  const { t, toast } = useApp();
  const fmt = useFmtDate();
  const pid = d.project.id;
  const r = useLoad(() => get<{ retros: Retro[] }>(`/api/projects/${pid}/retros`), [pid]);
  const [sel, setSel] = useState<number | null>(null);
  if (r.error) return <ErrorNote error={r.error} onRetry={r.reload} />;
  if (!r.data) return <Spinner />;
  const list = r.data.retros;
  const current = sel ?? list[0]?.id ?? null;
  async function create() {
    try { const x = await post<{ id: number }>(`/api/projects/${pid}/retros`, {}); r.reload(); setSel(x.id); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  return (
    <>
      <div className="between">
        <div className="hstack" style={{ gap: 6 }}>
          {list.map((x) => (
            <button key={x.id} type="button" className="pill" aria-pressed={current === x.id} onClick={() => setSel(x.id)}>
              {x.title} <span className="muted">· {fmt(x.date)}</span>{x.phase !== 'closed' ? ' •' : ''}
            </button>
          ))}
        </div>
        <button type="button" className="btn primary" onClick={create}><Icon name="plus" />{t('p.r.new')}</button>
      </div>
      {current === null ? <div className="empty-state">{t('p.r.empty')}</div> : <RetroBoard key={current} d={d} rid={current} onChanged={r.reload} />}
    </>
  );
}
