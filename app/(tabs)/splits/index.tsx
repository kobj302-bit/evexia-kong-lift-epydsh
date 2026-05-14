import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { setItem, STORAGE_KEYS } from '@/utils/storage';
import { HARDCODED_SPLITS, splitToActiveProgram } from '@/utils/splits';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function SplitsScreen() {
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAddToTracker = async (splitId: string) => {
    console.log('[Splits] Add to Tracker pressed — split:', splitId);
    const split = HARDCODED_SPLITS.find((s) => s.id === splitId);
    if (!split) return;
    const program = splitToActiveProgram(split);
    await setItem(STORAGE_KEYS.ACTIVE_PROGRAM, program);
    setAddedId(splitId);
    console.log('[Splits] Program saved to tracker:', split.name);
    setTimeout(() => {
      router.push('/(tabs)/tracker');
    }, 800);
  };

  const toggleExpand = (id: string) => {
    console.log('[Splits] Split expanded/collapsed:', id);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Splits</Text>
        <Text style={styles.headerSub}>6 proven programs 💪</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {HARDCODED_SPLITS.map((split, index) => {
          const isExpanded = expandedId === split.id;
          const isAdded = addedId === split.id;

          return (
            <AnimatedListItem key={split.id} index={index}>
              <View style={styles.splitCard}>
                {/* Card header */}
                <View style={styles.splitHeader}>
                  <View style={styles.splitInfo}>
                    <Text style={styles.splitName}>{split.name}</Text>
                    <Text style={styles.splitDesc}>{split.description}</Text>
                  </View>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>{split.daysPerWeek}d/wk</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.splitActions}>
                  <AnimatedPressable
                    onPress={() => toggleExpand(split.id)}
                    style={styles.expandButton}
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} color={COLORS.textSecondary} />
                    ) : (
                      <ChevronDown size={16} color={COLORS.textSecondary} />
                    )}
                    <Text style={styles.expandButtonText}>
                      {isExpanded ? 'Hide' : 'View'} Program
                    </Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    onPress={() => handleAddToTracker(split.id)}
                    style={[styles.addButton, isAdded && styles.addButtonAdded]}
                  >
                    {isAdded ? (
                      <Check size={16} color="#FFFFFF" />
                    ) : null}
                    <Text style={styles.addButtonText}>
                      {isAdded ? 'Added!' : 'Add to Tracker'}
                    </Text>
                  </AnimatedPressable>
                </View>

                {/* Expanded days */}
                {isExpanded && (
                  <View style={styles.daysContainer}>
                    {split.days.map((day, dayIndex) => (
                      <View key={dayIndex} style={styles.daySection}>
                        <Text style={styles.dayTitle}>{day.day}</Text>
                        {day.exercises.map((ex, exIndex) => (
                          <View key={exIndex} style={styles.exerciseRow}>
                            <View style={styles.exerciseDot} />
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.exerciseSets}>{ex.sets}×{ex.reps}</Text>
                            {ex.rest && <Text style={styles.exerciseRest}>{ex.rest}</Text>}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </AnimatedListItem>
          );
        })}
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
    gap: 14,
  },
  splitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  splitHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  splitInfo: {
    flex: 1,
    gap: 4,
  },
  splitName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  splitDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontFamily: 'Nunito_400Regular',
  },
  daysBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  daysBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  splitActions: {
    flexDirection: 'row',
    gap: 10,
  },
  expandButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expandButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  addButtonAdded: {
    backgroundColor: COLORS.success,
  },
  addButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  daysContainer: {
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },
  daySection: {
    gap: 8,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Nunito_700Bold',
    marginBottom: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.textTertiary,
  },
  exerciseName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'Nunito_400Regular',
  },
  exerciseSets: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
  exerciseRest: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
  },
});
