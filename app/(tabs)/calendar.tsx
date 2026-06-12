import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import type { WorkoutHistory, SessionSet } from '@/contexts/AppContext';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function todayStr(): string {
  const now = new Date();
  return toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday}, ${monthName} ${day}`;
}

function calcStreak(history: WorkoutHistory[]): number {
  if (!history.length) return 0;
  const dates = new Set(history.map((h) => h.date.split('T')[0]));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const s = toDateStr(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (dates.has(s)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function calcVolume(exercises: SessionSet[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      const reps = parseFloat(s.reps) || 0;
      const weight = parseFloat(s.weight) || 0;
      total += reps * weight;
    }
  }
  return total;
}

interface DayCell {
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
}

function buildCalendarGrid(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({ dateStr: toDateStr(prevYear, prevMonth, d), day: d, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: toDateStr(year, month, d), day: d, isCurrentMonth: true });
  }

  // Next month padding to fill 6 rows
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({ dateStr: toDateStr(nextYear, nextMonth, d), day: d, isCurrentMonth: false });
  }

  return cells;
}

export default function CalendarScreen() {
  const { state } = useApp();
  const insets = useSafeAreaInsets();

  const today = todayStr();
  const todayDate = new Date();

  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  // Build lookup map
  const historyMap = useMemo<Record<string, WorkoutHistory>>(() => {
    const map: Record<string, WorkoutHistory> = {};
    for (const entry of state.history) {
      const key = entry.date.split('T')[0];
      map[key] = entry;
    }
    return map;
  }, [state.history]);

  const calendarGrid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Stats for current viewed month
  const monthWorkouts = useMemo(() => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const prefix = `${viewYear}-${mm}`;
    return state.history.filter((h) => h.date.split('T')[0].startsWith(prefix)).length;
  }, [state.history, viewYear, viewMonth]);

  const currentStreak = useMemo(() => calcStreak(state.history), [state.history]);
  const totalWorkouts = state.history.length;

  const selectedWorkout = historyMap[selectedDate] ?? null;

  const handlePrevMonth = () => {
    console.log('[Calendar] Navigate to previous month');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    console.log('[Calendar] Navigate to next month');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayPress = (dateStr: string) => {
    console.log('[Calendar] Day selected:', dateStr);
    setSelectedDate(dateStr);
  };

  const selectedDateHeader = formatDateHeader(selectedDate);
  const selectedVolume = selectedWorkout ? calcVolume(selectedWorkout.exercises) : 0;
  const volumeDisplay = selectedVolume.toLocaleString();
  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Calendar Card */}
      <View style={styles.card}>
        {/* Month Header */}
        <View style={styles.monthHeader}>
          <AnimatedPressable onPress={handlePrevMonth} style={styles.chevronBtn}>
            <Text style={styles.chevron}>‹</Text>
          </AnimatedPressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <AnimatedPressable onPress={handleNextMonth} style={styles.chevronBtn}>
            <Text style={styles.chevron}>›</Text>
          </AnimatedPressable>
        </View>

        {/* Day of week labels */}
        <View style={styles.dayLabelsRow}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={styles.dayLabelCell}>
              <Text style={styles.dayLabelText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {calendarGrid.map((cell) => {
            const isToday = cell.dateStr === today;
            const isSelected = cell.dateStr === selectedDate;
            const hasWorkout = !!historyMap[cell.dateStr];

            const cellBg = isSelected ? COLORS.gold : 'transparent';
            const cellBorder = isToday && !isSelected ? COLORS.gold : 'transparent';
            const numColor = isSelected
              ? '#0A0A0A'
              : cell.isCurrentMonth
              ? COLORS.text
              : COLORS.textTertiary;

            return (
              <AnimatedPressable
                key={cell.dateStr}
                onPress={() => handleDayPress(cell.dateStr)}
                style={[
                  styles.dayCell,
                  { backgroundColor: cellBg, borderColor: cellBorder },
                ]}
              >
                <Text style={[styles.dayNum, { color: numColor }]}>{cell.day}</Text>
                {hasWorkout && !isSelected && (
                  <View style={styles.workoutDot} />
                )}
                {hasWorkout && isSelected && (
                  <View style={styles.workoutDotSelected} />
                )}
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {/* Stats Strip */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statEmoji}>🏋️</Text>
          <Text style={styles.statNum}>{monthWorkouts}</Text>
          <Text style={styles.statLabel}>this month</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statNum}>{currentStreak}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statEmoji}>📅</Text>
          <Text style={styles.statNum}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>total</Text>
        </View>
      </View>

      {/* Detail Card */}
      <View style={styles.detailCard}>
        <Text style={styles.detailDateHeader}>{selectedDateHeader}</Text>

        {!selectedWorkout ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛋️</Text>
            <Text style={styles.emptyTitle}>Rest Day</Text>
            <Text style={styles.emptySubtitle}>No workout logged for this day</Text>
          </View>
        ) : (
          <View>
            {/* XP Badge */}
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{selectedWorkout.xpEarned} XP ⚡</Text>
            </View>

            {/* Exercises */}
            {selectedWorkout.exercises.map((ex, exIdx) => (
              <View key={exIdx} style={styles.exerciseBlock}>
                <Text style={styles.exerciseName}>{ex.exercise}</Text>
                {ex.sets.map((set, setIdx) => {
                  const setNum = setIdx + 1;
                  const repsVal = set.reps;
                  const weightVal = set.weight;
                  const setLabel = `Set ${setNum}`;
                  const setDetail = `${repsVal} reps @ ${weightVal} lb`;
                  return (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={styles.setLabel}>{setLabel}</Text>
                      <Text style={styles.setSep}> — </Text>
                      <Text style={styles.setDetail}>{setDetail}</Text>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Total Volume */}
            <View style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>Total Volume:</Text>
              <Text style={styles.volumeValue}>{volumeDisplay} lb</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  // Calendar card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chevronBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
  },
  chevron: {
    fontSize: 22,
    color: COLORS.gold,
    fontWeight: '700',
    lineHeight: 26,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },

  // Day labels
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    marginVertical: 2,
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '600',
  },
  workoutDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginTop: 2,
  },
  workoutDotSelected: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#0A0A0A',
    marginTop: 2,
  },

  // Stats strip
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  statEmoji: {
    fontSize: 18,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.gold,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Detail card
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  detailDateHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  // XP badge
  xpBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.goldMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border2,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  xpBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
  },

  // Exercise blocks
  exerciseBlock: {
    marginBottom: 14,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  setLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    minWidth: 44,
  },
  setSep: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  setDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Volume row
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  volumeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.green,
  },
});
