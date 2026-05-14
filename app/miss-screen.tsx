import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { getItem, STORAGE_KEYS, addXP } from '@/utils/storage';

const SHAME_MESSAGES = [
  { days: 1, title: 'No big deal 😄', message: 'Kong believes in you. One day off is fine. Just don\'t make it a habit.' },
  { days: 2, title: 'Two days? 😟', message: 'Kong is concerned. Two days is starting to look like a pattern.' },
  { days: 3, title: 'Three days... 😔', message: 'Kong is disappointed. The gym misses you. Your muscles miss you.' },
  { days: 4, title: 'Four days. 😤', message: 'Kong is questioning your commitment. Your pre-workout is getting lonely.' },
  { days: 5, title: 'Five days. 💀', message: 'Even your pre-workout is expired. Kong has seen better dedication from a sloth.' },
  { days: 6, title: 'Six days. 🚨', message: 'Kong has filed a missing persons report. The iron is cold. Your gains are gone.' },
  { days: 7, title: 'A whole week. 💀', message: 'Even your pre-workout is disappointed. Kong has given up hope. But not really. Get back in there.' },
];

export default function MissScreen() {
  const insets = useSafeAreaInsets();
  const [daysMissed, setDaysMissed] = useState(1);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadData = async () => {
      const lastWorkoutDate = await getItem<string>(STORAGE_KEYS.LAST_WORKOUT_DATE);
      if (lastWorkoutDate) {
        const last = new Date(lastWorkoutDate);
        const now = new Date();
        const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        setDaysMissed(Math.max(1, Math.min(diff, 7)));
      }
    };
    loadData();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Shame shake
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(3000),
      ])
    ).start();
  }, []);

  const shameData = SHAME_MESSAGES[Math.min(daysMissed - 1, SHAME_MESSAGES.length - 1)];

  const handleImBack = async () => {
    console.log('[MissScreen] I\'m Back pressed — awarding comeback XP');
    await addXP(25);
    router.replace('/(tabs)/(home)');
  };

  const dayLabel = daysMissed === 1 ? '1 day' : `${daysMissed} days`;

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EVEXIA</Text>
        <View style={styles.daysBadge}>
          <Text style={styles.daysBadgeText}>{dayLabel} missed</Text>
        </View>
      </View>

      {/* Kong */}
      <View style={styles.kongSection}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <KongMascot state="disappointed" size={100} />
        </Animated.View>
      </View>

      {/* Shame tiles */}
      <View style={styles.shameContainer}>
        <View style={styles.shameCard}>
          <Text style={styles.shameTitle}>{shameData.title}</Text>
          <Text style={styles.shameMessage}>{shameData.message}</Text>
        </View>

        {/* Escalating tiles */}
        <View style={styles.tilesRow}>
          {SHAME_MESSAGES.slice(0, Math.min(daysMissed, 7)).map((item, index) => (
            <View
              key={index}
              style={[
                styles.tile,
                index === Math.min(daysMissed - 1, 6) && styles.tileActive,
              ]}
            >
              <Text style={styles.tileEmoji}>{item.days}d</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.footerHint}>Kong is waiting at the gym...</Text>
        <AnimatedPressable onPress={handleImBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>I'M BACK 🦍</Text>
        </AnimatedPressable>
        <Text style={styles.xpHint}>+25 XP Comeback Bonus</Text>
      </View>
    </Animated.View>
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
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 3,
    fontFamily: 'Nunito_800ExtraBold',
  },
  daysBadge: {
    backgroundColor: COLORS.dangerMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  daysBadgeText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Nunito_700Bold',
  },
  kongSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  shameContainer: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 20,
  },
  shameCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    alignItems: 'center',
  },
  shameTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
  },
  shameMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Nunito_400Regular',
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tileActive: {
    backgroundColor: COLORS.dangerMuted,
    borderColor: COLORS.danger,
  },
  tileEmoji: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  footerHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 1,
  },
  xpHint: {
    fontSize: 13,
    color: COLORS.accent,
    fontFamily: 'Nunito_600SemiBold',
  },
});
