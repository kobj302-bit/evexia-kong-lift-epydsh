import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonWorkout } from '@/components/SkeletonLoader';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getItem, setItem, STORAGE_KEYS, decrementTrialUses, getTrialUses } from '@/utils/storage';
import type { ActiveProgram } from '@/utils/storage';

const LEVELS = ['Beginner', 'Intermediate', 'Expert'];
const STAGES = ['Setting the Stage', 'Bulk', 'Cut', 'Maintenance', 'Muscle Building'];
const PROGRAM_TYPES = ['Daily Workout', 'Weekly Program'];
const ATHLETE_PICKS = [
  { emoji: '🏃', label: 'Ronaldo' },
  { emoji: '💪', label: 'Arnold' },
  { emoji: '🪖', label: 'Military' },
  { emoji: '🚒', label: 'Firefighter' },
  { emoji: '👮', label: 'Police' },
  { emoji: '🏋️', label: 'Bodybuilder' },
  { emoji: '⚡', label: 'Functional' },
  { emoji: '🥊', label: 'Fighter' },
];

interface GeneratedProgram {
  title: string;
  description: string;
  type: string;
  days?: Array<{ day: string; exercises: Array<{ name: string; sets: number; reps: string; rest?: string; notes?: string }> }>;
  exercises?: Array<{ name: string; sets: number; reps: string; rest?: string; notes?: string }>;
}

export default function AthleteScreen() {
  const insets = useSafeAreaInsets();
  const { isPremium } = useSubscription();
  const [trialUses, setTrialUses] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [stage, setStage] = useState('Bulk');
  const [programType, setProgramType] = useState('Daily Workout');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [program, setProgram] = useState<GeneratedProgram | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const loadTrialUses = useCallback(async () => {
    const uses = await getTrialUses();
    setTrialUses(uses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrialUses();
    }, [loadTrialUses])
  );

  const canGenerate = isPremium || trialUses > 0;

  const handleAthleteQuickPick = (label: string) => {
    console.log('[Athlete] Quick pick selected:', label);
    setPrompt(`Train like ${label}`);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    console.log('[Athlete] Generate pressed — prompt:', prompt, 'level:', level, 'stage:', stage, 'type:', programType);
    setLoading(true);
    setError('');
    setProgram(null);

    try {
      const response = await fetch('https://zth94rfafkmg6bdjhdzxh2d4exsfcmkz.app.specular.dev/api/athlete/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, level, stage, programType }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[Athlete] API error:', response.status, text);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Athlete] Program generated successfully');
      setProgram(data);

      // Decrement trial uses if not premium
      if (!isPremium) {
        const remaining = await decrementTrialUses();
        setTrialUses(remaining);
        console.log('[Athlete] Trial uses remaining:', remaining);
      }
    } catch (e: any) {
      console.error('[Athlete] Generate error:', e);
      setError(e.message ?? 'Failed to generate program. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToTracker = async () => {
    if (!program) return;
    console.log('[Athlete] Copy to Tracker pressed — program:', program.title);

    const days = program.days ?? [{ day: 'Day 1', exercises: program.exercises ?? [] }];
    const activeProgram: ActiveProgram = {
      name: program.title,
      days: days.map((d) => ({
        day: d.day,
        exercises: d.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          rest: ex.rest,
          notes: ex.notes,
        })),
      })),
      currentDay: 0,
    };
    await setItem(STORAGE_KEYS.ACTIVE_PROGRAM, activeProgram);
    console.log('[Athlete] Program saved to tracker');
    router.push('/(tabs)/tracker');
  };

  const handleBuyTrial = async () => {
    console.log('[Athlete] Buy Trial pressed — $1 one-time');
    router.push('/paywall');
  };

  const handleGoPremium = () => {
    console.log('[Athlete] Go Premium pressed');
    router.push('/paywall');
  };

  // Gate screen
  if (!canGenerate) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Athlete AI</Text>
          <Text style={styles.headerSub}>Train like the best 🤖</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.gateContent, { paddingBottom: 100 }]}>
          <View style={styles.gateHero}>
            <Text style={styles.gateEmoji}>🤖</Text>
            <Text style={styles.gateTitle}>Athlete AI Coach</Text>
            <Text style={styles.gateSub}>
              Generate custom workouts for any athlete, goal, or style. Kong's AI brain is ready.
            </Text>
          </View>

          <View style={styles.gateOptions}>
            <AnimatedPressable onPress={handleGoPremium} style={styles.premiumOption}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionBadge}>BEST VALUE</Text>
              </View>
              <Text style={styles.optionTitle}>Go Premium</Text>
              <Text style={styles.optionPrice}>$7 / month</Text>
              <Text style={styles.optionDesc}>Unlimited AI workouts + all premium features</Text>
            </AnimatedPressable>

            <AnimatedPressable onPress={handleBuyTrial} style={styles.trialOption}>
              <Text style={styles.optionTitle}>Try Once</Text>
              <Text style={[styles.optionPrice, { color: COLORS.text }]}>$1 one-time</Text>
              <Text style={styles.optionDesc}>One AI workout generation. Repurchase anytime.</Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Athlete AI</Text>
        <View style={styles.headerRight}>
          {!isPremium && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>{trialUses} trial left</Text>
            </View>
          )}
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>⚡ Premium</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prompt input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Describe your workout</Text>
          <TextInput
            style={styles.promptInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g. Train like Ronaldo, Military Army workout, Upper body dumbbells 40 min..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Quick picks */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPicksScroll}>
            <View style={styles.quickPicksRow}>
              {ATHLETE_PICKS.map((pick) => (
                <AnimatedPressable
                  key={pick.label}
                  onPress={() => handleAthleteQuickPick(pick.label)}
                  style={styles.quickPick}
                >
                  <Text style={styles.quickPickEmoji}>{pick.emoji}</Text>
                  <Text style={styles.quickPickLabel}>{pick.label}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Level selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Level</Text>
          <View style={styles.segmentedControl}>
            {LEVELS.map((l) => (
              <AnimatedPressable
                key={l}
                onPress={() => {
                  console.log('[Athlete] Level selected:', l);
                  setLevel(l);
                }}
                style={[styles.segment, level === l && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, level === l && styles.segmentTextActive]}>{l}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Stage selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Stage</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.stageRow}>
              {STAGES.map((s) => (
                <AnimatedPressable
                  key={s}
                  onPress={() => {
                    console.log('[Athlete] Stage selected:', s);
                    setStage(s);
                  }}
                  style={[styles.stageChip, stage === s && styles.stageChipActive]}
                >
                  <Text style={[styles.stageChipText, stage === s && styles.stageChipTextActive]}>{s}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Program type */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Program Type</Text>
          <View style={styles.segmentedControl}>
            {PROGRAM_TYPES.map((t) => (
              <AnimatedPressable
                key={t}
                onPress={() => {
                  console.log('[Athlete] Program type selected:', t);
                  setProgramType(t);
                }}
                style={[styles.segment, programType === t && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, programType === t && styles.segmentTextActive]}>{t}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Generate button */}
        <AnimatedPressable
          onPress={handleGenerate}
          style={[styles.generateButton, (!prompt.trim() || loading) && styles.generateButtonDisabled]}
          disabled={!prompt.trim() || loading}
        >
          <Text style={styles.generateButtonText}>
            {loading ? 'Kong is thinking... 🦍' : 'Generate Program ⚡'}
          </Text>
        </AnimatedPressable>

        {/* Loading */}
        {loading && <SkeletonWorkout />}

        {/* Error */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <AnimatedPressable onPress={handleGenerate} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        {/* Generated program */}
        {program && !loading && (
          <View style={styles.programResult}>
            <View style={styles.programResultHeader}>
              <Text style={styles.programResultTitle}>{program.title}</Text>
              <Text style={styles.programResultDesc}>{program.description}</Text>
            </View>

            {/* Weekly program */}
            {program.days && program.days.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayAccordion}>
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Athlete] Day accordion toggled:', day.day);
                    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
                  }}
                  style={styles.dayAccordionHeader}
                >
                  <Text style={styles.dayAccordionTitle}>{day.day}</Text>
                  <Text style={styles.dayAccordionCount}>{day.exercises.length} exercises</Text>
                  <Text style={styles.dayAccordionChevron}>{expandedDay === dayIndex ? '▲' : '▼'}</Text>
                </AnimatedPressable>
                {expandedDay === dayIndex && (
                  <View style={styles.dayExercises}>
                    {day.exercises.map((ex, exIndex) => (
                      <View key={exIndex} style={styles.exerciseItem}>
                        <Text style={styles.exerciseItemName}>{ex.name}</Text>
                        <Text style={styles.exerciseItemDetail}>{ex.sets}×{ex.reps}</Text>
                        {ex.rest && <Text style={styles.exerciseItemRest}>Rest: {ex.rest}</Text>}
                        {ex.notes && <Text style={styles.exerciseItemNotes}>{ex.notes}</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {/* Daily workout */}
            {program.exercises && program.exercises.map((ex, exIndex) => (
              <View key={exIndex} style={styles.exerciseItem}>
                <Text style={styles.exerciseItemName}>{ex.name}</Text>
                <Text style={styles.exerciseItemDetail}>{ex.sets}×{ex.reps}</Text>
                {ex.rest && <Text style={styles.exerciseItemRest}>Rest: {ex.rest}</Text>}
                {ex.notes && <Text style={styles.exerciseItemNotes}>{ex.notes}</Text>}
              </View>
            ))}

            <AnimatedPressable onPress={handleCopyToTracker} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>📋 Copy to Tracker</Text>
            </AnimatedPressable>

            {!isPremium && (
              <AnimatedPressable onPress={handleGoPremium} style={styles.upgradeBanner}>
                <Text style={styles.upgradeBannerText}>⚡ Upgrade to Premium for unlimited generations</Text>
              </AnimatedPressable>
            )}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  trialBadge: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  trialBadgeText: {
    fontSize: 12,
    color: COLORS.accent,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  premiumBadge: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  premiumBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: 'Nunito_400Regular',
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPicksScroll: {
    marginHorizontal: -4,
  },
  quickPicksRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  quickPick: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPickEmoji: {
    fontSize: 20,
  },
  quickPickLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  selectorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectorLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  stageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stageChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stageChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  stageChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  stageChipTextActive: {
    color: COLORS.primary,
  },
  generateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.4,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Nunito_800ExtraBold',
  },
  errorCard: {
    backgroundColor: COLORS.dangerMuted,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  programResult: {
    gap: 12,
  },
  programResultHeader: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  programResultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  programResultDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: 'Nunito_400Regular',
  },
  dayAccordion: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  dayAccordionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  dayAccordionCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  dayAccordionChevron: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  dayExercises: {
    padding: 14,
    paddingTop: 0,
    gap: 10,
  },
  exerciseItem: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  exerciseItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  exerciseItemDetail: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
  exerciseItemRest: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  exerciseItemNotes: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  copyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  upgradeBanner: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  upgradeBannerText: {
    fontSize: 13,
    color: COLORS.accent,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  // Gate styles
  gateContent: {
    padding: 20,
    gap: 24,
  },
  gateHero: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  gateEmoji: {
    fontSize: 72,
    lineHeight: 88,
  },
  gateTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
  },
  gateSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Nunito_400Regular',
  },
  gateOptions: {
    gap: 12,
  },
  premiumOption: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 16,
    padding: 20,
    gap: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  trialOption: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionHeader: {
    flexDirection: 'row',
  },
  optionBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 10,
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  optionPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Nunito_800ExtraBold',
  },
  optionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
});
