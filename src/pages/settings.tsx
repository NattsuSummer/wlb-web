import { useEffect, useState } from 'react';
import { del, get, patch, post, put, type ApiToken, type Level, type Privacy } from '../api';
import { useApp } from '../app-context';
import { Avatar, Icon, Switch } from '../components/ui';
import { useLoad } from '../lib/use-load';
import { Link } from '../router';
import { PasswordForm } from './login';

type Tab = 'profile' | 'privacy' | 'appearance' | 'tokens';

export function SettingsPage() {
  const { t, me, logout } = useApp();
  const [tab, setTab] = useState<Tab>((new URLSearchParams(location.search).get('tab') as Tab) || 'privacy');
  const tabs: [Tab, string][] = [['profile', t('settings.profile')], ['privacy', t('settings.privacy')], ['appearance', t('settings.appearance')], ['tokens', t('settings.tokens')]];
  return (
    <>
      <h1>{t('settings.title')}</h1>
      <div className="row">
        <nav aria-label={t('settings.title')} className="stack" style={{ flex: '1 1 200px', gap: 4 }}>
          {tabs.map(([k, label]) => (
            <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)} className="btn"
              style={{ justifyContent: 'flex-start', border: 0, ...(tab === k ? { background: 'var(--accent-soft)', color: 'var(--accent-ink)', fontWeight: 600 } : { background: 'transparent', color: 'var(--ink-2)' }) }}>{label}</button>
          ))}
          {me?.role === 'admin' && <Link href="/admin" className="btn" style={{ justifyContent: 'flex-start', border: 0, background: 'transparent', color: 'var(--ink-2)' }}>{t('nav.admin')}</Link>}
          <button type="button" className="btn" style={{ justifyContent: 'flex-start', border: 0, background: 'transparent', color: 'var(--danger-ink)' }} onClick={() => logout()}>{t('settings.logout')}</button>
        </nav>
        <div style={{ flex: '999 1 560px', minWidth: 0 }}>
          {tab === 'profile' && <Profile />}
          {tab === 'privacy' && <PrivacySettings />}
          {tab === 'appearance' && <Appearance />}
          {tab === 'tokens' && <Tokens />}
        </div>
      </div>
    </>
  );
}

const AVATARS = ['#FFE6A4', '#C1E6FF', '#E7DEF8', '#C4ECD0', '#FAE7E5', '#FFD6E8', '#D7F0F7'];

function Profile() {
  const { t, me, reload, toast } = useApp();
  const [name, setName] = useState(me!.displayName);
  const [color, setColor] = useState(me!.avatarColor ?? AVATARS[0]!);
  const [pwDone, setPwDone] = useState(false);
  async function save() {
    try { await patch('/api/me', { displayName: name, avatarColor: color }); await reload(); toast(t('common.saved')); }
    catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="card stack">
        <h2>{t('settings.profile')}</h2>
        <div className="hstack" style={{ gap: 14 }}><Avatar user={{ ...me!, displayName: name || me!.username, avatarColor: color }} size={56} /><span className="muted">@{me!.username}</span></div>
        <label className="field">{t('settings.displayName')}<input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
        <div className="field">{t('settings.avatar')}
          <div className="hstack">
            {AVATARS.map((c) => (
              <button key={c} type="button" aria-label={c} aria-pressed={c === color} onClick={() => setColor(c)}
                style={{ width: 36, height: 36, borderRadius: '50%', border: c === color ? '3px solid var(--ink)' : '1px solid var(--line)', background: `color-mix(in srgb, ${c} var(--cat-bg-pct), var(--ground))`, cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <button type="button" className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={!name.trim()} onClick={save}>{t('common.save')}</button>
      </section>
      <section className="card stack">
        <h2>{t('pw.change')}</h2>
        {pwDone ? <div className="note ok">{t('pw.done')}</div> : <PasswordForm onDone={() => setPwDone(true)} />}
      </section>
    </div>
  );
}

function Appearance() {
  const { t, theme, setTheme, lang, setLang } = useApp();
  return (
    <section className="card stack" style={{ gap: 18 }}>
      <div className="field">{t('settings.theme')}
        <div className="seg" role="radiogroup" aria-label={t('settings.theme')}>
          {(['dark', 'light', 'system'] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={theme === k} onClick={() => setTheme(k)}>{t(`settings.${k}`)}</button>)}
        </div>
      </div>
      <div className="field">{t('settings.language')}
        <div className="seg" role="radiogroup" aria-label={t('settings.language')}>
          <button type="button" role="radio" aria-checked={lang === 'th'} onClick={() => setLang('th')}>ไทย</button>
          <button type="button" role="radio" aria-checked={lang === 'en'} onClick={() => setLang('en')}>English</button>
        </div>
      </div>
    </section>
  );
}

function PrivacySettings() {
  const { t, me, privacy, setPrivacy, toast } = useApp();
  const [p, setP] = useState<Privacy>(privacy!);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (privacy) setP(privacy); }, [privacy]);
  const upd = (patchP: Partial<Privacy>) => { setP({ ...p, ...patchP }); setDirty(true); };
  async function save() {
    try { const r = await put<{ privacy: Privacy }>('/api/me/privacy', p); setPrivacy(r.privacy); setDirty(false); toast(t('common.saved')); }
    catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  const three: [Level, string][] = [['full', t('privacy.full')], ['cat', t('privacy.cat')], ['hide', t('privacy.hide')]];
  const two: ['show' | 'hide', string][] = [['show', t('privacy.show')], ['hide', t('privacy.hide')]];
  const rows: { key: keyof Privacy; title: string; sub: string; opts: [string, string][] }[] = [
    { key: 'schedule', title: t('privacy.schedule'), sub: t('privacy.scheduleSub'), opts: three },
    { key: 'nowStatus', title: t('privacy.now'), sub: t('privacy.nowSub'), opts: three },
    { key: 'summary', title: t('privacy.summary'), sub: t('privacy.summarySub'), opts: two },
    { key: 'courses', title: t('privacy.courses'), sub: t('privacy.coursesSub'), opts: two },
    { key: 'answers', title: t('privacy.answers'), sub: t('privacy.answersSub'), opts: two },
  ];
  const eff = (k: keyof Privacy) => (p.privateMode ? 'hide' : (p[k] as string));
  const preview: [string, string][] = [
    [t('privacy.now'), eff('nowStatus')], [t('privacy.schedule'), eff('schedule')], [t('privacy.summary'), eff('summary')], [t('privacy.courses'), eff('courses')],
  ];
  return (
    <div className="row">
      <div className="stack grow" style={{ gap: 16, flexBasis: 420 }}>
        <div className="card between" style={{ padding: 20, ...(p.privateMode ? { background: 'var(--inverse-bg)', color: 'var(--inverse-ink)', borderColor: 'transparent' } : {}) }}>
          <span className="stack" style={{ gap: 4, flex: '1 1 240px' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{t('privacy.mode')}</span>
            <span style={{ fontSize: 14, opacity: 0.85 }}>{t('privacy.modeSub')}</span>
          </span>
          <Switch checked={p.privateMode} onChange={(v) => upd({ privateMode: v })} label={t('privacy.mode')} />
        </div>
        <div className="card" style={{ padding: '6px 20px', opacity: p.privateMode ? 0.55 : 1 }}>
          {rows.map((r, i) => (
            <div key={r.key} className="between" style={{ padding: '16px 0', borderTop: i ? '1px solid var(--border)' : undefined }}>
              <span className="stack" style={{ gap: 2, flex: '1 1 240px' }}><span style={{ fontWeight: 600 }}>{r.title}</span><span className="muted" style={{ fontSize: 13 }}>{r.sub}</span></span>
              <div className="seg" role="radiogroup" aria-label={r.title}>
                {r.opts.map(([v, label]) => <button key={v} type="button" role="radio" disabled={p.privateMode} aria-checked={p[r.key] === v} onClick={() => upd({ [r.key]: v } as Partial<Privacy>)}>{label}</button>)}
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13 }}>{t('privacy.adminNote')}</p>
        <button type="button" className="btn primary" style={{ alignSelf: 'flex-start' }} disabled={!dirty} onClick={save}>{t('common.save')}</button>
      </div>
      <aside className="side stack" style={{ gap: 10 }}>
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{t('privacy.preview')}</span>
        <article className="card stack">
          <div className="hstack" style={{ gap: 12 }}>
            <Avatar user={me!} size={48} />
            <span className="stack" style={{ gap: 0 }}>
              <span className="hstack" style={{ fontWeight: 700, fontSize: 17 }}>{me!.displayName}{p.privateMode && <span className="chip inv" style={{ fontSize: 11 }}>{t('common.private')}</span>}</span>
              <span className="muted" style={{ fontSize: 13 }}>@{me!.username}</span>
            </span>
          </div>
          {preview.map(([label, v]) => (
            <div key={label} className="stack" style={{ gap: 6 }}>
              <span className="ink2" style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
              {v === 'hide'
                ? <span className="hstack muted" style={{ fontSize: 13, padding: '10px 12px', borderRadius: 10, border: '1px dashed var(--line)' }}><Icon name="lock" size={14} />{t('common.hidden')}</span>
                : <span style={{ fontSize: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--ground)' }}>{v === 'cat' ? t('privacy.cat') : t('privacy.full')}</span>}
            </div>
          ))}
        </article>
      </aside>
    </div>
  );
}

function Tokens() {
  const { t, toast } = useApp();
  const list = useLoad(() => get<{ tokens: ApiToken[] }>('/api/me/tokens'), []);
  const [name, setName] = useState('Claude');
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  async function create() {
    try { const r = await post<{ token: string }>('/api/me/tokens', { name }); setCreated(r.token); setCopied(false); list.reload(); }
    catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  async function revoke(id: string) {
    try { await del(`/api/me/tokens/${id}`); list.reload(); } catch (e) { toast(e instanceof Error ? e.message : t('common.error')); }
  }
  return (
    <section className="card stack">
      <h2>{t('settings.tokens')}</h2>
      <p className="ink2" style={{ fontSize: 14 }}>{t('tokens.sub')}</p>
      <div className="hstack" style={{ alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: '1 1 240px' }}>{t('tokens.name')}<input className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
        <button type="button" className="btn primary" disabled={!name.trim()} onClick={create}>{t('tokens.create')}</button>
      </div>
      {created && (
        <div className="note warn stack" role="status">
          <span style={{ fontWeight: 700 }}>{t('tokens.once')}</span>
          <span className="hstack">
            <code className="mono" style={{ flex: '1 1 280px', wordBreak: 'break-all', padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', color: 'var(--ink)' }}>{created}</code>
            <button type="button" className="btn small" onClick={() => { navigator.clipboard?.writeText(created).then(() => setCopied(true)).catch(() => {}); }}>{copied ? t('tokens.copied') : t('tokens.copy')}</button>
          </span>
        </div>
      )}
      {list.data && (list.data.tokens.length === 0 ? <span className="muted">{t('tokens.none')}</span> : (
        <div className="table-wrap"><table>
          <thead><tr><th>{t('tokens.name')}</th><th>{t('tokens.lastUsed')}</th><th /></tr></thead>
          <tbody>{list.data.tokens.map((x) => (
            <tr key={x.id}>
              <td><span className="stack" style={{ gap: 0 }}><span style={{ fontWeight: 600 }}>{x.name}</span><span className="mono muted" style={{ fontSize: 12 }}>wlb_…{x.hint}</span></span></td>
              <td className="ink2">{x.lastUsedAt ? new Date(x.lastUsedAt).toLocaleString() : t('tokens.never')}</td>
              <td style={{ textAlign: 'right' }}><button type="button" className="btn small danger-ghost" onClick={() => revoke(x.id)}>{t('tokens.revoke')}</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      ))}
    </section>
  );
}
