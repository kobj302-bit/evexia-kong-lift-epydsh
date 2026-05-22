import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

const SKIP_DELAY = 5;
const AUTO_DISMISS = 8;

export default function AdInterstitial() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(SKIP_DELAY);
  const [skipEnabled, setSkipEnabled] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    console.log('[AdInterstitial] mounted');

    const interval = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          setSkipEnabled(true);
          console.log('[AdInterstitial] skip enabled');
        }
        return next > 0 ? next : 0;
      });
    }, 1000);

    autoTimer.current = setTimeout(() => {
      console.log('[AdInterstitial] auto-dismissed');
      router.back();
    }, AUTO_DISMISS * 1000);

    return () => {
      clearInterval(interval);
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, []);

  const handleSkip = () => {
    if (!skipEnabled) return;
    console.log('[AdInterstitial] skipped by user');
    if (autoTimer.current) clearTimeout(autoTimer.current);
    router.back();
  };

  const handleLearnMore = () => {
    console.log('[AdInterstitial] Learn More pressed');
  };

  const handleGoPremium = () => {
    console.log('[AdInterstitial] Go Premium pressed');
    if (autoTimer.current) clearTimeout(autoTimer.current);
    router.replace('/paywall' as any);
  };

  const skipLabel = skipEnabled ? 'Skip ✕' : `Skip in ${countdown}s`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <Text style={styles.sponsoredLabel}>Sponsored</Text>
        <TouchableOpacity
          style={[styles.skipButton, !skipEnabled && styles.skipButtonDisabled]}
          onPress={handleSkip}
          disabled={!skipEnabled}
        >
          <Text style={[styles.skipButtonText, !skipEnabled && styles.skipButtonTextDisabled]}>
            {skipLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ad card */}
      <View style={styles.adCard}>
        {/* Fake product image */}
        <View style={styles.adImageBlock}>
          <Text style={styles.adImageEmoji}>🥤</Text>
        </View>

        <Text style={styles.brandName}>PROTEIN POWDER PRO</Text>
        <Text style={styles.tagline}>Fuel your gains 💪</Text>
        <Text style={styles.adBody}>
          Premium whey protein with 25g protein per serving. Trusted by elite athletes worldwide.
        </Text>

        <TouchableOpacity style={styles.learnMoreButton} onPress={handleLearnMore}>
          <Text style={styles.learnMoreText}>Learn More</Text>
        </TouchableOpacity>
      </View>

      {/* Upgrade prompt */}
      <View style={styles.upgradeRow}>
        <Text style={styles.upgradeText}>Upgrade to Kong Pro to remove ads</Text>
        <TouchableOpacity onPress={handleGoPremium}>
          <Text style={styles.upgradeLink}>Go Premium 👑</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sponsoredLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  skipButton: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  skipButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A0A0A',
  },
  skipButtonTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  adCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  adImageBlock: {
    width: 250,
    height: 250,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  adImageEmoji: {
    fontSize: 96,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F5F5F0',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  adBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 22,
  },
  learnMoreButton: {
    marginTop: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  learnMoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F0',
  },
  upgradeRow: {
    paddingBottom: 24,
    alignItems: 'center',
    gap: 6,
  },
  upgradeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  upgradeLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFD700',
  },
});
