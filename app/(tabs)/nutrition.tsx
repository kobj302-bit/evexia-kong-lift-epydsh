import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Switch, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { COLORS, DIET_TYPES } from '@/constants/data';

const GOALS = ['Bulk', 'Cut', 'Maintain'];
const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'];
const SEX_OPTIONS = ['Male', 'Female'];

export default function NutritionTab() {
  const insets = useSafeAreaInsets();
  const { state, updateState, showToast } = useApp();
  const [weight, setWeight] = useState(String(state.profile.weight || 180));
  const [height, setHeight] = useState('70');
  const [age, setAge] = useState(String(state.profile.age || 25));
  const [sex, setSex] = useState(state.profile.sex === 'Female' ? 'Female' : 'Male');
  const [goal, setGoal] = useState('Maintain');
  const [activity, setActivity] = useState('Moderate');
  const [bf, setBf] = useState(String(state.profile.bf || ''));
  const [dietType, setDietType] = useState('Balanced');
  const [includeGrocery, setIncludeGrocery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loading) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinAnim.setValue(0);
    }
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handleCalculate = async () => {
    if (!state.apiKey) {
      setError('No API key set. Go to Settings ⚙️ to add your Anthropic API key.');
      return;
    }
    console.log('[Nutrition] Calculate — weight:', weight, 'height:', height, 'goal:', goal, 'activity:', activity);
    setLoading(true);
    setError('');
    try {
      const body = {
        weight: parseFloat(weight) || 180,
        height: parseFloat(height) || 70,
        age: parseInt(age) || 25,
        sex,
        goal,
        activity,
        bf: parseFloat(bf) || undefined,
        dietType,
        includeGrocery,
        apiKey: state.apiKey,
      };
      const response = await fetch(
        'https://zth94rfafkmg6bdjhdzxh2d4exsfcmkz.app.specular.dev/api/ai/nutrition',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error ${response.status}: ${text.slice(0, 200)}`);
      }
      const data = await response.json();
      console.log('[Nutrition] Result received — TDEE:', data?.tdee);
      updateState({ nResult: data, grocery: data.grocery || [] });
    } catch (e: any) {
      console.error('[Nutrition] Error:', e.message);
      setError(e.message || 'Failed to calculate. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const result = state.nResult;

  const proteinPct = result?.macros ? Math.round((result.macros.protein * 4) / result.targetCalories * 100) : 33;
  const carbsPct = result?.macros ? Math.round((result.macros.carbs * 4) / result.targetCalories * 100) : 34;
  const fatPct = result?.macros ? Math.round((result.macros.fat * 9) / result.targetCalories * 100) : 33;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>🧮 Nutrition Calculator</Text>
      <Text style={styles.pageSubtitle}>Get your TDEE and personalized macro targets</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>📏 Body Stats</Text>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholderTextColor={COLORS.textTertiary} placeholder="180" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Height (in)</Text>
            <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholderTextColor={COLORS.textTertiary} placeholder="70" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Age</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholderTextColor={COLORS.textTertiary} placeholder="25" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Body Fat % (opt)</Text>
            <TextInput style={styles.input} value={bf} onChangeText={setBf} keyboardType="numeric" placeholderTextColor={COLORS.textTertiary} placeholder="15" />
          </View>
        </View>

        <Text style={styles.label}>Sex</Text>
        <View style={styles.pillRow}>
          {SEX_OPTIONS.map((s) => (
            <AnimatedPressable key={s} onPress={() => setSex(s)} style={[styles.pill, sex === s && styles.pillActive]}>
              <Text style={[styles.pillText, sex === s && styles.pillTextActive]}>{s}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>🎯 Goal & Activity</Text>
        <Text style={styles.label}>Goal</Text>
        <View style={styles.pillRow}>
          {GOALS.map((g) => (
            <AnimatedPressable key={g} onPress={() => setGoal(g)} style={[styles.pill, goal === g && styles.pillActive]}>
              <Text style={[styles.pillText, goal === g && styles.pillTextActive]}>{g}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_LEVELS.map((a) => (
            <AnimatedPressable key={a} onPress={() => setActivity(a)} style={[styles.activityPill, activity === a && styles.activityPillActive]}>
              <Text style={[styles.activityText, activity === a && styles.activityTextActive]}>{a}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>🥗 Diet Preferences</Text>
        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.dietGrid}>
          {DIET_TYPES.map((d) => (
            <AnimatedPressable key={d.name} onPress={() => setDietType(d.name)} style={[styles.dietCard, dietType === d.name && styles.dietCardActive]}>
              <Text style={styles.dietEmoji}>{d.emoji}</Text>
              <Text style={[styles.dietName, dietType === d.name && styles.dietNameActive]}>{d.name}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Include Grocery List?</Text>
            <Text style={styles.toggleSub}>Get a shopping list with your plan</Text>
          </View>
          <Switch
            value={includeGrocery}
            onValueChange={setIncludeGrocery}
            trackColor={{ false: COLORS.surface2, true: COLORS.gold }}
            thumbColor={includeGrocery ? COLORS.goldBright : COLORS.textSecondary}
          />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      <AnimatedPressable onPress={handleCalculate} style={styles.calcBtn} disabled={loading}>
        {loading ? (
          <View style={styles.loadingRow}>
            <Animated.Text style={[styles.loadingIcon, { transform: [{ rotate: spin }] }]}>🧮</Animated.Text>
            <Text style={styles.calcBtnText}>Calculating...</Text>
          </View>
        ) : (
          <Text style={styles.calcBtnText}>Calculate & Plan 🧮</Text>
        )}
      </AnimatedPressable>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Your Nutrition Plan</Text>

          <View style={styles.tdeeBox}>
            <Text style={styles.tdeeLabel}>TDEE</Text>
            <Text style={styles.tdeeNum}>{result.tdee || '—'}</Text>
            <Text style={styles.tdeeUnit}>calories/day</Text>
          </View>

          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>Target Calories</Text>
            <Text style={styles.targetNum}>{result.targetCalories || result.tdee || '—'}</Text>
          </View>

          {result.macros && (
            <View style={styles.macrosSection}>
              <Text style={styles.macrosTitle}>Macro Breakdown</Text>
              <View style={styles.macroBar}>
                <View style={[styles.macroBarSegment, { flex: proteinPct, backgroundColor: COLORS.blue }]} />
                <View style={[styles.macroBarSegment, { flex: carbsPct, backgroundColor: COLORS.gold }]} />
                <View style={[styles.macroBarSegment, { flex: fatPct, backgroundColor: COLORS.red }]} />
              </View>
              <View style={styles.macroLegend}>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: COLORS.blue }]} />
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{result.macros.protein}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: COLORS.gold }]} />
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{result.macros.carbs}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: COLORS.red }]} />
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>{result.macros.fat}g</Text>
                </View>
              </View>
            </View>
          )}

          {result.meals && result.meals.length > 0 && (
            <View style={styles.mealsSection}>
              <Text style={styles.mealsSectionTitle}>🍽️ Meal Plan</Text>
              {result.meals.map((meal: any, i: number) => (
                <View key={i} style={styles.mealRow}>
                  <Text style={styles.mealName}>{typeof meal === 'string' ? meal : meal.name}</Text>
                  {meal.calories && <Text style={styles.mealCals}>{meal.calories} cal</Text>}
                </View>
              ))}
            </View>
          )}

          {result.grocery && result.grocery.length > 0 && (
            <View style={styles.grocerySection}>
              <Text style={styles.grocerySectionTitle}>🛒 Grocery List</Text>
              {result.grocery.map((item: string, i: number) => (
                <Text key={i} style={styles.groceryItem}>• {item}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  pageSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: -8 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, gap: 6 },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.gold },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityPillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  activityText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  activityTextActive: { color: COLORS.gold },
  dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dietCard: {
    width: '22%',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dietCardActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  dietEmoji: { fontSize: 22 },
  dietName: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  dietNameActive: { color: COLORS.gold },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  toggleSub: { fontSize: 12, color: COLORS.textSecondary },
  errorBox: {
    backgroundColor: `${COLORS.red}15`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { fontSize: 13, color: COLORS.red, lineHeight: 20 },
  calcBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingIcon: { fontSize: 20 },
  calcBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 16,
  },
  resultTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gold },
  tdeeBox: { alignItems: 'center', paddingVertical: 8 },
  tdeeLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  tdeeNum: { fontSize: 56, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  tdeeUnit: { fontSize: 14, color: COLORS.textSecondary },
  targetBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  targetNum: { fontSize: 20, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
  macrosSection: { gap: 10 },
  macrosTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  macroBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  macroBarSegment: { borderRadius: 3 },
  macroLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroDot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { fontSize: 12, color: COLORS.textSecondary },
  macroValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontVariant: ['tabular-nums'] },
  mealsSection: { gap: 8 },
  mealsSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mealName: { fontSize: 14, color: COLORS.text, flex: 1 },
  mealCals: { fontSize: 13, color: COLORS.textSecondary, fontVariant: ['tabular-nums'] },
  grocerySection: { gap: 8 },
  grocerySectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  groceryItem: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 22 },
});
