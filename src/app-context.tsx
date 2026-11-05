import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { get, patch, post, setToken, setUnauthorizedHandler, getToken, type Me, type TimeCategory, type Privacy } from './api';
import { translate, type Key, type Lang } from './i18n';

type Theme = 'dark' | 'light' | 'system';
interface Toast { id: number; text: string; action?: { label: string; run: () => void } }

interface AppState {
  me: Me | null;
  privacy: Privacy | null;
  categories: TimeCategory[];
  catById: Map<number, TimeCategory>;
  ready: boolean;
  lang: Lang;
  theme: Theme;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  catName: (id: number) => string;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  login: (token: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  reloadCategories: () => Promise<void>;
  setPrivacy: (p: Privacy) => void;
  toast: (text: string, action?: Toast['action'], ms?: number) => void;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

const read = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function applyTheme(t: Theme) {
  const resolved = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0F1513' : '#F4F6F5');
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [categories, setCategories] = useState<TimeCategory[]>([]);
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>(read('wlb.lang', 'th') as Lang);
  const [theme, setThemeState] = useState<Theme>(read('wlb.theme', 'dark') as Theme);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const reloadCategories = useCallback(async () => {
    const r = await get<{ categories: TimeCategory[] }>('/api/time-categories');
    setCategories(r.categories);
  }, []);

  const reload = useCallback(async () => {
    if (!getToken()) { setMe(null); setReady(true); return; }
    try {
      const r = await get<{ user: Me; privacy: Privacy }>('/api/me');
      setMe(r.user);
      setPrivacy(r.privacy);
      // server-side preferences win once logged in
      setLangState(r.user.locale); write('wlb.lang', r.user.locale);
      setThemeState(r.user.theme); write('wlb.theme', r.user.theme);
      if (!r.user.mustChangePassword) await reloadCategories();
    } catch {
      setMe(null);
    } finally {
      setReady(true);
    }
  }, [reloadCategories]);

  useEffect(() => {
    setUnauthorizedHandler(() => { setToken(null); setMe(null); });
    reload();
  }, [reload]);

  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const catName = useCallback((id: number) => {
    const c = catById.get(id);
    return c ? (lang === 'en' ? c.nameEn : c.nameTh) : '?';
  }, [catById, lang]);

  const value: AppState = {
    me, privacy, categories, catById, ready, lang, theme, t, catName,
    setLang: (l) => { setLangState(l); write('wlb.lang', l); if (me) patch('/api/me', { locale: l }).catch(() => {}); },
    setTheme: (th) => { setThemeState(th); write('wlb.theme', th); if (me) patch('/api/me', { theme: th }).catch(() => {}); },
    login: async (token, remember) => { setToken(token, remember); setReady(false); await reload(); },
    logout: async () => { try { await post('/api/auth/logout'); } catch { /* ignore */ } setToken(null); setMe(null); },
    reload, reloadCategories, setPrivacy,
    toast: (text, action, ms = action ? 10000 : 3500) => {
      const id = Date.now();
      setToasts([{ id, text, action }]);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), ms);
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {toasts.map((x) => (
        <div key={x.id} className="toast" role="status">
          <span>{x.text}</span>
          {x.action && <button type="button" onClick={() => { setToasts([]); x.action!.run(); }}>{x.action.label}</button>}
        </div>
      ))}
    </Ctx.Provider>
  );
}
