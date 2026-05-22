import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot, KongMood } from '@/components/KongMascot';
import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';

interface MissTier {
  days: number;
  label: string;
  msg: string;
  color: string;
  mood: KongMood;
}

const MISS_TIERS: MissTier[] = [
  { days: 1, label: '1 Day 😄', msg: "No big deal. Kong still believes in you.", color: COLORS.green, mood: 'happy' },
  { days: 2, label: '2 Days 😅', msg: "Kong is side-eyeing you right now...", color: COLORS.blue, mood: 'sad' },
  { days: 3, label: '3 Days 😤', msg: "The gains are packing their bags.", color: '#F0A020', mood: 'sad' },
  { days: 4, label: '4 Days 😰', msg: "Your muscles filed a missing persons report.", color: '#E07020', mood: 'angry' },
  { days: 5, label: '5 Days 😱', msg: "EMERGENCY. Kong has lost faith.", color: COLORS.red, mood: 'angry' },
  { days: 7, label: '7+ Days 💀', msg: "Even your pre-workout is disappointed.", color: '#808080', mood: 'fat' },
  { days: 14, label: '2 Weeks 🥵', msg: "Kong put on the freshman 15. For you.", color: '#A04020', mood: 'fat' },
  { days: 21, label: '3 Weeks 💀', msg: "The pump has left the chat.", color: '#404040', mood: 'defeated' },
];

export default function MissScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updateState, addXP, showToast, triggerPR } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const daysMissed = (() => {
    if (!state.lastWorkout) return 7;
    const last = new Date(state.lastWorkout);
    const now = new Date();
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  })();

  const activeTier = MISS_TIERS.reduce((acc, tier) => {
    if (daysMissed >= tier.days) return tier;
    return acc;
  }, MISS_TIERS[0]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleImBack = () => {
    console.log('[Miss] I\'m Back pressed — awarding comeback XP and PR');
    const now = new Date();
    addXP(50);
    triggerPR('Comeback');
    updateState({
      streak: 1,
      prs: [...state.prs, { lift: 'Comeback', weight: 1, date: now.toISOString() }],
    });
    showToast('🔥 COMEBACK! +50 XP 🏆 Comeback PR!', true);
    router.replace('/(tabs)/tracker');
  };

  const shouldShake = daysMissed >= 3;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.title}>KONG IS WAITING</Text>
        <Text style={styles.subtitle}>You missed your workout</Text>

        <KongMascot size={140} mood={activeTier.mood} shake={shouldShake} />

        <View style={styles.tilesContainer}>
          {MISS_TIERS.map((tier) => {
            const isActive = tier.days === activeTier.days;
            return (
              <View
                key={tier.days}
                style={[
                  styles.tile,
                  isActive && { borderColor: tier.color, backgroundColor: `${tier.color}20` },
                ]}
              >
                <Text style={[styles.tileLabel, isActive && { color: tier.color }]}>{tier.label}</Text>
                {isActive && <Text style={styles.tileMsg}>{tier.msg}</Text>}
              </View>
            );
          })}
        </View>

        <View style={[styles.activeBox, { borderColor: activeTier.color, backgroundColor: `${activeTier.color}15` }]}>
          <Text style={[styles.activeLabel, { color: activeTier.color }]}>{activeTier.label}</Text>
          <Text style={styles.activeMsg}>{activeTier.msg}</Text>
          <Text style={styles.daysText}>{daysMissed} day{daysMissed !== 1 ? 's' : ''} missed</Text>
        </View>

        <AnimatedPressable onPress={handleImBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>I'M BACK 🔥</Text>
        </AnimatedPressable>

        <Text style={styles.bonusText}>+50 COMEBACK XP 🏆 Comeback PR</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 24, gap: 20, width: '100%' },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.gold, letterSpacing: 3 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: -12 },
  tilesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width: '100%' },
  tile: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tileLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tileMsg: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  activeBox: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
    gap: 6,
  },
  activeLabel: { fontSize: 24, fontWeight: '900' },
  activeMsg: { fontSize: 16, color: COLORS.text, fontWeight: '600', textAlign: 'center' },
  daysText: { fontSize: 13, color: COLORS.textSecondary },
  backBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  backBtnText: { fontSize: 20, fontWeight: '900', color: '#0A0A0A', letterSpacing: 2 },
  bonusText: { fontSize: 13, color: COLORS.gold, fontWeight: '700', letterSpacing: 1 },
});
