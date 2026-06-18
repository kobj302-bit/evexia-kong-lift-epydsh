import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Toast } from '@/components/Toast';
import { COLORS } from '@/constants/data';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const TABS = [
  { name: 'home', route: '/(tabs)/home' as const, icon: 'home' as const, label: 'Home' },
  { name: 'tracker', route: '/(tabs)/tracker' as const, icon: 'fitness-center' as const, label: 'Tracker' },
  { name: 'athlete', route: '/(tabs)/athlete' as const, icon: 'bolt' as const, label: 'Athlete' },
  { name: 'diet', route: '/(tabs)/diet' as const, icon: 'restaurant' as const, label: 'Diet' },
  { name: 'splits', route: '/(tabs)/splits' as const, icon: 'layers' as const, label: 'Splits' },
  { name: 'wods', route: '/(tabs)/wods' as const, icon: 'whatshot' as const, label: 'WODs' },
  { name: 'nutrition', route: '/(tabs)/nutrition' as const, icon: 'favorite' as const, label: 'Nutrition' },
  { name: 'community', route: '/(tabs)/community' as const, icon: 'group' as const, label: 'Community' },
  { name: 'goals', route: '/(tabs)/goals' as const, icon: 'track-changes' as const, label: 'Goals' },
  { name: 'calendar', route: '/(tabs)/calendar' as const, icon: 'calendar-today' as const, label: 'Calendar' },
  { name: 'glowup', route: '/(tabs)/glowup' as const, icon: 'auto-awesome' as const, label: 'Glow Up' },
];

function AppHeader() {
  const { state } = useApp();
  const { isSubscribed } = useSubscription();
  const router = useRouter();

  const handleSettings = () => {
    console.log('[Header] Settings pressed');
    router.push('/settings');
  };

  const proThemeActive = isSubscribed && state.proTheme;
  const headerBg = proThemeActive ? '#1A1400' : COLORS.surface;
  const headerBorderColor = proThemeActive ? COLORS.gold : COLORS.border;
  const headerBorderWidth = proThemeActive ? 1 : 1;

  return (
    <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorderColor, borderBottomWidth: headerBorderWidth }]}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerKong}>🦍</Text>
        <Text style={styles.headerTitle}>EVEXIA</Text>
        {isSubscribed && (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>👑 PRO</Text>
          </View>
        )}
      </View>
      <View style={styles.headerCenter}>
        {state.activeProg && (
          <Text style={styles.headerProg} numberOfLines={1}>{state.activeProg.name}</Text>
        )}
      </View>
      <View style={styles.headerRight}>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatText}>🔥</Text>
          <Text style={styles.headerStatNum}>{state.streak}</Text>
        </View>
        <View style={styles.headerStat}>
          <Text style={styles.headerStatText}>⚡</Text>
          <Text style={styles.headerStatNum}>{state.xp.toLocaleString()}</Text>
        </View>
        <AnimatedPressable onPress={handleSettings} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { toast } = useApp();

  const { width: screenWidth } = Dimensions.get('window');
  const tabBarWidth = Math.min(screenWidth * 0.96, 420);

  return (
    <View style={styles.container}>
      <AppHeader />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="tracker" />
        <Stack.Screen name="athlete" />
        <Stack.Screen name="diet" />
        <Stack.Screen name="splits" />
        <Stack.Screen name="wods" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="community" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="glowup" />
      </Stack>
      <FloatingTabBar
        tabs={TABS}
        containerWidth={tabBarWidth}
        borderRadius={20}
        bottomMargin={8}
      />
      <Toast visible={toast.visible} message={toast.message} isGold={toast.isGold} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerKong: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gold, letterSpacing: 2 },
  proBadge: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeText: { fontSize: 12, fontWeight: '900', color: COLORS.gold },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerProg: { fontSize: 12, color: COLORS.gold, fontWeight: '700', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerStat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerStatText: { fontSize: 13 },
  headerStatNum: { fontSize: 13, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'], lineHeight: 18 },
  settingsBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 18 },
});
