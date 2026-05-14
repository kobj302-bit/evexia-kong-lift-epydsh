import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from './AnimatedPressable';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface PremiumGateProps {
  featureName: string;
  children: React.ReactNode;
}

export function PremiumGate({ featureName, children }: PremiumGateProps) {
  const { isPremium } = useSubscription();

  if (isPremium) return <>{children}</>;

  const handleUnlock = () => {
    console.log('[PremiumGate] Unlock pressed for feature:', featureName);
    router.push('/paywall');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
      <Text style={{ fontSize: 64 }}>🔒</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, fontFamily: 'Nunito_800ExtraBold', textAlign: 'center' }}>
        {featureName}
      </Text>
      <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: 'Nunito_400Regular' }}>
        This feature is part of Evexia Premium. Unlock unlimited AI workouts, nutrition, community, and more.
      </Text>
      <AnimatedPressable
        onPress={handleUnlock}
        style={{
          backgroundColor: COLORS.primary,
          borderRadius: 14,
          paddingVertical: 16,
          paddingHorizontal: 32,
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Nunito_800ExtraBold' }}>
          Unlock Premium — $7/month
        </Text>
      </AnimatedPressable>
    </View>
  );
}
