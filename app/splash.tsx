import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/styles/colors';
import { getItem, STORAGE_KEYS } from '@/utils/storage';
import type { UserProfile } from '@/utils/storage';

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const bobAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [tapped, setTapped] = useState(false);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 8,
        bounciness: 10,
      }),
    ]).start();

    // Bob animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: -8,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleTap = async () => {
    if (tapped) return;
    setTapped(true);
    console.log('[Splash] Kong tapped — checking survey status');

    const profile = await getItem<UserProfile>(STORAGE_KEYS.PROFILE);
    const surveyComplete = profile?.surveyComplete ?? false;

    if (!surveyComplete) {
      console.log('[Splash] Survey not complete — navigating to survey');
      router.replace('/survey');
      return;
    }

    // Check if missed workout
    const lastWorkoutDate = await getItem<string>(STORAGE_KEYS.LAST_WORKOUT_DATE);
    if (lastWorkoutDate) {
      const last = new Date(lastWorkoutDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 1) {
        console.log('[Splash] Missed workout detected — days missed:', diffDays);
        router.replace('/miss-screen');
        return;
      }
    }

    console.log('[Splash] All good — navigating to tabs');
    router.replace('/(tabs)/(home)');
  };

  return (
    <Pressable style={[styles.container, { paddingTop: insets.top }]} onPress={handleTap}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Glow behind Kong */}
        <View style={styles.glowContainer}>
          <View style={styles.glow} />
        </View>

        {/* Kong */}
        <Animated.View style={{ transform: [{ translateY: bobAnim }] }}>
          <Text style={styles.kongEmoji}>🦍</Text>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>EVEXIA</Text>
        <Text style={styles.tagline}>Train Like a Beast</Text>

        {/* Hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>Tap Kong to Begin</Text>
        </View>
      </Animated.View>

      {/* Bottom decoration */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.bottomText}>Kong is waiting... 🦍</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.primaryMuted,
    opacity: 0.6,
  },
  kongEmoji: {
    fontSize: 120,
    lineHeight: 140,
    textAlign: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 8,
    fontFamily: 'Nunito_800ExtraBold',
    marginTop: 8,
  },
  tagline: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '600',
    letterSpacing: 2,
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 4,
  },
  hintContainer: {
    marginTop: 48,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
  },
});
