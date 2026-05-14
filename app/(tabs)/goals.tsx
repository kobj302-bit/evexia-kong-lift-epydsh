import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Animated, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp, Goal } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';

export default function GoalsTab() {
  const insets = useSafeAreaInsets();
  const { state, updateState, addXP, showToast } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [currentVal, setCurrentVal] = useState('');
  const [targetVal, setTargetVal] = useState('');
  const [unit, setUnit] = useState('');
  const [updateValues, setUpdateValues] = useState<Record<string, string>>({});

  const handleAddGoal = () => {
    if (!goalName.trim() || !targetVal.trim()) return;
    console.log('[Goals] Add goal:', goalName, 'target:', targetVal, 'unit:', unit);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newGoal: Goal = {
      id: Date.now().toString(),
      name: goalName.trim(),
      current: parseFloat(currentVal) || 0,
      target: parseFloat(targetVal) || 100,
      unit: unit.trim(),
      achieved: false,
    };
    updateState({ goals: [...state.goals, newGoal] });
    setGoalName('');
    setCurrentVal('');
    setTargetVal('');
    setUnit('');
    setShowForm(false);
  };

  const handleUpdateGoal = (goalId: string) => {
    const newVal = parseFloat(updateValues[goalId] || '0');
    if (isNaN(newVal)) return;
    console.log('[Goals] Update goal:', goalId, 'new value:', newVal);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updatedGoals = state.goals.map((g) => {
      if (g.id !== goalId) return g;
      const achieved = newVal >= g.target;
      if (achieved && !g.achieved) {
        setTimeout(() => {
          addXP(100);
          showToast(`🎉 GOAL ACHIEVED! "${g.name}" +100 XP`, true);
        }, 300);
      }
      return { ...g, current: newVal, achieved };
    });
    updateState({ goals: updatedGoals });
    setUpdateValues((prev) => ({ ...prev, [goalId]: '' }));
  };

  const handleDeleteGoal = (goalId: string) => {
    console.log('[Goals] Delete goal:', goalId);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateState({ goals: state.goals.filter((g) => g.id !== goalId) });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>🎯 Goals</Text>
          <Text style={styles.pageSubtitle}>Track your progress, earn XP</Text>
        </View>
        <AnimatedPressable onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{showForm ? '✕ Cancel' : '+ Add Goal'}</Text>
        </AnimatedPressable>
      </View>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Goal</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Goal Name *</Text>
            <TextInput
              style={styles.input}
              value={goalName}
              onChangeText={setGoalName}
              placeholder="e.g. Bench Press 225 lbs"
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
            />
          </View>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Current Value</Text>
              <TextInput
                style={styles.input}
                value={currentVal}
                onChangeText={setCurrentVal}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Target Value *</Text>
              <TextInput
                style={styles.input}
                value={targetVal}
                onChangeText={setTargetVal}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Unit (optional)</Text>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="lbs, kg, miles, reps..."
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>
          <AnimatedPressable onPress={handleAddGoal} style={styles.submitBtn} disabled={!goalName.trim() || !targetVal.trim()}>
            <Text style={styles.submitBtnText}>Add Goal 🎯</Text>
          </AnimatedPressable>
        </View>
      )}

      {state.goals.length === 0 && !showForm && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptySub}>Set goals to track your progress and earn XP when you hit them</Text>
          <AnimatedPressable onPress={() => setShowForm(true)} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Set Your First Goal</Text>
          </AnimatedPressable>
        </View>
      )}

      {state.goals.map((goal) => {
        const pct = Math.min((goal.current / goal.target) * 100, 100);
        const isAchieved = goal.achieved || goal.current >= goal.target;
        const updateVal = updateValues[goal.id] || '';

        return (
          <View key={goal.id} style={[styles.goalCard, isAchieved && styles.goalCardAchieved]}>
            <View style={styles.goalHeader}>
              <View style={styles.goalTitleRow}>
                {isAchieved && <Text style={styles.achievedBadge}>🏆 ACHIEVED</Text>}
                <Text style={styles.goalName}>{goal.name}</Text>
              </View>
              <AnimatedPressable onPress={() => handleDeleteGoal(goal.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </AnimatedPressable>
            </View>

            <View style={styles.progressRow}>
              <Text style={styles.progressCurrent}>{goal.current}</Text>
              <Text style={styles.progressSep}>/</Text>
              <Text style={styles.progressTarget}>{goal.target}</Text>
              {goal.unit ? <Text style={styles.progressUnit}>{goal.unit}</Text> : null}
              <Text style={styles.progressPct}>{Math.round(pct)}%</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pct}%` as `${number}%`, backgroundColor: isAchieved ? COLORS.green : COLORS.gold },
                ]}
              />
            </View>

            {!isAchieved && (
              <View style={styles.updateRow}>
                <TextInput
                  style={styles.updateInput}
                  value={updateVal}
                  onChangeText={(v) => setUpdateValues((prev) => ({ ...prev, [goal.id]: v }))}
                  keyboardType="numeric"
                  placeholder="Update value..."
                  placeholderTextColor={COLORS.textTertiary}
                />
                <AnimatedPressable onPress={() => handleUpdateGoal(goal.id)} style={styles.updateBtn}>
                  <Text style={styles.updateBtnText}>Update</Text>
                </AnimatedPressable>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  pageSubtitle: { fontSize: 14, color: COLORS.textSecondary },
  addBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.gold },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 12,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, gap: 6 },
  submitBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { fontSize: 15, fontWeight: '900', color: '#0A0A0A' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  emptyBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '900', color: '#0A0A0A' },
  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  goalCardAchieved: { borderColor: COLORS.green, backgroundColor: `${COLORS.green}08` },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalTitleRow: { flex: 1, gap: 4 },
  achievedBadge: { fontSize: 11, fontWeight: '800', color: COLORS.green },
  goalName: { fontSize: 16, fontWeight: '800', color: COLORS.text, flex: 1 },
  deleteBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 16, color: COLORS.red, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  progressCurrent: { fontSize: 22, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
  progressSep: { fontSize: 16, color: COLORS.textTertiary },
  progressTarget: { fontSize: 16, color: COLORS.textSecondary, fontVariant: ['tabular-nums'] },
  progressUnit: { fontSize: 13, color: COLORS.textSecondary, marginLeft: 2 },
  progressPct: { fontSize: 13, color: COLORS.gold, fontWeight: '700', marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 8, backgroundColor: COLORS.surface2, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  updateRow: { flexDirection: 'row', gap: 8 },
  updateInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updateBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
    justifyContent: 'center',
  },
  updateBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.gold },
});
