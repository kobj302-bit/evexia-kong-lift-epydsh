import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, Linking, useWindowDimensions } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { COLORS } from '@/constants/data';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetOnboarding } from '@/utils/onboardingStorage';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState, showToast } = useApp();
  const { isSubscribed, restorePurchases } = useSubscription();
  const { width } = useWindowDimensions();
  const [restoring, setRestoring] = useState(false);
  // On narrow screens, stat cards go 1-column
  const statMinWidth = width < 360 ? '100%' : '45%';

  const handleUpgradePro = () => {
    console.log('[Settings] Upgrade to Kong Pro pressed');
    router.push('/paywall' as any);
  };

  const handleRestorePurchase = async () => {
    console.log('[Settings] Restore Purchase pressed');
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        showToast('✅ Purchase restored!', true);
      } else {
        showToast('No previous purchases found.');
      }
    } catch {
      showToast('Restore failed. Try again.');
    } finally {
      setRestoring(false);
    }
  };

  const handleRetakeSurvey = () => {
    console.log('[Settings] Retake Survey pressed');
    Alert.alert(
      'Retake Survey?',
      'Your workout history, PRs, and saved routines will be kept. Only your profile answers will be reset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retake',
          style: 'default',
          onPress: async () => {
            console.log('[Settings] Retake Survey confirmed — navigating to /survey');
            await resetOnboarding();
            router.replace('/survey');
          },
        },
      ]
    );
  };

  const handleReset = () => {
    Alert.alert(
      '⚠️ Reset All Data',
      'This will delete ALL your progress, workouts, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] Reset all data confirmed');
            await AsyncStorage.removeItem('evexia_state_v1');
            await resetOnboarding();
            // Reset in-memory state to default (view: splash triggers re-navigation)
            updateState({
              view: 'splash',
              xp: 0,
              streak: 0,
              bestStreak: 0,
              lastWorkout: null,
              totalWorkouts: 0,
              activeProg: null,
              session: [],
              donedays: {},
              history: [],
              prs: [],
              goals: [],
              athleteResult: null,
              dietResult: null,
              savedDiet: null,
              nResult: null,
              grocery: [],
              myTeam: null,
              joinedChallenges: [],
              disclaimerAck: false,
              proTheme: false,
              glowUpAckDisclaimer: false,
              glowUpHabits: {},
              glowUpGrocery: {},
              glowUpGroceryWeek: null,
              glowUpStreakShield: false,
              glowUpStartDate: null,
              streakShields: 1,
              lastShieldRefill: null,
              profile: {
                username: '',
                avatar: '🦍',
                age: 25,
                weight: 180,
                sex: 'Male',
                bf: 15,
                exp: 'Beginner',
                yrs: 0,
                goal: 'Build Muscle',
                equip: 'Full Gym',
                days: 4,
                limNotes: '',
                injuries: [],
                height: 70,
                heightUnit: 'ft',
                waist: 32,
                neck: 15,
                hip: 38,
                weightUnit: 'lbs',
              },
            });
            showToast('🗑️ All data cleared.', false);
            router.replace('/splash');
          },
        },
      ]
    );
  };

  const handleProThemeToggle = (value: boolean) => {
    console.log('[Settings] Pro theme toggled:', value);
    updateState({ proTheme: value });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Kong Pro Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Kong Pro</Text>
        {isSubscribed ? (
          <View style={[styles.card, styles.proActiveCard]}>
            <View style={styles.proActiveRow}>
              <Text style={styles.proActiveCrown}>👑</Text>
              <View style={styles.proActiveInfo}>
                <Text style={styles.proActiveTitle}>Kong Pro Active</Text>
                <Text style={styles.proActiveDesc}>You have full access to all premium features</Text>
              </View>
              <View style={styles.proActiveBadge}>
                <Text style={styles.proActiveBadgeText}>PRO</Text>
              </View>
            </View>
            <AnimatedPressable onPress={handleRestorePurchase} style={styles.restoreBtn} disabled={restoring}>
              <Text style={styles.restoreBtnText}>{restoring ? 'Restoring...' : 'Restore Purchase'}</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={[styles.card, styles.proCard]}>
            <Text style={styles.proCardTitle}>Unlock Your Full Potential 🦍</Text>
            <Text style={styles.proCardDesc}>AI coaching, advanced analytics, 2x XP, and elite programs — everything a serious lifter needs.</Text>
            <AnimatedPressable onPress={handleUpgradePro} style={styles.proUpgradeBtn}>
              <Text style={styles.proUpgradeBtnText}>Upgrade to Kong Pro 👑</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleRestorePurchase} style={styles.restoreBtn} disabled={restoring}>
              <Text style={styles.restoreBtnText}>{restoring ? 'Restoring...' : 'Restore Purchase'}</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>

      {/* Kong Pro Theme — only for subscribers */}
      {isSubscribed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Appearance</Text>
          <View style={[styles.card, styles.proThemeCard]}>
            <View style={styles.proThemeHeader}>
              <View style={styles.proThemeTitleRow}>
                <Text style={styles.proThemeTitle}>👑 Dark Gold Theme</Text>
                <View style={styles.proExclusiveBadge}>
                  <Text style={styles.proExclusiveBadgeText}>PRO</Text>
                </View>
              </View>
              <Text style={styles.proThemeSubtitle}>Exclusive Pro color scheme</Text>
            </View>
            {/* Preview swatch */}
            <View style={styles.themePreviewRow}>
              <View style={[styles.themeSwatch, { backgroundColor: '#0A0A0A', borderColor: COLORS.border }]}>
                <Text style={styles.themeSwatchLabel}>Default</Text>
              </View>
              <Text style={styles.themeArrow}>→</Text>
              <View style={[styles.themeSwatch, { backgroundColor: '#0D0A00', borderColor: COLORS.gold }]}>
                <Text style={[styles.themeSwatchLabel, { color: COLORS.gold }]}>Gold</Text>
              </View>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Enable Dark Gold Theme</Text>
              <Switch
                value={state.proTheme}
                onValueChange={handleProThemeToggle}
                trackColor={{ false: COLORS.surface2, true: COLORS.gold }}
                thumbColor={state.proTheme ? COLORS.goldBright : COLORS.textSecondary}
              />
            </View>
          </View>
        </View>
      )}

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Profile</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.profileAvatar}>{state.profile.avatar}</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{state.profile.username || 'KongLifter'}</Text>
              <Text style={styles.profileSub}>{state.profile.exp} • {state.profile.goal}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Expert Mode</Text>
              <Text style={styles.hint}>Skips profile context in AI calls</Text>
            </View>
            <Switch
              value={state.expertMode}
              onValueChange={(v) => {
                console.log('[Settings] Expert mode toggled:', v);
                updateState({ expertMode: v });
              }}
              trackColor={{ false: COLORS.surface2, true: COLORS.gold }}
              thumbColor={state.expertMode ? COLORS.goldBright : COLORS.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* Body Measurements Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📏 Body Measurements</Text>
        <View style={styles.card}>
          {(() => {
            const p = state.profile;
            const heightInches = p.height || 70;
            const heightUnit = p.heightUnit || 'ft';
            const heightDisplay = heightUnit === 'ft'
              ? `${Math.floor(heightInches / 12)}'${heightInches % 12}"`
              : `${Math.round(heightInches * 2.54)} cm`;
            const weightUnit = p.weightUnit || 'lbs';
            const weightDisplay = weightUnit === 'kg'
              ? `${Math.round((p.weight || 180) / 2.205)} kg`
              : `${p.weight || 180} lbs`;
            return (
              <>
                <View style={styles.measureRow}>
                  <Text style={styles.measureLabel}>Height</Text>
                  <Text style={styles.measureValue}>{heightDisplay}</Text>
                </View>
                <View style={styles.measureRow}>
                  <Text style={styles.measureLabel}>Weight</Text>
                  <Text style={styles.measureValue}>{weightDisplay}</Text>
                </View>
                <View style={styles.measureRow}>
                  <Text style={styles.measureLabel}>Body Fat %</Text>
                  <Text style={styles.measureValue}>
                    {p.bf || 15}
                    {'%'}
                  </Text>
                </View>
                <View style={styles.measureRow}>
                  <Text style={styles.measureLabel}>Waist</Text>
                  <Text style={styles.measureValue}>
                    {p.waist || 32}
                    {' in'}
                  </Text>
                </View>
                <View style={styles.measureRow}>
                  <Text style={styles.measureLabel}>Neck</Text>
                  <Text style={styles.measureValue}>
                    {p.neck || 15}
                    {' in'}
                  </Text>
                </View>
                {p.sex === 'Female' && (
                  <View style={styles.measureRow}>
                    <Text style={styles.measureLabel}>Hip</Text>
                    <Text style={styles.measureValue}>
                      {p.hip || 38}
                      {' in'}
                    </Text>
                  </View>
                )}
                <AnimatedPressable
                  onPress={() => {
                    console.log('[Settings] Edit Measurements pressed — navigating to survey');
                    router.push('/survey');
                  }}
                  style={styles.retakeSurveyBtn}
                >
                  <Text style={styles.retakeSurveyBtnText}>Edit Measurements</Text>
                </AnimatedPressable>
              </>
            );
          })()}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { minWidth: statMinWidth as any }]}>
            <Text style={styles.statValue}>{state.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total XP ⚡</Text>
          </View>
          <View style={[styles.statCard, { minWidth: statMinWidth as any }]}>
            <Text style={styles.statValue}>{state.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts 🏋️</Text>
          </View>
          <View style={[styles.statCard, { minWidth: statMinWidth as any }]}>
            <Text style={styles.statValue}>{state.streak}</Text>
            <Text style={styles.statLabel}>Streak 🔥</Text>
          </View>
          <View style={[styles.statCard, { minWidth: statMinWidth as any }]}>
            <Text style={styles.statValue}>{state.prs.length}</Text>
            <Text style={styles.statLabel}>PRs 🏆</Text>
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
        <View style={styles.card}>
          <Text style={styles.retakeSurveyTitle}>📝 Retake Survey</Text>
          <Text style={styles.retakeSurveyDesc}>Update your goals, equipment, and injuries</Text>
          <AnimatedPressable onPress={handleRetakeSurvey} style={styles.retakeSurveyBtn}>
            <Text style={styles.retakeSurveyBtnText}>Retake Survey</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.dangerDivider} />
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>Clear All Data</Text>
          <Text style={styles.dangerDesc}>Permanently delete all progress, workouts, and settings. Resets the app to first launch. This supports your right to delete your data.</Text>
          <AnimatedPressable onPress={handleReset} style={styles.dangerBtn}>
            <Text style={styles.dangerBtnText}>Clear All Data</Text>
          </AnimatedPressable>
        </View>
      </View>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚖️ Legal</Text>
        <View style={styles.card}>
          <AnimatedPressable
            style={styles.legalRow}
            onPress={() => {
              console.log('[Settings] Privacy Policy link pressed');
              Linking.openURL('https://newly.app/privacy');
            }}
          >
            <Text style={styles.legalLabel}>Privacy Policy</Text>
            <ExternalLink size={16} color={COLORS.textSecondary} />
          </AnimatedPressable>
          <View style={styles.legalDivider} />
          <AnimatedPressable
            style={styles.legalRow}
            onPress={() => {
              console.log('[Settings] Terms of Service link pressed');
              Linking.openURL('https://newly.app/terms');
            }}
          >
            <Text style={styles.legalLabel}>Terms of Service</Text>
            <ExternalLink size={16} color={COLORS.textSecondary} />
          </AnimatedPressable>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>🦍 Evexia: Kong Lift</Text>
        <Text style={styles.appInfoSub}>Version 1.0.0 • Train Like a Gorilla</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  hint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: { fontSize: 40 },
  profileInfo: { gap: 2 },
  profileName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  profileSub: { fontSize: 13, color: COLORS.textSecondary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  measureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  measureLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  measureValue: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  retakeSurveyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  retakeSurveyDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  retakeSurveyBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retakeSurveyBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.gold },
  dangerDivider: { height: 1, backgroundColor: COLORS.border },
  dangerCard: { borderColor: `${COLORS.red}40` },
  dangerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.red },
  dangerDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  dangerBtn: {
    backgroundColor: `${COLORS.red}20`,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  dangerBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.red },
  restoreBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  restoreBtnText: { fontSize: 13, color: COLORS.textSecondary },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  legalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  legalDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: -16 },
  appInfo: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  appInfoText: { fontSize: 16, fontWeight: '800', color: COLORS.textSecondary },
  appInfoSub: { fontSize: 12, color: COLORS.textTertiary },
  proCard: {
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    gap: 12,
  },
  proCardTitle: { fontSize: 17, fontWeight: '900', color: COLORS.gold },
  proCardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  proUpgradeBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  proUpgradeBtnText: { fontSize: 15, fontWeight: '900', color: '#0A0A0A', letterSpacing: 0.5 },
  proActiveCard: {
    borderColor: COLORS.gold,
    borderWidth: 1.5,
  },
  proActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proActiveCrown: { fontSize: 32 },
  proActiveInfo: { flex: 1, gap: 2 },
  proActiveTitle: { fontSize: 16, fontWeight: '800', color: COLORS.gold },
  proActiveDesc: { fontSize: 12, color: COLORS.textSecondary },
  proActiveBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  proActiveBadgeText: { fontSize: 11, fontWeight: '900', color: '#0A0A0A', letterSpacing: 1 },

  // Pro Theme card
  proThemeCard: {
    borderColor: COLORS.border2,
    borderWidth: 1.5,
    gap: 14,
  },
  proThemeHeader: { gap: 4 },
  proThemeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proThemeTitle: { fontSize: 16, fontWeight: '800', color: COLORS.gold },
  proExclusiveBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proExclusiveBadgeText: { fontSize: 10, fontWeight: '900', color: '#0A0A0A', letterSpacing: 1 },
  proThemeSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  themePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  themeSwatch: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeSwatchLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  themeArrow: { fontSize: 18, color: COLORS.textSecondary },
});
