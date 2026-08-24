/**
 * FocusLockOverlay
 *
 * Full-screen modal that appears when Focus Mode is enabled and today's
 * challenge hasn't been completed yet. Rendered inside the root layout so
 * it covers every screen except /paywall and /settings.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { KongMascot } from '@/components/KongMascot';
import { COLORS } from '@/constants/data';

const EXCLUDED_ROUTES = ['/paywall', '/settings', '/survey', '/splash', '/miss', '/onboarding', '/index'];

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FocusLockOverlay() {
  const { state, updateState } = useApp();
  const pathname = usePathname();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const todayStr = getTodayStr();
  const challengeDoneToday = state.focusChallengeComplete === todayStr;
  const isExcluded = EXCLUDED_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
  const shouldShow = state.focusModeEnabled && !challengeDoneToday && !isExcluded;

  useEffect(() => {
    if (shouldShow) {
      console.log('[FocusLock] Showing focus lock overlay — challenge not complete today');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  const handleSkipToday = () => {
    console.log('[FocusLock] Skip Today pressed');
    Alert.alert(
      'Skip Today?',
      'This will mark today\'s challenge as complete without doing it. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            console.log('[FocusLock] Skip confirmed — marking challenge complete for today');
            updateState({ focusChallengeComplete: todayStr });
          },
        },
      ]
    );
  };

  const handleDisableFocusMode = () => {
    console.log('[FocusLock] Disable Focus Mode pressed');
    Alert.alert(
      'Disable Focus Mode?',
      'Focus Mode will be turned off. You can re-enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            console.log('[FocusLock] Focus Mode disabled');
            updateState({ focusModeEnabled: false });
          },
        },
      ]
    );
  };

  if (!shouldShow) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Kong mascot */}
          <KongMascot size={80} mood="happy" />

          {/* Lock badge */}
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>🔒 FOCUS MODE ACTIVE</Text>
          </View>

          <Text style={styles.title}>Daily Challenge Required</Text>
          <Text style={styles.subtitle}>
            Complete your challenge to unlock the app
          </Text>

          {/* Challenge card */}
          <View style={styles.challengeCard}>
            <Text style={styles.challengeEmoji}>💪</Text>
            <Text style={styles.challengeText}>
              {state.focusChallengeTarget}
              {' '}
              {state.focusChallengeType}
            </Text>
            <Text style={styles.challengeSub}>Complete your daily challenge to earn XP</Text>
          </View>

          {/* Skip link */}
          <TouchableOpacity style={styles.skipLink} onPress={handleSkipToday} activeOpacity={0.7}>
            <Text style={styles.skipLinkText}>Skip Today</Text>
          </TouchableOpacity>

          {/* Disable link */}
          <TouchableOpacity style={styles.disableLink} onPress={handleDisableFocusMode} activeOpacity={0.7}>
            <Text style={styles.disableLinkText}>Disable Focus Mode</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border2,
    width: '100%',
    maxWidth: 380,
  },
  lockBadge: {
    backgroundColor: `${COLORS.gold}20`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  lockBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  challengeCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  challengeEmoji: { fontSize: 36 },
  challengeText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.gold,
  },
  challengeSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
  skipLink: {
    paddingVertical: 8,
  },
  skipLinkText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  disableLink: {
    paddingVertical: 4,
  },
  disableLinkText: {
    fontSize: 12,
    color: COLORS.red,
    textDecorationLine: 'underline',
  },
});
