import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp, getRank, getNextRank } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { COLORS, KONG_MSGS, RANKS } from '@/constants/data';

export default function HomeTab() {
  const { state, updateState } = useApp();
  const { isSubscribed } = useSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    updateState({ kongIdx: (state.kongIdx + 1) % KONG_MSGS.length });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rank = getRank(state.xp);
  const nextRank = getNextRank(state.xp);
  const kongMsg = KONG_MSGS[state.kongIdx % KONG_MSGS.length];

  const progressPct = nextRank
    ? Math.min(((state.xp - rank.minXP) / (nextRank.minXP - rank.minXP)) * 100, 100)
    : 100;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const streakDisplay = state.streak > 0 ? `🔥 ${state.streak} streak` : '';

  const handleStartWorkout = () => {
    console.log('[Home] Start Workout pressed');
    router.push('/(tabs)/tracker');
  };

  const handleViewPrograms = () => {
    console.log('[Home] View Programs pressed');
    router.push('/(tabs)/athlete');
  };

  const handleCheckDiet = () => {
    console.log('[Home] Check Diet pressed');
    router.push('/(tabs)/diet');
  };

  const handleUpgradePro = () => {
    console.log('[Home] Kong Pro banner pressed — navigating to paywall');
    router.push('/paywall' as any);
  };

  const handleGoPremiumHeader = () => {
    console.log('[Home] Go Premium header button pressed');
    router.push('/paywall' as any);
  };

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <KongMascot size={80} mood="happy" />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>KONG LIFT</Text>
          <Text style={styles.heroDate}>{today}</Text>
        </View>
        {!isSubscribed && (
          <TouchableOpacity style={styles.goPremiumPill} onPress={handleGoPremiumHeader}>
            <Text style={styles.goPremiumPillText}>👑 Go Premium</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Kong Pro Banner — only shown to non-subscribers */}
      {!isSubscribed && (
        <AnimatedPressable onPress={handleUpgradePro} style={styles.proBanner}>
          <View style={styles.proBannerLeft}>
            <Text style={styles.proBannerCrown}>👑</Text>
            <View style={styles.proBannerText}>
              <Text style={styles.proBannerTitle}>Kong Pro</Text>
              <Text style={styles.proBannerSub}>AI coaching • 2x XP • Elite programs</Text>
            </View>
          </View>
          <Text style={styles.proBannerArrow}>→</Text>
        </AnimatedPressable>
      )}

      {/* Kong Quote */}
      <View style={styles.quoteBox}>
        <Text style={styles.quoteIcon}>💬</Text>
        <Text style={styles.quoteText}>{kongMsg}</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileLeft}>
          <Text style={styles.profileAvatar}>{state.profile.avatar}</Text>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{state.profile.username || 'KongLifter'}</Text>
              {isSubscribed && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>👑 PRO</Text>
                </View>
              )}
            </View>
            <View style={[styles.rankBadge, { backgroundColor: `${rank.color}20`, borderColor: rank.color }]}>
              <Text style={[styles.rankText, { color: rank.color }]}>{rank.emoji}</Text>
              <Text style={[styles.rankText, { color: rank.color }]}>{rank.name}</Text>
            </View>
          </View>
        </View>
        <View style={styles.profileRight}>
          <Text style={styles.xpNumber}>{state.xp.toLocaleString()}</Text>
          <Text style={styles.xpLabel}>XP ⚡</Text>
          {state.streak > 0 && (
            <Text style={styles.streakBadge}>{streakDisplay}</Text>
          )}
        </View>
      </View>

      {/* Stat Tiles */}
      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={styles.statEmoji}>🏋️</Text>
          <Text style={styles.statValue}>{state.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{state.streak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={styles.statValue}>{state.xp.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
      </View>

      {/* Rank Progress */}
      <View style={styles.rankCard}>
        <View style={styles.rankHeader}>
          <Text style={styles.rankCardTitle}>Rank Progress</Text>
          <Text style={styles.rankCardSub}>{nextRank ? `→ ${nextRank.emoji} ${nextRank.name}` : '👑 MAX RANK'}</Text>
        </View>
        <View style={styles.rankBarTrack}>
          <View style={[styles.rankBarFill, { width: `${progressPct}%`, backgroundColor: rank.color }]} />
        </View>
        <View style={styles.rankBarLabels}>
          <Text style={[styles.rankBarLabel, { color: rank.color }]}>{rank.emoji}</Text>
          <Text style={[styles.rankBarLabel, { color: rank.color }]}>{rank.name}</Text>
          <Text style={styles.rankBarXP}>{state.xp.toLocaleString()} XP</Text>
          {nextRank && <Text style={styles.rankBarNext}>{nextRank.minXP.toLocaleString()} XP</Text>}
        </View>
      </View>

      {/* All Ranks */}
      <View style={styles.ranksSection}>
        <Text style={styles.sectionTitle}>🏆 Rank Ladder</Text>
        {RANKS.map((r) => {
          const isCurrentRank = r.name === rank.name;
          return (
            <View key={r.name} style={[styles.rankRow, isCurrentRank && { backgroundColor: `${r.color}15`, borderColor: r.color }]}>
              <Text style={styles.rankRowEmoji}>{r.emoji}</Text>
              <View style={styles.rankRowInfo}>
                <Text style={[styles.rankRowName, { color: isCurrentRank ? r.color : COLORS.text }]}>{r.name}</Text>
                <Text style={styles.rankRowTagline}>{r.tagline}</Text>
              </View>
              <Text style={styles.rankRowXP}>{r.minXP.toLocaleString()} XP</Text>
            </View>
          );
        })}
      </View>

      {/* Quick Start */}
      <View style={styles.quickStart}>
        <Text style={styles.sectionTitle}>⚡ Quick Start</Text>
        <AnimatedPressable onPress={handleStartWorkout} style={styles.quickBtn}>
          <Text style={styles.quickBtnEmoji}>🏋️</Text>
          <Text style={styles.quickBtnText}>Start Workout</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={handleViewPrograms} style={[styles.quickBtn, styles.quickBtnSecondary]}>
          <Text style={styles.quickBtnEmoji}>💪</Text>
          <Text style={[styles.quickBtnText, styles.quickBtnTextSecondary]}>View Programs</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={handleCheckDiet} style={[styles.quickBtn, styles.quickBtnSecondary]}>
          <Text style={styles.quickBtnEmoji}>🥗</Text>
          <Text style={[styles.quickBtnText, styles.quickBtnTextSecondary]}>Check Diet</Text>
        </AnimatedPressable>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  heroText: { flex: 1, gap: 4 },
  goPremiumPill: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  goPremiumPillText: { fontSize: 12, fontWeight: '800', color: '#0A0A0A' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: COLORS.gold, letterSpacing: 4 },
  heroDate: { fontSize: 13, color: COLORS.textSecondary },
  quoteBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  quoteIcon: { fontSize: 18, marginTop: 2 },
  quoteText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 22, fontWeight: '500', fontStyle: 'italic' },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileAvatar: { fontSize: 44 },
  profileInfo: { gap: 6 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  proBadge: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeText: { fontSize: 11, fontWeight: '900', color: COLORS.gold },
  rankBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, flexDirection: 'row', gap: 4 },
  rankText: { fontSize: 12, fontWeight: '700' },
  profileRight: { alignItems: 'flex-end' },
  xpNumber: { fontSize: 28, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  xpLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  streakBadge: { fontSize: 12, color: COLORS.gold, fontWeight: '700', marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 10 },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '900', color: COLORS.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  rankCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankCardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  rankCardSub: { fontSize: 13, color: COLORS.textSecondary },
  rankBarTrack: { height: 8, backgroundColor: COLORS.surface2, borderRadius: 4, overflow: 'hidden' },
  rankBarFill: { height: 8, borderRadius: 4 },
  rankBarLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  rankBarLabel: { fontSize: 12, fontWeight: '700' },
  rankBarXP: { fontSize: 12, color: COLORS.textSecondary, fontVariant: ['tabular-nums'] },
  rankBarNext: { fontSize: 12, color: COLORS.textTertiary, fontVariant: ['tabular-nums'] },
  ranksSection: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rankRowEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  rankRowInfo: { flex: 1, gap: 2 },
  rankRowName: { fontSize: 14, fontWeight: '700' },
  rankRowTagline: { fontSize: 12, color: COLORS.textSecondary },
  rankRowXP: { fontSize: 12, color: COLORS.textTertiary, fontVariant: ['tabular-nums'] },
  quickStart: { gap: 10 },
  quickBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickBtnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickBtnEmoji: { fontSize: 20 },
  quickBtnText: { fontSize: 16, fontWeight: '800', color: '#0A0A0A' },
  quickBtnTextSecondary: { color: COLORS.text },
  proBanner: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proBannerCrown: { fontSize: 28 },
  proBannerText: { gap: 2 },
  proBannerTitle: { fontSize: 17, fontWeight: '900', color: '#0A0A0A', letterSpacing: 0.5 },
  proBannerSub: { fontSize: 12, fontWeight: '600', color: 'rgba(10,10,10,0.65)' },
  proBannerArrow: { fontSize: 20, fontWeight: '900', color: '#0A0A0A' },
});
