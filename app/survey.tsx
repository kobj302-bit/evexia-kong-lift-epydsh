import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  Animated, Switch, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp } from '@/contexts/AppContext';
import { COLORS, AVATARS } from '@/constants/data';

const TOTAL_STEPS = 7;

const GOALS = [
  { label: 'Build Muscle', emoji: '💪' },
  { label: 'Lose Fat', emoji: '🔥' },
  { label: 'Get Strong', emoji: '🏋️' },
  { label: 'Endurance', emoji: '🏃' },
  { label: 'General Fitness', emoji: '⚡' },
];

const INJURY_OPTIONS = ['None', 'Lower Back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Neck', 'Ankles'];
const EQUIP_OPTIONS = ['Full Gym', 'Home Gym', 'Minimal', 'Bodyweight Only'];
const EXP_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const SEX_OPTIONS = ['Male', 'Female', 'Other'];

export default function SurveyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateState } = useApp();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState(1);
  const [age, setAge] = useState('25');
  const [weight, setWeight] = useState('180');
  const [sex, setSex] = useState('Male');
  const [exp, setExp] = useState('Beginner');
  const [yrs, setYrs] = useState('0');
  const [goal, setGoal] = useState('Build Muscle');
  const [injuries, setInjuries] = useState<string[]>(['None']);
  const [limNotes, setLimNotes] = useState('');
  const [equip, setEquip] = useState('Full Gym');
  const [days, setDays] = useState(4);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🦍');
  const [disclaimer, setDisclaimer] = useState(false);
  const [expertMode, setExpertMode] = useState(false);

  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  // Responsive grid: 1 col < 360, 2 col 360-600, 3 col >= 600
  const numCols = width < 360 ? 1 : width < 600 ? 2 : 3;
  const cardGap = 10;
  const cardWidth = (width - 40 - cardGap * (numCols - 1)) / numCols;

  // Avatar grid: auto-compute columns
  const avatarGap = 8;
  const avatarNumCols = Math.max(4, Math.floor((width - 40) / 64));
  const avatarSize = Math.floor((width - 40 - avatarGap * (avatarNumCols - 1)) / avatarNumCols);

  // EXP cards: always 3 equal columns
  const expCardWidth = (width - 40 - cardGap * 2) / 3;
  const isNarrow = width < 360;

  const goNext = () => {
    console.log('[Survey] Step', step, 'completed');
    const next = step + 1;
    setStep(next);
    Animated.timing(progressAnim, {
      toValue: next / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const goBack = () => {
    if (step === 1) return;
    const prev = step - 1;
    setStep(prev);
    Animated.timing(progressAnim, {
      toValue: prev / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleExpertMode = () => {
    console.log('[Survey] Expert Mode activated — skipping survey');
    updateState({ view: 'app', expertMode: true });
    router.replace('/(tabs)/home');
  };

  const toggleInjury = (item: string) => {
    if (item === 'None') {
      setInjuries(['None']);
      return;
    }
    setInjuries((prev) => {
      const without = prev.filter((i) => i !== 'None');
      if (without.includes(item)) return without.filter((i) => i !== item) || ['None'];
      return [...without, item];
    });
  };

  const handleFinish = () => {
    console.log('[Survey] Completed — saving profile');
    updateState({
      view: 'app',
      profile: {
        username: username || 'KongLifter',
        avatar,
        age: parseInt(age) || 25,
        weight: parseFloat(weight) || 180,
        sex,
        bf: 15,
        exp,
        yrs: parseInt(yrs) || 0,
        goal,
        equip,
        days,
        limNotes,
        injuries,
      },
      expertMode,
      disclaimerAck: disclaimer,
    });
    router.replace('/(tabs)/home');
  };

  const canProceed = () => {
    if (step === 6 && !username.trim()) return false;
    if (step === 7 && !disclaimer) return false;
    return true;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🦍 KONG LIFT</Text>
        <Text style={styles.stepText}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>📊 Your Stats</Text>
            <Text style={styles.stepSubtitle}>Let Kong know what he's working with</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
                placeholder="25"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
                placeholder="180"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Sex</Text>
              <View style={styles.pillRow}>
                {SEX_OPTIONS.map((s) => (
                  <AnimatedPressable key={s} onPress={() => setSex(s)} style={[styles.pill, sex === s && styles.pillActive]}>
                    <Text numberOfLines={1} style={[styles.pillText, sex === s && styles.pillTextActive]}>{s}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            {/* Expert Mode — Step 1 only */}
            <AnimatedPressable onPress={handleExpertMode} style={styles.expertSkipBtn}>
              <View style={styles.expertSkipLeft}>
                <Text style={styles.expertSkipTitle}>Expert Mode</Text>
                <Text style={styles.expertSkipDesc}>Skip survey (advanced users)</Text>
              </View>
              <Text style={styles.expertSkipArrow}>→</Text>
            </AnimatedPressable>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🏋️ Experience Level</Text>
            <Text style={styles.stepSubtitle}>How long have you been training?</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Level</Text>
              {/* Always 3 equal columns for EXP cards */}
              <View style={styles.expRow}>
                {EXP_OPTIONS.map((e) => (
                  <AnimatedPressable
                    key={e}
                    onPress={() => setExp(e)}
                    style={[
                      styles.expCard,
                      { width: expCardWidth, padding: isNarrow ? 10 : 16 },
                      exp === e && styles.expCardActive,
                    ]}
                  >
                    <Text style={styles.expEmoji}>{e === 'Beginner' ? '🌱' : e === 'Intermediate' ? '💪' : '👑'}</Text>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.expLabel, exp === e && styles.expLabelActive]}
                    >
                      {e}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Years Training</Text>
              <TextInput
                style={styles.input}
                value={yrs}
                onChangeText={setYrs}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textTertiary}
                placeholder="0"
              />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🎯 Your Goal</Text>
            <Text style={styles.stepSubtitle}>What are you training for?</Text>

            <View style={styles.responsiveGrid}>
              {GOALS.map((g) => (
                <AnimatedPressable
                  key={g.label}
                  onPress={() => setGoal(g.label)}
                  style={[
                    styles.goalCard,
                    { width: cardWidth },
                    goal === g.label && styles.goalCardActive,
                  ]}
                >
                  <Text style={styles.goalEmoji}>{g.emoji}</Text>
                  <Text numberOfLines={2} style={[styles.goalLabel, goal === g.label && styles.goalLabelActive]}>{g.label}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🩹 Injuries & Limits</Text>
            <Text style={styles.stepSubtitle}>Kong needs to know what to avoid</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Problem Areas</Text>
              <View style={styles.chipGrid}>
                {INJURY_OPTIONS.map((item) => (
                  <AnimatedPressable key={item} onPress={() => toggleInjury(item)} style={[styles.chip, injuries.includes(item) && styles.chipActive]}>
                    <Text numberOfLines={1} style={[styles.chipText, injuries.includes(item) && styles.chipTextActive]}>{item}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={limNotes}
                onChangeText={setLimNotes}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.textTertiary}
                placeholder="Any other limitations or notes..."
              />
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>⚙️ Setup</Text>
            <Text style={styles.stepSubtitle}>What do you have to work with?</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Equipment</Text>
              <View style={styles.responsiveGrid}>
                {EQUIP_OPTIONS.map((e) => (
                  <AnimatedPressable
                    key={e}
                    onPress={() => setEquip(e)}
                    style={[
                      styles.equipCard,
                      { width: cardWidth },
                      equip === e && styles.equipCardActive,
                    ]}
                  >
                    <Text numberOfLines={2} style={[styles.equipLabel, equip === e && styles.equipLabelActive]}>{e}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Days Per Week</Text>
              <View style={styles.pillRow}>
                {[3, 4, 5, 6].map((d) => (
                  <AnimatedPressable key={d} onPress={() => setDays(d)} style={[styles.dayPill, days === d && styles.dayPillActive]}>
                    <Text style={[styles.dayPillText, days === d && styles.dayPillTextActive]}>{d}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 6 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>👤 Username</Text>
            <Text style={styles.stepSubtitle}>What should Kong call you?</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor={COLORS.textTertiary}
                placeholder="e.g. IronKing_88"
                autoFocus
              />
            </View>
          </View>
        )}

        {step === 7 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>🦍 Choose Your Avatar</Text>
            <Text style={styles.stepSubtitle}>Pick your Kong identity</Text>

            {/* Responsive avatar grid — plain View+map, no FlatList nested in ScrollView */}
            <View style={styles.avatarGridWrap}>
              {AVATARS.map((a) => (
                <AnimatedPressable
                  key={a}
                  onPress={() => {
                    console.log('[Survey] Avatar selected:', a);
                    setAvatar(a);
                  }}
                  style={[
                    styles.avatarBtn,
                    { width: avatarSize, height: avatarSize, borderRadius: Math.floor(avatarSize * 0.2) },
                    avatar === a && styles.avatarBtnActive,
                  ]}
                >
                  <Text style={[styles.avatarEmoji, { fontSize: Math.floor(avatarSize * 0.5) }]}>{a}</Text>
                </AnimatedPressable>
              ))}
            </View>

            <View style={styles.disclaimerBox}>
              <TouchableOpacity style={styles.disclaimerRow} onPress={() => setDisclaimer(!disclaimer)} activeOpacity={0.7}>
                <View style={[styles.checkbox, disclaimer && styles.checkboxActive]}>
                  {disclaimer && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.disclaimerText}>
                  I acknowledge this app is for entertainment purposes only and not medical advice. *
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.expertRow}>
              <View style={styles.expertInfo}>
                <Text style={styles.expertLabel}>Expert Mode</Text>
                <Text style={styles.expertDesc}>Skips profile context in AI calls</Text>
              </View>
              <Switch
                value={expertMode}
                onValueChange={(val) => {
                  console.log('[Survey] Expert Mode toggle:', val);
                  setExpertMode(val);
                }}
                trackColor={{ false: COLORS.surface2, true: COLORS.gold }}
                thumbColor={expertMode ? COLORS.goldBright : COLORS.textSecondary}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.navButtons, { paddingBottom: insets.bottom + 16 }]}>
        {step > 1 && (
          <AnimatedPressable onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </AnimatedPressable>
        )}
        {step < TOTAL_STEPS ? (
          <AnimatedPressable onPress={goNext} style={[styles.nextBtn, step === 1 && { flex: 1 }]} disabled={!canProceed()}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable onPress={handleFinish} style={[styles.finishBtn, { flex: 1 }]} disabled={!canProceed()}>
            <Text style={styles.finishBtnText}>LET'S LIFT 🦍</Text>
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gold },
  stepText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  progressTrack: { height: 4, backgroundColor: COLORS.surface2, marginHorizontal: 20, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: COLORS.gold, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  stepContainer: { gap: 20 },
  stepTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  stepSubtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: -12 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 4,
  },
  pillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  pillText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, flexShrink: 1 },
  pillTextActive: { color: COLORS.gold },

  // Responsive grid for goals/equip
  responsiveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // EXP cards — always 3 equal columns
  expRow: { flexDirection: 'row', gap: 10 },
  expCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expCardActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  expEmoji: { fontSize: 28 },
  expLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  expLabelActive: { color: COLORS.gold },

  // Goal cards — responsive width
  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalCardActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  goalEmoji: { fontSize: 32 },
  goalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center', flexShrink: 1 },
  goalLabelActive: { color: COLORS.gold },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, flexShrink: 1 },
  chipTextActive: { color: COLORS.gold },

  // Equip cards — responsive width
  equipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  equipCardActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  equipLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center', flexShrink: 1 },
  equipLabelActive: { color: COLORS.gold },

  dayPill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayPillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  dayPillText: { fontSize: 18, fontWeight: '800', color: COLORS.textSecondary },
  dayPillTextActive: { color: COLORS.gold },

  // Avatar grid — responsive, plain View+map
  avatarGridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarBtn: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarBtnActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold, borderWidth: 2 },
  avatarEmoji: { fontSize: 32 },

  disclaimerBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  checkmark: { fontSize: 13, fontWeight: '900', color: '#0A0A0A' },
  disclaimerText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expertInfo: { gap: 2, flex: 1, marginRight: 12 },
  expertLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  expertDesc: { fontSize: 12, color: COLORS.textSecondary },
  expertSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  expertSkipLeft: { gap: 2, flex: 1, marginRight: 12 },
  expertSkipTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gold },
  expertSkipDesc: { fontSize: 12, color: COLORS.textSecondary },
  expertSkipArrow: { fontSize: 18, color: COLORS.gold, fontWeight: '700' },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  finishBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
  },
  finishBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A', letterSpacing: 1 },
});
