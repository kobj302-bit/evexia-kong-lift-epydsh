import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';
import { scheduleMissNotifications } from '@/utils/notifications';

function getDaysMissed(lastWorkout: string | null): number {
  if (!lastWorkout) return 0;
  const last = new Date(lastWorkout);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getMoodData(days: number): { emoji: string; title: string; subtitle: string; color: string } {
  if (days <= 1) return {
    emoji: '😏',
    title: 'Kong is watching...',
    subtitle: "One day off. No biggie. Don't make it two.",
    color: COLORS.gold,
  };
  if (days <= 2) return {
    emoji: '😅',
    title: "Kong's side-eye intensifies",
    subtitle: "2 days. Your gains are texting their lawyer.",
    color: COLORS.gold,
  };
  if (days <= 3) return {
    emoji: '😤',
    title: 'The gains are packing',
    subtitle: '3 days. Time to come back. Kong believes in you.',
    color: '#FF9500',
  };
  if (days <= 5) return {
    emoji: '😱',
    title: 'EMERGENCY',
    subtitle: '5 days. Your muscles filed a missing persons report.',
    color: '#FF6B00',
  };
  if (days <= 7) return {
    emoji: '💀',
    title: 'Pre-workout disappointed',
    subtitle: 'A whole week. Even your shaker bottle is sad.',
    color: COLORS.red,
  };
  if (days <= 10) return {
    emoji: '🥵',
    title: 'Freshman 15 incoming',
    subtitle: '10 days off. Kong put on weight FOR you.',
    color: COLORS.red,
  };
  if (days <= 14) return {
    emoji: '😭',
    title: 'Kong is begging',
    subtitle: "2 weeks. One workout. That's all he's asking.",
    color: COLORS.red,
  };
  return {
    emoji: '☠️',
    title: 'The pump has left the chat',
    subtitle: `${days} days. Kong is in mourning. Bring him back.`,
    color: COLORS.red,
  };
}

export default function MissScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState, addXP, showToast } = useApp();

  const days = getDaysMissed(state.lastWorkout);
  const mood = getMoodData(days);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[Miss] Screen shown — days missed:', days);
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Shake animation for Kong
    const shake = Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]);

    const timer = setTimeout(() => shake.start(), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleImBack = () => {
    console.log('[Miss] "I\'m Back!" pressed — days missed:', days);
    const now = new Date();
    const xpBonus = Math.max(50, 200 - days * 10);
    addXP(xpBonus);

    // Add comeback PR
    const newPR = { lift: 'Comeback', weight: days, date: now.toISOString() };
    const updatedPRs = [...state.prs, newPR];

    updateState({
      lastWorkout: now.toISOString(),
      prs: updatedPRs,
    });

    // Reschedule miss notifications from today
    scheduleMissNotifications(now.toISOString());

    showToast(`💪 Welcome back! +${xpBonus} XP`, true);
    console.log('[Miss] Navigating to tracker');
    router.replace('/(tabs)/tracker');
  };

  const handleSkip = () => {
    console.log('[Miss] Skip pressed — navigating to home');
    router.replace('/(tabs)/home');
  };

  const daysText = days === 1 ? '1 day' : `${days} days`;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        {/* Kong Mascot */}
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <KongMascot size={120} />
        </Animated.View>

        {/* Mood Emoji */}
        <Text style={styles.moodEmoji}>{mood.emoji}</Text>

        {/* Days Badge */}
        <View style={[styles.daysBadge, { backgroundColor: `${mood.color}20`, borderColor: mood.color }]}>
          <Text style={[styles.daysText, { color: mood.color }]}>{daysText} missed</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{mood.title}</Text>
        <Text style={styles.subtitle}>{mood.subtitle}</Text>

        {/* Motivational Quote */}
        <View style={styles.quoteBox}>
          <Text style={styles.quoteText}>
            "The iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The iron will always kick you the real deal."
          </Text>
          <Text style={styles.quoteAuthor}>— Henry Rollins</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <AnimatedPressable onPress={handleImBack} style={[styles.backBtn, { backgroundColor: mood.color }]}>
            <Text style={styles.backBtnText}>💪 I'm Back! Let's Go!</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Maybe later...</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  moodEmoji: { fontSize: 64 },
  daysBadge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1.5,
  },
  daysText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  quoteBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    marginTop: 8,
  },
  quoteText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, fontStyle: 'italic', textAlign: 'center' },
  quoteAuthor: { fontSize: 12, color: COLORS.textTertiary, textAlign: 'right', fontWeight: '700' },
  buttons: { width: '100%', gap: 12, marginTop: 8 },
  backBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
    }),
    elevation: 6,
  },
  backBtnText: { fontSize: 17, fontWeight: '900', color: '#0A0A0A' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { fontSize: 14, color: COLORS.textTertiary },
});
