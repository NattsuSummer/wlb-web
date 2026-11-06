import { useState } from 'react';
import { ApiError, del, get, patch, post, type AdminUser, type ApiToken } from '../api';
import { useApp } from '../app-context';
import { Avatar, ErrorNote, Spinner } from '../components/ui';
import { catColors } from '../lib/colors';
import { useLoad } from '../lib/use-load';
import { CatBox, resetCourseCats } from '../components/course-ui';
import { TINT_KEYS, tintHex, type CourseCard, type CourseCategory } from '../lib/courses';
import { Link } from '../router';
import { downloadJson } from './course';

type Tab = 'users' | 'cats' | 'ccats' | 'courses' | 'tokens';

export function AdminPage() {
  const { t, me } = useApp();
  const [tab, setTab] = useState<Tab>('users');
  if (me?.role !== 'admin') return <div className="empty-state">403</div>;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}><h1>{t('admin.title')}</h1><p className="muted" style={{ fontSize: 14 }}>{t('admin.sub')}</p></div>
      <div className="tabs" role="tablist">
        {([['users', t('admin.users')], ['cats', t('admin.timeCats')], ['ccats', t('admin.courseCats')], ['courses', t('admin.allCourses')], ['tokens', t('admin.tokens')]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'users' && <Users />}
      {tab === 'cats' && <Categories />}
      {tab === 'ccats' && <CourseCategories />}
      {tab === 'courses' && <AllCourses />}
      {tab === 'tokens' && <AllTokens />}
    </>
  );
}

const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function Users() {
  const { t, me, toast } = useApp();
  const list = useLoad(() => get<{ users: AdminUser[] }>('/api/admin/users'), []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ displayName: '', username: '', password: '', role: 'member' });

  async function create() {
    try {
      await post('/api/admin/users', { ...form, displayName: form.displayName || form.username });
      setAdding(false); setForm({ displayName: '', username: '', password: '', role: 'member' }); list.reload(); toast(t('common.saved'));
    } catch (e) { toast(errMsg(e, t('common.error'))); }
  }
  async function update(u: AdminUser, body: Record<string, unknown>) {
    try { await patch(`/api/admin/users/${u.id}`, body); list.reload(); } catch (e) { toast(errMsg(e, t('common.error'))); list.reload(); }
  }
  async function reset(u: AdminUser) {
    const pw = window.prompt(t('admin.resetPrompt', { name: u.displayName }));
    if (!pw) return;
    try { await post(`/api/admin/users/${u.id}/reset-password`, { password: pw }); list.reload(); toast(t('common.saved')); } catch (e) { toast(errMsg(e, t('common.error'))); }
  }

  if (list.error) return <ErrorNote error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Spinner />;
  return (
    <section className="stack">
      <div className="between">
        <span className="muted">{list.data.users.length}</span>
        <button type="button" className="btn primary" onClick={() => setAdding(!adding)}>{t('admin.addUser')}</button>
      </div>
      {adding && (
        <div className="card" style={{ borderColor: 'var(--accent-ink)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label className="field">{t('settings.displayName')}<input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>
          <label className="field">username<input className="input" autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
          <label className="field">{t('admin.tempPw')}<input className="input mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label className="field">{t('admin.role')}<select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="member">member</option><option value="admin">admin</option></select></label>
          <div className="hstack" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="btn primary" disabled={!form.username || form.password.length < 8} onClick={create}>{t('admin.createUser')}</button>
            <span className="muted" style={{ fontSize: 13 }}>{t('admin.newUserNote')}</span>
          </div>
        </div>
      )}
      <div className="table-wrap"><table style={{ minWidth: 760 }}>
        <thead><tr><th>{t('nav.members')}</th><th>{t('admin.role')}</th><th>{t('admin.status')}</th><th>{t('admin.lastLogin')}</th><th style={{ textAlign: 'right' }}>{t('admin.manage')}</th></tr></thead>
        <tbody>{list.data.users.map((u) => (
          <tr key={u.id}>
            <td><span className="hstack" style={{ flexWrap: 'nowrap' }}><Avatar user={u} size={36} /><span className="stack" style={{ gap: 0 }}><span style={{ fontWeight: 600 }}>{u.displayName}</span><span className="muted" style={{ fontSize: 12 }}>@{u.username}</span></span></span></td>
            <td><select className="input" aria-label={`${t('admin.role')} ${u.displayName}`} value={u.role} onChange={(e) => update(u, { role: e.target.value })} style={{ minHeight: 36, padding: '6px 8px', width: 'auto' }}><option value="admin">admin</option><option value="member">member</option></select></td>
            <td>{u.disabled ? <span className="chip gray">{t('admin.disabled')}</span> : u.mustChangePassword ? <span className="chip" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)' }}>{t('admin.mustChange')}</span> : <span className="chip" style={{ background: 'var(--ok-bg)', color: 'var(--ok-ink)' }}>{t('admin.active')}</span>}</td>
            <td className="ink2">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : t('admin.never')}</td>
            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <button type="button" className="btn small" onClick={() => reset(u)}>{t('admin.reset')}</button>{' '}
              {u.id !== me!.id && (u.disabled
                ? <button type="button" className="btn small" onClick={() => update(u, { disabled: false })}>{t('admin.enable')}</button>
                : <button type="button" className="btn small danger-ghost" onClick={() => { if (window.confirm(t('admin.confirmDisable', { name: u.displayName }))) update(u, { disabled: true }); }}>{t('admin.disable')}</button>)}
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}

function Categories() {
  const { t, categories, reloadCategories, toast } = useApp();
  const [newCat, setNewCat] = useState<{ nameTh: string; nameEn: string; color: string } | null>(null);
  async function save(id: number, body: Record<string, unknown>) {
    try { await patch(`/api/time-categories/${id}`, body); await reloadCategories(); } catch (e) { toast(errMsg(e, t('common.error'))); }
  }
  async function remove(id: number) {
    try { await del(`/api/time-categories/${id}`); await reloadCategories(); }
    catch (e) { toast(e instanceof ApiError && e.code === 'category_in_use' ? t('admin.catInUse') : errMsg(e, t('common.error'))); }
  }
  async function add() {
    if (!newCat) return;
    try { await post('/api/time-categories', { ...newCat, nameEn: newCat.nameEn || newCat.nameTh }); setNewCat(null); await reloadCategories(); }
    catch (e) { toast(errMsg(e, t('common.error'))); }
  }
  return (
    <section className="card" style={{ padding: '8px 16px' }}>
      {categories.map((c, i) => (
        <div key={c.id} className="hstack" style={{ gap: 10, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : undefined }}>
          <label style={{ position: 'relative', width: 40, height: 40, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', cursor: 'pointer', flex: '0 0 auto', background: catColors(c.color).bg }}>
            <input type="color" aria-label={`${t('admin.color')} ${c.nameTh}`} defaultValue={c.color} onBlur={(e) => { if (e.target.value.toUpperCase() !== c.color.toUpperCase()) save(c.id, { color: e.target.value }); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
          </label>
          <input className="input" aria-label={t('admin.nameTh')} defaultValue={c.nameTh} onBlur={(e) => e.target.value.trim() && e.target.value !== c.nameTh && save(c.id, { nameTh: e.target.value })} style={{ flex: '1 1 140px', width: 'auto', minHeight: 40 }} />
          <input className="input" aria-label={t('admin.nameEn')} defaultValue={c.nameEn} onBlur={(e) => e.target.value.trim() && e.target.value !== c.nameEn && save(c.id, { nameEn: e.target.value })} style={{ flex: '1 1 140px', width: 'auto', minHeight: 40 }} />
          <span className="muted" style={{ flex: '0 0 120px', fontSize: 13 }}>{t('admin.used', { n: c.usedSlots })}</span>
          <button type="button" className="btn small danger-ghost" onClick={() => remove(c.id)}>{t('common.delete')}</button>
        </div>
      ))}
      {newCat ? (
        <div className="hstack" style={{ gap: 10, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
          <input type="color" aria-label={t('admin.color')} value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} style={{ width: 40, height: 40, border: 0, background: 'transparent' }} />
          <input className="input" placeholder={t('admin.nameTh')} value={newCat.nameTh} onChange={(e) => setNewCat({ ...newCat, nameTh: e.target.value })} style={{ flex: '1 1 140px', width: 'auto' }} />
          <input className="input" placeholder={t('admin.nameEn')} value={newCat.nameEn} onChange={(e) => setNewCat({ ...newCat, nameEn: e.target.value })} style={{ flex: '1 1 140px', width: 'auto' }} />
          <button type="button" className="btn primary small" disabled={!newCat.nameTh.trim()} onClick={add}>{t('common.save')}</button>
          <button type="button" className="btn small" onClick={() => setNewCat(null)}>{t('common.cancel')}</button>
        </div>
      ) : (
        <button type="button" className="btn ghost" style={{ padding: '12px 0' }} onClick={() => setNewCat({ nameTh: '', nameEn: '', color: '#D7F0F7' })}>{t('admin.addCat')}</button>
      )}
    </section>
  );
}

function AllTokens() {
  const { t, toast } = useApp();
  const list = useLoad(() => get<{ tokens: ApiToken[] }>('/api/admin/tokens'), []);
  if (list.error) return <ErrorNote error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Spinner />;
  if (!list.data.tokens.length) return <div className="empty-state">{t('tokens.none')}</div>;
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>{t('tokens.name')}</th><th>{t('tokens.owner')}</th><th>{t('tokens.lastUsed')}</th><th /></tr></thead>
      <tbody>{list.data.tokens.map((x) => (
        <tr key={x.id}>
          <td><span style={{ fontWeight: 600 }}>{x.name}</span> <span className="mono muted" style={{ fontSize: 12 }}>…{x.hint}</span></td>
          <td className="ink2">{x.owner}</td>
          <td className="ink2">{x.lastUsedAt ? new Date(x.lastUsedAt).toLocaleString() : t('tokens.never')}</td>
          <td style={{ textAlign: 'right' }}><button type="button" className="btn small danger-ghost" onClick={async () => { try { await del(`/api/admin/tokens/${x.id}`); list.reload(); } catch (e) { toast(errMsg(e, t('common.error'))); } }}>{t('tokens.revoke')}</button></td>
        </tr>
      ))}</tbody>
    </table></div>
  );
}

const ICON_CHOICES = ['speech', 'music', 'brush', 'code', 'sigma', 'flask', 'heart', 'chef', 'coin', 'chart', 'camera', 'gamepad', 'sprout', 'book'];

function CourseCategories() {
  const { t, toast } = useApp();
  const list = useLoad(() => get<{ categories: CourseCategory[] }>('/api/course-categories'), []);
  const [form, setForm] = useState({ nameTh: '', nameEn: '', icon: 'book', tint: 'r' });
  const done = () => { resetCourseCats(); list.reload(); };

  async function create() {
    try { await post('/api/course-categories', { ...form, nameEn: form.nameEn || form.nameTh }); setForm({ nameTh: '', nameEn: '', icon: 'book', tint: 'r' }); done(); toast(t('common.saved')); }
    catch (e) { toast(errMsg(e, t('common.error'))); }
  }
  async function update(c: CourseCategory, body: Partial<CourseCategory>) {
    try { await patch(`/api/course-categories/${c.id}`, body); done(); } catch (e) { toast(errMsg(e, t('common.error'))); list.reload(); }
  }
  async function remove(c: CourseCategory) {
    try { await del(`/api/course-categories/${c.id}`); done(); toast(t('common.saved')); }
    catch (e) { toast(e instanceof ApiError && e.code === 'category_in_use' ? t('admin.courseCatInUse') : errMsg(e, t('common.error'))); }
  }

  if (list.error) return <ErrorNote error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Spinner />;
  const TintPick = ({ value, onPick }: { value: string; onPick: (v: string) => void }) => (
    <div className="hstack" role="radiogroup" aria-label={t('admin.color')} style={{ gap: 4 }}>
      {TINT_KEYS.map((k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} aria-label={k} onClick={() => onPick(k)}
          style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer', background: catColors(tintHex(k)).solid, border: value === k ? '3px solid var(--ink)' : '1px solid var(--line)' }} />
      ))}
    </div>
  );
  return (
    <section className="stack">
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t('admin.icon')}</th><th>{t('admin.nameTh')}</th><th>{t('admin.nameEn')}</th><th>{t('admin.color')}</th><th /></tr></thead>
          <tbody>
            {list.data.categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="hstack" style={{ flexWrap: 'nowrap' }}>
                    <CatBox cat={c} size={34} />
                    <select className="input" aria-label={t('admin.icon')} value={c.icon} onChange={(e) => update(c, { icon: e.target.value })} style={{ width: 120 }}>
                      {ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </span>
                </td>
                <td><input className="input" aria-label={t('admin.nameTh')} defaultValue={c.nameTh} onBlur={(e) => e.target.value.trim() && e.target.value !== c.nameTh && update(c, { nameTh: e.target.value.trim() })} /></td>
                <td><input className="input" aria-label={t('admin.nameEn')} defaultValue={c.nameEn} onBlur={(e) => e.target.value.trim() && e.target.value !== c.nameEn && update(c, { nameEn: e.target.value.trim() })} /></td>
                <td><TintPick value={c.tint} onPick={(v) => update(c, { tint: v })} /></td>
                <td><button type="button" className="btn small danger-ghost" onClick={() => remove(c)}>{t('common.delete')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card stack">
        <h2>{t('admin.addCourseCat')}</h2>
        <div className="grid2">
          <label className="field">{t('admin.nameTh')}<input className="input" value={form.nameTh} onChange={(e) => setForm({ ...form, nameTh: e.target.value })} /></label>
          <label className="field">{t('admin.nameEn')}<input className="input" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></label>
          <label className="field">{t('admin.icon')}
            <select className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>{ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}</select>
          </label>
          <div className="field">{t('admin.color')}<TintPick value={form.tint} onPick={(v) => setForm({ ...form, tint: v })} /></div>
        </div>
        <div><button type="button" className="btn primary" disabled={!form.nameTh.trim()} onClick={create}>{t('common.save')}</button></div>
      </div>
    </section>
  );
}

function AllCourses() {
  const { t, toast } = useApp();
  const list = useLoad(() => get<{ courses: CourseCard[] }>('/api/admin/courses'), []);
  async function change(c: CourseCard, body: Record<string, unknown>) {
    try { await patch(`/api/courses/${c.id}`, body); list.reload(); } catch (e) { toast(errMsg(e, t('common.error'))); }
  }
  async function remove(c: CourseCard) {
    if (!window.confirm(t('c.confirmDelete', { title: c.title }))) return;
    try { await del(`/api/courses/${c.id}`); list.reload(); toast(t('c.deleted')); } catch (e) { toast(errMsg(e, t('common.error'))); }
  }
  async function exportJson(c: CourseCard) {
    try { downloadJson(c.title, await get(`/api/courses/${c.id}/export`)); } catch (e) { toast(errMsg(e, t('common.error'))); }
  }
  if (list.error) return <ErrorNote error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Spinner />;
  if (!list.data.courses.length) return <div className="empty-state">{t('c.emptyAll')}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>{t('admin.colCourse')}</th><th>{t('admin.colBy')}</th><th>{t('admin.colVis')}</th><th>{t('admin.colStatus')}</th><th className="num">{t('c.lessonsH')}</th><th>{t('admin.manage')}</th></tr></thead>
        <tbody>
          {list.data.courses.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/courses/${c.id}`}>{c.title}</Link></td>
              <td>{c.creatorName ?? '—'}</td>
              <td>
                <select className="input" aria-label={`${t('admin.colVis')}: ${c.title}`} value={c.visibility} onChange={(e) => change(c, { visibility: e.target.value })} style={{ minWidth: 150 }}>
                  <option value="group">{t('f.vis.group')}</option><option value="private">{t('f.vis.private')}</option>
                </select>
              </td>
              <td>
                <select className="input" aria-label={`${t('admin.colStatus')}: ${c.title}`} value={c.status} onChange={(e) => change(c, { status: e.target.value })} style={{ minWidth: 120 }}>
                  <option value="published">{t('admin.published')}</option><option value="draft">{t('c.draft')}</option>
                </select>
              </td>
              <td className="num">{c.lessonCount}</td>
              <td>
                <span className="hstack" style={{ flexWrap: 'nowrap' }}>
                  <Link className="btn small" href={`/courses/${c.id}/edit`}>{t('common.edit')}</Link>
                  <button type="button" className="btn small" onClick={() => exportJson(c)}>JSON</button>
                  <button type="button" className="btn small danger-ghost" onClick={() => remove(c)}>{t('common.delete')}</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
