import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { COLORS } from '@/constants/data';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function AthleteTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState, showToast } = useApp();
  const { isAthleteSubscribed, isSubscribed } = useSubscription();
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(state.profile.exp || 'Beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loading) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinAnim.setValue(0);
    }
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handleGenerate = async () => {
    if (!state.apiKey) {
      setError('No API key set. Go to Settings ⚙️ to add your Anthropic API key.');
      return;
    }
    if (!description.trim()) {
      showToast('Describe your ideal routine first!');
      return;
    }
    console.log('[Athlete] Generate routine — level:', level, 'description:', description);
    setLoading(true);
    setError('');
    try {
      const body: any = {
        description,
        level,
        apiKey: state.apiKey,
      };
      if (!state.expertMode) {
        body.profile = {
          age: state.profile.age,
          weight: state.profile.weight,
          sex: state.profile.sex,
          goal: state.profile.goal,
          equip: state.profile.equip,
          days: state.profile.days,
          injuries: state.profile.injuries,
        };
      }
      const response = await fetch(
        'https://zth94rfafkmg6bdjhdzxh2d4exsfcmkz.app.specular.dev/api/ai/athlete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error ${response.status}: ${text.slice(0, 200)}`);
      }
      const data = await response.json();
      console.log('[Athlete] Routine received:', data?.name);
      updateState({ athleteResult: data });
    } catch (e: any) {
      console.error('[Athlete] Error:', e.message);
      setError(e.message || 'Failed to generate routine. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdopt = () => {
    if (!state.athleteResult) return;
    console.log('[Athlete] Adopt program:', state.athleteResult.name);
    updateState({ activeProg: state.athleteResult });
    showToast(`💪 "${state.athleteResult.name}" adopted!`, true);
  };

  const result = state.athleteResult;

  if (!isAthleteSubscribed) {
    const requiresProNote = !isSubscribed;
    const handleUnlock = () => {
      console.log('[Athlete] Unlock Athlete AI pressed — navigating to paywall?tier=athlete');
      router.push('/paywall?tier=athlete');
    };
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedCard}>
          <KongMascot size={60} />
          <Text style={styles.lockedTitle}>Athlete AI — Exclusive Add-On</Text>
          <Text style={styles.lockedSubtitle}>
            Copy workout routines from elite athletes with AI. Requires Kong Pro + Athlete upgrade.
          </Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>$7/month total (Kong Pro + Athlete)</Text>
          </View>
          {requiresProNote ? (
            <View style={styles.requiresProNote}>
              <Text style={styles.requiresProNoteText}>⚠️ Requires Kong Pro ($5/month) first</Text>
            </View>
          ) : null}
          <AnimatedPressable onPress={handleUnlock} style={styles.unlockBtn}>
            <Text style={styles.unlockBtnText}>Unlock Athlete AI 👑</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>🦍 AI Routine Generator</Text>
      <Text style={styles.pageSubtitle}>Describe your ideal program and Kong will build it</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Describe Your Ideal Routine</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="e.g. I want a 4-day PPL split focused on hypertrophy with heavy compounds..."
          placeholderTextColor={COLORS.textTertiary}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Experience Level</Text>
        <View style={styles.levelRow}>
          {LEVELS.map((l) => (
            <AnimatedPressable key={l} onPress={() => setLevel(l)} style={[styles.levelPill, level === l && styles.levelPillActive]}>
              <Text style={[styles.levelText, level === l && styles.levelTextActive]}>{l}</Text>
            </AnimatedPressable>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <AnimatedPressable onPress={handleGenerate} style={styles.generateBtn} disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <Animated.Text style={[styles.loadingKong, { transform: [{ rotate: spin }] }]}>🦍</Animated.Text>
              <Text style={styles.generateBtnText}>Kong is thinking...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>Generate Routine 🦍</Text>
          )}
        </AnimatedPressable>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultName}>{result.name || 'Custom Routine'}</Text>
            <AnimatedPressable onPress={handleAdopt} style={styles.adoptBtn}>
              <Text style={styles.adoptBtnText}>Adopt 💪</Text>
            </AnimatedPressable>
          </View>

          {result.description && (
            <Text style={styles.resultDesc}>{result.description}</Text>
          )}

          {result.days && result.days.length > 0 && (
            <View style={styles.daysSection}>
              <Text style={styles.daysSectionTitle}>📅 Program Days</Text>
              {result.days.map((day: any, idx: number) => (
                <AnimatedPressable
                  key={idx}
                  onPress={() => {
                    console.log('[Athlete] Toggle day:', idx);
                    setExpandedDay(expandedDay === idx ? null : idx);
                  }}
                  style={styles.dayRow}
                >
                  <View style={styles.dayRowHeader}>
                    <Text style={styles.dayRowName}>{day.name || `Day ${idx + 1}`}</Text>
                    <Text style={styles.dayRowChevron}>{expandedDay === idx ? '▲' : '▼'}</Text>
                  </View>
                  {expandedDay === idx && (
                    <View style={styles.dayExercises}>
                      {(day.exercises || []).map((ex: string, i: number) => (
                        <Text key={i} style={styles.dayExercise}>• {ex}</Text>
                      ))}
                    </View>
                  )}
                </AnimatedPressable>
              ))}
            </View>
          )}

          {result.tips && result.tips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsSectionTitle}>💡 Kong's Tips</Text>
              {result.tips.map((tip: string, i: number) => (
                <Text key={i} style={styles.tip}>• {tip}</Text>
              ))}
            </View>
          )}

          <AnimatedPressable onPress={handleAdopt} style={styles.adoptBtnFull}>
            <Text style={styles.adoptBtnFullText}>Adopt This Program 💪</Text>
          </AnimatedPressable>
        </View>
      )}

      {!result && !loading && (
        <View style={styles.emptyState}>
          <KongMascot size={60} />
          <Text style={styles.emptyTitle}>No routine yet</Text>
          <Text style={styles.emptySub}>Describe what you want and Kong will build your perfect program</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  pageSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: -8 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  textArea: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
  },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelPillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  levelText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  levelTextActive: { color: COLORS.gold },
  errorBox: {
    backgroundColor: `${COLORS.red}15`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
  },
  errorText: { fontSize: 13, color: COLORS.red, lineHeight: 20 },
  generateBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingKong: { fontSize: 20 },
  generateBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 14,
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { fontSize: 20, fontWeight: '900', color: COLORS.gold, flex: 1 },
  adoptBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  adoptBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.gold },
  resultDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  daysSection: { gap: 8 },
  daysSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  dayRow: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  dayRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayRowName: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  dayRowChevron: { fontSize: 12, color: COLORS.textSecondary },
  dayExercises: { gap: 4, paddingTop: 4 },
  dayExercise: { fontSize: 13, color: COLORS.textSecondary },
  tipsSection: { gap: 6 },
  tipsSectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  tip: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  adoptBtnFull: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  adoptBtnFullText: { fontSize: 15, fontWeight: '900', color: '#0A0A0A' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary },
  emptySub: { fontSize: 14, color: COLORS.textTertiary, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  lockedContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lockedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    width: '100%',
    maxWidth: 360,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  priceBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
  },
  requiresProNote: {
    backgroundColor: `${COLORS.red}15`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
    width: '100%',
  },
  requiresProNoteText: {
    fontSize: 13,
    color: COLORS.red,
    textAlign: 'center',
    fontWeight: '600',
  },
  unlockBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  unlockBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0A0A',
  },
});
