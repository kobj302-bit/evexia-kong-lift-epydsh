import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { setItem, STORAGE_KEYS } from '@/utils/storage';
import type { UserProfile } from '@/utils/storage';

const AVATARS = [
  '🦁','🐯','🐻','🦊','🐺','🦅','🦆','🦉',
  '🦋','🐉','🦄','🐬','🦈','🐆','🦓','🦏',
  '🐘','🦒','🦘','🦬','🐃','🦌','🐗','🦝',
  '🦡','🦦','🦥','🦨','🦔','🐿️','🦫','🦭',
  '🐋','🦑','🐙','🦞','🦀','🐡','🦐','🦩',
];

const INJURIES = ['None', 'Lower Back', 'Knees', 'Shoulders', 'Wrists', 'Hips', 'Neck', 'Ankles'];
const GOALS = ['Build Muscle', 'Lose Fat', 'Maintain', 'Athletic Performance', 'General Fitness'];
const EXPERIENCE_OPTIONS = ['0-1 years', '1-3 years', '3-5 years', '5+ years'];
const EQUIPMENT_OPTIONS = ['Home', 'Gym', 'Both'];
const TRAINING_DAYS = ['3', '4', '5', '6'];

export default function SurveyScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const progressAnim = useRef(new Animated.Value(1 / 7)).current;

  // Form state
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [sex, setSex] = useState('');
  const [experience, setExperience] = useState('');
  const [goal, setGoal] = useState('');
  const [injuries, setInjuries] = useState<string[]>([]);
  const [equipment, setEquipment] = useState('');
  const [trainingDays, setTrainingDays] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('🦁');
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  const goToStep = (newStep: number) => {
    console.log('[Survey] Moving to step:', newStep);
    setStep(newStep);
    Animated.timing(progressAnim, {
      toValue: newStep / 7,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const toggleInjury = (injury: string) => {
    if (injury === 'None') {
      setInjuries(['None']);
      return;
    }
    setInjuries((prev) => {
      const filtered = prev.filter((i) => i !== 'None');
      if (filtered.includes(injury)) {
        return filtered.filter((i) => i !== injury);
      }
      return [...filtered, injury];
    });
  };

  const handleComplete = async () => {
    console.log('[Survey] Survey complete — saving profile');
    const profile: UserProfile = {
      username: username || 'Kong Jr.',
      avatar,
      age,
      weight,
      height: `${heightFt}'${heightIn}"`,
      sex,
      goal,
      injuries,
      equipment,
      trainingDays,
      experience,
      expertMode: false,
      surveyComplete: true,
    };
    await setItem(STORAGE_KEYS.PROFILE, profile);
    await setItem(STORAGE_KEYS.XP, 0);
    await setItem(STORAGE_KEYS.STREAK, 0);
    router.replace('/(tabs)/(home)');
  };

  const handleExpertMode = async () => {
    console.log('[Survey] Expert mode selected — skipping to step 7');
    const profile: UserProfile = {
      username: 'Beast Mode',
      avatar: '🦍',
      age: '',
      weight: '',
      height: '',
      sex: '',
      goal: 'Build Muscle',
      injuries: [],
      equipment: 'Gym',
      trainingDays: '5',
      experience: '5+ years',
      expertMode: true,
      surveyComplete: false,
    };
    await setItem(STORAGE_KEYS.PROFILE, profile);
    goToStep(7);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Let's get to know you 💪</Text>
            <Text style={styles.stepSubtitle}>Kong needs your stats to build the perfect program</Text>

            <View style={styles.sexRow}>
              {['Male', 'Female'].map((s) => (
                <AnimatedPressable
                  key={s}
                  onPress={() => setSex(s)}
                  style={[styles.sexButton, sex === s && styles.sexButtonActive]}
                >
                  <Text style={[styles.sexButtonText, sex === s && styles.sexButtonTextActive]}>
                    {s === 'Male' ? '♂️ Male' : '♀️ Female'}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 25"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 185"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Height (ft)</Text>
                <TextInput
                  style={styles.input}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  placeholder="5"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Height (in)</Text>
                <TextInput
                  style={styles.input}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  placeholder="10"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How long have you been lifting? 🏋️</Text>
            <Text style={styles.stepSubtitle}>Be honest. Kong can tell.</Text>
            <View style={styles.optionsGrid}>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <AnimatedPressable
                  key={opt}
                  onPress={() => setExperience(opt)}
                  style={[styles.optionCard, experience === opt && styles.optionCardActive]}
                >
                  <Text style={[styles.optionText, experience === opt && styles.optionTextActive]}>{opt}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your primary goal? 🎯</Text>
            <Text style={styles.stepSubtitle}>Kong will tailor everything to this</Text>
            <View style={styles.optionsGrid}>
              {GOALS.map((g) => (
                <AnimatedPressable
                  key={g}
                  onPress={() => setGoal(g)}
                  style={[styles.optionCard, goal === g && styles.optionCardActive]}
                >
                  <Text style={[styles.optionText, goal === g && styles.optionTextActive]}>{g}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Any injuries or limitations? 🩹</Text>
            <Text style={styles.stepSubtitle}>Kong won't make you do anything that hurts (much)</Text>
            <View style={styles.chipsContainer}>
              {INJURIES.map((injury) => (
                <AnimatedPressable
                  key={injury}
                  onPress={() => toggleInjury(injury)}
                  style={[styles.chip, injuries.includes(injury) && styles.chipActive]}
                >
                  <Text style={[styles.chipText, injuries.includes(injury) && styles.chipTextActive]}>
                    {injury}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Equipment & Schedule 🏠</Text>
            <Text style={styles.stepSubtitle}>Where do you train and how often?</Text>

            <Text style={styles.sectionLabel}>Equipment</Text>
            <View style={styles.optionsRow}>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <AnimatedPressable
                  key={eq}
                  onPress={() => setEquipment(eq)}
                  style={[styles.optionPill, equipment === eq && styles.optionPillActive]}
                >
                  <Text style={[styles.optionPillText, equipment === eq && styles.optionPillTextActive]}>{eq}</Text>
                </AnimatedPressable>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Training Days / Week</Text>
            <View style={styles.optionsRow}>
              {TRAINING_DAYS.map((d) => (
                <AnimatedPressable
                  key={d}
                  onPress={() => setTrainingDays(d)}
                  style={[styles.dayButton, trainingDays === d && styles.dayButtonActive]}
                >
                  <Text style={[styles.dayButtonText, trainingDays === d && styles.dayButtonTextActive]}>{d}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Create your identity 🦍</Text>
            <Text style={styles.stepSubtitle}>Pick a name and avatar. Make Kong proud.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. BeastMode99"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Choose your avatar</Text>
            <ScrollView style={styles.avatarScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.avatarGrid}>
                {AVATARS.map((emoji) => (
                  <AnimatedPressable
                    key={emoji}
                    onPress={() => setAvatar(emoji)}
                    style={[styles.avatarButton, avatar === emoji && styles.avatarButtonActive]}
                  >
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Almost there, beast 🔥</Text>
            <Text style={styles.stepSubtitle}>Read this before Kong lets you in</Text>

            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerText}>
                Evexia provides fitness guidance for informational purposes only. Always consult a healthcare professional before starting any new exercise program. Kong is not a doctor, but he does have massive arms.
                {'\n\n'}
                By continuing, you agree to train hard, skip no leg days, and respect the iron.
              </Text>
            </View>

            <AnimatedPressable
              onPress={() => setDisclaimerChecked(!disclaimerChecked)}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, disclaimerChecked && styles.checkboxChecked]}>
                {disclaimerChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I understand and I'm ready to train</Text>
            </AnimatedPressable>
          </View>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return age && weight && heightFt && sex;
      case 2: return experience !== '';
      case 3: return goal !== '';
      case 4: return true;
      case 5: return equipment && trainingDays;
      case 6: return username.trim().length > 0;
      case 7: return disclaimerChecked;
      default: return false;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>EVEXIA</Text>
        <Text style={styles.stepIndicator}>Step {step} of 7</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStep()}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {step === 1 && (
          <AnimatedPressable onPress={handleExpertMode} style={styles.expertButton}>
            <Text style={styles.expertButtonText}>⚡ Expert Mode (Skip Survey)</Text>
          </AnimatedPressable>
        )}

        <View style={styles.footerButtons}>
          {step > 1 && (
            <AnimatedPressable onPress={() => goToStep(step - 1)} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </AnimatedPressable>
          )}

          {step < 7 ? (
            <AnimatedPressable
              onPress={() => goToStep(step + 1)}
              style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>Continue →</Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              onPress={handleComplete}
              style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>I'M READY 🦍</Text>
            </AnimatedPressable>
          )}
        </View>
      </View>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 3,
    fontFamily: 'Nunito_800ExtraBold',
  },
  stepIndicator: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.surface2,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
    marginBottom: 8,
  },
  sexRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sexButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sexButtonActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  sexButtonText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  sexButtonTextActive: {
    color: COLORS.primary,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: 'Nunito_400Regular',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: '45%',
    alignItems: 'center',
  },
  optionCardActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  optionTextActive: {
    color: COLORS.primary,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  sectionLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  optionPill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionPillActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  optionPillText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  optionPillTextActive: {
    color: COLORS.primary,
  },
  dayButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayButtonActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  dayButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_700Bold',
  },
  dayButtonTextActive: {
    color: COLORS.primary,
  },
  avatarScroll: {
    maxHeight: 280,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarButtonActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  disclaimerBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disclaimerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontFamily: 'Nunito_400Regular',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: 'Nunito_600SemiBold',
  },
  footer: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expertButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expertButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
});
