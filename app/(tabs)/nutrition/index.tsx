import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PremiumGate } from '@/components/PremiumGate';
import { SkeletonWorkout } from '@/components/SkeletonLoader';
import { useSubscription } from '@/contexts/SubscriptionContext';

const GOALS = ['Lose Fat', 'Maintain', 'Build Muscle', 'Bulk', 'Cut'];
const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'];
const DIET_STYLES = ['Balanced', 'Keto', 'Mediterranean', 'Carnivore', 'Vegan', 'Paleo', 'IIFYM', 'Fasting'];

interface NutritionResult {
  tdee: number;
  targetCalories: number;
  bmr: number;
  bmi: number;
  protein: number;
  carbs: number;
  fat: number;
  mealIdeas: Array<{ name: string; calories: number; description: string }>;
  groceryList: string[];
  tips: string[];
}

function NutritionContent() {
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Male');
  const [goal, setGoal] = useState('Build Muscle');
  const [activityLevel, setActivityLevel] = useState('Moderate');
  const [bodyFat, setBodyFat] = useState('');
  const [dietStyle, setDietStyle] = useState('Balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<NutritionResult | null>(null);

  const canCalculate = weight && heightFt && age;

  const handleCalculate = async () => {
    if (!canCalculate) return;
    console.log('[Nutrition] Calculate pressed — weight:', weight, 'height:', heightFt + "'" + heightIn + '"', 'age:', age, 'goal:', goal);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('https://zth94rfafkmg6bdjhdzxh2d4exsfcmkz.app.specular.dev/api/nutrition/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(weight),
          heightFt: parseFloat(heightFt),
          heightIn: parseFloat(heightIn) || 0,
          age: parseInt(age),
          sex,
          goal,
          activityLevel,
          bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
          dietStyle,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[Nutrition] API error:', response.status, text);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Nutrition] Calculation complete — TDEE:', data.tdee);
      setResult(data);
    } catch (e: any) {
      console.error('[Nutrition] Calculate error:', e);
      setError(e.message ?? 'Failed to calculate. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const macroTotal = result ? result.protein + result.carbs + result.fat : 1;
  const proteinPct = result ? Math.round((result.protein * 4 / result.targetCalories) * 100) : 0;
  const carbsPct = result ? Math.round((result.carbs * 4 / result.targetCalories) * 100) : 0;
  const fatPct = result ? Math.round((result.fat * 9 / result.targetCalories) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <Text style={styles.headerSub}>TDEE & macro calculator ❤️</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Stats form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Your Stats</Text>

          {/* Sex toggle */}
          <View style={styles.sexRow}>
            {['Male', 'Female'].map((s) => (
              <AnimatedPressable
                key={s}
                onPress={() => setSex(s)}
                style={[styles.sexButton, sex === s && styles.sexButtonActive]}
              >
                <Text style={[styles.sexButtonText, sex === s && styles.sexButtonTextActive]}>
                  {s === 'Male' ? '♂️ Male' : '♀️ Female'}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="185"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="25"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Height (ft)</Text>
              <TextInput
                style={styles.input}
                value={heightFt}
                onChangeText={setHeightFt}
                placeholder="5"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Height (in)</Text>
              <TextInput
                style={styles.input}
                value={heightIn}
                onChangeText={setHeightIn}
                placeholder="10"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Body Fat %</Text>
              <TextInput
                style={styles.input}
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="15"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Goal */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Goal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {GOALS.map((g) => (
                <AnimatedPressable
                  key={g}
                  onPress={() => {
                    console.log('[Nutrition] Goal selected:', g);
                    setGoal(g);
                  }}
                  style={[styles.chip, goal === g && styles.chipActive]}
                >
                  <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{g}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Activity level */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Activity Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {ACTIVITY_LEVELS.map((level) => (
                <AnimatedPressable
                  key={level}
                  onPress={() => {
                    console.log('[Nutrition] Activity level selected:', level);
                    setActivityLevel(level);
                  }}
                  style={[styles.chip, activityLevel === level && styles.chipActive]}
                >
                  <Text style={[styles.chipText, activityLevel === level && styles.chipTextActive]}>{level}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Diet style */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Diet Style</Text>
          <View style={styles.dietGrid}>
            {DIET_STYLES.map((style) => (
              <AnimatedPressable
                key={style}
                onPress={() => {
                  console.log('[Nutrition] Diet style selected:', style);
                  setDietStyle(style);
                }}
                style={[styles.chip, dietStyle === style && styles.chipActive]}
              >
                <Text style={[styles.chipText, dietStyle === style && styles.chipTextActive]}>{style}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Calculate button */}
        <AnimatedPressable
          onPress={handleCalculate}
          style={[styles.calculateButton, (!canCalculate || loading) && styles.calculateButtonDisabled]}
          disabled={!canCalculate || loading}
        >
          <Text style={styles.calculateButtonText}>
            {loading ? 'Kong is calculating... 🦍' : 'Calculate My Macros ⚡'}
          </Text>
        </AnimatedPressable>

        {loading && <SkeletonWorkout />}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <AnimatedPressable onPress={handleCalculate} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        {/* Results */}
        {result && !loading && (
          <View style={styles.results}>
            {/* TDEE */}
            <View style={styles.tdeeCard}>
              <View style={styles.tdeeRow}>
                <View style={styles.tdeeItem}>
                  <Text style={styles.tdeeNumber}>{result.tdee.toLocaleString()}</Text>
                  <Text style={styles.tdeeLabel}>TDEE</Text>
                </View>
                <View style={styles.tdeeDivider} />
                <View style={styles.tdeeItem}>
                  <Text style={[styles.tdeeNumber, { color: COLORS.primary }]}>{result.targetCalories.toLocaleString()}</Text>
                  <Text style={styles.tdeeLabel}>Target Calories</Text>
                </View>
              </View>
              <View style={styles.bmiRow}>
                <Text style={styles.bmiText}>BMR: {result.bmr.toLocaleString()} cal</Text>
                <Text style={styles.bmiText}>BMI: {Number(result.bmi).toFixed(1)}</Text>
              </View>
            </View>

            {/* Macros */}
            <View style={styles.macrosCard}>
              <Text style={styles.macrosTitle}>Macro Breakdown</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarSegment, { flex: proteinPct, backgroundColor: COLORS.primary }]} />
                <View style={[styles.macroBarSegment, { flex: carbsPct, backgroundColor: COLORS.accent }]} />
                <View style={[styles.macroBarSegment, { flex: fatPct, backgroundColor: COLORS.success }]} />
              </View>
              <View style={styles.macroLegend}>
                <View style={styles.macroLegendItem}>
                  <View style={[styles.macroLegendDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.macroLegendText}>Protein: {result.protein}g ({proteinPct}%)</Text>
                </View>
                <View style={styles.macroLegendItem}>
                  <View style={[styles.macroLegendDot, { backgroundColor: COLORS.accent }]} />
                  <Text style={styles.macroLegendText}>Carbs: {result.carbs}g ({carbsPct}%)</Text>
                </View>
                <View style={styles.macroLegendItem}>
                  <View style={[styles.macroLegendDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.macroLegendText}>Fat: {result.fat}g ({fatPct}%)</Text>
                </View>
              </View>
            </View>

            {/* Meal ideas */}
            {result.mealIdeas && result.mealIdeas.length > 0 && (
              <View style={styles.mealIdeasSection}>
                <Text style={styles.sectionTitle}>Meal Ideas</Text>
                {result.mealIdeas.map((meal, i) => (
                  <View key={i} style={styles.mealIdeaCard}>
                    <View style={styles.mealIdeaHeader}>
                      <Text style={styles.mealIdeaName}>{meal.name}</Text>
                      <Text style={styles.mealIdeaCalories}>{meal.calories} cal</Text>
                    </View>
                    <Text style={styles.mealIdeaDesc}>{meal.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Tips */}
            {result.tips && result.tips.length > 0 && (
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>💡 Kong's Nutrition Tips</Text>
                {result.tips.map((tip, i) => (
                  <Text key={i} style={styles.tipText}>• {tip}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function NutritionScreen() {
  return (
    <PremiumGate featureName="Nutrition Calculator">
      <NutritionContent />
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
  content: {
    padding: 16,
    gap: 16,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  sexRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sexButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sexButtonActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  sexButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  sexButtonTextActive: {
    color: COLORS.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: 'Nunito_400Regular',
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
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calculateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  calculateButtonDisabled: {
    opacity: 0.4,
  },
  calculateButtonText: {
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
  results: {
    gap: 14,
  },
  tdeeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tdeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdeeItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tdeeDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.border,
  },
  tdeeNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  tdeeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  bmiText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  macrosCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  macrosTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  macroBar: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  macroBarSegment: {
    borderRadius: 6,
  },
  macroLegend: {
    gap: 6,
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroLegendText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  mealIdeasSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  mealIdeaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealIdeaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealIdeaName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  mealIdeaCalories: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
  mealIdeaDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
  tipsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
});
