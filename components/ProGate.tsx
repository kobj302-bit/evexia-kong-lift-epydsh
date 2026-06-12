import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KongMascot } from '@/components/KongMascot';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface ProGateProps {
  feature: string;
  icon: string;
  description: string;
  showDailyPass?: boolean;
  onDailyPass?: () => void;
  previewContent?: React.ReactNode;
}

const INCLUDED_FEATURES = [
  { icon: '🏋️', label: 'WODs & Hero Workouts' },
  { icon: '🥗', label: 'Diet & Meal Plans' },
  { icon: '🧮', label: 'Nutrition Calculator' },
  { icon: '👥', label: 'Community & Teams' },
  { icon: '🤖', label: 'Athlete AI Routines' },
  { icon: '📊', label: 'Advanced Analytics & 1RM Tracking' },
  { icon: '📤', label: 'CSV Export' },
  { icon: '🏋️', label: 'Plate Calculator' },
  { icon: '📚', label: 'Unlimited Saved Routines' },
  { icon: '🔄', label: 'Deload Week Mode' },
];

export function ProGate({ feature, icon, description, showDailyPass, onDailyPass, previewContent }: ProGateProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restorePurchases } = useSubscription();

  const handleUnlock = () => {
    console.log('[ProGate] Unlock Kong Pro pressed — feature:', feature);
    router.push('/paywall');
  };

  const handleRestore = async () => {
    console.log('[ProGate] Restore Purchase pressed — feature:', feature);
    try {
      await restorePurchases();
    } catch {
      // silently ignore
    }
  };

  const handleDailyPass = () => {
    console.log('[ProGate] Daily Pass button pressed — feature:', feature);
    onDailyPass?.();
  };

  const handleClose = () => {
    console.log('[ProGate] Close X pressed — feature:', feature);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const titleText = `${feature} is Kong Pro`;

  // If previewContent is provided, show frosted preview layout
  if (previewContent) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Preview content behind overlay */}
        <View style={styles.previewWrapper}>
          {previewContent}
        </View>

        {/* Dark overlay + blur */}
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.previewOverlay}>
            {/* X Close Button */}
            <TouchableOpacity
              style={[styles.closeButtonOverlay, { top: insets.top + 12 }]}
              onPress={handleClose}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Lock card centered */}
            <View style={styles.lockCard}>
              <KongMascot size={70} />
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={styles.title}>{titleText}</Text>
              <Text style={styles.description}>{description}</Text>
              <AnimatedPressable onPress={handleUnlock} style={styles.unlockBtn}>
                <Text style={styles.unlockBtnText}>Unlock Kong Pro — $7/month</Text>
              </AnimatedPressable>
              <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
                <Text style={styles.restoreBtnText}>Restore Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* X Close Button */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={handleClose}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot */}
        <KongMascot size={100} />

        {/* Lock icon */}
        <Text style={styles.lockIcon}>🔒</Text>

        {/* Feature icon + title */}
        <Text style={styles.featureIcon}>{icon}</Text>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.description}>{description}</Text>

        {/* Included features card */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresCardLabel}>INCLUDED WITH KONG PRO</Text>
          {INCLUDED_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureRowIcon}>{f.icon}</Text>
              <Text style={styles.featureRowLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily pass card (Athlete tab only) */}
        {showDailyPass && (
          <View style={styles.dailyPassCard}>
            <Text style={styles.dailyPassTitle}>⚡ Try Today for $1</Text>
            <Text style={styles.dailyPassSubtitle}>
              One AI workout, expires at midnight. Buy again anytime.
            </Text>
            <AnimatedPressable onPress={handleDailyPass} style={styles.dailyPassBtn}>
              <Text style={styles.dailyPassBtnText}>Get Daily Pass — $1</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Main CTA */}
        <AnimatedPressable onPress={handleUnlock} style={styles.unlockBtn}>
          <Text style={styles.unlockBtnText}>Unlock Kong Pro — $7/month</Text>
        </AnimatedPressable>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreBtnText}>Restore Purchase</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const GOLD = '#D4A017';
const GOLD_LIGHT = '#F0C040';
const GOLD_MUTED = 'rgba(212, 160, 23, 0.15)';
const BG = '#0A0A0A';
const SURFACE = '#141414';
const BORDER = '#2A2A2A';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  // Preview layout
  previewWrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  closeButtonOverlay: {
    position: 'absolute',
    right: 16,
    zIndex: 999,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 340,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 16,
  },
  lockIcon: {
    fontSize: 32,
    marginTop: -8,
  },
  featureIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  featuresCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 1.5,
    borderColor: GOLD,
    gap: 10,
  },
  featuresCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureRowIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  featureRowLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dailyPassCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 1.5,
    borderColor: GOLD,
    gap: 8,
    alignItems: 'center',
  },
  dailyPassTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: GOLD_LIGHT,
    textAlign: 'center',
  },
  dailyPassSubtitle: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  dailyPassBtn: {
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  dailyPassBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: GOLD_LIGHT,
  },
  unlockBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(212,160,23,0.35)' },
      default: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
    }),
    elevation: 6,
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0A0A',
  },
  restoreBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreBtnText: {
    fontSize: 14,
    color: '#888888',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 999,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    lineHeight: 16,
  },
});
