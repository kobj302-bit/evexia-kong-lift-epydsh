import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  PROFILE: 'evexia_profile',
  XP: 'evexia_xp',
  STREAK: 'evexia_streak',
  BEST_STREAK: 'evexia_best_streak',
  TOTAL_WORKOUTS: 'evexia_total_workouts',
  LAST_WORKOUT_DATE: 'evexia_last_workout_date',
  ACTIVE_PROGRAM: 'evexia_active_program',
  WORKOUT_HISTORY: 'evexia_workout_history',
  PRS: 'evexia_prs',
  GOALS: 'evexia_goals',
  SAVED_DIET: 'evexia_saved_diet',
  JOINED_CHALLENGES: 'evexia_joined_challenges',
  TEAM: 'evexia_team',
  SURVEY_STEP: 'evexia_survey_step',
  ATHLETE_TRIAL_USES: 'athlete_trial_uses',
} as const;

export interface UserProfile {
  username: string;
  avatar: string;
  age: string;
  weight: string;
  height: string;
  sex: string;
  goal: string;
  injuries: string[];
  equipment: string;
  trainingDays: string;
  experience: string;
  expertMode: boolean;
  surveyComplete: boolean;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest?: string;
  notes?: string;
  weight?: number;
}

export interface WorkoutDay {
  day: string;
  exercises: Exercise[];
}

export interface ActiveProgram {
  name: string;
  days: WorkoutDay[];
  currentDay: number;
}

export interface WorkoutHistory {
  date: string;
  exercises: Array<{ name: string; sets: Array<{ weight: number; reps: number }> }>;
  xpEarned: number;
}

export interface PR {
  weight: number;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  createdAt: string;
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // silently fail
  }
}

export async function clearAll(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch {
    // silently fail
  }
}

export async function getXP(): Promise<number> {
  return (await getItem<number>(STORAGE_KEYS.XP)) ?? 0;
}

export async function addXP(amount: number): Promise<number> {
  const current = await getXP();
  const newXP = current + amount;
  await setItem(STORAGE_KEYS.XP, newXP);
  return newXP;
}

export async function getStreak(): Promise<number> {
  return (await getItem<number>(STORAGE_KEYS.STREAK)) ?? 0;
}

export async function getTotalWorkouts(): Promise<number> {
  return (await getItem<number>(STORAGE_KEYS.TOTAL_WORKOUTS)) ?? 0;
}

export async function getTrialUses(): Promise<number> {
  return (await getItem<number>(STORAGE_KEYS.ATHLETE_TRIAL_USES)) ?? 0;
}

export async function incrementTrialUses(): Promise<number> {
  const current = await getTrialUses();
  const newVal = current + 1;
  await setItem(STORAGE_KEYS.ATHLETE_TRIAL_USES, newVal);
  return newVal;
}

export async function decrementTrialUses(): Promise<number> {
  const current = await getTrialUses();
  const newVal = Math.max(0, current - 1);
  await setItem(STORAGE_KEYS.ATHLETE_TRIAL_USES, newVal);
  return newVal;
}
