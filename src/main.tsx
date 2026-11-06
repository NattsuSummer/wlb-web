import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './app-context';
import { Layout } from './components/layout';
import { Spinner } from './components/ui';
import { AdminPage } from './pages/admin';
import { HomePage } from './pages/home';
import { ForcePasswordPage, LoginPage } from './pages/login';
import { MembersPage } from './pages/members';
import { SchedulePage } from './pages/schedule';
import { SettingsPage } from './pages/settings';
import { usePath } from './router';

function CoursesSoon() {
  const { t } = useApp();
  return (
    <div className="card stack" style={{ alignItems: 'flex-start' }}>
      <h1>{t('courses.soonTitle')}</h1>
      <p className="muted">{t('courses.soonSub')}</p>
    </div>
  );
}

function App() {
  const { ready, me } = useApp();
  const path = usePath();
  if (!ready) return <Spinner />;
  if (!me) return <LoginPage />;
  if (me.mustChangePassword) return <ForcePasswordPage />;

  const [, section, arg] = path.split('/');
  let page;
  switch (section) {
    case '': case undefined: page = <HomePage />; break;
    case 'schedule': page = <SchedulePage key={arg ?? 'me'} username={arg ? decodeURIComponent(arg) : undefined} />; break;
    case 'members': page = <MembersPage />; break;
    case 'courses': page = <CoursesSoon />; break;
    case 'settings': page = <SettingsPage />; break;
    case 'admin': page = <AdminPage />; break;
    default: page = <div className="empty-state">404</div>;
  }
  return <Layout path={path}>{page}</Layout>;
}

createRoot(document.getElementById('root')!).render(<AppProvider><App /></AppProvider>);
