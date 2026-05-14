import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Check } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getItem, setItem, STORAGE_KEYS, addXP } from '@/utils/storage';
import type { ActiveProgram, WorkoutHistory, PR } from '@/utils/storage';
import { XP_AWARDS } from '@/utils/xp';

interface SetLog {
  weight: string;
  reps: string;
  done: boolean;
}

interface ExerciseLog {
  name: string;
  sets: SetLog[];
  isPR: boolean;
}

export default function SessionScreen() {
  const insets = useSafeAreaInsets();
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [prs, setPRs] = useState<Record<string, PR>>({});
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [programName, setProgramName] = useState('Workout');
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadData = async () => {
      const [program, savedPRs] = await Promise.all([
        getItem<ActiveProgram>(STORAGE_KEYS.ACTIVE_PROGRAM),
        getItem<Record<string, PR>>(STORAGE_KEYS.PRS),
      ]);
      setPRs(savedPRs ?? {});
      if (program) {
        setProgramName(program.name);
        const dayExercises = program.days[program.currentDay % program.days.length]?.exercises ?? [];
        setExercises(
          dayExercises.map((ex) => ({
            name: ex.name,
            sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: '', done: false })),
            isPR: false,
          }))
        );
      }
    };
    loadData();
  }, []);

  const updateSet = (exIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exIndex] = {
        ...updated[exIndex],
        sets: updated[exIndex].sets.map((s, i) =>
          i === setIndex ? { ...s, [field]: value } : s
        ),
      };
      return updated;
    });
  };

  const toggleSetDone = (exIndex: number, setIndex: number) => {
    console.log('[Session] Set toggled done — exercise:', exercises[exIndex]?.name, 'set:', setIndex + 1);
    setExercises((prev) => {
      const updated = [...prev];
      const ex = updated[exIndex];
      const set = ex.sets[setIndex];
      const newDone = !set.done;

      // Check for PR
      if (newDone && set.weight) {
        const weight = parseFloat(set.weight);
        const existingPR = prs[ex.name];
        if (!existingPR || weight > existingPR.weight) {
          console.log('[Session] New PR detected for:', ex.name, 'weight:', weight);
          updated[exIndex] = { ...ex, isPR: true };
          setNewPRs((p) => [...p, ex.name]);
          triggerCelebration();
        }
      }

      updated[exIndex] = {
        ...updated[exIndex],
        sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, done: newDone } : s)),
      };
      return updated;
    });
  };

  const triggerCelebration = () => {
    Animated.sequence([
      Animated.timing(celebrateAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(celebrateAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const addSet = (exIndex: number) => {
    console.log('[Session] Add set pressed for exercise:', exercises[exIndex]?.name);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExercises((prev) => {
      const updated = [...prev];
      updated[exIndex] = {
        ...updated[exIndex],
        sets: [...updated[exIndex].sets, { weight: '', reps: '', done: false }],
      };
      return updated;
    });
  };

  const handleFinish = async () => {
    console.log('[Session] Finish Session pressed');
    const completedExercises = exercises.filter((ex) => ex.sets.some((s) => s.done));
    if (completedExercises.length === 0) {
      router.back();
      return;
    }

    // Save PRs
    const updatedPRs = { ...prs };
    exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.done && set.weight) {
          const weight = parseFloat(set.weight);
          if (!updatedPRs[ex.name] || weight > updatedPRs[ex.name].weight) {
            updatedPRs[ex.name] = { weight, date: new Date().toISOString() };
          }
        }
      });
    });
    await setItem(STORAGE_KEYS.PRS, updatedPRs);

    // Award XP
    let xpEarned = XP_AWARDS.WORKOUT_FINISH;
    if (newPRs.length > 0) xpEarned += XP_AWARDS.PR_BONUS * newPRs.length;
    await addXP(xpEarned);

    // Save history
    const history = (await getItem<WorkoutHistory[]>(STORAGE_KEYS.WORKOUT_HISTORY)) ?? [];
    const newEntry: WorkoutHistory = {
      date: new Date().toISOString(),
      exercises: completedExercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets.filter((s) => s.done).map((s) => ({
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
        })),
      })),
      xpEarned,
    };
    await setItem(STORAGE_KEYS.WORKOUT_HISTORY, [...history, newEntry]);

    // Update streak and total workouts
    const total = (await getItem<number>(STORAGE_KEYS.TOTAL_WORKOUTS)) ?? 0;
    await setItem(STORAGE_KEYS.TOTAL_WORKOUTS, total + 1);
    await setItem(STORAGE_KEYS.LAST_WORKOUT_DATE, new Date().toISOString());

    const streak = (await getItem<number>(STORAGE_KEYS.STREAK)) ?? 0;
    const newStreak = streak + 1;
    await setItem(STORAGE_KEYS.STREAK, newStreak);
    const bestStreak = (await getItem<number>(STORAGE_KEYS.BEST_STREAK)) ?? 0;
    if (newStreak > bestStreak) {
      await setItem(STORAGE_KEYS.BEST_STREAK, newStreak);
    }

    // Advance program day
    const program = await getItem<ActiveProgram>(STORAGE_KEYS.ACTIVE_PROGRAM);
    if (program) {
      await setItem(STORAGE_KEYS.ACTIVE_PROGRAM, {
        ...program,
        currentDay: program.currentDay + 1,
      });
    }

    console.log('[Session] Session saved — XP earned:', xpEarned);
    router.back();
  };

  const celebrateScale = celebrateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.3, 1],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{programName}</Text>
          <Text style={styles.headerSub}>Log your sets</Text>
        </View>
        <AnimatedPressable onPress={handleFinish} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </AnimatedPressable>
      </View>

      {/* PR celebration */}
      {newPRs.length > 0 && (
        <Animated.View style={[styles.prBanner, { transform: [{ scale: celebrateScale }] }]}>
          <Text style={styles.prBannerText}>🎉 New PR: {newPRs[newPRs.length - 1]}!</Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.map((exercise, exIndex) => (
          <View key={exIndex} style={[styles.exerciseCard, exercise.isPR && styles.exerciseCardPR]}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              {exercise.isPR && (
                <View style={styles.prBadge}>
                  <Text style={styles.prBadgeText}>🏆 PR</Text>
                </View>
              )}
            </View>

            {/* Set headers */}
            <View style={styles.setHeaderRow}>
              <Text style={styles.setHeaderLabel}>Set</Text>
              <Text style={styles.setHeaderLabel}>Weight (lbs)</Text>
              <Text style={styles.setHeaderLabel}>Reps</Text>
              <Text style={styles.setHeaderLabel}>Done</Text>
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={[styles.setRow, set.done && styles.setRowDone]}>
                <Text style={styles.setNumber}>{setIndex + 1}</Text>
                <TextInput
                  style={styles.setInput}
                  value={set.weight}
                  onChangeText={(v) => updateSet(exIndex, setIndex, 'weight', v)}
                  placeholder="0"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  editable={!set.done}
                />
                <TextInput
                  style={styles.setInput}
                  value={set.reps}
                  onChangeText={(v) => updateSet(exIndex, setIndex, 'reps', v)}
                  placeholder="0"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                  editable={!set.done}
                />
                <AnimatedPressable
                  onPress={() => toggleSetDone(exIndex, setIndex)}
                  style={[styles.doneButton, set.done && styles.doneButtonActive]}
                >
                  <Check size={16} color={set.done ? '#FFFFFF' : COLORS.textTertiary} />
                </AnimatedPressable>
              </View>
            ))}

            <AnimatedPressable onPress={() => addSet(exIndex)} style={styles.addSetButton}>
              <Plus size={14} color={COLORS.primary} />
              <Text style={styles.addSetText}>Add Set</Text>
            </AnimatedPressable>
          </View>
        ))}

        {exercises.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyTitle}>No exercises loaded</Text>
            <Text style={styles.emptySubtitle}>Add a split program first to track your session.</Text>
          </View>
        )}
      </ScrollView>

      {/* Finish button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <AnimatedPressable onPress={handleFinish} style={styles.finishButtonLarge}>
          <Text style={styles.finishButtonLargeText}>Finish Session 🦍 +{XP_AWARDS.WORKOUT_FINISH} XP</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  finishButton: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  finishButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  prBanner: {
    backgroundColor: COLORS.accentMuted,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  prBannerText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: 'Nunito_700Bold',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseCardPR: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentMuted,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
    flex: 1,
  },
  prBadge: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  prBadgeText: {
    fontSize: 12,
    color: COLORS.accent,
    fontFamily: 'Nunito_700Bold',
  },
  setHeaderRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  setHeaderLabel: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  setRowDone: {
    opacity: 0.6,
  },
  setNumber: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: 'Nunito_400Regular',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  doneButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  addSetText: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Nunito_400Regular',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  finishButtonLarge: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finishButtonLargeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Nunito_800ExtraBold',
  },
});
