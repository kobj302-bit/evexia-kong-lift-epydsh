import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  Animated, LayoutAnimation, Platform, Modal, TouchableOpacity, KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp, SessionSet, WorkoutHistory, PR } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { COLORS } from '@/constants/data';
import { getCoachingMessage } from '@/utils/coaching';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Epley 1RM formula
function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Find last workout entry for a given exercise name (case-insensitive), from a previous day
function findLastWorkoutEntry(
  history: WorkoutHistory[],
  exerciseName: string,
  todayStr: string
): { entry: WorkoutHistory; exData: SessionSet } | null {
  const lower = exerciseName.toLowerCase();
  for (const h of history) {
    const hDay = h.date.split('T')[0];
    if (hDay === todayStr) continue;
    const found = h.exercises.find((e) => e.exercise.toLowerCase() === lower);
    if (found) return { entry: h, exData: found };
  }
  return null;
}

// Format date as "Mon, Nov 18"
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Get heaviest set from a SessionSet
function getHeaviestSet(sets: { reps: string; weight: string }[]): { reps: string; weight: string } | null {
  let best: { reps: string; weight: string } | null = null;
  let bestW = 0;
  for (const s of sets) {
    const w = parseFloat(s.weight) || 0;
    if (w > bestW) { bestW = w; best = s; }
  }
  return best;
}

// Plate calculator
function calcPlates(targetWeight: number, barWeight: number): string {
  const PLATES = [45, 35, 25, 10, 5, 2.5];
  let remaining = (targetWeight - barWeight) / 2;
  if (remaining <= 0) return 'Just the bar';
  const result: string[] = [];
  for (const p of PLATES) {
    const count = Math.floor(remaining / p);
    if (count > 0) {
      result.push(`${count}× ${p}`);
      remaining -= count * p;
    }
  }
  if (remaining > 0.1) result.push(`(+${remaining.toFixed(1)} remaining)`);
  return result.length > 0 ? result.join(', ') : 'Just the bar';
}

// Volume trend bar chart (last 4 weeks)
function getWeeklyVolume(history: WorkoutHistory[], exerciseName: string): number[] {
  const lower = exerciseName.toLowerCase();
  const now = new Date();
  const weeks: number[] = [0, 0, 0, 0];
  for (const h of history) {
    const d = new Date(h.date);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const weekIdx = Math.floor(diffDays / 7);
    if (weekIdx >= 0 && weekIdx < 4) {
      const ex = h.exercises.find((e) => e.exercise.toLowerCase() === lower);
      if (ex) {
        const vol = ex.sets.reduce((sum, s) => sum + (parseFloat(s.reps) || 0) * (parseFloat(s.weight) || 0), 0);
        weeks[weekIdx] += vol;
      }
    }
  }
  return weeks.reverse(); // oldest first
}

// Recommend working weight based on 1RM (percentage-based)
function recommendWeight(oneRM: number, reps: number): number {
  const pct = reps <= 1 ? 1.0 : reps <= 2 ? 0.95 : reps <= 3 ? 0.90 : reps <= 5 ? 0.85 : reps <= 6 ? 0.80 : reps <= 8 ? 0.75 : reps <= 10 ? 0.70 : reps <= 12 ? 0.67 : 0.65;
  return Math.round((oneRM * pct) / 2.5) * 2.5;
}

function getRepPct(reps: number): number {
  return reps <= 1 ? 1.0 : reps <= 2 ? 0.95 : reps <= 3 ? 0.90 : reps <= 5 ? 0.85 : reps <= 6 ? 0.80 : reps <= 8 ? 0.75 : reps <= 10 ? 0.70 : reps <= 12 ? 0.67 : 0.65;
}

// Get best estimated 1RM for an exercise from history
function getBest1RM(history: WorkoutHistory[], prs: PR[], exerciseName: string): number | null {
  const lower = exerciseName.toLowerCase();
  const pr = prs.find(p => p.lift.toLowerCase() === lower);
  let best = pr ? epley1RM(pr.weight, 1) : 0;
  for (const h of history) {
    const ex = h.exercises.find(e => e.exercise.toLowerCase() === lower);
    if (ex) {
      for (const s of ex.sets) {
        const w = parseFloat(s.weight) || 0;
        const r = parseFloat(s.reps) || 0;
        if (w > 0 && r > 0) {
          const est = epley1RM(w, r);
          if (est > best) best = est;
        }
      }
    }
  }
  return best > 0 ? best : null;
}

// Get strength tier for a lift relative to bodyweight
function getStrengthTier(oneRM: number, bodyweight: number, liftName: string): { label: string; color: string } {
  const bw = bodyweight > 0 ? bodyweight : 180;
  const lower = liftName.toLowerCase();
  const isUpperPush = lower.includes('bench') || lower.includes('press') || lower.includes('overhead');
  const threshold = isUpperPush ? 0.75 : 1.0;
  const ratio = oneRM / bw;
  if (ratio < threshold) return { label: 'Beginner', color: '#808080' };
  if (ratio < threshold * 1.5) return { label: 'Intermediate', color: '#4A90D9' };
  if (ratio < threshold * 2.0) return { label: 'Advanced', color: '#D4A017' };
  return { label: 'Elite', color: '#E84040' };
}

// Get next milestone weight (nearest 5 lb increment above current PR)
function getNextMilestone(prWeight: number): number {
  const milestones = [45, 95, 135, 185, 225, 275, 315, 365, 405, 455, 495, 545];
  return milestones.find(m => m > prWeight) || Math.ceil((prWeight + 20) / 5) * 5;
}

// Kong Rank system based on average strength tier
const KONG_RANKS = [
  { name: 'Iron Kong',     color: '#808080', minScore: 0   },
  { name: 'Bronze Kong',   color: '#CD7F32', minScore: 1   },
  { name: 'Silver Kong',   color: '#C0C0C0', minScore: 2   },
  { name: 'Gold Kong',     color: '#D4A017', minScore: 3   },
  { name: 'Platinum Kong', color: '#E5E4E2', minScore: 4   },
  { name: 'Diamond Kong',  color: '#4A90D9', minScore: 5   },
  { name: 'Kong Elite',    color: '#E84040', minScore: 6   },
];

function getTierScore(tier: string): number {
  switch (tier) {
    case 'Beginner':     return 0;
    case 'Intermediate': return 1;
    case 'Advanced':     return 2;
    case 'Elite':        return 3;
    default:             return 0;
  }
}

function getKongRank(prs: PR[], bodyweight: number): { rank: typeof KONG_RANKS[0]; score: number; nextRank: typeof KONG_RANKS[0] | null; progress: number } {
  if (prs.length === 0) return { rank: KONG_RANKS[0], score: 0, nextRank: KONG_RANKS[1], progress: 0 };
  const scores = prs.map((pr) => {
    const tier = getStrengthTier(epley1RM(pr.weight, 1), bodyweight, pr.lift);
    return getTierScore(tier.label);
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const rankIdx = Math.min(Math.floor(avg * 2), KONG_RANKS.length - 1);
  const rank = KONG_RANKS[rankIdx];
  const nextRank = rankIdx < KONG_RANKS.length - 1 ? KONG_RANKS[rankIdx + 1] : null;
  const progress = avg * 2 - Math.floor(avg * 2);
  return { rank, score: avg, nextRank, progress };
}

function getStreakMotivation(streak: number): string {
  if (streak >= 100) return 'LEGENDARY. You are unstoppable. 🏆';
  if (streak >= 60)  return 'Two months of fire. Kong bows to you. 👑';
  if (streak >= 30)  return 'A full month of consistency. Elite tier. 🔥';
  if (streak >= 14)  return 'Two weeks strong. The habit is forming. 💪';
  if (streak >= 7)   return 'One week down. You\'re building something real. ⚡';
  if (streak >= 3)   return 'Three days in a row. Momentum is building. 🔥';
  if (streak >= 2)   return 'Back to back. Keep the chain alive. 💪';
  return 'First step taken. The journey begins. 🦍';
}

// Check if it's a new week (Monday) since lastShieldRefill
function isNewWeekSinceRefill(lastRefill: string | null): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
  if (dayOfWeek !== 1) return false; // Only refill on Monday
  if (!lastRefill) return true;
  const lastDate = new Date(lastRefill);
  const lastMonday = lastDate.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];
  return lastMonday !== todayStr;
}

export default function TrackerTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState, addXP, showToast, triggerPR } = useApp();
  const { isSubscribed } = useSubscription();
  const [newExercise, setNewExercise] = useState('');
  const prFlashAnim = useRef(new Animated.Value(0)).current;

  // Plate calculator state
  const [plateModalVisible, setPlateModalVisible] = useState(false);
  const [plateTarget, setPlateTarget] = useState('135');
  const [plateBar, setPlateBar] = useState('45');

  // Pro celebration modal state
  const [showProCelebration, setShowProCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');
  const [celebrationXP, setCelebrationXP] = useState(0);

  // Max testing protocol modal state
  const [showMaxModal, setShowMaxModal] = useState(false);
  const [maxInputs, setMaxInputs] = useState<Record<string, string>>({});
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Streak fire celebration modal state
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [pendingWorkoutData, setPendingWorkoutData] = useState<any>(null);
  const [streakModalStreak, setStreakModalStreak] = useState(0);
  const [streakModalXP, setStreakModalXP] = useState(0);
  const [streakModalIsNewPR, setStreakModalIsNewPR] = useState(false);
  const fireScaleAnim = useRef(new Animated.Value(0)).current;
  const [xpCountDisplay, setXpCountDisplay] = useState(0);

  // Goal progress ring modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [goalEditValue, setGoalEditValue] = useState('');

  const MAX_LIFTS = [
    'Bench Press', 'Overhead Press', 'Squat', 'Deadlift',
    'Barbell Row', 'Weighted Pull-Up', 'Romanian Deadlift',
    'Incline DB Press', 'Barbell Curl', 'Close-Grip Bench',
    'Leg Press', 'Power Clean',
  ];

  const MAX_PROTOCOL_DAYS = [
    {
      day: 1,
      title: 'Day 1 — Upper Push Maxes',
      exercises: ['Bench Press: Warm up to a heavy 3-rep max. Rest 3 min between sets.', 'Overhead Press: Same protocol — heavy 3RM.', 'Incline Dumbbell Press: Find your heaviest set of 8.'],
      instructions: 'Work up in 10-20 lb jumps. Stop when form breaks. Log your best set below.',
    },
    {
      day: 2,
      title: 'Day 2 — Lower Body Maxes',
      exercises: ['Squat: Heavy 3RM (use spotter or safety bars)', 'Romanian Deadlift: Heavy 5RM', 'Leg Press: Heavy 8RM'],
      instructions: 'Prioritize depth and form. Never sacrifice technique for weight.',
    },
    {
      day: 3,
      title: 'Day 3 — Pull Maxes',
      exercises: ['Deadlift: Heavy 3RM (conventional or sumo)', 'Barbell Row: Heavy 5RM', 'Weighted Pull-Up: Max reps with bodyweight, or add weight for 3-5 reps'],
      instructions: 'Keep your back neutral on all pulls. Film yourself if possible.',
    },
    {
      day: 4,
      title: 'Day 4 — Arms & Shoulders',
      exercises: ['Barbell Curl: Heavy 6RM', 'Close-Grip Bench: Heavy 6RM', 'Lateral Raise: Find your 12RM'],
      instructions: 'Control the eccentric. No swinging.',
    },
    {
      day: 5,
      title: 'Day 5 — Full Body Benchmark',
      exercises: ["Power Clean or Hang Clean: Heavy 3RM (if available)", "Farmer's Carry: Max distance with heaviest dumbbells", 'Plank: Max hold time'],
      instructions: 'This day tests athleticism and grip. Rest well before this session.',
    },
  ];

  const session = state.session;
  const todayStr = new Date().toISOString().split('T')[0];

  // Shield auto-refill on Monday
  useEffect(() => {
    if (!isSubscribed) return;
    if (isNewWeekSinceRefill(state.lastShieldRefill)) {
      console.log('[Tracker] Shield refill triggered — new Monday');
      updateState({ streakShields: 1, lastShieldRefill: new Date().toISOString() });
    }
  }, [isSubscribed, state.lastShieldRefill, updateState]);

  const addExercise = () => {
    if (!newExercise.trim()) return;
    console.log('[Tracker] Add exercise:', newExercise);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSession: SessionSet[] = [
      ...session,
      { exercise: newExercise.trim(), sets: [{ reps: '', weight: '' }] },
    ];
    updateState({ session: newSession });
    setNewExercise('');
  };

  const addSet = (exIdx: number) => {
    console.log('[Tracker] Add set to exercise index:', exIdx);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newSession = session.map((ex, i) =>
      i === exIdx ? { ...ex, sets: [...ex.sets, { reps: '', weight: '' }] } : ex
    );
    updateState({ session: newSession });
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: string) => {
    const newSession = session.map((ex, i) =>
      i === exIdx
        ? {
            ...ex,
            sets: ex.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s)),
          }
        : ex
    );
    updateState({ session: newSession });
  };

  const removeExercise = (exIdx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateState({ session: session.filter((_, i) => i !== exIdx) });
  };

  const finishWorkout = () => {
    if (session.length === 0) {
      showToast('Add at least one exercise first!');
      return;
    }
    console.log('[Tracker] Finish workout — exercises:', session.length, 'isSubscribed:', isSubscribed);

    // 2x XP for Pro members
    const baseXP = 50 + session.length * 10;
    const xpEarned = isSubscribed ? baseXP * 2 : baseXP;
    console.log('[Tracker] XP earned:', xpEarned, isSubscribed ? '(2x Pro bonus)' : '');

    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];

    let newStreak = state.streak;
    let newBestStreak = state.bestStreak;
    let shieldUsed = false;

    if (state.lastWorkout) {
      const last = new Date(state.lastWorkout);
      const lastStr = last.toISOString().split('T')[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastStr === yesterdayStr || lastStr === todayIso) {
        newStreak = lastStr === todayIso ? state.streak : state.streak + 1;
      } else {
        if (isSubscribed && state.streakShields > 0 && lastStr !== todayIso) {
          console.log('[Tracker] Streak shield activated! Protecting streak:', state.streak);
          newStreak = state.streak + 1;
          shieldUsed = true;
        } else {
          newStreak = 1;
        }
      }
    } else {
      newStreak = 1;
    }
    newBestStreak = Math.max(newBestStreak, newStreak);

    const newPRs: PR[] = [...state.prs];
    const prNames: string[] = [];
    session.forEach((ex) => {
      const maxWeight = Math.max(...ex.sets.map((s) => parseFloat(s.weight) || 0));
      if (maxWeight > 0) {
        const existing = newPRs.find((p) => p.lift.toLowerCase() === ex.exercise.toLowerCase());
        if (!existing) {
          console.log('[Tracker] New PR (first time):', ex.exercise, maxWeight);
          newPRs.push({ lift: ex.exercise, weight: maxWeight, date: now.toISOString() });
          prNames.push(ex.exercise);
        } else if (maxWeight > existing.weight) {
          console.log('[Tracker] PR broken:', ex.exercise, existing.weight, '->', maxWeight);
          existing.weight = maxWeight;
          existing.date = now.toISOString();
          prNames.push(ex.exercise);
        }
      }
    });

    const historyEntry: WorkoutHistory = {
      id: now.getTime().toString(),
      date: now.toISOString(),
      exercises: session,
      xpEarned,
    };

    const stateUpdate: any = {
      session: [],
      lastWorkout: now.toISOString(),
      totalWorkouts: state.totalWorkouts + 1,
      streak: newStreak,
      bestStreak: newBestStreak,
      history: [historyEntry, ...state.history].slice(0, 50),
      prs: newPRs,
    };

    if (shieldUsed) {
      stateUpdate.streakShields = state.streakShields - 1;
    }

    // Store pending data and show streak celebration modal
    setPendingWorkoutData({ stateUpdate, xpEarned, shieldUsed, prNames });
    setStreakModalStreak(newStreak);
    setStreakModalXP(xpEarned);
    setStreakModalIsNewPR(prNames.length > 0);
    setXpCountDisplay(0);
    fireScaleAnim.setValue(0);

    console.log('[Tracker] Showing streak celebration modal — streak:', newStreak, 'xp:', xpEarned);
    setShowStreakModal(true);

    // Animate fire emoji entrance
    Animated.spring(fireScaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();

    // Count-up XP display using setInterval for reliable JS-driven animation
    const step = Math.max(1, Math.ceil(xpEarned / 30));
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, xpEarned);
      setXpCountDisplay(current);
      if (current >= xpEarned) clearInterval(interval);
    }, 50);
  };

  const claimXP = () => {
    if (!pendingWorkoutData) return;
    const { stateUpdate, xpEarned, shieldUsed, prNames } = pendingWorkoutData;
    console.log('[Tracker] Claim XP pressed — saving workout data');

    setShowStreakModal(false);
    setPendingWorkoutData(null);

    updateState(stateUpdate);
    addXP(xpEarned);

    if (shieldUsed) {
      showToast('🛡️ Streak Shield activated! Streak protected.', true);
    }

    if (isSubscribed) {
      const msg = getCoachingMessage(state.history, session, streakModalStreak, state.totalWorkouts);
      console.log('[Tracker] Pro celebration — coaching message:', msg);
      setCelebrationMsg(msg);
      setCelebrationXP(xpEarned);
      setShowProCelebration(true);
    } else {
      if (prNames.length > 0) {
        prNames.forEach((name: string) => triggerPR(name));
      } else {
        showToast(`💪 Workout done! +${xpEarned} XP`, true);
      }
    }
  };

  const toggleDoneDay = (dayIdx: number) => {
    const progName = state.activeProg?.name || 'default';
    const key = `${progName}-${dayIdx}`;
    console.log('[Tracker] Toggle day:', key);
    updateState({ donedays: { ...state.donedays, [key]: !state.donedays[key] } });
  };

  const handleExportCSV = async () => {
    console.log('[Tracker] Export workout history pressed');
    if (!isSubscribed) {
      console.log('[Tracker] Export blocked — not subscribed');
      router.push('/paywall');
      return;
    }
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      const rows = ['date,exercise,set,reps,weight'];
      for (const h of state.history) {
        const dateStr = h.date.split('T')[0];
        for (const ex of h.exercises) {
          ex.sets.forEach((s, idx) => {
            rows.push(`${dateStr},${ex.exercise},${idx + 1},${s.reps},${s.weight}`);
          });
        }
      }
      const csv = rows.join('\n');
      const fileUri = (FileSystem.documentDirectory || '') + 'kong_workout_history.csv';
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Workout History' });
        console.log('[Tracker] CSV shared successfully');
      } else {
        showToast('Sharing not available on this device.');
      }
    } catch (e) {
      console.error('[Tracker] Export error:', e);
      showToast('Export failed. Try again.');
    }
  };

  const recentHistory = state.history.slice(0, 5);

  // Plate calculator result
  const plateTarget_n = parseFloat(plateTarget) || 0;
  const plateBar_n = parseFloat(plateBar) || 45;
  const plateResult = plateTarget_n > 0 ? calcPlates(plateTarget_n, plateBar_n) : '';

  // Shield display
  const shieldCount = state.streakShields ?? 0;
  const shieldText = shieldCount > 0
    ? `You have ${shieldCount} streak shield active. If you miss a day, your streak is protected.`
    : 'Shield used. Refills next Monday.';

  // XP badge text for session header
  const xpBadgeText = '⚡ 2× XP';

  // Celebration XP display
  const celebrationXPText = `+${celebrationXP} XP ⚡`;

  // Fake analytics preview rows for non-subscribers
  const fakeAnalyticsRows = [
    { name: 'Bench Press', pr: '185', est: '196' },
    { name: 'Squat', pr: '225', est: '239' },
    { name: 'Deadlift', pr: '275', est: '293' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Kong Approves streak badge */}
      {state.streak > 0 && (
        <View style={styles.kongApproveBadge}>
          <KongMascot size={28} />
          <Text style={styles.kongApproveText}>Kong approves! 🔥 {state.streak}-day streak</Text>
        </View>
      )}

      {/* Active Program */}
      {state.activeProg && (
        <View style={styles.progCard}>
          <Text style={styles.progName}>📋 {state.activeProg.name}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
            {(state.activeProg.days || []).map((day: any, idx: number) => {
              const key = `${state.activeProg.name}-${idx}`;
              const isDone = state.donedays[key];
              const isSelected = state.selDay === idx;
              return (
                <AnimatedPressable
                  key={idx}
                  onPress={() => {
                    console.log('[Tracker] Select day:', idx);
                    updateState({ selDay: idx });
                  }}
                  style={[styles.dayPill, isSelected && styles.dayPillSelected, isDone && styles.dayPillDone]}
                >
                  <Text style={[styles.dayPillText, isSelected && styles.dayPillTextSelected]}>
                    {day.name?.split('—')[0]?.trim() || `Day ${idx + 1}`}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>

          {state.activeProg.days?.[state.selDay] && (
            <View style={styles.dayExercises}>
              <Text style={styles.dayTitle}>{state.activeProg.days[state.selDay].name}</Text>
              {(state.activeProg.days[state.selDay].exercises || []).map((ex: string, i: number) => (
                <Text key={i} style={styles.dayExercise}>• {ex}</Text>
              ))}
              <AnimatedPressable
                onPress={() => toggleDoneDay(state.selDay)}
                style={[styles.doneBtn, state.donedays[`${state.activeProg.name}-${state.selDay}`] && styles.doneBtnActive]}
              >
                <Text style={styles.doneBtnText}>
                  {state.donedays[`${state.activeProg.name}-${state.selDay}`] ? '✅ Done!' : 'Mark Done'}
                </Text>
              </AnimatedPressable>
            </View>
          )}
        </View>
      )}

      {/* Weekly Checkboxes */}
      <View style={styles.weekCard}>
        <Text style={styles.sectionTitle}>📅 This Week</Text>
        <View style={styles.weekRow}>
          {DAYS.map((day) => {
            const key = `week-${day}`;
            const isDone = state.donedays[key];
            return (
              <AnimatedPressable key={day} onPress={() => {
                console.log('[Tracker] Toggle week day:', day);
                updateState({ donedays: { ...state.donedays, [key]: !isDone } });
              }} style={styles.weekDay}>
                <View style={[styles.weekCheck, isDone && styles.weekCheckDone]}>
                  {isDone && <Text style={styles.weekCheckMark}>✓</Text>}
                </View>
                <Text style={styles.weekDayLabel}>{day}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {/* Streak Shield — Pro only */}
      {isSubscribed && (
        <View style={[styles.shieldCard, shieldCount > 0 ? styles.shieldCardActive : styles.shieldCardEmpty]}>
          <View style={styles.shieldHeader}>
            <Text style={styles.shieldTitle}>🛡️ Streak Shield</Text>
            {shieldCount > 0 && (
              <View style={styles.shieldCountBadge}>
                <Text style={styles.shieldCountText}>{shieldCount} Active</Text>
              </View>
            )}
          </View>
          <Text style={[styles.shieldDesc, shieldCount === 0 && styles.shieldDescEmpty]}>
            {shieldText}
          </Text>
          {shieldCount > 0 && (
            <View style={styles.shieldAutoNote}>
              <Text style={styles.shieldAutoNoteText}>Auto-activates if you miss a day</Text>
            </View>
          )}
        </View>
      )}

      {/* Session Logger */}
      <View style={styles.sessionCard}>
        <View style={styles.sessionTitleRow}>
          <View style={styles.sessionTitleLeft}>
            <Text style={styles.sectionTitle}>🏋️ Session Logger</Text>
            {isSubscribed && (
              <View style={styles.xpMultiplierBadge}>
                <Text style={styles.xpMultiplierText}>{xpBadgeText}</Text>
              </View>
            )}
          </View>
          <View style={styles.sessionHeaderBtns}>
            {/* My Routines button */}
            <AnimatedPressable
              onPress={() => {
                console.log('[Tracker] My Routines button pressed, isSubscribed:', isSubscribed);
                if (!isSubscribed) {
                  router.push('/paywall');
                  return;
                }
                router.push('/routine-import');
              }}
              style={styles.routinesBtn}
            >
              <Text style={styles.routinesBtnText}>📋 Routines{!isSubscribed ? ' 🔒' : ''}</Text>
            </AnimatedPressable>
            {/* Plate Calculator button */}
            <AnimatedPressable
              onPress={() => {
                console.log('[Tracker] Plate Calculator button pressed');
                if (!isSubscribed) {
                  router.push('/paywall');
                  return;
                }
                setPlateModalVisible(true);
              }}
              style={styles.plateBtn}
            >
              <Text style={styles.plateBtnText}>🏋️ Plates{!isSubscribed ? ' 🔒' : ''}</Text>
            </AnimatedPressable>
          </View>
        </View>

        <View style={styles.addExRow}>
          <TextInput
            style={styles.exInput}
            value={newExercise}
            onChangeText={setNewExercise}
            placeholder="Exercise name..."
            placeholderTextColor={COLORS.textTertiary}
            onSubmitEditing={addExercise}
            returnKeyType="done"
          />
          <AnimatedPressable onPress={addExercise} style={styles.addExBtn}>
            <Text style={styles.addExBtnText}>+ Add</Text>
          </AnimatedPressable>
        </View>

        {session.length === 0 && (
          <View style={styles.emptySession}>
            <Text style={styles.emptySessionEmoji}>🏋️</Text>
            <Text style={styles.emptySessionText}>No exercises yet</Text>
            <Text style={styles.emptySessionSub}>Add an exercise to start logging</Text>
          </View>
        )}

        {session.map((ex, exIdx) => {
          const lastEntry = findLastWorkoutEntry(state.history, ex.exercise, todayStr);
          const lastSets = lastEntry?.exData.sets || null;
          const lastDateStr = lastEntry ? formatShortDate(lastEntry.entry.date) : null;
          const heaviest = lastSets ? getHeaviestSet(lastSets) : null;
          const hasLastData = lastSets && lastSets.length > 0;
          const summaryReps = heaviest ? heaviest.reps : '';
          const summaryWeight = heaviest ? heaviest.weight : '';
          const summaryText = hasLastData
            ? `↑ Last week: ${lastSets!.length} × ${summaryReps} @ ${summaryWeight} lb`
            : 'First time — set the bar 🦍';

          // Weight suggestion chip data
          const best1RM = getBest1RM(state.history, state.prs, ex.exercise);
          const lastSet = ex.sets[ex.sets.length - 1];
          const lastSetReps = lastSet ? parseInt(lastSet.reps) || 0 : 0;
          const suggPct = lastSetReps > 0 ? getRepPct(lastSetReps) : 0;
          const suggWeight = best1RM && lastSetReps > 0 ? recommendWeight(best1RM, lastSetReps) : 0;

          return (
            <View key={exIdx} style={styles.exerciseBlock}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{ex.exercise}</Text>
                <AnimatedPressable onPress={() => removeExercise(exIdx)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </AnimatedPressable>
              </View>

              {/* Last week summary chip */}
              <View style={[styles.lastWeekChip, !hasLastData && styles.lastWeekChipFirst]}>
                <Text style={[styles.lastWeekChipText, !hasLastData && styles.lastWeekChipTextFirst]}>
                  {summaryText}
                </Text>
                {lastDateStr && hasLastData ? (
                  <Text style={styles.lastWeekDate}>({lastDateStr})</Text>
                ) : null}
              </View>

              {/* Weight suggestion chip — Pro only */}
              {isSubscribed && best1RM && (
                <View style={styles.suggestionChip}>
                  {lastSetReps > 0 ? (
                    <Text style={styles.suggestionChipText}>
                      {'💡 Suggested: ~'}{suggWeight}{' lbs for '}{lastSetReps}{' reps ('}{Math.round(suggPct * 100)}{'% of est. 1RM)'}
                    </Text>
                  ) : (
                    <Text style={styles.suggestionChipText}>
                      {'💡 Est. 1RM: ~'}{best1RM}{' lbs — enter reps for weight suggestion'}
                    </Text>
                  )}
                  <Text style={styles.suggestionDisclaimer}>⚠️ AI-generated suggestion — always use safe, manageable weight</Text>
                </View>
              )}

              <View style={styles.setHeader}>
                <Text style={styles.setHeaderText}>Set</Text>
                <Text style={styles.setHeaderText}>Reps</Text>
                <Text style={styles.setHeaderText}>Weight (lbs)</Text>
              </View>

              {ex.sets.map((set, setIdx) => {
                // Per-set last week hint
                const lastSet = lastSets
                  ? (lastSets[setIdx] || heaviest)
                  : null;
                const lastHint = lastSet && (lastSet.reps || lastSet.weight)
                  ? `Last: ${lastSet.reps} × ${lastSet.weight} lb`
                  : null;

                return (
                  <View key={setIdx}>
                    <View style={styles.setRow}>
                      <Text style={styles.setNum}>{setIdx + 1}</Text>
                      <TextInput
                        style={styles.setInput}
                        value={set.reps}
                        onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={COLORS.textTertiary}
                      />
                      <TextInput
                        style={styles.setInput}
                        value={set.weight}
                        onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={COLORS.textTertiary}
                      />
                    </View>
                    {lastHint ? (
                      <Text style={styles.setLastHint}>{lastHint}</Text>
                    ) : null}
                  </View>
                );
              })}

              <AnimatedPressable onPress={() => addSet(exIdx)} style={styles.addSetBtn}>
                <Text style={styles.addSetBtnText}>+ Add Set</Text>
              </AnimatedPressable>
            </View>
          );
        })}

        {session.length > 0 && (
          <AnimatedPressable onPress={finishWorkout} style={styles.finishBtn}>
            <Text style={styles.finishBtnText}>🏁 Finish Workout</Text>
          </AnimatedPressable>
        )}
      </View>

      {/* Pro Analytics Card */}
      <View style={styles.analyticsCard}>
        <View style={styles.analyticsHeader}>
          <Text style={styles.sectionTitle}>📈 Pro Analytics</Text>
          <View style={styles.analyticsHeaderRight}>
            {isSubscribed && !state.maxTestComplete && (
              <AnimatedPressable
                onPress={() => {
                  console.log('[Tracker] Max Testing Protocol button pressed');
                  setMaxInputs(
                    Object.fromEntries(
                      Object.entries(state.userMaxes).map(([k, v]) => [k, String(v)])
                    )
                  );
                  setShowMaxModal(true);
                }}
                style={styles.maxTestBtn}
              >
                <Text style={styles.maxTestBtnText}>🎯 Max Test</Text>
              </AnimatedPressable>
            )}
            {!isSubscribed && (
              <AnimatedPressable
                onPress={() => {
                  console.log('[Tracker] Pro Analytics lock pressed');
                  router.push('/paywall');
                }}
                style={styles.proLockPill}
              >
                <Text style={styles.proLockText}>🔒 Unlock Pro</Text>
              </AnimatedPressable>
            )}
          </View>
        </View>

        {isSubscribed ? (
          <View style={styles.analyticsContent}>
            {/* KONG RANK Banner */}
            {state.prs && state.prs.length > 0 && state.profile?.weight ? (() => {
              const kongRankData = getKongRank(state.prs, state.profile.weight);
              const rankProgressPct = Math.round(kongRankData.progress * 100);
              return (
                <View style={[styles.kongRankBanner, { borderColor: `${kongRankData.rank.color}50` }]}>
                  <View style={styles.kongRankHeader}>
                    <Text style={styles.kongRankLabel}>KONG RANK</Text>
                    <View style={[styles.kongRankBadge, { backgroundColor: `${kongRankData.rank.color}20`, borderColor: `${kongRankData.rank.color}60` }]}>
                      <Text style={[styles.kongRankName, { color: kongRankData.rank.color }]}>{kongRankData.rank.name}</Text>
                    </View>
                  </View>
                  {kongRankData.nextRank && (
                    <>
                      <View style={styles.kongRankProgressBar}>
                        <View style={[styles.kongRankProgressFill, { width: `${rankProgressPct}%` as any, backgroundColor: kongRankData.rank.color }]} />
                      </View>
                      <Text style={styles.kongRankNextLabel}>
                        {'Next: '}
                        {kongRankData.nextRank.name}
                        {' — improve your lift tiers to rank up'}
                      </Text>
                    </>
                  )}
                  {!kongRankData.nextRank && (
                    <Text style={[styles.kongRankNextLabel, { color: kongRankData.rank.color }]}>Maximum rank achieved. You are Kong Elite. 👑</Text>
                  )}
                </View>
              );
            })() : null}

            {/* Goal Progress Rings */}
            {(!state.goals || state.goals.length === 0) ? (
              <Text style={styles.emptyGoalsText}>No goals set yet</Text>
            ) : (
              <View style={styles.goalRingsSection}>
                <Text style={styles.analyticsSectionLabel}>GOAL PROGRESS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalRingsScroll}>
                  {state.goals.map((goal) => {
                    const pct = goal.target > 0 ? Math.min(goal.current / goal.target, 1) : 0;
                    const pctDisplay = Math.round(pct * 100);
                    const ringColor = goal.achieved ? COLORS.gold : COLORS.blue;
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        style={styles.goalRing}
                        onPress={() => {
                          console.log('[Tracker] Goal ring tapped:', goal.name);
                          setEditingGoal(goal);
                          setGoalEditValue(String(goal.current));
                          setShowGoalModal(true);
                        }}
                        activeOpacity={0.8}
                      >
                        {/* Ring visual */}
                        <View style={[styles.ringOuter, { borderColor: `${ringColor}30` }]}>
                          <View style={[styles.ringFill, {
                            borderColor: ringColor,
                            borderTopColor: pct > 0.25 ? ringColor : 'transparent',
                            borderRightColor: pct > 0.5 ? ringColor : 'transparent',
                            borderBottomColor: pct > 0.75 ? ringColor : 'transparent',
                          }]} />
                          <View style={styles.ringInner}>
                            <Text style={[styles.ringPct, { color: ringColor }]}>
                              {pctDisplay}
                              {'%'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.ringName} numberOfLines={2}>{goal.name}</Text>
                        <Text style={styles.ringValues}>
                          {goal.current}
                          {'/'}
                          {goal.target}
                          {' '}
                          {goal.unit}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Max test protocol banner */}
            {!state.maxTestComplete && (
              <TouchableOpacity
                style={styles.maxTestBanner}
                onPress={() => {
                  console.log('[Tracker] Max test banner tapped');
                  setMaxInputs(
                    Object.fromEntries(
                      Object.entries(state.userMaxes).map(([k, v]) => [k, String(v)])
                    )
                  );
                  setShowMaxModal(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.maxTestBannerText}>🎯 Complete the Max Testing Protocol to unlock personalized weight recommendations →</Text>
              </TouchableOpacity>
            )}

            {/* Section 1 — Strength Overview */}
            {state.prs.length === 0 ? (
              <Text style={styles.analyticsEmpty}>Complete workouts to see analytics</Text>
            ) : (
              <>
                <Text style={styles.analyticsSectionLabel}>STRENGTH OVERVIEW</Text>
                {state.prs.slice(0, 8).map((pr, i) => {
                  const est1RM = epley1RM(pr.weight, 1);
                  const weeklyVols = getWeeklyVolume(state.history, pr.lift);
                  const maxVol = Math.max(...weeklyVols, 1);
                  const prDateStr = formatShortDate(pr.date);
                  const tier = getStrengthTier(est1RM, state.profile.weight, pr.lift);
                  const nextMilestone = getNextMilestone(pr.weight);
                  const toGo = nextMilestone - pr.weight;
                  return (
                    <View key={i} style={styles.analyticsRow}>
                      <View style={styles.analyticsLiftInfo}>
                        <View style={styles.analyticsLiftNameRow}>
                          <Text style={styles.analyticsLiftName}>{pr.lift}</Text>
                          <View style={[styles.strengthTierBadge, { backgroundColor: `${tier.color}25`, borderColor: `${tier.color}60` }]}>
                            <Text style={[styles.strengthTierText, { color: tier.color }]}>{tier.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.analyticsLiftSub}>PR: {pr.weight} lb • Est 1RM: {est1RM} lb</Text>
                        <Text style={styles.analyticsLiftDate}>{prDateStr}</Text>
                        <Text style={styles.nextMilestoneTxt}>Next: {nextMilestone} lbs (+{toGo} lbs to go)</Text>
                      </View>
                      {/* Volume trend bars */}
                      <View style={styles.volBars}>
                        {weeklyVols.map((v, wi) => {
                          const barH = maxVol > 0 ? Math.max(4, Math.round((v / maxVol) * 40)) : 4;
                          return (
                            <View key={wi} style={styles.volBarWrap}>
                              <View style={[styles.volBar, { height: barH }]} />
                              <Text style={styles.volBarLabel}>W{wi + 1}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Section 2 — Weight Recommendations Table */}
            {Object.keys(state.userMaxes).length > 0 && (
              <View style={styles.weightRecCard}>
                <Text style={styles.weightRecTitle}>💡 Recommended Working Weights</Text>
                <View style={styles.disclaimerBanner}>
                  <Text style={styles.disclaimerText}>⚠️ Weight suggestions are AI-generated estimates. Always use weight you can safely lift with proper form. Consult a trainer before attempting new maxes.</Text>
                </View>
                {Object.entries(state.userMaxes).map(([lift, maxVal]) => {
                  const est1RM = epley1RM(maxVal, 1);
                  const repsSchemes: { label: string; reps: number; pct: number }[] = [
                    { label: '5×5', reps: 5, pct: 0.85 },
                    { label: '4×6', reps: 6, pct: 0.80 },
                    { label: '3×8', reps: 8, pct: 0.75 },
                    { label: '3×10', reps: 10, pct: 0.70 },
                    { label: '4×12', reps: 12, pct: 0.67 },
                  ];
                  return (
                    <View key={lift} style={styles.weightRecTable}>
                      <Text style={styles.weightRecMax}>{lift} — Max: {maxVal} lbs • Est 1RM: {est1RM} lbs</Text>
                      <View style={styles.weightRecRow}>
                        <Text style={[styles.weightRecCell, styles.weightRecHeader]}>Sets×Reps</Text>
                        <Text style={[styles.weightRecCell, styles.weightRecHeader]}>% 1RM</Text>
                        <Text style={[styles.weightRecCell, styles.weightRecHeader]}>Suggested</Text>
                      </View>
                      {repsSchemes.map((s) => {
                        const suggested = Math.round((est1RM * s.pct) / 2.5) * 2.5;
                        const pctDisplay = Math.round(s.pct * 100);
                        return (
                          <View key={s.label} style={styles.weightRecRow}>
                            <Text style={styles.weightRecCell}>{s.label}</Text>
                            <Text style={styles.weightRecCell}>{pctDisplay}{'%'}</Text>
                            <Text style={[styles.weightRecCell, { color: COLORS.gold }]}>{suggested}{' lbs'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Section 3 — Total Tonnage */}
            {state.prs.length > 0 && (
              <View style={styles.tonnageRow}>
                <Text style={styles.tonnageLabel}>Total Tonnage (all time)</Text>
                <Text style={styles.tonnageValue}>
                  {state.history.reduce((sum, h) =>
                    sum + h.exercises.reduce((s2, ex) =>
                      s2 + ex.sets.reduce((s3, set) =>
                        s3 + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0), 0), 0), 0
                  ).toLocaleString()} lb
                </Text>
              </View>
            )}

            {/* Section 4 — 7-Day Frequency Heatmap */}
            {(() => {
              const now = new Date();
              const days7: { label: string; active: boolean }[] = [];
              for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
                const active = state.history.some(h => h.date.split('T')[0] === dStr);
                days7.push({ label, active });
              }
              return (
                <View>
                  <Text style={styles.analyticsSectionLabel}>LAST 7 DAYS</Text>
                  <View style={styles.freqHeatmap}>
                    {days7.map((d, i) => (
                      <View key={i} style={styles.freqDayWrap}>
                        <View style={[styles.freqDay, d.active && styles.freqDayActive]} />
                        <Text style={styles.freqDayLabel}>{d.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* Section 5 — PR Table */}
            {state.prs.length > 0 && (
              <View>
                <Text style={styles.analyticsSectionLabel}>PERSONAL RECORDS</Text>
                <View style={styles.prTable}>
                  <View style={styles.prTableRow}>
                    <Text style={[styles.prTableCell, styles.prTableHeader]}>Lift</Text>
                    <Text style={[styles.prTableCell, styles.prTableHeader]}>Weight</Text>
                    <Text style={[styles.prTableCell, styles.prTableHeader]}>Date</Text>
                  </View>
                  {state.prs.map((pr, i) => {
                    const dateStr = new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
                    return (
                      <View key={i} style={[styles.prTableRow, i % 2 === 1 && styles.prTableRowAlt]}>
                        <Text style={styles.prTableCell} numberOfLines={1}>{pr.lift}</Text>
                        <Text style={[styles.prTableCell, { color: COLORS.gold }]}>{pr.weight} lb</Text>
                        <Text style={[styles.prTableCell, { color: COLORS.textTertiary }]}>{dateStr}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.analyticsBlurContainer}>
            {/* Fake preview rows behind blur */}
            <View style={styles.analyticsPreview}>
              {fakeAnalyticsRows.map((row, i) => (
                <View key={i} style={styles.analyticsPreviewRow}>
                  <View style={styles.analyticsLiftInfo}>
                    <Text style={styles.analyticsLiftName}>{row.name}</Text>
                    <Text style={styles.analyticsLiftSub}>PR: {row.pr} lb • Est 1RM: {row.est} lb</Text>
                  </View>
                  <View style={styles.volBars}>
                    {[20, 32, 28, 40].map((h, wi) => (
                      <View key={wi} style={styles.volBarWrap}>
                        <View style={[styles.volBar, { height: h }]} />
                        <Text style={styles.volBarLabel}>W{wi + 1}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            {/* BlurView overlay */}
            <BlurView intensity={60} tint="dark" style={styles.analyticsBlurOverlay}>
              <Text style={styles.analyticsBlurIcon}>📊</Text>
              <Text style={styles.analyticsBlurTitle}>Advanced Analytics</Text>
              <Text style={styles.analyticsBlurSub}>Volume trends, 1RM estimates, total tonnage</Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Tracker] Unlock Pro Analytics pressed');
                  router.push('/paywall');
                }}
                style={styles.analyticsUnlockBtn}
              >
                <Text style={styles.analyticsUnlockText}>Unlock Pro Analytics</Text>
              </AnimatedPressable>
            </BlurView>
          </View>
        )}
      </View>

      {/* Recent History */}
      {recentHistory.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>📜 Recent Workouts</Text>
          {recentHistory.map((h) => {
            const dateStr = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <View key={h.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{dateStr}</Text>
                  <Text style={styles.historyExercises}>{h.exercises.length} exercise{h.exercises.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyXP}>+{h.xpEarned} XP ⚡</Text>
                </View>
              </View>
            );
          })}

          {/* Export button */}
          <AnimatedPressable
            onPress={handleExportCSV}
            style={styles.exportBtn}
          >
            <Text style={styles.exportBtnText}>
              {isSubscribed ? '📤 Export Workout History (CSV)' : '📤 Export Workout History 🔒 Pro'}
            </Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Plate Calculator Modal */}
      <Modal
        visible={plateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPlateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏋️ Plate Calculator</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[Tracker] Close plate calculator');
                setPlateModalVisible(false);
              }}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.plateField}>
              <Text style={styles.plateLabel}>Target Weight (lbs)</Text>
              <TextInput
                style={styles.plateInput}
                value={plateTarget}
                onChangeText={setPlateTarget}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
                placeholder="135"
              />
            </View>
            <View style={styles.plateField}>
              <Text style={styles.plateLabel}>Bar Weight (lbs)</Text>
              <TextInput
                style={styles.plateInput}
                value={plateBar}
                onChangeText={setPlateBar}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
                placeholder="45"
              />
            </View>
            {plateResult ? (
              <View style={styles.plateResult}>
                <Text style={styles.plateResultLabel}>PLATES PER SIDE</Text>
                <Text style={styles.plateResultValue}>{plateResult}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Max Testing Protocol Modal */}
      <Modal
        visible={showMaxModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMaxModal(false)}
      >
        <View style={styles.maxModalContainer}>
          <View style={styles.maxModalHeader}>
            <Text style={styles.maxModalTitle}>🎯 Find Your Maxes</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[Tracker] Close max testing modal');
                setShowMaxModal(false);
              }}
              style={styles.maxModalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.maxModalIntro}>
                This 5-day protocol helps Kong understand your strength baseline so it can recommend the perfect weights for every set. Complete each day's test, log your best set, and Kong will personalize all future recommendations.
              </Text>

              {/* Protocol Days */}
              {MAX_PROTOCOL_DAYS.map((day) => (
                <TouchableOpacity
                  key={day.day}
                  style={styles.maxDayCard}
                  onPress={() => {
                    console.log('[Tracker] Max protocol day toggled:', day.day);
                    setExpandedDay(expandedDay === day.day ? null : day.day);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.maxDayHeader}>
                    <Text style={styles.maxDayTitle}>{day.title}</Text>
                    <Text style={styles.modalCloseText}>{expandedDay === day.day ? '▲' : '▼'}</Text>
                  </View>
                  {expandedDay === day.day && (
                    <View style={{ marginTop: 10, gap: 6 }}>
                      {day.exercises.map((ex, i) => (
                        <Text key={i} style={styles.maxDayExercise}>{'• '}{ex}</Text>
                      ))}
                      <Text style={styles.maxDayInstructions}>{day.instructions}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* Log Your Maxes */}
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Log Your Maxes</Text>
              {MAX_LIFTS.map((lift) => (
                <View key={lift} style={styles.maxInputRow}>
                  <Text style={styles.maxInputLabel}>{lift}</Text>
                  <TextInput
                    style={styles.maxInput}
                    value={maxInputs[lift] || ''}
                    onChangeText={(v) => {
                      setMaxInputs((prev) => ({ ...prev, [lift]: v }));
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                  <Text style={styles.maxInputUnit}>lbs</Text>
                </View>
              ))}

              {/* Save button */}
              <TouchableOpacity
                style={styles.maxSaveBtn}
                onPress={() => {
                  console.log('[Tracker] Save maxes button pressed', maxInputs);
                  const newMaxes: Record<string, number> = { ...state.userMaxes };
                  Object.entries(maxInputs).forEach(([lift, val]) => {
                    const n = parseFloat(val);
                    if (!isNaN(n) && n > 0) newMaxes[lift] = n;
                  });
                  updateState({ userMaxes: newMaxes, maxTestComplete: true });
                  setShowMaxModal(false);
                  showToast('🎯 Maxes saved! Kong will now personalize your weight recommendations.', true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.maxSaveBtnText}>Save Maxes & Complete Protocol</Text>
              </TouchableOpacity>

              {/* Reset link */}
              <TouchableOpacity
                style={styles.maxResetLink}
                onPress={() => {
                  console.log('[Tracker] Reset max protocol pressed');
                  updateState({ maxTestComplete: false, userMaxes: {} });
                  setMaxInputs({});
                  showToast('Protocol reset. Re-enter your maxes anytime.');
                }}
              >
                <Text style={styles.maxResetText}>Reset Protocol</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Pro Celebration Modal */}
      <Modal
        visible={showProCelebration}
        animationType="fade"
        transparent
        onRequestClose={() => setShowProCelebration(false)}
      >
        <View style={styles.celebrationBackdrop}>
          <View style={styles.celebrationCard}>
            <KongMascot size={80} mood="happy" />
            <View style={styles.celebrationProBadge}>
              <Text style={styles.celebrationProBadgeText}>👑 KONG PRO</Text>
            </View>
            <Text style={styles.celebrationTitle}>Workout Complete!</Text>
            <Text style={styles.celebrationMsg}>{celebrationMsg}</Text>
            <View style={styles.celebrationXPRow}>
              <Text style={styles.celebrationXP}>{celebrationXPText}</Text>
              <Text style={styles.celebrationXPSub}>2× Pro Bonus</Text>
            </View>
            <AnimatedPressable
              onPress={() => {
                console.log('[Tracker] Pro celebration closed');
                setShowProCelebration(false);
              }}
              style={styles.celebrationBtn}
            >
              <Text style={styles.celebrationBtnText}>Let's Go! 🦍</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Streak Fire Celebration Modal */}
      <Modal
        visible={showStreakModal}
        animationType="fade"
        transparent
        onRequestClose={() => {}}
      >
        <View style={styles.streakBackdrop}>
          <View style={styles.streakCard}>
            {/* New PR badge */}
            {streakModalIsNewPR && (
              <View style={styles.newPRBadge}>
                <Text style={styles.newPRBadgeText}>💪 NEW PR!</Text>
              </View>
            )}

            {/* Fire emoji */}
            <Animated.Text style={[styles.streakFireEmoji, { transform: [{ scale: fireScaleAnim }] }]}>
              🔥
            </Animated.Text>

            {/* Streak number */}
            <Text style={styles.streakNumber}>
              {streakModalStreak}
              {' Day Streak!'}
            </Text>

            {/* Motivation message */}
            <Text style={styles.streakMotivation}>{getStreakMotivation(streakModalStreak)}</Text>

            {/* XP counter */}
            <View style={styles.streakXPRow}>
              <Text style={styles.streakXPLabel}>XP Earned</Text>
              <Text style={styles.streakXPValue}>
                {'+'}
                {xpCountDisplay}
                {' ⚡'}
              </Text>
            </View>

            {/* Claim button */}
            <AnimatedPressable onPress={claimXP} style={styles.claimXPBtn}>
              <Text style={styles.claimXPBtnText}>CLAIM XP 🦍</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>

      {/* Goal Progress Edit Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.goalModalContainer}>
          <View style={styles.goalModalHeader}>
            <Text style={styles.goalModalTitle}>Update Goal Progress</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[Tracker] Close goal modal');
                setShowGoalModal(false);
              }}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {editingGoal && (
            <View style={styles.goalModalContent}>
              <Text style={styles.goalModalName}>{editingGoal.name}</Text>
              <Text style={styles.goalModalSub}>
                {'Target: '}
                {editingGoal.target}
                {' '}
                {editingGoal.unit}
              </Text>
              <View style={styles.goalModalInputRow}>
                <Text style={styles.goalModalInputLabel}>Current Value</Text>
                <TextInput
                  style={styles.goalModalInput}
                  value={goalEditValue}
                  onChangeText={setGoalEditValue}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.textTertiary}
                />
                <Text style={styles.goalModalUnit}>{editingGoal.unit}</Text>
              </View>
              <TouchableOpacity
                style={styles.goalModalSaveBtn}
                onPress={() => {
                  const newVal = parseFloat(goalEditValue) || 0;
                  console.log('[Tracker] Goal updated:', editingGoal.name, '->', newVal);
                  const newGoals = state.goals.map((g) =>
                    g.id === editingGoal.id
                      ? { ...g, current: newVal, achieved: newVal >= g.target }
                      : g
                  );
                  updateState({ goals: newGoals });
                  setShowGoalModal(false);
                  showToast(`✅ Goal updated: ${editingGoal.name}`, true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.goalModalSaveBtnText}>Save Progress</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  kongApproveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  kongApproveText: { fontSize: 14, fontWeight: '700', color: COLORS.gold, flex: 1 },
  progCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  progName: { fontSize: 16, fontWeight: '800', color: COLORS.gold },
  daysScroll: { marginHorizontal: -4 },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayPillSelected: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  dayPillDone: { backgroundColor: `${COLORS.green}20`, borderColor: COLORS.green },
  dayPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  dayPillTextSelected: { color: COLORS.gold },
  dayExercises: { gap: 6 },
  dayTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dayExercise: { fontSize: 13, color: COLORS.textSecondary },
  doneBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  doneBtnActive: { backgroundColor: `${COLORS.green}20`, borderColor: COLORS.green },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  weekCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 6 },
  weekCheck: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCheckDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  weekCheckMark: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  weekDayLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', lineHeight: 16 },

  // Streak Shield
  shieldCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  shieldCardActive: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.border2,
  },
  shieldCardEmpty: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  shieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shieldTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  shieldCountBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  shieldCountText: { fontSize: 12, fontWeight: '900', color: '#0A0A0A' },
  shieldDesc: { fontSize: 13, color: COLORS.gold, lineHeight: 20 },
  shieldDescEmpty: { color: COLORS.textSecondary },
  shieldAutoNote: {
    backgroundColor: 'rgba(212,160,23,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  shieldAutoNoteText: { fontSize: 12, fontWeight: '700', color: COLORS.gold },

  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sessionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 },
  xpMultiplierBadge: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  xpMultiplierText: { fontSize: 12, fontWeight: '800', color: COLORS.gold },
  sessionHeaderBtns: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 },
  routinesBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border2,
    marginBottom: 8,
  },
  routinesBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.gold, flexShrink: 1 },
  plateBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  plateBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, flexShrink: 1 },
  addExRow: { flexDirection: 'row', gap: 8 },
  exInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addExBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExBtnText: { fontSize: 14, fontWeight: '800', color: '#0A0A0A' },
  emptySession: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptySessionEmoji: { fontSize: 40 },
  emptySessionText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  emptySessionSub: { fontSize: 13, color: COLORS.textTertiary },
  exerciseBlock: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontSize: 15, fontWeight: '800', color: COLORS.text, flex: 1 },
  removeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 16, color: COLORS.red, fontWeight: '700' },

  // Last week chip
  lastWeekChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border2,
    flexWrap: 'wrap',
  },
  lastWeekChipFirst: {
    backgroundColor: `${COLORS.green}15`,
    borderColor: `${COLORS.green}40`,
  },
  lastWeekChipText: { fontSize: 12, fontWeight: '600', color: COLORS.gold, flexShrink: 1 },
  lastWeekChipTextFirst: { color: COLORS.green },
  lastWeekDate: { fontSize: 12, color: COLORS.textTertiary },

  setHeader: { flexDirection: 'row', gap: 8 },
  setHeaderText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 16 },
  setRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  setNum: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  setInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  setLastHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: -4,
    marginBottom: 2,
    paddingRight: 4,
  },
  addSetBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addSetBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  finishBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  finishBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },

  // Analytics
  analyticsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proLockPill: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  proLockText: { fontSize: 12, fontWeight: '700', color: COLORS.gold },
  analyticsContent: { gap: 12 },
  analyticsEmpty: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', paddingVertical: 12 },
  emptyGoalsText: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  analyticsLiftInfo: { flex: 1, gap: 2 },
  analyticsLiftName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  analyticsLiftSub: { fontSize: 12, color: COLORS.gold },
  analyticsLiftDate: { fontSize: 12, color: COLORS.textTertiary },
  volBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 48 },
  volBarWrap: { alignItems: 'center', gap: 2 },
  volBar: { width: 12, backgroundColor: COLORS.gold, borderRadius: 3, minHeight: 4 },
  volBarLabel: { fontSize: 12, color: COLORS.textTertiary },
  tonnageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tonnageLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tonnageValue: { fontSize: 16, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },

  // Analytics blur (non-subscriber)
  analyticsBlurContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 160,
  },
  analyticsPreview: {
    padding: 8,
    gap: 8,
  },
  analyticsPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  analyticsBlurOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  analyticsBlurIcon: { fontSize: 32 },
  analyticsBlurTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  analyticsBlurSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  analyticsUnlockBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  analyticsUnlockText: { fontSize: 14, fontWeight: '800', color: '#0A0A0A' },
  analyticsHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyticsSectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textTertiary, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4, marginBottom: 6 },
  analyticsLiftNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },

  // Strength tier badge
  strengthTierBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    flexShrink: 0,
  },
  strengthTierText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  nextMilestoneTxt: { fontSize: 11, color: COLORS.textTertiary, fontStyle: 'italic', marginTop: 1 },

  // Weight recommendation card
  weightRecCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  weightRecTitle: { fontSize: 14, fontWeight: '800', color: COLORS.gold },
  weightRecMax: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  weightRecTable: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  weightRecRow: { flexDirection: 'row', gap: 4 },
  weightRecCell: { flex: 1, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 3 },
  weightRecHeader: { fontWeight: '800', color: COLORS.textTertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Disclaimer banner
  disclaimerBanner: {
    backgroundColor: `${COLORS.gold}10`,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border2,
  },
  disclaimerText: { fontSize: 12, color: COLORS.gold, lineHeight: 18 },

  // Max test banner
  maxTestBanner: {
    backgroundColor: `${COLORS.gold}15`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  maxTestBannerText: { fontSize: 13, fontWeight: '600', color: COLORS.gold, lineHeight: 20 },
  maxTestBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  maxTestBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.gold },

  // Frequency heatmap
  freqHeatmap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  freqDayWrap: { alignItems: 'center', gap: 4 },
  freqDay: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  freqDayActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  freqDayLabel: { fontSize: 10, color: COLORS.textTertiary, fontWeight: '600' },

  // PR Table
  prTable: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prTableRowAlt: { backgroundColor: COLORS.surface2 },
  prTableCell: { flex: 1, fontSize: 12, color: COLORS.text },
  prTableHeader: { fontWeight: '800', color: COLORS.textTertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Suggestion chip
  suggestionChip: {
    backgroundColor: `${COLORS.gold}18`,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 4,
  },
  suggestionChipText: { fontSize: 12, fontWeight: '700', color: COLORS.gold },
  suggestionDisclaimer: { fontSize: 11, color: COLORS.textTertiary, fontStyle: 'italic' },

  // Max Testing Modal
  maxModalContainer: { flex: 1, backgroundColor: COLORS.bg },
  maxModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  maxModalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.gold },
  maxModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxModalIntro: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  maxDayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  maxDayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  maxDayTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, flex: 1 },
  maxDayExercise: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  maxDayInstructions: {
    fontSize: 12,
    color: COLORS.gold,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
  maxInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  maxInputLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  maxInput: {
    width: 70,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  maxInputUnit: { fontSize: 13, color: COLORS.textTertiary, width: 28 },
  maxSaveBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  maxSaveBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  maxResetLink: { alignItems: 'center', paddingVertical: 12 },
  maxResetText: { fontSize: 13, color: COLORS.textTertiary, textDecorationLine: 'underline' },

  // History
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyLeft: { gap: 2 },
  historyDate: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  historyExercises: { fontSize: 12, color: COLORS.textSecondary },
  historyRight: {},
  historyXP: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  exportBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  exportBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },

  // Plate Calculator Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '700' },
  modalContent: { padding: 20, gap: 16 },
  plateField: { gap: 8 },
  plateLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  plateInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontVariant: ['tabular-nums'],
  },
  plateResult: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 6,
    alignItems: 'center',
  },
  plateResultLabel: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  plateResultValue: { fontSize: 18, fontWeight: '900', color: COLORS.gold, textAlign: 'center' },

  // Pro Celebration Modal
  celebrationBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  celebrationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 360,
  },
  celebrationProBadge: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  celebrationProBadgeText: { fontSize: 12, fontWeight: '900', color: COLORS.gold, letterSpacing: 1 },
  celebrationTitle: { fontSize: 22, fontWeight: '900', color: COLORS.gold, textAlign: 'center' },
  celebrationMsg: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  celebrationXPRow: { alignItems: 'center', gap: 2 },
  celebrationXP: { fontSize: 28, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  celebrationXPSub: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  celebrationBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 4,
  },
  celebrationBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },

  // Kong Rank Banner
  kongRankBanner: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    marginBottom: 12,
  },
  kongRankHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kongRankLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' },
  kongRankBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
  },
  kongRankName: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  kongRankProgressBar: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  kongRankProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  kongRankNextLabel: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },

  // Goal Progress Rings
  goalRingsSection: { marginBottom: 12 },
  goalRingsScroll: { marginHorizontal: -4 },
  goalRing: {
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 8,
    width: 80,
  },
  ringOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringFill: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
  },
  ringInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 12, fontWeight: '900' },
  ringName: { fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'center', lineHeight: 14 },
  ringValues: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },

  // Streak Fire Modal
  streakBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  streakCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.border2,
    width: '100%',
    maxWidth: 360,
  },
  newPRBadge: {
    backgroundColor: `${COLORS.red}20`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  newPRBadgeText: { fontSize: 13, fontWeight: '900', color: COLORS.red, letterSpacing: 1 },
  streakFireEmoji: { fontSize: 72, lineHeight: 80 },
  streakNumber: { fontSize: 28, fontWeight: '900', color: COLORS.gold, textAlign: 'center' },
  streakMotivation: { fontSize: 14, color: COLORS.text, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  streakXPRow: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border2,
    width: '100%',
  },
  streakXPLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  streakXPValue: { fontSize: 32, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  claimXPBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  claimXPBtnText: { fontSize: 17, fontWeight: '900', color: '#0A0A0A', letterSpacing: 1 },

  // Goal Modal
  goalModalContainer: { flex: 1, backgroundColor: COLORS.bg },
  goalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  goalModalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  goalModalContent: { padding: 20, gap: 16 },
  goalModalName: { fontSize: 20, fontWeight: '900', color: COLORS.gold },
  goalModalSub: { fontSize: 14, color: COLORS.textSecondary },
  goalModalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalModalInputLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
  goalModalInput: {
    width: 80,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  goalModalUnit: { fontSize: 14, color: COLORS.textSecondary, width: 40 },
  goalModalSaveBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  goalModalSaveBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
});
