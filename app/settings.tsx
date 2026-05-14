import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getItem, clearAll, STORAGE_KEYS } from '@/utils/storage';
import type { UserProfile } from '@/utils/storage';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getItem<UserProfile>(STORAGE_KEYS.PROFILE).then(setProfile);
  }, []);

  const handleResetData = () => {
    console.log('[Settings] Reset All Data pressed');
    Alert.alert(
      'Reset All Data',
      'This will delete everything — your profile, workouts, XP, and progress. Kong will be very disappointed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] Confirmed reset — clearing all data');
            await clearAll();
            router.replace('/splash');
          },
        },
      ]
    );
  };

  const handleClose = () => {
    console.log('[Settings] Close pressed');
    router.back();
  };

  const avatarDisplay = profile?.avatar ?? '🦍';
  const usernameDisplay = profile?.username ?? 'Kong Jr.';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <AnimatedPressable onPress={handleClose} style={styles.closeButton}>
          <X size={22} color={COLORS.textSecondary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>{avatarDisplay}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{usernameDisplay}</Text>
              <Text style={styles.profileSub}>
                {profile?.goal ?? 'No goal set'} • {profile?.experience ?? 'Unknown experience'}
              </Text>
            </View>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <AnimatedPressable onPress={handleResetData} style={styles.dangerButton}>
            <Text style={styles.dangerButtonText}>🗑️ Reset All Data</Text>
          </AnimatedPressable>
          <Text style={styles.dangerHint}>This cannot be undone. Kong will be sad.</Text>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App</Text>
              <Text style={styles.infoValue}>Evexia</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mascot</Text>
              <Text style={styles.infoValue}>Kong 🦍</Text>
            </View>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
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
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  profileSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  dangerButton: {
    backgroundColor: COLORS.dangerMuted,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
    fontFamily: 'Nunito_700Bold',
  },
  dangerHint: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.text,
    fontFamily: 'Nunito_600SemiBold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 16,
  },
});
