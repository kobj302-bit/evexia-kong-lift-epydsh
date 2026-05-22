import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Switch, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { COLORS, DIET_TYPES } from '@/constants/data';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProGate } from '@/components/ProGate';

const GOALS = ['Bulk', 'Cut', 'Maintain'];
const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'];
const SEX_OPTIONS = ['Male', 'Female'];
const PHASES = ['Bulking', 'Cutting', 'Maintenance', 'Setting the Stage', 'Building Muscle'];
const SPORTS = ['Soccer', 'Basketball', 'Swimming', 'Wrestling', 'Boxing', 'MMA', 'Rugby', 'Football'];

interface AthleteMatchOption {
  label: string;
  emoji: string;
  athleteMatch: string;
  goal?: string;
  dietType?: string;
}

const ATHLETE_MATCHES: AthleteMatchOption[] = [
  { label: 'Ronaldo', emoji: '🦵', athleteMatch: 'Cristiano Ronaldo', goal: 'Maintain', dietType: 'Balanced' },
  { label: 'Arnold', emoji: '💪', athleteMatch: 'Arnold Schwarzenegger', goal: 'Bulk', dietType: 'Balanced' },
  { label: 'LeBron', emoji: '🏀', athleteMatch: 'LeBron James', goal: 'Maintain', dietType: 'Balanced' },
  { label: 'Phelps', emoji: '🏊', athleteMatch: 'Michael Phelps', goal: 'Maintain', dietType: 'Balanced' },
  { label: 'Navy SEAL', emoji: '🔱', athleteMatch: 'Navy SEAL', goal: 'Maintain', dietType: 'Balanced' },
  { label: 'Firefighter', emoji: '🚒', athleteMatch: 'Firefighter', goal: 'Maintain', dietType: 'Balanced' },
  { label: 'Swimmer', emoji: '🏊', athleteMatch: 'Competitive Swimmer', goal: 'Maintain', dietType: 'Balanced' },
  { label: 'Wrestler', emoji: '🤼', athleteMatch: 'Wrestler', goal: 'Cut', dietType: 'Balanced' },
  { label: 'Bodybuilder (Bulk)', emoji: '📈', athleteMatch: 'Bodybuilder', goal: 'Bulk', dietType: 'Balanced' },
  { label: 'Bodybuilder (Cut)', emoji: '✂️', athleteMatch: 'Bodybuilder', goal: 'Cut', dietType: 'Balanced' },
];

export default function NutritionTab() {
  const insets = useSafeAreaInsets();
  const { state, updateState, showToast } = useApp();
  const { isSubscribed } = useSubscription();

  const [weight, setWeight] = useState(String(state.profile.weight || 180));
  const [height, setHeight] = useState('70');
  const [age, setAge] = useState(String(state.profile.age || 25));
  const [sex, setSex] = useState(state.profile.sex === 'Female' ? 'Female' : 'Male');
  const [goal, setGoal] = useState('Maintain');
  const [activity, setActivity] = useState('Moderate');
  const [bf, setBf] = useState(String(state.profile.bf || ''));
  const [dietType, setDietType] = useState('Balanced');
  const [includeGrocery, setIncludeGrocery] = useState(false);
  const [athleteMatch, setAthleteMatch] = useState('');
  const [phase, setPhase] = useState('Maintenance');
  const [sport, setSport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loading) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinAnim.setValue(0);
    }
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (!isSubscribed) {
    return <ProGate feature="Nutrition" icon="🧮" description="TDEE calculator, macros, and grocery lists" />;
  }

  const handleAthleteMatchPress = (opt: AthleteMatchOption) => {
    console.log('[Nutrition] Athlete match selected:', opt.label);
    setAthleteMatch(opt.athleteMatch);
    if (opt.goal) setGoal(opt.goal);
    if (opt.dietType) setDietType(opt.dietType);
  };

  const handleCalculate = async () => {
    if (!state.apiKey) {
      setError('No API key set. Go to Settings ⚙️ to add your Anthropic API key.');
      return;
    }
    console.log('[Nutrition] Calculate pressed — weight:', weight, 'height:', height, 'goal:', goal, 'activity:', activity, 'phase:', phase, 'athleteMatch:', athleteMatch, 'sport:', sport);
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        weight: parseFloat(weight) || 180,
        height: parseFloat(height) || 70,
        age: parseInt(age) || 25,
        sex,
        goal,
        activity,
        bf: parseFloat(bf) || undefined,
        dietType,
        includeGrocery,
        phase,
        apiKey: state.apiKey,
      };
      if (athleteMatch) body.athleteMatch = athleteMatch;
      if (sport) body.sport = sport;

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
      showToast('✅ Nutrition plan ready!', true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to calculate.';
      console.error('[Nutrition] Error:', msg);
      setError(msg || 'Failed to calculate. Check your API key.');
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
      {/* Header */}
      <Text style={styles.pageTitle}>🧮 Nutrition Calculator</Text>
      <Text style={styles.pageSubtitle}>Get your TDEE, macros, and a personalized meal plan</Text>

      {/* Athlete Match */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🏆 MATCH AN ATHLETE'S DIET</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {ATHLETE_MATCHES.map((opt) => (
            <AnimatedPressable
              key={opt.label}
              onPress={() => handleAthleteMatchPress(opt)}
              style={[styles.chip, athleteMatch === opt.athleteMatch && styles.chipActive]}
            >
              <Text style={styles.chipEmoji}>{opt.emoji}</Text>
              <Text style={[styles.chipLabel, athleteMatch === opt.athleteMatch && styles.chipLabelActive]}>
                {opt.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      {/* Body Stats */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>📏 BODY STATS</Text>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
              placeholder="180"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Height (in)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
              placeholder="70"
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
              placeholder="25"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Body Fat % (opt)</Text>
            <TextInput
              style={styles.input}
              value={bf}
              onChangeText={setBf}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textTertiary}
              placeholder="15"
            />
          </View>
        </View>
        <Text style={styles.label}>Sex</Text>
        <View style={styles.pillRow}>
          {SEX_OPTIONS.map((s) => (
            <AnimatedPressable
              key={s}
              onPress={() => {
                console.log('[Nutrition] Sex selected:', s);
                setSex(s);
              }}
              style={[styles.pill, sex === s && styles.pillActive]}
            >
              <Text style={[styles.pillText, sex === s && styles.pillTextActive]}>{s}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {/* Goal & Activity */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>🎯 GOAL & ACTIVITY</Text>
        <Text style={styles.label}>Goal</Text>
        <View style={styles.pillRow}>
          {GOALS.map((g) => (
            <AnimatedPressable
              key={g}
              onPress={() => {
                console.log('[Nutrition] Goal selected:', g);
                setGoal(g);
              }}
              style={[styles.pill, goal === g && styles.pillActive]}
            >
              <Text style={[styles.pillText, goal === g && styles.pillTextActive]}>{g}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={styles.label}>Training Phase</Text>
        <View style={styles.phaseGrid}>
          {PHASES.map((p) => (
            <AnimatedPressable
              key={p}
              onPress={() => {
                console.log('[Nutrition] Phase selected:', p);
                setPhase(p);
              }}
              style={[styles.phasePill, phase === p && styles.phasePillActive]}
            >
              <Text style={[styles.phaseText, phase === p && styles.phaseTextActive]}>{p}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_LEVELS.map((a) => (
            <AnimatedPressable
              key={a}
              onPress={() => {
                console.log('[Nutrition] Activity selected:', a);
                setActivity(a);
              }}
              style={[styles.activityPill, activity === a && styles.activityPillActive]}
            >
              <Text style={[styles.activityText, activity === a && styles.activityTextActive]}>{a}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={styles.label}>Sport (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SPORTS.map((s) => (
            <AnimatedPressable
              key={s}
              onPress={() => {
                console.log('[Nutrition] Sport selected:', s);
                setSport(sport === s ? '' : s);
              }}
              style={[styles.sportChip, sport === s && styles.sportChipActive]}
            >
              <Text style={[styles.sportChipText, sport === s && styles.sportChipTextActive]}>{s}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      {/* Diet Preferences */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>🥗 DIET PREFERENCES</Text>
        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.dietGrid}>
          {DIET_TYPES.map((d) => (
            <AnimatedPressable
              key={d.name}
              onPress={() => {
                console.log('[Nutrition] Diet type selected:', d.name);
                setDietType(d.name);
              }}
              style={[styles.dietCard, dietType === d.name && styles.dietCardActive]}
            >
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
            onValueChange={(v) => {
              console.log('[Nutrition] Grocery list toggle:', v);
              setIncludeGrocery(v);
            }}
            trackColor={{ false: COLORS.surface2, true: COLORS.gold }}
            thumbColor={includeGrocery ? COLORS.goldBright : COLORS.textSecondary}
          />
        </View>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* Calculate Button */}
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

      {/* Result Card */}
      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Your Nutrition Plan</Text>

          {/* Athlete Inspiration Badge */}
          {result.athleteInspiration && (
            <View style={styles.inspirationBadge}>
              <Text style={styles.inspirationText}>⭐ Modeled after {result.athleteInspiration}</Text>
            </View>
          )}

          {/* TDEE */}
          <View style={styles.tdeeBox}>
            <Text style={styles.tdeeLabel}>TDEE</Text>
            <Text style={styles.tdeeNum}>{result.tdee || '—'}</Text>
            <Text style={styles.tdeeUnit}>calories/day</Text>
          </View>

          {/* Target Calories */}
          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>Target Calories</Text>
            <Text style={styles.targetNum}>{result.targetCalories || result.tdee || '—'}</Text>
          </View>

          {/* Macros */}
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

          {/* Phase Notes */}
          {result.phaseNotes && (
            <View style={styles.phaseNotesBox}>
              <Text style={styles.subSectionLabel}>📋 PHASE NOTES</Text>
              <Text style={styles.phaseNotesText}>{result.phaseNotes}</Text>
            </View>
          )}

          {/* Meal Timing */}
          {result.mealTiming && (
            <View style={styles.mealTimingBox}>
              <Text style={styles.subSectionLabel}>⏰ MEAL TIMING</Text>
              <Text style={styles.mealTimingText}>{result.mealTiming}</Text>
            </View>
          )}

          {/* Meals */}
          {result.meals && result.meals.length > 0 && (
            <View style={styles.mealsSection}>
              <Text style={styles.mealsSectionTitle}>🍽️ Meal Plan</Text>
              {result.meals.map((meal: any, i: number) => {
                const mealName = typeof meal === 'string' ? meal : (meal.name || '');
                const mealCals = typeof meal === 'object' ? meal.calories : null;
                return (
                  <View key={i} style={styles.mealRow}>
                    <Text style={styles.mealName}>{mealName}</Text>
                    {mealCals ? <Text style={styles.mealCals}>{mealCals} cal</Text> : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* Supplements */}
          {result.supplements && result.supplements.length > 0 && (
            <View style={styles.supplementsBlock}>
              <Text style={styles.subSectionLabel}>💊 SUPPLEMENTS</Text>
              <View style={styles.supplementChips}>
                {result.supplements.map((s: string, i: number) => (
                  <View key={i} style={styles.supplementChip}>
                    <Text style={styles.supplementChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Hydration */}
          {result.hydration && (
            <View style={styles.hydrationBox}>
              <Text style={styles.hydrationText}>💧 {result.hydration}</Text>
            </View>
          )}

          {/* Weekly Plan */}
          {result.weeklyPlan && (
            <View style={styles.weeklyPlanBox}>
              <Text style={styles.subSectionLabel}>📅 WEEKLY CALORIE PLAN</Text>
              {result.weeklyPlan.trainingDay && (
                <View style={styles.weeklyPlanRow}>
                  <Text style={styles.weeklyPlanLabel}>Training Day</Text>
                  <Text style={styles.weeklyPlanVal}>{result.weeklyPlan.trainingDay}</Text>
                </View>
              )}
              {result.weeklyPlan.restDay && (
                <View style={styles.weeklyPlanRow}>
                  <Text style={styles.weeklyPlanLabel}>Rest Day</Text>
                  <Text style={styles.weeklyPlanVal}>{result.weeklyPlan.restDay}</Text>
                </View>
              )}
            </View>
          )}

          {/* Grocery List */}
          {result.grocery && result.grocery.length > 0 && (
            <View style={styles.grocerySection}>
              <Text style={styles.grocerySectionTitle}>🛒 Grocery List</Text>
              <View style={styles.groceryGrid}>
                {result.grocery.map((item: string, i: number) => (
                  <View key={i} style={styles.groceryItem}>
                    <Text style={styles.groceryDot}>•</Text>
                    <Text style={styles.groceryText}>{item}</Text>
                  </View>
                ))}
              </View>
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
  pageTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase' },
  chipRow: { gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  chipEmoji: { fontSize: 15 },
  chipLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chipLabelActive: { color: COLORS.gold },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: COLORS.text, letterSpacing: 1, textTransform: 'uppercase' },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
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

  phaseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phasePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phasePillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  phaseText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  phaseTextActive: { color: COLORS.gold },

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

  sportChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sportChipActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  sportChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  sportChipTextActive: { color: COLORS.gold },

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
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(212,160,23,0.3)' },
      default: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
    }),
    elevation: 6,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingIcon: { fontSize: 20 },
  calcBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },

  // Result
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 16,
  },
  resultTitle: { fontSize: 20, fontWeight: '900', color: COLORS.gold },

  inspirationBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border2,
    alignSelf: 'flex-start',
  },
  inspirationText: { fontSize: 13, fontWeight: '700', color: COLORS.goldBright },

  tdeeBox: { alignItems: 'center', paddingVertical: 8 },
  tdeeLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
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

  subSectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },

  phaseNotesBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  phaseNotesText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  mealTimingBox: {
    backgroundColor: `${COLORS.blue}12`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.blue}30`,
    gap: 6,
  },
  mealTimingText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

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

  supplementsBlock: { gap: 8 },
  supplementChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  supplementChip: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  supplementChipText: { fontSize: 12, fontWeight: '700', color: COLORS.gold },

  hydrationBox: {
    backgroundColor: `${COLORS.blue}15`,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: `${COLORS.blue}30`,
  },
  hydrationText: { fontSize: 13, color: COLORS.blue, fontWeight: '600' },

  weeklyPlanBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  weeklyPlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weeklyPlanLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  weeklyPlanVal: { fontSize: 14, fontWeight: '800', color: COLORS.gold, fontVariant: ['tabular-nums'] },

  grocerySection: { gap: 10 },
  grocerySectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  groceryGrid: { gap: 4 },
  groceryItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  groceryDot: { fontSize: 14, color: COLORS.gold, marginTop: 1 },
  groceryText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 22, flex: 1 },
});
