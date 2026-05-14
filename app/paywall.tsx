import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useSubscription } from '@/contexts/SubscriptionContext';

const FEATURES = [
  { icon: '🤖', title: 'Athlete AI Coach', description: 'AI-generated weekly programs tailored to any athlete or role' },
  { icon: '🥗', title: 'Smart Nutrition', description: 'AI meal plans, TDEE calculator, and macro tracking' },
  { icon: '👥', title: 'Community & Teams', description: 'Join teams, compete in leaderboards, and team battles' },
  { icon: '📋', title: 'WODs & Diet Plans', description: 'Hero workouts, holiday challenges, and AI diet generation' },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { purchasePremium, restorePurchases, isLoading } = useSubscription();

  const handlePurchase = async () => {
    console.log('[Paywall] Purchase Premium button pressed');
    await purchasePremium();
  };

  const handleRestore = async () => {
    console.log('[Paywall] Restore Purchases pressed');
    await restorePurchases();
  };

  const handleClose = () => {
    console.log('[Paywall] Close pressed');
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close button */}
      <View style={styles.header}>
        <AnimatedPressable onPress={handleClose} style={styles.closeButton}>
          <X size={22} color={COLORS.textSecondary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.kongEmoji}>🦍</Text>
          <Text style={styles.title}>Go Premium</Text>
          <Text style={styles.subtitle}>Unlock Kong's full arsenal. Train like a beast.</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{feature.icon}</Text>
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$7</Text>
            <Text style={styles.pricePeriod}>/month</Text>
          </View>
          <Text style={styles.priceNote}>Cancel anytime. No excuses.</Text>
        </View>

        {/* CTA */}
        <AnimatedPressable
          onPress={handlePurchase}
          style={[styles.purchaseButton, isLoading && styles.purchaseButtonLoading]}
          disabled={isLoading}
        >
          <Text style={styles.purchaseButtonText}>
            {isLoading ? 'Processing...' : 'Start Premium — $7/month 🦍'}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable onPress={handleRestore} style={styles.restoreButton}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </AnimatedPressable>

        <Text style={styles.legalText}>
          Subscription auto-renews monthly. Cancel anytime in App Store settings.
        </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  kongEmoji: {
    fontSize: 72,
    lineHeight: 88,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: 'Nunito_400Regular',
  },
  featuresContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontFamily: 'Nunito_400Regular',
  },
  priceCard: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Nunito_800ExtraBold',
  },
  pricePeriod: {
    fontSize: 18,
    color: COLORS.primary,
    fontFamily: 'Nunito_600SemiBold',
  },
  priceNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  purchaseButtonLoading: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Nunito_800ExtraBold',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  legalText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Nunito_400Regular',
  },
});
