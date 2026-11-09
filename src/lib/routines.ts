// Routine types (mirror wlb-api) and helpers.
import type { Status, Visibility } from './courses';

export type ItemKind = 'exercise' | 'meal';
export type PlanKind = 'workout' | 'meal';
export const MUSCLES = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full_body', 'cardio', 'mobility'] as const;
export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const WORKOUT_SECTIONS = ['warmup', 'main', 'cooldown'] as const;
export const sectionsFor = (k: PlanKind): readonly string[] => (k === 'workout' ? WORKOUT_SECTIONS : MEAL_TYPES);
export const itemKindFor = (k: PlanKind): ItemKind => (k === 'workout' ? 'exercise' : 'meal');

export interface ExerciseData { muscles: string[]; equipment: string; sets: number | null; reps: string | null; seconds: number | null }
export interface MealData { mealTypes: string[]; ingredients: string[]; servingNote: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null }

export interface RoutineItem {
  id: number; kind: ItemKind; title: string; description: string; bodyMd?: string; data: ExerciseData & MealData;
  images: { url: string; alt: string }[]; links: { title: string; url: string }[];
  visibility: Visibility; status: Status; createdBy: number | null; creatorName?: string | null; usedIn?: number; mine: boolean; canEdit: boolean;
}
export interface Totals { calories: number; protein: number; carbs: number; fat: number; split: { protein: number; carbs: number; fat: number }; bySection: Record<string, number>; itemsWithoutCalories: number }
export interface Day { weekday: number; hour: number | null }
export interface RoutinePlan {
  id: number; kind: PlanKind; title: string; description: string; visibility: Visibility; status: Status; createdBy: number | null;
  creatorName?: string | null; entryCount: number; totals?: Totals; minutes?: number; muscles?: string[]; mine: boolean; canEdit: boolean; myDays?: Day[];
}
export interface PlanEntry {
  id: number; sort: number; section: string; itemId: number; sets: number | null; reps: string | null; seconds: number | null;
  restSeconds: number | null; servings: number | null; note: string;
  item: { id: number; kind: ItemKind; title: string; description: string; data: ExerciseData & MealData; image: { url: string; alt: string } | null; viewable: boolean };
}
export interface PlanDetail { plan: RoutinePlan; entries: PlanEntry[]; myDays: Day[] }
export interface RoutineList { items: RoutineItem[]; plans: RoutinePlan[] }
export interface WeekLink { weekday: number; hour: number | null; plan: { id: number; kind: PlanKind; title: string; entryCount: number; minutes?: number; calories?: number }; current?: boolean }

export const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
export const fmtNum = (n: number | null | undefined) => (n === null || n === undefined ? '–' : Number.isInteger(n) ? String(n) : n.toFixed(1));
