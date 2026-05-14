import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateState } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    console.log('[Splash] Get Started pressed');
    updateState({ view: 'survey' });
    router.replace('/survey');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <KongMascot size={120} />

        <View style={styles.titleBlock}>
          <Text style={styles.title}>EVEXIA</Text>
          <Text style={styles.subtitle}>KONG LIFT</Text>
          <Text style={styles.tagline}>Train Like a Gorilla 💪</Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featureItem}>🏋️ AI-Powered Workout Programs</Text>
          <Text style={styles.featureItem}>🥗 Personalized Meal Plans</Text>
          <Text style={styles.featureItem}>🏆 Track PRs & Earn XP</Text>
          <Text style={styles.featureItem}>🔥 Compete with Friends</Text>
        </View>

        <AnimatedPressable onPress={handleGetStarted} style={styles.button}>
          <Text style={styles.buttonText}>GET STARTED 🦍</Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 32,
    width: '100%',
  },
  titleBlock: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },
  features: {
    gap: 12,
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureItem: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0A0A0A',
    letterSpacing: 2,
  },
});
