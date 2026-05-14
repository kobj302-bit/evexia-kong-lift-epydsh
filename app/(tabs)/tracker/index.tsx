import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getItem, STORAGE_KEYS } from '@/utils/storage';
import type { ActiveProgram, WorkoutHistory } from '@/utils/storage';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null);
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [completedDays, setCompletedDays] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    const [program, hist] = await Promise.all([
      getItem<ActiveProgram>(STORAGE_KEYS.ACTIVE_PROGRAM),
      getItem<WorkoutHistory[]>(STORAGE_KEYS.WORKOUT_HISTORY),
    ]);
    setActiveProgram(program);
    setHistory(hist ?? []);

    // Calculate completed days this week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const completed: number[] = [];
    (hist ?? []).forEach((w) => {
      const d = new Date(w.date);
      if (d >= weekStart) {
        completed.push(d.getDay() === 0 ? 6 : d.getDay() - 1);
      }
    });
    setCompletedDays(completed);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleStartSession = () => {
    console.log('[Tracker] Start Session pressed');
    router.push('/(tabs)/tracker/session');
  };

  const handleAddSplit = () => {
    console.log('[Tracker] Add Split pressed — navigating to splits');
    router.push('/(tabs)/splits');
  };

  const todayExercises = activeProgram
    ? activeProgram.days[activeProgram.currentDay % activeProgram.days.length]?.exercises ?? []
    : [];

  const currentDayName = activeProgram
    ? activeProgram.days[activeProgram.currentDay % activeProgram.days.length]?.day ?? 'Today'
    : 'Today';

  const recentHistory = history.slice(-5).reverse();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tracker</Text>
        <Text style={styles.headerSub}>Stay consistent 🔥</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly grid */}
        <AnimatedListItem index={0}>
          <View style={styles.weekCard}>
            <Text style={styles.cardTitle}>This Week</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day, index) => (
                <View key={day} style={styles.dayItem}>
                  <View style={[styles.dayCircle, completedDays.includes(index) && styles.dayCircleComplete]}>
                    {completedDays.includes(index) && <Text style={styles.dayCheck}>✓</Text>}
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedListItem>

        {/* Active program */}
        {activeProgram ? (
          <AnimatedListItem index={1}>
            <View style={styles.programCard}>
              <View style={styles.programHeader}>
                <View>
                  <Text style={styles.programName}>{activeProgram.name}</Text>
                  <Text style={styles.programDay}>Today: {currentDayName}</Text>
                </View>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {(activeProgram.currentDay % activeProgram.days.length) + 1}</Text>
                </View>
              </View>

              <View style={styles.exerciseList}>
                {todayExercises.slice(0, 5).map((ex, i) => (
                  <View key={i} style={styles.exerciseRow}>
                    <View style={styles.exerciseDot} />
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseSets}>{ex.sets}×{ex.reps}</Text>
                  </View>
                ))}
                {todayExercises.length > 5 && (
                  <Text style={styles.moreExercises}>+{todayExercises.length - 5} more exercises</Text>
                )}
              </View>

              <AnimatedPressable onPress={handleStartSession} style={styles.startButton}>
                <Text style={styles.startButtonText}>Start Session 🏋️</Text>
              </AnimatedPressable>
            </View>
          </AnimatedListItem>
        ) : (
          <AnimatedListItem index={1}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No active program</Text>
              <Text style={styles.emptySubtitle}>Kong needs a plan. Add a split to get started.</Text>
              <AnimatedPressable onPress={handleAddSplit} style={styles.addSplitButton}>
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.addSplitText}>Add a Split</Text>
              </AnimatedPressable>
            </View>
          </AnimatedListItem>
        )}

        {/* Recent history */}
        {recentHistory.length > 0 && (
          <AnimatedListItem index={2}>
            <View style={styles.historySection}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              {recentHistory.map((workout, i) => {
                const dateStr = new Date(workout.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <View key={i} style={styles.historyCard}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyDate}>{dateStr}</Text>
                      <Text style={styles.historyExercises}>{workout.exercises.length} exercises</Text>
                    </View>
                    <View style={styles.historyXP}>
                      <Text style={styles.historyXPText}>+{workout.xpEarned} XP</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </AnimatedListItem>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  weekCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayCircleComplete: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_600SemiBold',
  },
  programCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  programName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  programDay: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  dayBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  dayBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  exerciseList: {
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: 'Nunito_400Regular',
  },
  exerciseSets: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  moreExercises: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
    marginLeft: 16,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  addSplitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  addSplitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  historySection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyLeft: {
    gap: 2,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Nunito_600SemiBold',
  },
  historyExercises: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  historyXP: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyXPText: {
    fontSize: 13,
    color: COLORS.accent,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
});
