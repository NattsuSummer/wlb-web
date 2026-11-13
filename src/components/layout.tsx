import type { ReactNode } from 'react';
import { useApp } from '../app-context';
import { Link } from '../router';
import { Avatar, BrandMark, Icon } from './ui';

export function ThemeToggle() {
  const { theme, setTheme, t } = useApp();
  const dark = theme === 'dark' || (theme === 'system' && !matchMedia('(prefers-color-scheme: light)').matches);
  return (
    <button type="button" className="btn icon" aria-label={dark ? t('theme.toLight') : t('theme.toDark')} title={dark ? t('theme.toLight') : t('theme.toDark')} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  );
}

export function LangToggle() {
  const { lang, setLang } = useApp();
  return (
    <div className="lang" role="group" aria-label="Language">
      <button type="button" aria-pressed={lang === 'th'} onClick={() => setLang('th')}>TH</button>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
    </div>
  );
}

const NAV = [
  { href: '/', key: 'nav.today', icon: 'clock' },
  { href: '/schedule', key: 'nav.schedule', icon: 'calendar' },
  { href: '/members', key: 'nav.members', icon: 'users' },
  { href: '/courses', key: 'nav.courses', icon: 'book' },
  { href: '/routines', key: 'nav.routines', icon: 'dumbbell' },
  { href: '/projects', key: 'nav.projects', icon: 'gamepad' },
] as const;

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  const { me, t } = useApp();
  const first = path.split('/')[1] ?? '';
  const section = '/' + (first === 'lessons' ? 'courses' : first);
  const current = (href: string) => (href === section ? 'page' : undefined);
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link href="/" className="brand"><BrandMark />Balance</Link>
          <nav className="nav" aria-label="main">
            {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{t(n.key)}</Link>)}
            {me?.role === 'admin' && <Link href="/admin" aria-current={current('/admin')}>{t('nav.admin')}</Link>}
          </nav>
          <div className="top-actions" style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
            <LangToggle />
            {me && (
              <Link href="/settings" aria-label={t('settings.account')} title={t('settings.account')} style={{ borderRadius: '50%', display: 'flex' }}>
                <Avatar user={me} />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
      <nav className="bottomnav" aria-label="main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={current(n.href)}>
            <Icon name={n.icon} size={22} />{t(n.key)}
          </Link>
        ))}
      </nav>
    </>
  );
}
