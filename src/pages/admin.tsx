import { useState } from 'react';
import { ApiError, del, get, patch, post, type AdminUser, type ApiToken } from '../api';
import { useApp } from '../app-context';
import { Avatar, ErrorNote, Spinner } from '../components/ui';
import { catColors } from '../lib/colors';
import { useLoad } from '../lib/use-load';

type Tab = 'users' | 'cats' | 'tokens';

export function AdminPage() {
  const { t, me } = useApp();
  const [tab, setTab] = useState<Tab>('users');
  if (me?.role !== 'admin') return <div className="empty-state">403</div>;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}><h1>{t('admin.title')}</h1><p className="muted" style={{ fontSize: 14 }}>{t('admin.sub')}</p></div>
      <div className="tabs" role="tablist">
        {([['users', t('admin.users')], ['cats', t('admin.timeCats')], ['tokens', t('admin.tokens')]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'users' && <Users />}
      {tab === 'cats' && <Categories />}
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
