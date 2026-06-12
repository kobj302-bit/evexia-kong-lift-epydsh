import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated } from 'react-native';
import { RANKS } from '@/constants/data';
import { scheduleMissNotifications } from '@/utils/notifications';

const STORAGE_KEY = 'evexia_state_v1';

export interface SessionSet {
  exercise: string;
  sets: { reps: string; weight: string }[];
}

export interface WorkoutHistory {
  id: string;
  date: string;
  exercises: SessionSet[];
  xpEarned: number;
  duration?: number;
}

export interface PR {
  lift: string;
  weight: number;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  achieved: boolean;
}

export interface Team {
  id: string;
  name: string;
  emoji: string;
  color: string;
  members: number;
}

export interface Battle {
  id: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
}

export interface ToastState {
  visible: boolean;
  message: string;
  isGold: boolean;
}

export interface AppState {
  view: 'splash' | 'survey' | 'miss' | 'app';
  profile: {
    username: string;
    avatar: string;
    age: number;
    weight: number;
    sex: string;
    bf: number;
    exp: string;
    yrs: number;
    goal: string;
    equip: string;
    days: number;
    limNotes: string;
    injuries: string[];
  };
  expertMode: boolean;
  xp: number;
  streak: number;
  bestStreak: number;
  lastWorkout: string | null;
  totalWorkouts: number;
  activeProg: any | null;
  selDay: number;
  session: SessionSet[];
  donedays: Record<string, boolean>;
  history: WorkoutHistory[];
  prs: PR[];
  goals: Goal[];
  athleteResult: any | null;
  savedRoutines: any[];
  dietResult: any | null;
  savedDiet: any | null;
  nResult: any | null;
  grocery: string[];
  openSplit: string | null;
  expandWod: string | null;
  wodFilter: 'all' | 'famous' | 'holiday';
  myTeam: string | null;
  teams: Team[];
  joinedChallenges: string[];
  battles: Battle[];
  disclaimerAck: boolean;
  kongIdx: number;
  proTheme: boolean;
  streakShields: number;
  lastShieldRefill: string | null;
  glowUpAckDisclaimer: boolean;
  glowUpHabits: Record<string, boolean>;
  glowUpGrocery: Record<string, boolean>;
  glowUpGroceryWeek: string | null;
  glowUpStreakShield: boolean;
}

const DEFAULT_STATE: AppState = {
  view: 'splash',
  profile: {
    username: '',
    avatar: '🦍',
    age: 25,
    weight: 180,
    sex: 'Male',
    bf: 15,
    exp: 'Beginner',
    yrs: 0,
    goal: 'Build Muscle',
    equip: 'Full Gym',
    days: 4,
    limNotes: '',
    injuries: [],
  },
  expertMode: false,
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastWorkout: null,
  totalWorkouts: 0,
  activeProg: null,
  selDay: 0,
  session: [],
  donedays: {},
  history: [],
  prs: [],
  goals: [],
  athleteResult: null,
  savedRoutines: [],
  dietResult: null,
  savedDiet: null,
  nResult: null,
  grocery: [],
  openSplit: null,
  expandWod: null,
  wodFilter: 'all',
  myTeam: null,
  teams: [],
  joinedChallenges: [],
  battles: [
    { id: 'b1', team1: 'Iron Brotherhood', team2: 'Apex Predators', score1: 4200, score2: 3800 },
    { id: 'b2', team1: 'Silent Grind', team2: 'Cardio Club', score1: 2100, score2: 2900 },
    { id: 'b3', team1: 'Iron Brotherhood', team2: 'Silent Grind', score1: 5100, score2: 1800 },
  ],
  disclaimerAck: false,
  kongIdx: 0,
  proTheme: false,
  streakShields: 1,
  lastShieldRefill: null,
  glowUpAckDisclaimer: false,
  glowUpHabits: {},
  glowUpGrocery: {},
  glowUpGroceryWeek: null,
  glowUpStreakShield: false,
};

interface AppContextType {
  state: AppState;
  updateState: (partial: Partial<AppState>) => void;
  addXP: (amount: number) => void;
  showToast: (message: string, isGold?: boolean) => void;
  triggerPR: (liftName: string) => void;
  toast: ToastState;
  prFlash: Animated.Value;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', isGold: false });
  const prFlash = useRef(new Animated.Value(0)).current;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<AppState>;
          setState((prev) => ({ ...prev, ...saved }));
        } catch {
          // ignore parse errors
        }
      }
      setLoaded(true);
    });
  }, []);

  const updateState = useCallback((partial: Partial<AppState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, 500);
      return next;
    });
  }, []);

  const addXP = useCallback((amount: number) => {
    setState((prev) => {
      const newXP = prev.xp + amount;
      const prevRank = RANKS.filter((r) => r.minXP <= prev.xp).pop();
      const newRank = RANKS.filter((r) => r.minXP <= newXP).pop();
      const next = { ...prev, xp: newXP };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }, 500);
      if (prevRank && newRank && prevRank.name !== newRank.name) {
        setTimeout(() => {
          setToast({ visible: true, message: `🎉 RANK UP! You are now ${newRank.emoji} ${newRank.name}!`, isGold: true });
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
        }, 300);
      }
      return next;
    });
  }, []);

  const showToast = useCallback((message: string, isGold = false) => {
    console.log('[Toast]', message);
    setToast({ visible: true, message, isGold });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const triggerPR = useCallback((liftName: string) => {
    console.log('[PR]', liftName);
    Animated.sequence([
      Animated.timing(prFlash, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(prFlash, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(prFlash, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(prFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    setToast({ visible: true, message: `🏆 NEW PR! ${liftName}`, isGold: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  }, [prFlash]);

  useEffect(() => {
    if (!loaded) return;
    console.log('[AppContext] lastWorkout changed, rescheduling notifications:', state.lastWorkout);
    scheduleMissNotifications(state.lastWorkout);
  }, [state.lastWorkout, loaded]);

  if (!loaded) return null;

  return (
    <AppContext.Provider value={{ state, updateState, addXP, showToast, triggerPR, toast, prFlash }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function getRank(xp: number) {
  return RANKS.filter((r) => r.minXP <= xp).pop() || RANKS[0];
}

export function getNextRank(xp: number) {
  return RANKS.find((r) => r.minXP > xp) || null;
}
