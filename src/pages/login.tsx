import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, post, type Me } from '../api';
import { useApp } from '../app-context';
import { LangToggle, ThemeToggle } from '../components/layout';
import { BrandMark } from '../components/ui';

function Shell({ children }: { children: ReactNode }) {
  const { t } = useApp();
  return (
    <div className="center-screen">
      <div className="hstack" style={{ justifyContent: 'flex-end', padding: '16px 24px' }}><ThemeToggle /><LangToggle /></div>
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 16px 48px' }}>
        <div style={{ width: '100%', maxWidth: 920, display: 'flex', flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, overflow: 'hidden' }}>
          <div style={{ flex: '1 1 340px', padding: 40, display: 'flex', flexDirection: 'column', gap: 28, background: 'color-mix(in srgb, #E7DEF8 var(--cat-bg-pct), var(--ground))' }}>
            <span className="brand" style={{ fontSize: 22 }}><BrandMark size={36} />Balance</span>
            <div className="stack" style={{ gap: 10 }}>
              <span style={{ fontSize: 30, lineHeight: 1.25, fontWeight: 700 }}>{t('login.hero1')}<br />{t('login.hero2')}</span>
              <span className="ink2" style={{ fontSize: 15 }}>{t('login.heroSub')}</span>
            </div>
            <div aria-hidden="true" style={{ marginTop: 'auto', display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
              <span style={{ flex: '7 1 0', background: '#4A9FD8' }} /><span style={{ flex: '3 1 0', background: '#D9A520' }} />
              <span style={{ flex: '8 1 0', background: '#3E9E63' }} /><span style={{ flex: '2 1 0', background: '#8A6BC9' }} />
              <span style={{ flex: '4 1 0', background: 'linear-gradient(180deg,#4A9FD8 0 50%,#8A6BC9 50% 100%)' }} />
            </div>
          </div>
          <div style={{ flex: '1 1 360px', padding: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { t, login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await post<{ token: string; user: Me }>('/api/auth/login', { username, password, remember });
      await login(r.token, remember);
    } catch (err) {
      setError(err instanceof ApiError ? (err.code === 'locked' ? t('login.locked') : err.status === 401 ? t('login.bad') : err.code === 'network' ? t('err.network') : err.message) : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 24 }}>{t('login.title')}</h1>
          <span className="muted">{t('login.sub')}</span>
        </div>
        {error && <div className="note err" role="alert">{error}</div>}
        <label className="field">{t('login.username')}
          <input className="input" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <div className="field">
          <label htmlFor="login-pw">{t('login.password')}</label>
          <span style={{ position: 'relative', display: 'flex' }}>
            <input id="login-pw" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: 70 }} />
            <button type="button" className="btn ghost" aria-pressed={show} style={{ position: 'absolute', right: 6, top: 2, minHeight: 40 }} onClick={() => setShow(!show)}>{show ? t('login.hide') : t('login.show')}</button>
          </span>
        </div>
        <label className="hstack ink2" style={{ fontSize: 14, minHeight: 40, cursor: 'pointer' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
          {t('login.remember')}
        </label>
        <button className="btn primary" type="submit" disabled={busy} style={{ minHeight: 50, fontSize: 16 }}>{t('login.submit')}</button>
        <span className="muted" style={{ fontSize: 13 }}>{t('login.help')}</span>
      </form>
    </Shell>
  );
}

export function passwordRules(current: string, next: string, confirm: string) {
  return {
    r1: next.length >= 8,
    r2: /[A-Za-z]/.test(next) && /[0-9]/.test(next),
    r3: next !== '' && next !== current,
    r4: next !== '' && next === confirm,
  };
}

export function PasswordForm({ first, onDone }: { first?: boolean; onDone: () => void }) {
  const { t } = useApp();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rules = passwordRules(current, next, confirm);
  const ok = current !== '' && Object.values(rules).every(Boolean);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError('');
    try {
      await post('/api/me/password', { currentPassword: current, newPassword: next });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('login.bad') : err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  const rule = (pass: boolean, key: 'pw.r1' | 'pw.r2' | 'pw.r3' | 'pw.r4') => (
    <li style={{ color: pass ? 'var(--ok-ink)' : 'var(--muted)' }}>{pass ? '✓' : '○'} {t(key)}</li>
  );

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
      {error && <div className="note err" role="alert">{error}</div>}
      <label className="field">{t('pw.current')}
        <input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </label>
      <label className="field">{t('pw.new')}
        <input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
      </label>
      <label className="field">{t('pw.confirm')}
        <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </label>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rule(rules.r1, 'pw.r1')}{rule(rules.r2, 'pw.r2')}{rule(rules.r3, 'pw.r3')}{rule(rules.r4, 'pw.r4')}
      </ul>
      <button className="btn primary" type="submit" disabled={!ok || busy}>{first ? t('pw.submit') : t('pw.change')}</button>
    </form>
  );
}

export function ForcePasswordPage() {
  const { t, me, reload, logout } = useApp();
  return (
    <Shell>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 24 }}>{t('pw.title')}</h1>
        <span className="muted">{t('pw.first')} ({me?.username})</span>
      </div>
      <PasswordForm first onDone={() => reload()} />
      <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => logout()}>{t('settings.logout')}</button>
    </Shell>
  );
}
