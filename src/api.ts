// Typed client for wlb-api. The session token lives in localStorage ("remember me") or sessionStorage.
declare const __API_URL__: string;
export const API_URL = __API_URL__;

export type Role = 'admin' | 'member';
export interface User { id: number; username: string; displayName: string; role: Role; avatarColor: string | null }
export interface Me extends User { locale: 'th' | 'en'; theme: 'dark' | 'light' | 'system'; mustChangePassword: boolean }
export interface Slot { categoryIds: number[]; description: string }
export type Week = (Slot | null)[];
export interface TimeCategory { id: number; nameTh: string; nameEn: string; color: string; sort: number; usedSlots: number }
export interface CategoryShare { categoryId: number; hours: number; pct: number; target: number; diff: number }
export interface Summary { plannedHours: number; unplannedHours: number; targetsSet: boolean; categories: CategoryShare[] }
export type Level = 'full' | 'cat' | 'hide';
export interface Privacy { privateMode: boolean; schedule: Level; nowStatus: Level; summary: 'show' | 'hide'; courses: 'show' | 'hide'; answers: 'show' | 'hide' }
export interface NowInfo {
  weekday: number; hour: number; minute: number;
  current: { from: number; to: number; slot: Slot | null; minutesLeft: number } | null;
  next: { weekday: number; hour: number; slot: Slot | null } | null;
}
export interface MemberCard {
  user: User; isMe: boolean; privateMode: boolean;
  visible: { schedule: Level; now: Level; summary: Level; courses: Level };
  now: NowInfo | null; summary: Summary | null;
  courses: { id: number; title: string; categoryId: number | null; done: number; total: number; percent: number; state: string; lastAt: string }[] | null;
}
export interface ScheduleView {
  user: User; editable: boolean;
  visible: { schedule: Level; summary: Level };
  week: Week | null; targets: Record<string, number> | null; summary: Summary | null;
}
export interface Cell { weekday: number; hour: number; slot: Slot | null }
export interface Overwrite { weekday: number; from: number; to: number; before: Slot }
export interface ApiToken { id: string; name: string; hint: string; lastUsedAt: string | null; createdAt: string; owner?: string }
export interface AdminUser extends User { disabled: boolean; mustChangePassword: boolean; lastLoginAt: string | null; createdAt: string }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) { super(message); }
}

const KEY = 'wlb.token';
export function getToken(): string | null {
  try { return localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY); } catch { return null; }
}
export function setToken(token: string | null, remember = true) {
  try {
    localStorage.removeItem(KEY); sessionStorage.removeItem(KEY);
    if (token) (remember ? localStorage : sessionStorage).setItem(KEY, token);
  } catch { /* storage blocked: session lasts for this tab only */ memoryToken = token; }
}
let memoryToken: string | null = null;

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken() ?? memoryToken;
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(API_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the server');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    if (res.status === 401 && path !== '/api/auth/login' && path !== '/api/me/password') onUnauthorized?.();
    throw new ApiError(res.status, e.code ?? 'error', e.message ?? res.statusText, e.details);
  }
  return data as T;
}

export const get = <T = any>(p: string) => api<T>('GET', p);
export const post = <T = any>(p: string, b?: unknown) => api<T>('POST', p, b ?? {});
export const put = <T = any>(p: string, b?: unknown) => api<T>('PUT', p, b ?? {});
export const patch = <T = any>(p: string, b?: unknown) => api<T>('PATCH', p, b ?? {});
export const del = <T = any>(p: string) => api<T>('DELETE', p);
