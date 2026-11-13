// Project types (mirror wlb-api) and small date helpers.
export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskSize = 'S' | 'M' | 'L';
export type Load = 'over' | 'ok' | 'under';
export type EventKind = 'review' | 'retro' | 'cut' | 'release' | 'meeting' | 'other';
export type RetroCol = 'good' | 'bad' | 'vent';
export type RetroPhase = 'write' | 'reveal' | 'closed';

export const STATUSES: TaskStatus[] = ['todo', 'doing', 'done'];
export const SIZES: TaskSize[] = ['S', 'M', 'L'];
export const LOADS: Load[] = ['over', 'ok', 'under'];
export const EVENT_KINDS: EventKind[] = ['review', 'retro', 'cut', 'release', 'meeting', 'other'];
export const RETRO_COLS: RetroCol[] = ['good', 'bad', 'vent'];
export const SIZE_POINTS: Record<TaskSize, number> = { S: 1, M: 2, L: 4 };

export interface Link { title: string; url: string }
export interface WorkDays { weekly: number[]; alternate: [number, number] | null }
export interface Project {
  id: number; name: string; description: string; repoUrl: string; refs: Link[]; sprintAnchor: string; versionWeeks: number;
  reviewHour: number; retroHour: number; archived: boolean; createdBy: number | null; createdAt: string;
}
export interface Member { userId: number; role: 'owner' | 'member'; days: WorkDays; displayName?: string; avatarColor?: string | null }
export interface SprintInfo { no: number; start: string; end: string; started: boolean; versionSlot: number; versionCutDate: string; sprintInVersion: number }
export interface Task {
  id: number; projectId: number; title: string; description: string; assigneeId: number | null; size: TaskSize | null; status: TaskStatus;
  sprintNo: number | null; versionId: number | null; sort: number; createdBy: number | null; createdAt: string; doneAt: string | null;
}
export interface Version {
  id: number; projectId: number; name: string; goal: string; checklist: { text: string; done: boolean }[]; cutDate: string | null; releaseDate: string | null;
  buildUrl: string; playable: boolean | null; notes: string; closed: boolean;
}
export interface CalendarEntry { kind: EventKind | 'sprint'; title: string; date: string; hour: number | null; note: string; eventId?: number; versionId?: number; auto?: boolean }
export interface ProjectSummary { sprint: SprintInfo; tasks: { total: number; done: number; doing: number; backlog: number }; workingToday: number[] }
export interface ProjectListItem extends Project, ProjectSummary { members: Member[]; mine: boolean }
export interface ProjectDetail extends ProjectSummary {
  project: Project; members: Member[]; canManage: boolean; today: string; versions: Version[]; upcoming: CalendarEntry[]; myDailyDone: boolean;
}
export interface Daily {
  id: number; userId: number; date: string; prevText: string; prevDone: boolean | null; nextText: string; blocker: string; createdAt: string;
  replies: { id: number; userId: number; text: string; createdAt: string }[];
}
export interface Dailies { from: string; to: string; today: string; dailies: Daily[]; myLastPlan: { date: string; text: string } | null; workdays: Record<string, number[]> }
export interface SprintDetail {
  sprint: { no: number; start: string; end: string; version: { slot: number; firstSprint: number; lastSprint: number; cutDate: string } };
  next: { no: number; start: string; end: string };
  totals: { planned: number; done: number; carry: number; plannedPoints: number; donePoints: number };
  people: { userId: number; displayName?: string; planned: number; done: number; plannedPoints: number; donePoints: number; workdays: number; nextWorkdays: string[]; nextPlannedPoints: number }[];
  reviews: { userId: number; load: Load; note: string }[];
  tasks: Task[];
}
export interface Retro { id: number; title: string; date: string; phase: RetroPhase }
export interface RetroCard { id: number; col: RetroCol; text: string; anonymous: boolean; mine: boolean; userId: number | null; votes: number; voted: boolean; actionTaskId: number | null }
export interface RetroDetail { retro: Retro; cards: RetroCard[]; counts: Record<RetroCol, number>; writers: number; canManage: boolean }

const DAY = 86_400_000;
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const weekdayOf = (d: string) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
export const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
export const pts = (t: Pick<Task, 'size'>) => (t.size ? SIZE_POINTS[t.size] : 1);
