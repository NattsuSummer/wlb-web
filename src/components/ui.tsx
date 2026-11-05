import type { CSSProperties, ReactNode } from 'react';
import type { Slot, TimeCategory, User } from '../api';
import { useApp } from '../app-context';
import { catColors, splitBg } from '../lib/colors';

// ---------- icons (inline stroke SVG) ----------
const P: Record<string, string> = {
  clock: 'M12 7v5l3 2',
  calendar: 'M3 9h18M8 2v4M16 2v4',
  users: 'M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2',
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z',
  sun: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  warn: 'M12 3 2 20h20zM12 10v4M12 17.5v.01',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  target: '',
  x: 'M6 6l12 12M18 6L6 18',
  lock: 'M8 11V8a4 4 0 0 1 8 0v3',
  check: 'M5 12l5 5L20 7',
  plus: 'M12 5v14M5 12h14',
};

export function Icon({ name, size = 18, stroke = 'currentColor' }: { name: keyof typeof P; size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'clock' && <circle cx="12" cy="12" r="9" />}
      {name === 'sun' && <circle cx="12" cy="12" r="4" />}
      {name === 'calendar' && <rect x="3" y="4" width="18" height="17" rx="2" />}
      {name === 'users' && <circle cx="9" cy="8" r="3.5" />}
      {name === 'lock' && <rect x="5" y="11" width="14" height="10" rx="2" />}
      {name === 'target' && <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>}
      {P[name] && <path d={P[name]} />}
    </svg>
  );
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }}>
      <Icon name="clock" size={size * 0.56} stroke="#fff" />
    </span>
  );
}

// ---------- people ----------
const AVATAR_DEFAULTS = ['#FFE6A4', '#C1E6FF', '#E7DEF8', '#C4ECD0', '#FAE7E5'];
export function avatarColors(u: Pick<User, 'id' | 'avatarColor'>) {
  return catColors(u.avatarColor ?? AVATAR_DEFAULTS[u.id % AVATAR_DEFAULTS.length]!);
}

export function Avatar({ user, size = 40 }: { user: Pick<User, 'id' | 'avatarColor' | 'displayName'>; size?: number }) {
  const c = avatarColors(user);
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, background: c.bg, color: c.ink, fontSize: size * 0.4 }}>
      {user.displayName.charAt(0).toUpperCase()}
    </span>
  );
}

// ---------- categories ----------
export function useCat() {
  const { catById, catName } = useApp();
  const colorsOf = (ids: number[]) => ids.map((id) => catById.get(id)?.color ?? '#888888');
  return {
    catName,
    names: (ids: number[]) => ids.map(catName).join(' + '),
    one: (id: number) => catColors(catById.get(id)?.color ?? '#888888'),
    bg: (slot: Slot | null, dir: '90deg' | '180deg' = '90deg') => (slot ? splitBg(colorsOf(slot.categoryIds), dir) : 'transparent'),
    solid: (slot: Slot | null, dir: '90deg' | '180deg' = '90deg') => (slot ? splitBg(colorsOf(slot.categoryIds), dir, 'solid') : 'transparent'),
    ink: (slot: Slot | null) => (slot ? catColors(catById.get(slot.categoryIds[0]!)?.color ?? '#888888').ink : 'var(--muted)'),
  };
}

export function CatChip({ cat }: { cat: TimeCategory }) {
  const { lang } = useApp();
  const c = catColors(cat.color);
  return <span className="chip" style={{ background: c.bg, color: c.ink }}>{lang === 'en' ? cat.nameEn : cat.nameTh}</span>;
}

export function Dot({ color, style }: { color: string; style?: CSSProperties }) {
  return <span className="dot" style={{ background: color, ...style }} />;
}

// ---------- misc ----------
export function Spinner() { return <div className="spinner" role="status" aria-label="loading" />; }

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useApp();
  const msg = error instanceof Error ? (error.message === 'Cannot reach the server' ? t('err.network') : error.message) : t('common.error');
  return (
    <div className="note err between" role="alert">
      <span>{msg}</span>
      {onRetry && <button className="btn small" type="button" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}

export function Modal({ children, labelledBy, narrow, onClose }: { children: ReactNode; labelledBy: string; narrow?: boolean; onClose: () => void }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className={`dialog${narrow ? ' narrow' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}
