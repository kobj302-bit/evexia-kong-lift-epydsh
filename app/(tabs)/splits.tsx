import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { COLORS, SPLITS } from '@/constants/data';

export default function SplitsTab() {
  const insets = useSafeAreaInsets();
  const { updateState, showToast } = useApp();
  const [openSplit, setOpenSplit] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    console.log('[Splits] Toggle split:', id);
    setOpenSplit(openSplit === id ? null : id);
  };

  const handleAddToTracker = (split: typeof SPLITS[0]) => {
    console.log('[Splits] Add to tracker:', split.name);
    updateState({ activeProg: split });
    showToast(`📲 "${split.name}" added to Tracker!`, true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>💪 Training Splits</Text>
      <Text style={styles.pageSubtitle}>Choose your battle plan</Text>

      {SPLITS.map((split) => {
        const isOpen = openSplit === split.id;
        return (
          <View key={split.id} style={styles.splitCard}>
            <AnimatedPressable onPress={() => handleToggle(split.id)} style={styles.splitHeader}>
              <View style={styles.splitLeft}>
                <Text style={styles.splitEmoji}>{split.emoji}</Text>
                <View style={styles.splitInfo}>
                  <Text style={styles.splitName}>{split.name}</Text>
                  <Text style={styles.splitDesc}>{split.description}</Text>
                </View>
              </View>
              <View style={styles.splitRight}>
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>{split.daysPerWeek}d/wk</Text>
                </View>
                <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
              </View>
            </AnimatedPressable>

            {isOpen && (
              <View style={styles.splitBody}>
                {split.days.map((day, idx) => (
                  <View key={idx} style={styles.dayBlock}>
                    <Text style={styles.dayName}>{day.name}</Text>
                    <View style={styles.exerciseList}>
                      {day.exercises.map((ex, i) => (
                        <Text key={i} style={styles.exercise}>• {ex}</Text>
                      ))}
                    </View>
                  </View>
                ))}

                <AnimatedPressable onPress={() => handleAddToTracker(split)} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>Add to Tracker 📲</Text>
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
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  pageSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: -4 },
  splitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  splitLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  splitEmoji: { fontSize: 28 },
  splitInfo: { flex: 1, gap: 3 },
  splitName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  splitDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  splitRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  daysBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  daysBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.gold },
  chevron: { fontSize: 12, color: COLORS.textSecondary },
  splitBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dayBlock: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginTop: 8,
  },
  dayName: { fontSize: 14, fontWeight: '800', color: COLORS.gold },
  exerciseList: { gap: 3 },
  exercise: { fontSize: 13, color: COLORS.textSecondary },
  addBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { fontSize: 14, fontWeight: '900', color: '#0A0A0A' },
});
