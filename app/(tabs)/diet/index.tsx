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
import { setItem, STORAGE_KEYS } from '@/utils/storage';

const GOALS = ['Bulk', 'Cut', 'Maintain'];
const DIET_STYLES = ['Balanced', 'Keto', 'Mediterranean', 'Carnivore', 'Vegan', 'Paleo', 'IIFYM', 'Fasting'];

interface MealPlan {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: Array<{
    name: string;
    calories: number;
    items: string[];
  }>;
  groceryList: string[];
  tips: string[];
}

function DietContent() {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [goal, setGoal] = useState('Bulk');
  const [dietStyle, setDietStyle] = useState('Balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [groceryExpanded, setGroceryExpanded] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    console.log('[Diet] Generate pressed — prompt:', prompt, 'goal:', goal, 'style:', dietStyle);
    setLoading(true);
    setError('');
    setMealPlan(null);

    try {
      const response = await fetch('https://zth94rfafkmg6bdjhdzxh2d4exsfcmkz.app.specular.dev/api/diet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, goal, dietStyle }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[Diet] API error:', response.status, text);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Diet] Meal plan generated successfully');
      setMealPlan(data);
    } catch (e: any) {
      console.error('[Diet] Generate error:', e);
      setError(e.message ?? 'Failed to generate meal plan. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!mealPlan) return;
    console.log('[Diet] Save meal plan pressed');
    await setItem(STORAGE_KEYS.SAVED_DIET, mealPlan);
    console.log('[Diet] Meal plan saved to storage');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diet AI</Text>
        <Text style={styles.headerSub}>Eat like a champion 🥗</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prompt */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Describe your diet goals</Text>
          <TextInput
            style={styles.promptInput}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g. I want to bulk up, 3000 calories, high protein..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Goal selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Goal</Text>
          <View style={styles.segmentedControl}>
            {GOALS.map((g) => (
              <AnimatedPressable
                key={g}
                onPress={() => {
                  console.log('[Diet] Goal selected:', g);
                  setGoal(g);
                }}
                style={[styles.segment, goal === g && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, goal === g && styles.segmentTextActive]}>{g}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Diet style */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorLabel}>Diet Style</Text>
          <View style={styles.dietStyleGrid}>
            {DIET_STYLES.map((style) => (
              <AnimatedPressable
                key={style}
                onPress={() => {
                  console.log('[Diet] Diet style selected:', style);
                  setDietStyle(style);
                }}
                style={[styles.dietStyleChip, dietStyle === style && styles.dietStyleChipActive]}
              >
                <Text style={[styles.dietStyleText, dietStyle === style && styles.dietStyleTextActive]}>{style}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Generate */}
        <AnimatedPressable
          onPress={handleGenerate}
          style={[styles.generateButton, (!prompt.trim() || loading) && styles.generateButtonDisabled]}
          disabled={!prompt.trim() || loading}
        >
          <Text style={styles.generateButtonText}>
            {loading ? 'Kong is cooking... 🦍' : 'Generate Meal Plan 🥗'}
          </Text>
        </AnimatedPressable>

        {loading && <SkeletonWorkout />}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <AnimatedPressable onPress={handleGenerate} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        {/* Meal plan result */}
        {mealPlan && !loading && (
          <View style={styles.mealPlanResult}>
            {/* Macros */}
            <View style={styles.macrosCard}>
              <Text style={styles.caloriesNumber}>{mealPlan.dailyCalories}</Text>
              <Text style={styles.caloriesLabel}>Daily Calories</Text>
              <View style={styles.macroRow}>
                <View style={[styles.macroPill, { backgroundColor: 'rgba(255, 107, 43, 0.2)' }]}>
                  <Text style={[styles.macroPillText, { color: COLORS.primary }]}>
                    🥩 {mealPlan.protein}g Protein
                  </Text>
                </View>
                <View style={[styles.macroPill, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
                  <Text style={[styles.macroPillText, { color: COLORS.accent }]}>
                    🌾 {mealPlan.carbs}g Carbs
                  </Text>
                </View>
                <View style={[styles.macroPill, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <Text style={[styles.macroPillText, { color: COLORS.success }]}>
                    🥑 {mealPlan.fat}g Fat
                  </Text>
                </View>
              </View>
            </View>

            {/* Meals */}
            {mealPlan.meals.map((meal, i) => (
              <View key={i} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealCalories}>{meal.calories} cal</Text>
                </View>
                {meal.items.map((item, j) => (
                  <View key={j} style={styles.mealItem}>
                    <View style={styles.mealItemDot} />
                    <Text style={styles.mealItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Grocery list */}
            <View style={styles.groceryCard}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Diet] Grocery list toggled');
                  setGroceryExpanded(!groceryExpanded);
                }}
                style={styles.groceryHeader}
              >
                <Text style={styles.groceryTitle}>🛒 Grocery List</Text>
                <Text style={styles.groceryChevron}>{groceryExpanded ? '▲' : '▼'}</Text>
              </AnimatedPressable>
              {groceryExpanded && (
                <View style={styles.groceryList}>
                  {mealPlan.groceryList.map((item, i) => (
                    <Text key={i} style={styles.groceryItem}>• {item}</Text>
                  ))}
                </View>
              )}
            </View>

            {/* Tips */}
            {mealPlan.tips.length > 0 && (
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>💡 Kong's Tips</Text>
                {mealPlan.tips.map((tip, i) => (
                  <Text key={i} style={styles.tipText}>• {tip}</Text>
                ))}
              </View>
            )}

            <AnimatedPressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>💾 Save Meal Plan</Text>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function DietScreen() {
  return (
    <PremiumGate featureName="Diet AI">
      <DietContent />
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
  dietStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietStyleChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dietStyleChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  dietStyleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  dietStyleTextActive: {
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
  mealPlanResult: {
    gap: 12,
  },
  macrosCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  caloriesNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Nunito_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  caloriesLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
  },
  macroPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  macroPillText: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  mealCalories: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealItemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.textTertiary,
  },
  mealItemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    flex: 1,
  },
  groceryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groceryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  groceryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  groceryChevron: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  groceryList: {
    padding: 14,
    paddingTop: 0,
    gap: 6,
  },
  groceryItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
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
  saveButton: {
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
});
