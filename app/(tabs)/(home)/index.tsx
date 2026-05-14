import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { getItem, STORAGE_KEYS, getXP, getStreak, getTotalWorkouts } from '@/utils/storage';
import { getRank, getRankProgress, getNextRank, getXPToNextRank } from '@/utils/xp';
import type { UserProfile } from '@/utils/storage';

const KONG_QUOTES = [
  "You didn't come this far to only come this far. 🦍",
  "Rest days are for the weak. Just kidding. Rest. 😤",
  "Kong doesn't skip leg day. Neither should you. 🦵",
  "Your only competition is yesterday's you. 💪",
  "Pain is temporary. Kong's respect is forever. 🏆",
  "The iron never lies. Neither does Kong. ⚖️",
  "Sweat now, flex later. 🔥",
  "Kong approves of your dedication. Keep going. 👑",
];

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const loadData = useCallback(async () => {
    const [p, x, s, t] = await Promise.all([
      getItem<UserProfile>(STORAGE_KEYS.PROFILE),
      getXP(),
      getStreak(),
      getTotalWorkouts(),
    ]);
    setProfile(p);
    setXp(x);
    setStreak(s);
    setTotalWorkouts(t);
    setQuoteIndex(Math.floor(Math.random() * KONG_QUOTES.length));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const rank = getRank(xp);
  const nextRank = getNextRank(xp);
  const progress = getRankProgress(xp);
  const xpToNext = getXPToNextRank(xp);

  const progressPercent = Math.round(progress * 100);
  const quote = KONG_QUOTES[quoteIndex];
  const avatarDisplay = profile?.avatar ?? '🦍';
  const usernameDisplay = profile?.username ?? 'Kong Jr.';

  const handleStartWorkout = () => {
    console.log('[Home] Start Workout pressed');
    router.push('/(tabs)/tracker');
  };

  const handleAthleteAI = () => {
    console.log('[Home] Athlete AI pressed');
    router.push('/(tabs)/athlete');
  };

  const handleWOD = () => {
    console.log('[Home] WOD Today pressed');
    router.push('/(tabs)/wods');
  };

  const handleSettings = () => {
    console.log('[Home] Settings pressed');
    router.push('/settings');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sticky header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>EVEXIA</Text>
        <AnimatedPressable onPress={handleSettings} style={styles.settingsButton}>
          <Settings size={22} color={COLORS.textSecondary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Kong hero */}
        <AnimatedListItem index={0}>
          <View style={styles.kongHero}>
            <KongMascot state="idle" size={90} />
            <View style={styles.quoteContainer}>
              <Text style={styles.quoteText}>{quote}</Text>
            </View>
          </View>
        </AnimatedListItem>

        {/* Profile card */}
        <AnimatedListItem index={1}>
          <View style={styles.profileCard}>
            <View style={styles.profileLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{avatarDisplay}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{usernameDisplay}</Text>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankEmoji}>{rank.emoji}</Text>
                  <Text style={styles.rankName}>{rank.name}</Text>
                </View>
              </View>
            </View>
            <View style={styles.xpContainer}>
              <Text style={styles.xpNumber}>{xp.toLocaleString()}</Text>
              <Text style={styles.xpLabel}>XP ⚡</Text>
            </View>
          </View>
        </AnimatedListItem>

        {/* Rank progress */}
        <AnimatedListItem index={2}>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Rank Progress</Text>
              {nextRank ? (
                <Text style={styles.progressNext}>{xpToNext} XP to {nextRank.name} {nextRank.emoji}</Text>
              ) : (
                <Text style={styles.progressNext}>Max Rank Achieved 👑</Text>
              )}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>{rank.name} {rank.emoji}</Text>
              {nextRank && <Text style={styles.progressLabelText}>{nextRank.name} {nextRank.emoji}</Text>}
            </View>
          </View>
        </AnimatedListItem>

        {/* Stats row */}
        <AnimatedListItem index={3}>
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statNumber}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={[styles.statTile, styles.statTileMid]}>
              <Text style={styles.statNumber}>{streak}</Text>
              <Text style={styles.statLabel}>Streak 🔥</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statNumber}>{xp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>XP ⚡</Text>
            </View>
          </View>
        </AnimatedListItem>

        {/* Quick launch */}
        <AnimatedListItem index={4}>
          <View style={styles.quickLaunchSection}>
            <Text style={styles.sectionTitle}>Quick Launch</Text>
            <View style={styles.quickLaunchGrid}>
              <AnimatedPressable onPress={handleStartWorkout} style={styles.quickButton}>
                <Text style={styles.quickButtonIcon}>🏋️</Text>
                <Text style={styles.quickButtonText}>Start Workout</Text>
              </AnimatedPressable>
              <AnimatedPressable onPress={handleAthleteAI} style={[styles.quickButton, styles.quickButtonPrimary]}>
                <Text style={styles.quickButtonIcon}>🤖</Text>
                <Text style={[styles.quickButtonText, styles.quickButtonTextPrimary]}>Athlete AI</Text>
              </AnimatedPressable>
              <AnimatedPressable onPress={handleWOD} style={styles.quickButton}>
                <Text style={styles.quickButtonIcon}>🔥</Text>
                <Text style={styles.quickButtonText}>WOD Today</Text>
              </AnimatedPressable>
            </View>
          </View>
        </AnimatedListItem>

        {/* Kong tip */}
        <AnimatedListItem index={5}>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Kong's Tip</Text>
              <Text style={styles.tipText}>
                Consistency beats intensity. Show up every day, even when you don't feel like it.
              </Text>
            </View>
          </View>
        </AnimatedListItem>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 4,
    fontFamily: 'Nunito_800ExtraBold',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  kongHero: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  quoteContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: '90%',
  },
  quoteText: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Nunito_600SemiBold',
    fontStyle: 'italic',
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  profileInfo: {
    gap: 4,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rankEmoji: {
    fontSize: 12,
  },
  rankName: {
    fontSize: 12,
    color: COLORS.accent,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.accent,
    fontFamily: 'Nunito_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  xpLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Nunito_600SemiBold',
  },
  progressNext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statTileMid: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  quickLaunchSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  quickLaunchGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickButtonPrimary: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  quickButtonIcon: {
    fontSize: 24,
  },
  quickButtonText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  quickButtonTextPrimary: {
    color: COLORS.primary,
  },
  tipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipEmoji: {
    fontSize: 24,
  },
  tipContent: {
    flex: 1,
    gap: 4,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontFamily: 'Nunito_400Regular',
  },
});
