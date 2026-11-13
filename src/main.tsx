import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './app-context';
import { Layout } from './components/layout';
import { Spinner } from './components/ui';
import { AdminPage } from './pages/admin';
import { CoursePage } from './pages/course';
import { EditCoursePage, ImportPage, NewCoursePage } from './pages/course-editor';
import { ProjectsPage } from './pages/projects';
import { ProjectPage } from './pages/project';
import { EditRoutinePage, NewRoutinePage, RoutineImportPage } from './pages/routine-editor';
import { RoutineItemPage, RoutinePlanPage, RoutinesPage } from './pages/routines';
import { CoursesPage } from './pages/courses';
import { LessonPage } from './pages/lesson';
import { ConsentPage } from './pages/oauth';
import { HomePage } from './pages/home';
import { ForcePasswordPage, LoginPage } from './pages/login';
import { MembersPage } from './pages/members';
import { SchedulePage } from './pages/schedule';
import { SettingsPage } from './pages/settings';
import { usePath } from './router';

function App() {
  const { ready, me } = useApp();
  const path = usePath();
  if (!ready) return <Spinner />;
  if (!me) return <LoginPage />;
  if (me.mustChangePassword) return <ForcePasswordPage />;
  if (path === '/oauth/consent') return <ConsentPage />;

  const [, section, arg, sub] = path.split('/');
  const num = Number(arg);
  let page: ReactElement | undefined;
  switch (section) {
    case '': case undefined: page = <HomePage />; break;
    case 'schedule': page = <SchedulePage key={arg ?? 'me'} username={arg ? decodeURIComponent(arg) : undefined} />; break;
    case 'members': page = <MembersPage />; break;
    case 'courses':
      if (!arg) page = <CoursesPage />;
      else if (arg === 'new') page = <NewCoursePage />;
      else if (arg === 'import') page = <ImportPage />;
      else if (Number.isInteger(num) && sub === 'edit') page = <EditCoursePage key={num} id={num} />;
      else if (Number.isInteger(num) && !sub) page = <CoursePage key={num} id={num} />;
      break;
    case 'projects': {
      const n = Number(arg);
      if (!arg) page = <ProjectsPage />;
      else if (Number.isInteger(n) && n > 0 && !sub) page = <ProjectPage key={n} id={n} />;
      break;
    }
    case 'routines': {
      const n = Number(sub);
      const edit = path.split('/')[4] === 'edit';
      if (!arg) page = <RoutinesPage />;
      else if (arg === 'import') page = <RoutineImportPage />;
      else if (arg === 'new' && sub) page = <NewRoutinePage key={sub} what={sub} />;
      else if ((arg === 'plans' || arg === 'items') && Number.isInteger(n) && n > 0) {
        if (edit) page = <EditRoutinePage key={path} what={arg} id={n} />;
        else if (!path.split('/')[4]) page = arg === 'plans' ? <RoutinePlanPage key={n} id={n} /> : <RoutineItemPage key={n} id={n} />;
      }
      break;
    }
    case 'lessons': if (Number.isInteger(num)) page = <LessonPage id={num} />; break;
    case 'settings': page = <SettingsPage />; break;
    case 'admin': page = <AdminPage />; break;
  }
  page ??= <div className="empty-state">404</div>;
  return <Layout path={path}>{page}</Layout>;
}

createRoot(document.getElementById('root')!).render(<AppProvider><App /></AppProvider>);
