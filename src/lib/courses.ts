// Course types (mirror wlb-api) and small helpers: category tints, markdown, YouTube embeds.
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { User } from '../api';
import { catColors } from './colors';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Visibility = 'group' | 'private';
export type Status = 'published' | 'draft';
export type CourseState = 'not_started' | 'in_progress' | 'done';

export interface CourseCategory { id: number; nameTh: string; nameEn: string; icon: string; tint: string; sort: number }
export interface Progress { done: number; total: number; percent: number; state: CourseState; lastAt: string | null }
export interface CourseCard {
  id: number; packId: number | null; orderInPack: number | null; title: string; description: string; categoryId: number | null;
  level: Level; visibility: Visibility; status: Status; coverUrl: string | null; createdBy: number | null; creatorName: string | null;
  lessonCount: number; minutes: number; createdAt: string; updatedAt: string; progress: Progress; mine: boolean; canEdit: boolean;
}
export interface Pack { id: number; title: string; description: string; categoryId: number | null; coverUrl: string | null; createdBy: number | null }
export interface PackView extends Pack { courses: CourseCard[]; progress: { done: number; total: number; percent: number }; canEdit: boolean }
export interface Catalog { categories: CourseCategory[]; packs: PackView[]; singles: CourseCard[]; inProgress: CourseCard[] }

export interface CourseDetail {
  course: CourseCard;
  category: CourseCategory | null;
  lessons: { id: number; sort: number; title: string; minutes: number | null; completed: boolean; exerciseCount: number }[];
  nextLessonId: number | null;
  pack: (Pack & { courses: { id: number; title: string; orderInPack: number | null; state: CourseState; percent: number }[] }) | null;
  skippedCourses: { id: number; title: string }[];
}

export type ExerciseData =
  | { type: 'mcq'; choices: string[]; answer?: number }
  | { type: 'checklist'; items: string[] }
  | { type: 'text'; sample?: string };
export interface Attempt { answer: unknown; isCorrect: boolean | null; createdAt: string }
export interface LessonView {
  course: { id: number; title: string; packId: number | null; canEdit: boolean };
  lesson: { id: number; courseId: number; sort: number; title: string; minutes: number | null; contentMd: string; links: { title: string; url: string }[]; images: { url: string; alt: string }[] };
  completed: boolean;
  exercises: { id: number; sort: number; prompt: string; data: ExerciseData; myAttempt: Attempt | null }[];
  othersAnswers: { exerciseId: number; user: User; answer: unknown; createdAt: string }[];
  skipped: { id: number; title: string }[];
  outline: { id: number; title: string; minutes: number | null; completed: boolean }[];
  prevId: number | null; nextId: number | null;
  progress: { done: number; total: number; percent: number };
}

export interface Issue { path: string; message: string }
export interface Validation { errors: Issue[]; warnings: Issue[]; draft: unknown | null }
export interface MemberCourse { id: number; title: string; categoryId: number | null; done: number; total: number; percent: number; state: CourseState; lastAt: string }

// Course category tints use the same palette as the time categories.
const TINT: Record<string, string> = { r: '#C1E6FF', w: '#C4ECD0', p: '#E7DEF8', f: '#FFE6A4', o: '#FAE7E5' };
export const TINT_KEYS = Object.keys(TINT);
export const tintColors = (tint: string | undefined) => catColors(TINT[tint ?? ''] ?? TINT.r!);
export const tintHex = (tint: string) => TINT[tint] ?? TINT.r!;

// ---------- markdown (sanitised) ----------
marked.setOptions({ gfm: true, breaks: true });
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
});
export function renderMarkdown(md: string): string {
  return DOMPurify.sanitize(marked.parse(md, { async: false }) as string, { FORBID_TAGS: ['style', 'iframe', 'form', 'input'] });
}

/** YouTube video id from common URL shapes, or null. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    if (/(^|\.)youtube\.com$/.test(u.hostname)) {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
      return m ? m[2]! : null;
    }
  } catch { /* not a URL */ }
  return null;
}

export const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim());
