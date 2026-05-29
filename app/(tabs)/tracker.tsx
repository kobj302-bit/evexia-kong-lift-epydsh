import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  Animated, LayoutAnimation, Platform, Modal, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp, SessionSet, WorkoutHistory, PR } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { COLORS } from '@/constants/data';

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

  const session = state.session;
  const todayStr = new Date().toISOString().split('T')[0];

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
    const todayIso = now.toISOString().split('T')[0];

    let newStreak = state.streak;
    let newBestStreak = state.bestStreak;
    if (state.lastWorkout) {
      const last = new Date(state.lastWorkout);
      const lastStr = last.toISOString().split('T')[0];
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (lastStr === yesterdayStr || lastStr === todayIso) {
        newStreak = lastStr === todayIso ? state.streak : state.streak + 1;
      } else {
        newStreak = 1;
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

      {/* Session Logger */}
      <View style={styles.sessionCard}>
        <View style={styles.sessionTitleRow}>
          <Text style={styles.sectionTitle}>🏋️ Session Logger</Text>
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

        {isSubscribed ? (
          <View style={styles.analyticsContent}>
            {state.prs.length === 0 ? (
              <Text style={styles.analyticsEmpty}>Complete workouts to see analytics</Text>
            ) : (
              state.prs.slice(0, 5).map((pr, i) => {
                const est1RM = epley1RM(pr.weight, 1);
                const weeklyVols = getWeeklyVolume(state.history, pr.lift);
                const maxVol = Math.max(...weeklyVols, 1);
                const prDateStr = formatShortDate(pr.date);
                return (
                  <View key={i} style={styles.analyticsRow}>
                    <View style={styles.analyticsLiftInfo}>
                      <Text style={styles.analyticsLiftName}>{pr.lift}</Text>
                      <Text style={styles.analyticsLiftSub}>PR: {pr.weight} lb • Est 1RM: {est1RM} lb</Text>
                      <Text style={styles.analyticsLiftDate}>{prDateStr}</Text>
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
              })
            )}
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
          </View>
        ) : (
          <View style={styles.analyticsBlur}>
            <View style={styles.analyticsBlurOverlay}>
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
            </View>
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
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plateBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  plateBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
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
  lastWeekDate: { fontSize: 11, color: COLORS.textTertiary },

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
  setLastHint: {
    fontSize: 11,
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
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  analyticsLiftInfo: { flex: 1, gap: 2 },
  analyticsLiftName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  analyticsLiftSub: { fontSize: 12, color: COLORS.gold },
  analyticsLiftDate: { fontSize: 11, color: COLORS.textTertiary },
  volBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 48 },
  volBarWrap: { alignItems: 'center', gap: 2 },
  volBar: { width: 12, backgroundColor: COLORS.gold, borderRadius: 3, minHeight: 4 },
  volBarLabel: { fontSize: 9, color: COLORS.textTertiary },
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
  analyticsBlur: {
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 120,
  },
  analyticsBlurOverlay: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  plateResultLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  plateResultValue: { fontSize: 18, fontWeight: '900', color: COLORS.gold, textAlign: 'center' },
});
