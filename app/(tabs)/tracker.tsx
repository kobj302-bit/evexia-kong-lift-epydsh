import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  Animated, LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp, SessionSet, WorkoutHistory, PR } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { COLORS } from '@/constants/data';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TrackerTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState, addXP, showToast, triggerPR } = useApp();
  const { isSubscribed } = useSubscription();
  const [newExercise, setNewExercise] = useState('');
  const prFlashAnim = useRef(new Animated.Value(0)).current;

  const session = state.session;

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
    console.log('[Tracker] Finish workout — exercises:', session.length);

    const xpEarned = 50 + session.length * 10;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check streak
    let newStreak = state.streak;
    let newBestStreak = state.bestStreak;
    if (state.lastWorkout) {
      const last = new Date(state.lastWorkout);
      const lastStr = last.toISOString().split('T')[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (lastStr === yesterdayStr || lastStr === todayStr) {
        newStreak = lastStr === todayStr ? state.streak : state.streak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
    newBestStreak = Math.max(newBestStreak, newStreak);

    // Check PRs — fixed: capture old weight BEFORE mutating
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

    updateState({
      session: [],
      lastWorkout: now.toISOString(),
      totalWorkouts: state.totalWorkouts + 1,
      streak: newStreak,
      bestStreak: newBestStreak,
      history: [historyEntry, ...state.history].slice(0, 50),
      prs: newPRs,
    });

    addXP(xpEarned);

    if (prNames.length > 0) {
      prNames.forEach((name) => triggerPR(name));
    } else {
      showToast(`💪 Workout done! +${xpEarned} XP`, true);
    }

    // Show interstitial ad for free users
    if (!isSubscribed) {
      setTimeout(() => {
        console.log('[Tracker] Showing post-workout interstitial ad');
        router.push('/ad-interstitial' as any);
      }, 1500);
    }
  };

  const toggleDoneDay = (dayIdx: number) => {
    const progName = state.activeProg?.name || 'default';
    const key = `${progName}-${dayIdx}`;
    console.log('[Tracker] Toggle day:', key);
    updateState({ donedays: { ...state.donedays, [key]: !state.donedays[key] } });
  };

  const recentHistory = state.history.slice(0, 5);

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
          {DAYS.map((day, idx) => {
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

      {/* Session Logger */}
      <View style={styles.sessionCard}>
        <Text style={styles.sectionTitle}>🏋️ Session Logger</Text>

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

        {session.map((ex, exIdx) => (
          <View key={exIdx} style={styles.exerciseBlock}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{ex.exercise}</Text>
              <AnimatedPressable onPress={() => removeExercise(exIdx)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕</Text>
              </AnimatedPressable>
            </View>

            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
              <Text style={styles.setHeaderText}>Weight (lbs)</Text>
            </View>

            {ex.sets.map((set, setIdx) => (
              <View key={setIdx} style={styles.setRow}>
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
            ))}

            <AnimatedPressable onPress={() => addSet(exIdx)} style={styles.addSetBtn}>
              <Text style={styles.addSetBtnText}>+ Add Set</Text>
            </AnimatedPressable>
          </View>
        ))}

        {session.length > 0 && (
          <AnimatedPressable onPress={finishWorkout} style={styles.finishBtn}>
            <Text style={styles.finishBtnText}>🏁 Finish Workout</Text>
          </AnimatedPressable>
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
        </View>
      )}
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
  weekDayLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
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
  setHeader: { flexDirection: 'row', gap: 8 },
  setHeaderText: { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  setRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  setNum: { width: 24, fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
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
});
