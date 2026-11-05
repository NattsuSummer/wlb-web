import { useState } from 'react';
import { get, type MemberCard } from '../api';
import { useApp } from '../app-context';
import { Avatar, ErrorNote, Icon, Spinner, useCat } from '../components/ui';
import { hh } from '../lib/schedule';
import { useLoad } from '../lib/use-load';
import { Link } from '../router';

export function MembersPage() {
  const { t } = useApp();
  const [q, setQ] = useState('');
  const data = useLoad(() => get<{ members: MemberCard[] }>('/api/users'), []);
  if (data.error) return <ErrorNote error={data.error} onRetry={data.reload} />;
  if (!data.data) return <Spinner />;
  const list = data.data.members.filter((m) => !q || `${m.user.displayName} ${m.user.username}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div className="stack" style={{ gap: 4 }}>
          <h1>{t('members.title')}</h1>
          <p className="muted" style={{ fontSize: 14 }}>{t('members.sub')}</p>
        </div>
        <label className="field" style={{ minWidth: 240 }}>{t('members.search')}
          <input className="input" type="search" placeholder={t('members.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} style={{ background: 'var(--surface)' }} />
        </label>
      </div>
      {list.length === 0 ? <div className="empty-state">{t('members.none')}</div> : (
        <div className="grid-cards">{list.map((m) => <Member key={m.user.id} m={m} />)}</div>
      )}
    </>
  );
}

function Member({ m }: { m: MemberCard }) {
  const { t } = useApp();
  const cat = useCat();
  const cur = m.now?.current ?? null;
  return (
    <article className="card stack" style={{ gap: 18 }}>
      <div className="hstack" style={{ gap: 14, flexWrap: 'nowrap' }}>
        <Avatar user={m.user} size={52} />
        <div className="stack" style={{ gap: 0, minWidth: 0 }}>
          <span className="hstack" style={{ fontSize: 18, fontWeight: 700 }}>
            {m.user.displayName}
            {m.user.role === 'admin' && <span className="chip soft" style={{ fontSize: 11 }}>admin</span>}
            {m.isMe && <span className="chip gray" style={{ fontSize: 11 }}>{t('common.you')}</span>}
            {m.privateMode && <span className="chip inv" style={{ fontSize: 11 }}>{t('common.private')}</span>}
          </span>
          <span className="muted" style={{ fontSize: 13 }}>@{m.user.username}</span>
        </div>
      </div>

      {m.privateMode ? (
        <div className="empty-state hstack" style={{ justifyContent: 'center', padding: 18 }}><Icon name="lock" size={14} />{t('members.privateCard')}</div>
      ) : (
        <>
          {m.now ? (
            <div className="stack" style={{ gap: 2, padding: '14px 16px', borderRadius: 12, background: cur?.slot ? cat.bg(cur.slot) : 'var(--subtle)' }}>
              <span className="ink2" style={{ fontSize: 12 }}>{cur ? `${hh(cur.from)}–${hh(cur.to)}` : ''}</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: cat.ink(cur?.slot ?? null) }}>{cur?.slot ? cur.slot.description || cat.names(cur.slot.categoryIds) : t('members.idle')}</span>
              {cur?.slot && <span className="ink2" style={{ fontSize: 13 }}>{cat.names(cur.slot.categoryIds)}</span>}
            </div>
          ) : <Hidden label={t('privacy.now')} />}

          {m.summary ? (
            <div className="stack" style={{ gap: 6 }}>
              <span className="ink2" style={{ fontSize: 12, fontWeight: 500 }}>{t('members.week')}</span>
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2, background: 'var(--subtle)' }}>
                {m.summary.categories.filter((c) => c.hours > 0).map((c) => <span key={c.categoryId} style={{ flex: `${c.hours} 1 0`, background: cat.one(c.categoryId).solid }} />)}
                {m.summary.unplannedHours > 0 && <span style={{ flex: `${m.summary.unplannedHours} 1 0` }} />}
              </div>
              <div className="hstack ink2" style={{ gap: '4px 12px', fontSize: 12 }}>
                {m.summary.categories.filter((c) => c.hours > 0).map((c) => (
                  <span key={c.categoryId} className="hstack" style={{ gap: 5 }}><span className="dot" style={{ width: 8, height: 8, background: cat.one(c.categoryId).solid }} />{cat.catName(c.categoryId)} {Math.round(c.pct)}%</span>
                ))}
              </div>
            </div>
          ) : <Hidden label={t('members.week')} />}

          {m.visible.schedule !== 'hide' && (
            <Link href={m.isMe ? '/schedule' : `/schedule/${m.user.username}`} className="btn" style={{ alignSelf: 'flex-start' }}>
              <Icon name="calendar" size={16} />{m.isMe ? t('members.mine') : t('members.view', { name: m.user.displayName })}
            </Link>
          )}
        </>
      )}
    </article>
  );
}

function Hidden({ label }: { label: string }) {
  const { t } = useApp();
  return (
    <div className="stack" style={{ gap: 6 }}>
      <span className="ink2" style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      <span className="hstack muted" style={{ fontSize: 13, padding: '10px 12px', borderRadius: 10, border: '1px dashed var(--line)' }}><Icon name="lock" size={14} />{t('common.hidden')}</span>
    </div>
  );
}
