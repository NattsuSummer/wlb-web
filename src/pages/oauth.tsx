// OAuth consent page (MCP connector) and the "connect Claude" instructions.
import { useState } from 'react';
import { API_URL, ApiError, get, post } from '../api';
import { useApp } from '../app-context';
import { ThemeToggle, LangToggle } from '../components/layout';
import { BrandMark, ErrorNote, Icon, Spinner } from '../components/ui';
import { useLoad } from '../lib/use-load';

const PARAMS = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'scope'];

export function ConsentPage() {
  const { t } = useApp();
  const q = new URLSearchParams(location.search);
  const params = Object.fromEntries(PARAMS.filter((k) => q.has(k)).map((k) => [k, q.get(k)!]));
  const info = useLoad(() => get<{ client: { name: string; redirectHost: string }; user: { username: string; displayName: string } }>(`/api/oauth/consent?${new URLSearchParams(params)}`), []);
  const [autoPublish, setAutoPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ redirect: string }>('/api/oauth/consent', { ...params, approve, autoPublish });
      location.assign(r.redirect);
    } catch (e) { setError(e); setBusy(false); }
  }

  return (
    <div className="center-screen" style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="hstack" style={{ position: 'absolute', top: 16, right: 16 }}><ThemeToggle /><LangToggle /></div>
      <main className="card stack" style={{ maxWidth: 480, width: '100%', gap: 18 }}>
        <div className="hstack" style={{ gap: 10 }}><BrandMark /><strong style={{ fontSize: 18 }}>Balance Our Day</strong></div>
        {info.error ? (
          info.error instanceof ApiError && info.error.status === 400
            ? <div className="note err" role="alert">{t('oauth.bad')}</div>
            : <ErrorNote error={info.error} onRetry={info.reload} />
        ) : !info.data ? <Spinner /> : (
          <>
            <h1 style={{ fontSize: 22 }}>{t('oauth.title', { client: info.data.client.name })}</h1>
            <p className="ink2">{t('oauth.as', { client: info.data.client.name, name: info.data.user.displayName, username: info.data.user.username })}</p>
            <ul className="stack" style={{ gap: 8, margin: 0, paddingLeft: 0, listStyle: 'none' }}>
              {(['oauth.p1', 'oauth.p2', 'oauth.p3'] as const).map((k) => (
                <li key={k} className="hstack" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><span style={{ color: 'var(--accent-ink)', marginTop: 2 }}><Icon name="check" size={16} /></span>{t(k)}</li>
              ))}
              <li className="hstack muted" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><span style={{ marginTop: 2 }}><Icon name="lock" size={16} /></span>{t('oauth.not')}</li>
            </ul>
            <label className="check" style={{ fontSize: 14 }}>
              <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} />
              <span>{t('oauth.auto')}</span>
            </label>
            {error !== null && <ErrorNote error={error} />}
            <div className="hstack" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn" disabled={busy} onClick={() => decide(false)}>{t('oauth.deny')}</button>
              <button type="button" className="btn primary" disabled={busy} onClick={() => decide(true)}>{t('oauth.allow')}</button>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>{t('oauth.back', { host: info.data.client.redirectHost })} · {t('oauth.revoke')}</p>
          </>
        )}
      </main>
    </div>
  );
}

export function McpSetup({ example }: { example?: string } = {}) {
  const { t, toast } = useApp();
  const url = `${API_URL || location.origin}/mcp`;
  async function copy() {
    try { await navigator.clipboard.writeText(url); toast(t('e.copied')); } catch { toast(t('common.error')); }
  }
  return (
    <div className="stack">
      <strong>{t('mcp.title')}</strong>
      <p className="ink2" style={{ fontSize: 14 }}>{t('mcp.sub')}</p>
      <ol className="stack" style={{ gap: 10, margin: 0, paddingLeft: 20, fontSize: 14 }}>
        <li>{t('mcp.s1')}</li>
        <li>
          {t('mcp.s2')}
          <span className="hstack" style={{ flexWrap: 'nowrap', marginTop: 6 }}>
            <code className="input mono" aria-label={t('mcp.url')} style={{ fontSize: 12, overflowWrap: 'anywhere', minHeight: 0, padding: '8px 10px', flex: 1, minWidth: 0 }}>{url}</code>
            <button type="button" className="btn small" onClick={copy} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}><Icon name="copy" size={16} />{t('e.copy')}</button>
          </span>
        </li>
        <li>{t('mcp.s3')}</li>
        <li>{t('mcp.s4')}</li>
      </ol>
      {example && <p className="ink2" style={{ fontSize: 14 }}>{example}</p>}
      <p className="note info">{t('mcp.note')}</p>
    </div>
  );
}
