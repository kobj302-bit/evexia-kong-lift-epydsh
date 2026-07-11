import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Animated, Alert, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { COLORS, DIET_TYPES } from '@/constants/data';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProGate } from '@/components/ProGate';
import {
  isDisclaimerAcknowledged,
  acknowledgeDisclaimer,
  DISCLAIMER_SHORT,
  DISCLAIMER_FULL,
  DISCLAIMER_FOOTER,
} from '@/utils/disclaimer';

const GOALS = [
  { label: 'Bulk', emoji: '📈' },
  { label: 'Cut', emoji: '📉' },
  { label: 'Maintain', emoji: '⚖️' },
];

export default function DietTab() {
  const insets = useSafeAreaInsets();
  const { state, updateState, showToast } = useApp();
  const { isSubscribed } = useSubscription();
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('Maintain');
  const [dietType, setDietType] = useState('Balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disclaimerModalVisible, setDisclaimerModalVisible] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (!isSubscribed) return <ProGate feature="Diet" icon="🥗" description="AI-powered meal plans tailored to your goals" />;

  const doGenerate = async () => {
    console.log('[Diet] Generate meal plan — goal:', goal, 'dietType:', dietType);
    setLoading(true);
    setError('');
    try {
      const body: any = {
        description: description || `${goal} diet, ${dietType} style`,
        goal,
        dietType,
      };
      if (!state.expertMode) {
        body.profile = {
          age: state.profile.age,
          weight: state.profile.weight,
          sex: state.profile.sex,
          goal: state.profile.goal,
        };
      }
      console.log('[Diet] POST /api/ai/diet — goal:', goal, 'dietType:', dietType);
      const response = await fetch(
        'https://tc9zmyamhv4vudbhz49epzeyr82j76wn.app.specular.dev/api/ai/diet',
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
      console.log('[Diet] Meal plan received:', data?.name);
      updateState({ dietResult: data });
    } catch (e: any) {
      console.error('[Diet] Error:', e.message);
      setError(e.message || 'Failed to generate meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    console.log('[Diet] Generate button pressed');
    const acked = await isDisclaimerAcknowledged();
    if (!acked) {
      console.log('[Diet] Disclaimer not yet acknowledged — showing modal');
      setPendingGenerate(true);
      setDisclaimerModalVisible(true);
      return;
    }
    await doGenerate();
  };

  const handleDisclaimerAccept = async () => {
    console.log('[Diet] Disclaimer accepted');
    await acknowledgeDisclaimer();
    setDisclaimerModalVisible(false);
    setPendingGenerate(false);
    await doGenerate();
  };

  const handleDisclaimerCancel = () => {
    console.log('[Diet] Disclaimer cancelled');
    setDisclaimerModalVisible(false);
    setPendingGenerate(false);
  };

  const handleSave = () => {
    if (!state.dietResult) return;
    console.log('[Diet] Save meal plan:', state.dietResult.name);
    updateState({ savedDiet: state.dietResult });
    showToast('💾 Meal plan saved!', true);
  };

  const result = state.dietResult;

  const proteinPct = result ? Math.round((result.macros?.protein * 4) / result.calories * 100) : 33;
  const carbsPct = result ? Math.round((result.macros?.carbs * 4) / result.calories * 100) : 34;
  const fatPct = result ? Math.round((result.macros?.fat * 9) / result.calories * 100) : 33;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Medical Disclaimer Banner */}
      <AnimatedPressable
        onPress={() => {
          console.log('[Diet] Disclaimer banner tapped');
          Alert.alert('Medical Disclaimer', DISCLAIMER_FULL, [{ text: 'Got it', style: 'default' }]);
        }}
        style={styles.disclaimerBanner}
      >
        <Text style={styles.disclaimerBannerText}>{DISCLAIMER_SHORT}</Text>
      </AnimatedPressable>

      <Text style={styles.pageTitle}>🥗 AI Meal Planner</Text>
      <Text style={styles.pageSubtitle}>Kong will design your perfect nutrition plan</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Describe Your Diet Goals (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholder="e.g. High protein, low carb, 2500 calories..."
          placeholderTextColor={COLORS.textTertiary}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Goal</Text>
        <View style={styles.goalRow}>
          {GOALS.map((g) => (
            <AnimatedPressable
              key={g.label}
              onPress={() => {
                console.log('[Diet] Goal selected:', g.label);
                setGoal(g.label);
              }}
              style={[styles.goalPill, goal === g.label && styles.goalPillActive]}
            >
              <Text style={styles.goalEmoji}>{g.emoji}</Text>
              <Text style={[styles.goalText, goal === g.label && styles.goalTextActive]}>{g.label}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.dietGrid}>
          {DIET_TYPES.map((d) => (
            <AnimatedPressable
              key={d.name}
              onPress={() => {
                console.log('[Diet] Diet type selected:', d.name);
                setDietType(d.name);
              }}
              style={[styles.dietCard, dietType === d.name && styles.dietCardActive]}
            >
              <Text style={styles.dietEmoji}>{d.emoji}</Text>
              <Text style={[styles.dietName, dietType === d.name && styles.dietNameActive]}>{d.name}</Text>
            </AnimatedPressable>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <AnimatedPressable onPress={handleGenerate} style={styles.generateBtn} disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <Animated.Text style={[styles.loadingKong, { transform: [{ rotate: spin }] }]}>🥗</Animated.Text>
              <Text style={styles.generateBtnText}>Kong is cooking...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>Generate Meal Plan 🥗</Text>
          )}
        </AnimatedPressable>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultName}>{result.name || 'Custom Meal Plan'}</Text>
            <AnimatedPressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>💾 Save</Text>
            </AnimatedPressable>
          </View>

          {/* Calories */}
          <View style={styles.caloriesBox}>
            <Text style={styles.caloriesNum}>{result.calories || '—'}</Text>
            <Text style={styles.caloriesLabel}>calories / day</Text>
          </View>

          {/* Macros Bar */}
          {result.macros && (
            <View style={styles.macrosSection}>
              <Text style={styles.macrosTitle}>Macros</Text>
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

          {/* Meals */}
          {result.meals && result.meals.length > 0 && (
            <View style={styles.mealsSection}>
              <Text style={styles.mealsSectionTitle}>🍽️ Meals</Text>
              {result.meals.map((meal: any, i: number) => (
                <View key={i} style={styles.mealRow}>
                  <Text style={styles.mealName}>{meal.name || meal}</Text>
                  {meal.calories && <Text style={styles.mealCals}>{meal.calories} cal</Text>}
                </View>
              ))}
            </View>
          )}

          <AnimatedPressable onPress={handleSave} style={styles.saveBtnFull}>
            <Text style={styles.saveBtnFullText}>Save This Plan 💾</Text>
          </AnimatedPressable>

          {/* Disclaimer Footer */}
          <View style={styles.disclaimerFooter}>
            <Text style={styles.disclaimerFooterText}>{DISCLAIMER_FOOTER}</Text>
          </View>
        </View>
      )}

      {/* Disclaimer Modal */}
      <Modal
        visible={disclaimerModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDisclaimerCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⚠️ Medical Disclaimer</Text>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.disclaimerModalText}>{DISCLAIMER_FULL}</Text>
          </ScrollView>
          <View style={styles.disclaimerModalActions}>
            <AnimatedPressable onPress={handleDisclaimerAccept} style={styles.disclaimerAcceptBtn}>
              <Text style={styles.disclaimerAcceptBtnText}>I understand & accept</Text>
            </AnimatedPressable>
            <TouchableOpacity onPress={handleDisclaimerCancel} style={styles.disclaimerCancelLink}>
              <Text style={styles.disclaimerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  disclaimerBanner: {
    backgroundColor: 'rgba(212,160,23,0.10)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.25)',
  },
  disclaimerBannerText: { fontSize: 12, color: '#C8A020', lineHeight: 18 },

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
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  textArea: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
  },
  goalRow: { flexDirection: 'row', gap: 8 },
  goalPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  goalPillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  goalEmoji: { fontSize: 18 },
  goalText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  goalTextActive: { color: COLORS.gold },
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
  errorBox: {
    backgroundColor: `${COLORS.red}15`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { fontSize: 13, color: COLORS.red, lineHeight: 20 },
  generateBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingKong: { fontSize: 20 },
  generateBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 14,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { fontSize: 18, fontWeight: '900', color: COLORS.gold, flex: 1 },
  saveBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.gold },
  caloriesBox: { alignItems: 'center', paddingVertical: 8 },
  caloriesNum: { fontSize: 48, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  caloriesLabel: { fontSize: 14, color: COLORS.textSecondary },
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
  saveBtnFull: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnFullText: { fontSize: 15, fontWeight: '900', color: '#0A0A0A' },

  // Disclaimer footer
  disclaimerFooter: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerFooterText: { fontSize: 11, color: COLORS.textTertiary, lineHeight: 17, textAlign: 'center' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  modalContent: { padding: 16, gap: 10 },
  disclaimerModalText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  disclaimerModalActions: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  disclaimerAcceptBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disclaimerAcceptBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  disclaimerCancelLink: { alignItems: 'center', paddingVertical: 8 },
  disclaimerCancelText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
});
