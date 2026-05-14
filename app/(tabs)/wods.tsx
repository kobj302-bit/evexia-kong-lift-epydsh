import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { COLORS, FAMOUS_WODS, HOLIDAY_WODS } from '@/constants/data';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProGate } from '@/components/ProGate';

type WodFilter = 'all' | 'famous' | 'holiday';

export default function WodsTab() {
  const insets = useSafeAreaInsets();
  const { state, updateState, addXP, showToast } = useApp();
  const { isSubscribed } = useSubscription();
  const [filter, setFilter] = useState<WodFilter>(state.wodFilter || 'all');
  const [expandedWod, setExpandedWod] = useState<string | null>(null);

  if (!isSubscribed) return <ProGate feature="WODs" icon="🏋️" description="Famous hero workouts and holiday challenges" />;

  const allWods = [...FAMOUS_WODS, ...HOLIDAY_WODS];
  const filteredWods = filter === 'all' ? allWods : allWods.filter((w) => w.category === filter);

  const handleFilter = (f: WodFilter) => {
    console.log('[WODs] Filter changed:', f);
    setFilter(f);
    updateState({ wodFilter: f });
  };

  const handleLogWod = (wod: typeof FAMOUS_WODS[0]) => {
    console.log('[WODs] Log WOD:', wod.name, 'XP:', wod.xp);
    addXP(wod.xp);
    showToast(`🏆 ${wod.name} logged! +${wod.xp} XP`, true);
  };

  const handleToggle = (id: string) => {
    console.log('[WODs] Toggle WOD:', id);
    setExpandedWod(expandedWod === id ? null : id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>🔥 WODs</Text>
      <Text style={styles.pageSubtitle}>Workouts of the Day — earn XP for completing them</Text>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {(['all', 'famous', 'holiday'] as WodFilter[]).map((f) => (
          <AnimatedPressable key={f} onPress={() => handleFilter(f)} style={[styles.filterPill, filter === f && styles.filterPillActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? '🌐 All' : f === 'famous' ? '⭐ Famous' : '🎉 Holiday'}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {filteredWods.map((wod) => {
        const isExpanded = expandedWod === wod.id;
        return (
          <View key={wod.id} style={styles.wodCard}>
            <AnimatedPressable onPress={() => handleToggle(wod.id)} style={styles.wodHeader}>
              <View style={styles.wodLeft}>
                <Text style={styles.wodEmoji}>{wod.emoji}</Text>
                <View style={styles.wodInfo}>
                  <Text style={styles.wodName}>{wod.name}</Text>
                  <Text style={styles.wodDesc} numberOfLines={2}>{wod.description}</Text>
                </View>
              </View>
              <View style={styles.wodRight}>
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+{wod.xp} XP</Text>
                </View>
                <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
              </View>
            </AnimatedPressable>

            {isExpanded && (
              <View style={styles.wodBody}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>⏱️ {wod.time}</Text>
                </View>
                <Text style={styles.wodDetails}>{wod.details}</Text>
                <AnimatedPressable onPress={() => handleLogWod(wod)} style={styles.logBtn}>
                  <Text style={styles.logBtnText}>Log This WOD ✅</Text>
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
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  filterText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.gold },
  wodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  wodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  wodLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  wodEmoji: { fontSize: 26, marginTop: 2 },
  wodInfo: { flex: 1, gap: 3 },
  wodName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  wodDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  wodRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  xpBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.gold },
  chevron: { fontSize: 12, color: COLORS.textSecondary },
  wodBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  timeBadge: {
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  wodDetails: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  logBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logBtnText: { fontSize: 14, fontWeight: '900', color: '#0A0A0A' },
});
