import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PremiumGate } from '@/components/PremiumGate';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { addXP } from '@/utils/storage';
import { XP_AWARDS } from '@/utils/xp';

const HERO_WODS = [
  {
    id: 'murph',
    name: 'Murph',
    type: 'Hero WOD',
    description: 'For time. In memory of Lt. Michael Murphy.',
    movements: ['1 mile Run', '100 Pull-Ups', '200 Push-Ups', '300 Air Squats', '1 mile Run'],
    notes: 'Wear a 20 lb vest if possible. Partition pull-ups, push-ups, and squats as needed.',
    difficulty: '🔥🔥🔥🔥🔥',
  },
  {
    id: 'cindy',
    name: 'Cindy',
    type: 'Hero WOD',
    description: '20 min AMRAP (As Many Rounds As Possible)',
    movements: ['5 Pull-Ups', '10 Push-Ups', '15 Air Squats'],
    notes: 'Score is total rounds completed. Good score: 20+ rounds.',
    difficulty: '🔥🔥🔥',
  },
  {
    id: 'fran',
    name: 'Fran',
    type: 'Hero WOD',
    description: '21-15-9 reps for time',
    movements: ['Thrusters (95/65 lb)', 'Pull-Ups'],
    notes: 'Sub-5 minutes is elite. Sub-10 is solid. Scale weight as needed.',
    difficulty: '🔥🔥🔥🔥',
  },
  {
    id: '300',
    name: '300',
    type: 'Hero WOD',
    description: 'For time. Inspired by the movie 300.',
    movements: [
      '25 Pull-Ups',
      '50 Deadlifts (135 lb)',
      '50 Push-Ups',
      '50 Box Jumps (24")',
      '50 Floor Wipers (135 lb)',
      '50 KB Clean & Press (36 lb)',
      '25 Pull-Ups',
    ],
    notes: 'Total 300 reps. This is a benchmark of elite fitness.',
    difficulty: '🔥🔥🔥🔥🔥',
  },
  {
    id: 'angie',
    name: 'Angie',
    type: 'Hero WOD',
    description: 'For time. Complete all reps of each movement before moving on.',
    movements: ['100 Pull-Ups', '100 Push-Ups', '100 Sit-Ups', '100 Air Squats'],
    notes: 'Must complete all reps of each exercise before moving to the next.',
    difficulty: '🔥🔥🔥🔥',
  },
  {
    id: 'helen',
    name: 'Helen',
    type: 'Hero WOD',
    description: '3 rounds for time',
    movements: ['400m Run', '21 KB Swings (53/35 lb)', '12 Pull-Ups'],
    notes: 'Sub-10 minutes is excellent. Focus on unbroken KB swings.',
    difficulty: '🔥🔥🔥',
  },
];

const HOLIDAY_CHALLENGES = [
  {
    id: 'turkey-trot',
    name: 'Turkey Trot',
    type: 'Holiday Challenge',
    description: 'Thanksgiving Day challenge. Earn your feast.',
    movements: ['5K Run', '50 Burpees', '100 Air Squats', '50 Push-Ups'],
    notes: 'Complete before Thanksgiving dinner. No excuses.',
    difficulty: '🔥🔥🔥',
  },
  {
    id: '12-days',
    name: '12 Days of Christmas',
    type: 'Holiday Challenge',
    description: 'Complete each day adding one more movement.',
    movements: ['Day 1: 1 Clean', 'Day 2: 2 Snatches + Day 1', '...up to Day 12'],
    notes: 'Total: 364 reps across 12 movements. The ultimate holiday challenge.',
    difficulty: '🔥🔥🔥🔥🔥',
  },
  {
    id: 'nye-30',
    name: 'NYE 30-Day',
    type: 'Holiday Challenge',
    description: 'Start the new year right. 30 days of daily workouts.',
    movements: ['Daily: 100 Push-Ups', 'Daily: 100 Sit-Ups', 'Daily: 100 Squats', 'Daily: 10K Steps'],
    notes: 'No rest days. Kong is watching.',
    difficulty: '🔥🔥🔥🔥',
  },
  {
    id: 'valentines',
    name: "Valentine's Day",
    type: 'Holiday Challenge',
    description: 'Love yourself enough to train hard.',
    movements: ['14 rounds: 14 Push-Ups', '14 rounds: 14 Squats', '14 rounds: 14 Sit-Ups'],
    notes: 'February 14th. 14 is the theme. 196 reps total.',
    difficulty: '🔥🔥',
  },
  {
    id: 'july4',
    name: 'July 4th',
    type: 'Holiday Challenge',
    description: 'Freedom WOD. For time.',
    movements: ['1776m Run', '76 Push-Ups', '76 Air Squats', '17 Pull-Ups', '76 Sit-Ups'],
    notes: 'Numbers represent 1776. Celebrate freedom with sweat.',
    difficulty: '🔥🔥🔥',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    type: 'Holiday Challenge',
    description: 'Scary hard. For time.',
    movements: ['31 Burpees', '31 Box Jumps', '31 KB Swings', '31 Pull-Ups', '31 Push-Ups'],
    notes: '31 reps for October 31st. Costume optional.',
    difficulty: '🔥🔥🔥',
  },
  {
    id: 'memorial-day',
    name: 'Memorial Day',
    type: 'Holiday Challenge',
    description: 'Honor those who served.',
    movements: ['Murph (full)', 'Wear a 20 lb vest'],
    notes: 'The traditional Memorial Day Murph. Do it with respect.',
    difficulty: '🔥🔥🔥🔥🔥',
  },
  {
    id: 'shamrock',
    name: 'Shamrock Shuffle',
    type: 'Holiday Challenge',
    description: 'St. Patrick\'s Day. Green means go.',
    movements: ['3 rounds: 17 Push-Ups', '3 rounds: 17 Squats', '3 rounds: 17 Sit-Ups', '1.7 mile Run'],
    notes: '17 for March 17th. Wear green. Sweat green.',
    difficulty: '🔥🔥',
  },
];

type FilterType = 'All' | 'Hero WODs' | 'Holiday Challenges';

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

function WODsContent() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('All');
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const allWODs = [...HERO_WODS, ...HOLIDAY_CHALLENGES];
  const filtered = filter === 'All'
    ? allWODs
    : filter === 'Hero WODs'
    ? HERO_WODS
    : HOLIDAY_CHALLENGES;

  const handleComplete = async (id: string, name: string) => {
    console.log('[WODs] Complete WOD pressed:', name);
    if (completedIds.includes(id)) return;
    await addXP(XP_AWARDS.WOD_COMPLETE);
    setCompletedIds((prev) => [...prev, id]);
    console.log('[WODs] WOD completed — XP awarded:', XP_AWARDS.WOD_COMPLETE);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>WODs</Text>
        <Text style={styles.headerSub}>Hero workouts & challenges 🔥</Text>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {(['All', 'Hero WODs', 'Holiday Challenges'] as FilterType[]).map((f) => (
          <AnimatedPressable
            key={f}
            onPress={() => {
              console.log('[WODs] Filter selected:', f);
              setFilter(f);
            }}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map((wod, index) => {
          const isDone = completedIds.includes(wod.id);
          return (
            <AnimatedListItem key={wod.id} index={index}>
              <View style={[styles.wodCard, isDone && styles.wodCardDone]}>
                <View style={styles.wodHeader}>
                  <View style={styles.wodInfo}>
                    <View style={styles.wodTitleRow}>
                      <Text style={styles.wodName}>{wod.name}</Text>
                      {isDone && (
                        <View style={styles.doneBadge}>
                          <Text style={styles.doneBadgeText}>✓ Done</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.wodMeta}>
                      <View style={[styles.typeBadge, wod.type === 'Hero WOD' ? styles.heroBadge : styles.holidayBadge]}>
                        <Text style={[styles.typeBadgeText, wod.type === 'Hero WOD' ? styles.heroBadgeText : styles.holidayBadgeText]}>
                          {wod.type}
                        </Text>
                      </View>
                      <Text style={styles.difficulty}>{wod.difficulty}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.wodDesc}>{wod.description}</Text>

                <View style={styles.movementsList}>
                  {wod.movements.map((m, i) => (
                    <View key={i} style={styles.movementRow}>
                      <View style={styles.movementDot} />
                      <Text style={styles.movementText}>{m}</Text>
                    </View>
                  ))}
                </View>

                {wod.notes && (
                  <Text style={styles.wodNotes}>💡 {wod.notes}</Text>
                )}

                <AnimatedPressable
                  onPress={() => handleComplete(wod.id, wod.name)}
                  style={[styles.completeButton, isDone && styles.completeButtonDone]}
                  disabled={isDone}
                >
                  <Text style={styles.completeButtonText}>
                    {isDone ? '✓ Completed! +75 XP' : `Complete WOD +${XP_AWARDS.WOD_COMPLETE} XP`}
                  </Text>
                </AnimatedPressable>
              </View>
            </AnimatedListItem>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function WODsScreen() {
  return (
    <PremiumGate featureName="WODs & Challenges">
      <WODsContent />
    </PremiumGate>
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  wodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wodCardDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successMuted,
  },
  wodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  wodInfo: {
    flex: 1,
    gap: 6,
  },
  wodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wodName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  doneBadge: {
    backgroundColor: COLORS.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  doneBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  wodMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroBadge: {
    backgroundColor: COLORS.primaryMuted,
  },
  holidayBadge: {
    backgroundColor: COLORS.accentMuted,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  heroBadgeText: {
    color: COLORS.primary,
  },
  holidayBadgeText: {
    color: COLORS.accent,
  },
  difficulty: {
    fontSize: 14,
  },
  wodDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  movementsList: {
    gap: 6,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movementDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  movementText: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'Nunito_400Regular',
    flex: 1,
  },
  wodNotes: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeButtonDone: {
    backgroundColor: COLORS.success,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
});
