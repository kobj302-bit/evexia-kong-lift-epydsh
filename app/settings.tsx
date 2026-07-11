import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, Linking, useWindowDimensions, TextInput, TouchableOpacity } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { COLORS } from '@/constants/data';
import { useColors } from '@/hooks/useColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetOnboarding } from '@/utils/onboardingStorage';

// ─── Theme definitions ────────────────────────────────────────────────────────
interface Theme {
  id: string;
  name: string;
  emoji: string;
  primary: string;
  bg: string;
  surface: string;
  border: string;
  description: string;
  isPro: boolean;
}

const THEMES: Theme[] = [
  { id: 'gold',     name: 'Dark Gold',  emoji: '👑', primary: '#C9A84C', bg: '#0A0A0A', surface: '#111108', border: '#2A2510', description: 'Classic Kong',    isPro: false },
  { id: 'platinum', name: 'Platinum',   emoji: '🪙', primary: '#E8E8E8', bg: '#0A0A0A', surface: '#111111', border: '#252525', description: 'Clean & Elite',   isPro: true  },
  { id: 'crimson',  name: 'Crimson',    emoji: '🔴', primary: '#E53935', bg: '#0A0505', surface: '#130808', border: '#2A1010', description: 'Warrior Blood',   isPro: true  },
  { id: 'emerald',  name: 'Emerald',    emoji: '💚', primary: '#00C853', bg: '#050A05', surface: '#081308', border: '#102510', description: "Nature's Power",  isPro: true  },
  { id: 'cobalt',   name: 'Cobalt',     emoji: '💙', primary: '#2979FF', bg: '#050510', surface: '#080813', border: '#101030', description: 'Ice Cold Focus',  isPro: true  },
  { id: 'violet',   name: 'Violet',     emoji: '💜', primary: '#AA00FF', bg: '#080510', surface: '#0D0813', border: '#1A1030', description: 'Ascendant',       isPro: true  },
  { id: 'rose',     name: 'Rose Gold',  emoji: '🌸', primary: '#FF4081', bg: '#0A0508', surface: '#130810', border: '#2A1020', description: 'Prestige',        isPro: true  },
  { id: 'arctic',   name: 'Arctic',     emoji: '🧊', primary: '#00E5FF', bg: '#050A0A', surface: '#081313', border: '#102525', description: 'Cryo Mode',       isPro: true  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState, showToast } = useApp();
  const { isSubscribed, restorePurchases, unlockWithPromo } = useSubscription();
  const C = useColors();
  const { width } = useWindowDimensions();
  const [restoring, setRestoring] = useState(false);

  // Redeem code state
  const PROMO_KEY = 'promo_unlocked';
  const [codeInput, setCodeInput] = useState('');
  const [redeemed, setRedeemed] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(PROMO_KEY);
        if (flag === 'true') {
          console.log('[Settings] Promo already redeemed — restoring unlockWithPromo');
          setRedeemed(true);
          await unlockWithPromo();
        }
      } catch (e) {
        console.warn('[Settings] Failed to read promo flag:', e);
      }
    })();
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleRedeem = async () => {
    console.log('[Settings] Redeem code pressed');
    const trimmed = codeInput.trim();
    if (!trimmed) return;
    setRedeemError('');
    try {
      console.log('[Settings] Sending promo code to backend');
      const res = await fetch('https://bu6g6s69j785bngkjuxy3cnwyg5dah4f.app.specular.dev/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      console.log('[Settings] Promo redeem response:', data);
      if (data.valid) {
        console.log('[Settings] Valid code — unlocking Pro');
        await unlockWithPromo();
        setRedeemed(true);
        setCodeInput('');
        showToast('🎉 Kong Pro unlocked!', true);
      } else {
        console.log('[Settings] Invalid code:', data.error);
        setRedeemError(data.error || 'Invalid code');
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setRedeemError(''), 3000);
      }
    } catch {
      console.log('[Settings] Network error during promo redeem');
      setRedeemError('Network error — try again');
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setRedeemError(''), 3000);
    }
  };

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
              accentColor: '#C9A84C',
              themeName: 'gold',
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
    console.log('[Settings] Dark background tint toggled:', value);
    updateState({ proTheme: value });
  };

  const handleThemeSelect = (theme: Theme) => {
    console.log('[Settings] Theme tile pressed:', theme.id);
    if (theme.isPro && !isSubscribed) {
      console.log('[Settings] Pro theme selected without subscription — navigating to paywall');
      router.push('/paywall' as any);
      return;
    }
    console.log('[Settings] Applying theme:', theme.id, theme.primary);
    updateState({ accentColor: theme.primary, themeName: theme.id });
  };

  const activeTheme = THEMES.find((t) => t.id === state.themeName) ?? THEMES[0];
  const selectedLabel = activeTheme.name + ' ' + activeTheme.emoji;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Kong Pro Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Kong Pro</Text>
        {isSubscribed ? (
          <View style={[styles.card, { borderColor: C.gold, borderWidth: 1.5 }]}>
            <View style={styles.proActiveRow}>
              <Text style={styles.proActiveCrown}>👑</Text>
              <View style={styles.proActiveInfo}>
                <Text style={[styles.proActiveTitle, { color: C.gold }]}>Kong Pro Active</Text>
                <Text style={styles.proActiveDesc}>You have full access to all premium features</Text>
              </View>
              <View style={[styles.proActiveBadge, { backgroundColor: C.gold }]}>
                <Text style={styles.proActiveBadgeText}>PRO</Text>
              </View>
            </View>
            <AnimatedPressable onPress={handleRestorePurchase} style={styles.restoreBtn} disabled={restoring}>
              <Text style={styles.restoreBtnText}>{restoring ? 'Restoring...' : 'Restore Purchase'}</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: C.gold, borderWidth: 1.5, gap: 12 }]}>
            <Text style={[styles.proCardTitle, { color: C.gold }]}>Unlock Your Full Potential 🦍</Text>
            <Text style={styles.proCardDesc}>AI coaching, advanced analytics, 2x XP, and elite programs — everything a serious lifter needs.</Text>
            <AnimatedPressable onPress={handleUpgradePro} style={[styles.proUpgradeBtn, { backgroundColor: C.gold }]}>
              <Text style={styles.proUpgradeBtnText}>Upgrade to Kong Pro 👑</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleRestorePurchase} style={styles.restoreBtn} disabled={restoring}>
              <Text style={styles.restoreBtnText}>{restoring ? 'Restoring...' : 'Restore Purchase'}</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>

      {/* Appearance Section — always visible */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Appearance</Text>
        <View style={[styles.card, styles.appearanceCard]}>
          <View>
            <Text style={styles.appearanceTitle}>Color Theme</Text>
            <Text style={styles.appearanceSubtitle}>Personalize your Kong experience</Text>
          </View>

          {/* Theme grid */}
          <View style={styles.themeGrid}>
            {THEMES.map((theme) => {
              const isSelected = state.themeName === theme.id;
              const isProTheme = theme.isPro;
              return (
                <AnimatedPressable
                  key={theme.id}
                  style={styles.themeTile}
                  onPress={() => handleThemeSelect(theme)}
                >
                  <View
                    style={[
                      styles.themeTileBox,
                      {
                        backgroundColor: theme.bg,
                        borderColor: isSelected ? theme.primary : theme.border,
                        borderWidth: isSelected ? 2.5 : 1.5,
                      },
                    ]}
                  >
                    <View style={[styles.themeTileDot, { backgroundColor: theme.primary }]} />
                    {isProTheme && !isSubscribed && (
                      <Text style={styles.themeTileCrown}>👑</Text>
                    )}
                  </View>
                  <Text style={styles.themeTileEmoji}>{theme.emoji}</Text>
                  <Text style={styles.themeTileName} numberOfLines={1}>{theme.name}</Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* Selected label */}
          <Text style={[styles.themeSelectedLabel, { color: C.gold }]}>
            {'Selected: '}
            {selectedLabel}
          </Text>

          {/* Dark Background Tint toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Dark Background Tint</Text>
            <Switch
              value={state.proTheme}
              onValueChange={handleProThemeToggle}
              trackColor={{ false: COLORS.surface2, true: C.gold }}
              thumbColor={state.proTheme ? C.goldBright : COLORS.textSecondary}
            />
          </View>
        </View>
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Profile</Text>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.profileAvatar}>{state.profile.avatar}</Text>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{state.profile.username || 'KongLifter'}</Text>
              <Text style={styles.profileSub}>{state.profile.exp}</Text>
              <Text style={styles.profileSub}>{state.profile.goal}</Text>
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
              trackColor={{ false: COLORS.surface2, true: C.gold }}
              thumbColor={state.expertMode ? C.goldBright : COLORS.textSecondary}
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
                  <Text style={[styles.retakeSurveyBtnText, { color: C.gold }]}>Edit Measurements</Text>
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
            <Text style={[styles.statValue, { color: C.gold }]}>{state.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total XP ⚡</Text>
          </View>
          <View style={[styles.statCard, { minWidth: statMinWidth as any }]}>
            <Text style={[styles.statValue, { color: C.gold }]}>{state.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts 🏋️</Text>
          </View>
          <View style={[styles.statCard, { minWidth: statMinWidth as any }]}>
            <Text style={[styles.statValue, { color: C.gold }]}>{state.streak}</Text>
            <Text style={styles.statLabel}>Streak 🔥</Text>
          </View>
          <View style={[styles.statCard, { minWidth: statMinWidth as any }]}>
            <Text style={[styles.statValue, { color: C.gold }]}>{state.prs.length}</Text>
            <Text style={styles.statLabel}>PRs 🏆</Text>
          </View>
        </View>
      </View>

      {/* Redeem Code */}
      <View style={styles.redeemSection}>
        <Text style={styles.redeemSectionTitle}>🎁 REDEEM CODE</Text>
        {redeemed ? (
          <Text style={[styles.redeemSuccess, { color: C.gold }]}>✓ Code redeemed</Text>
        ) : (
          <>
            <View style={styles.redeemRow}>
              <TextInput
                style={styles.redeemInput}
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder="Enter code"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
              />
              <AnimatedPressable style={styles.redeemBtn} onPress={handleRedeem}>
                <Text style={styles.redeemBtnText}>Redeem</Text>
              </AnimatedPressable>
            </View>
            {redeemError ? <Text style={styles.redeemError}>{redeemError}</Text> : null}
          </>
        )}
      </View>

      {/* Focus & Productivity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Focus & Productivity</Text>
        <View style={[styles.card, { gap: 14 }]}>
          {/* Focus Mode toggle */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.toggleLabel}>🔒 Focus Mode</Text>
              <Text style={styles.hint}>Lock app navigation until you complete your daily challenge</Text>
            </View>
            <Switch
              value={state.focusModeEnabled}
              onValueChange={(v) => {
                console.log('[Settings] Focus Mode toggled:', v);
                updateState({ focusModeEnabled: v });
              }}
              trackColor={{ false: COLORS.surface2, true: C.gold }}
              thumbColor={state.focusModeEnabled ? C.goldBright : COLORS.textSecondary}
            />
          </View>

          {state.focusModeEnabled && (
            <>
              {/* Challenge Type */}
              <View style={{ gap: 8 }}>
                <Text style={styles.toggleLabel}>Challenge Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Push-Ups', 'Sit-Ups', 'Squats', 'Pull-Ups'].map((type) => {
                    const isSelected = state.focusChallengeType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          focusStyles.typeChip,
                          isSelected && { backgroundColor: `${C.gold}25`, borderColor: C.gold },
                        ]}
                        onPress={() => {
                          console.log('[Settings] Focus challenge type selected:', type);
                          updateState({ focusChallengeType: type });
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[focusStyles.typeChipText, isSelected && { color: C.gold }]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Daily Target */}
              <View style={{ gap: 6 }}>
                <Text style={styles.toggleLabel}>Daily Target</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {[20, 30, 50, 75, 100].map((n) => {
                    const isSelected = state.focusChallengeTarget === n;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[
                          focusStyles.typeChip,
                          isSelected && { backgroundColor: `${C.gold}25`, borderColor: C.gold },
                        ]}
                        onPress={() => {
                          console.log('[Settings] Focus challenge target selected:', n);
                          updateState({ focusChallengeTarget: n });
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[focusStyles.typeChipText, isSelected && { color: C.gold }]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Text style={styles.hint}>
                Use the AI camera counter to verify reps. The lock screen will appear until you complete your challenge.
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
        <View style={styles.card}>
          <Text style={styles.retakeSurveyTitle}>📝 Retake Survey</Text>
          <Text style={styles.retakeSurveyDesc}>Update your goals, equipment, and injuries</Text>
          <AnimatedPressable onPress={handleRetakeSurvey} style={styles.retakeSurveyBtn}>
            <Text style={[styles.retakeSurveyBtnText, { color: C.gold }]}>Retake Survey</Text>
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
              Linking.openURL('https://kobj302-bit.github.io/evexia-kong-lift-epydsh/privacy.html');
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
              Linking.openURL('https://kobj302-bit.github.io/evexia-kong-lift-epydsh/terms.html');
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
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, lineHeight: 19 },
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
  measureLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600', flex: 1, lineHeight: 20 },
  measureValue: { fontSize: 14, fontWeight: '800', color: COLORS.text, flexShrink: 0, lineHeight: 20 },
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
  proCardTitle: { fontSize: 17, fontWeight: '900', color: COLORS.gold },
  proCardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  proUpgradeBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  proUpgradeBtnText: { fontSize: 15, fontWeight: '900', color: '#0A0A0A', letterSpacing: 0.5 },
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
  proActiveBadgeText: { fontSize: 12, fontWeight: '900', color: '#0A0A0A', letterSpacing: 1 },

  // Redeem code
  redeemSection: { marginBottom: 16 },
  redeemRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  redeemInput: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  redeemBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  redeemBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  redeemSuccess: { fontSize: 12, color: COLORS.gold, fontWeight: '700', marginTop: 6 },
  redeemError: { fontSize: 12, color: COLORS.red, marginTop: 6 },
  redeemSectionTitle: { fontSize: 12, color: COLORS.textTertiary, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },

  // Appearance / theme picker
  appearanceCard: { gap: 14 },
  appearanceTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  appearanceSubtitle: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  themeTile: { width: '22%', alignItems: 'center', gap: 4 },
  themeTileBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  themeTileDot: { width: 20, height: 20, borderRadius: 10 },
  themeTileEmoji: { fontSize: 14 },
  themeTileName: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  themeTileCrown: { position: 'absolute', top: -4, right: -4, fontSize: 10 },
  themeSelectedLabel: { fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' },
});

const focusStyles = StyleSheet.create({
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
