import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Toast } from '@/components/Toast';
import { COLORS } from '@/constants/data';
import { AnimatedPressable } from '@/components/AnimatedPressable';

function AppHeader() {
  const { state } = useApp();
  const router = useRouter();

  const handleSettings = () => {
    console.log('[Header] Settings pressed');
    router.push('/settings');
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerKong}>🦍</Text>
        <Text style={styles.headerTitle}>EVEXIA</Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <AppHeader />
      <NativeTabs>
        <NativeTabs.Trigger name="home">
          <Icon sf="house.fill" />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tracker">
          <Icon sf="dumbbell.fill" />
          <Label>Tracker</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="athlete">
          <Icon sf="bolt.fill" />
          <Label>Athlete</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="diet">
          <Icon sf="fork.knife" />
          <Label>Diet</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="splits">
          <Icon sf="square.stack.3d.up.fill" />
          <Label>Splits</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="wods">
          <Icon sf="flame.fill" />
          <Label>WODs</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="nutrition">
          <Icon sf="heart.fill" />
          <Label>Nutrition</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="community">
          <Icon sf="person.3.fill" />
          <Label>Community</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="goals">
          <Icon sf="target" />
          <Label>Goals</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="calendar">
          <Icon sf="calendar" />
          <Label>Calendar</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="glowup">
          <Icon sf="sparkles" />
          <Label>Glow Up</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
      <Toast visible={toast.visible} message={toast.message} isGold={toast.isGold} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerKong: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gold, letterSpacing: 2 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerProg: { fontSize: 12, color: COLORS.gold, fontWeight: '700', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerStat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerStatText: { fontSize: 13 },
  headerStatNum: { fontSize: 13, fontWeight: '800', color: COLORS.text, fontVariant: ['tabular-nums'], lineHeight: 18 },
  settingsBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 18 },
});
