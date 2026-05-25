import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { KongMascot } from '@/components/KongMascot';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProGate } from '@/components/ProGate';
import { COLORS } from '@/constants/data';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const PHASES = ['Bulking', 'Cutting', 'Maintenance', 'Setting the Stage', 'Building Muscle'];

interface Template {
  label: string;
  emoji: string;
  description: string;
  athleteTemplate?: string;
  sport?: string;
  phase?: string;
}

const TEMPLATES: Template[] = [
  // Famous Athletes
  { label: 'Ronaldo', emoji: '🦵', description: 'Train like Cristiano Ronaldo', athleteTemplate: 'Cristiano Ronaldo', sport: 'Soccer' },
  { label: 'Arnold', emoji: '💪', description: 'Arnold Schwarzenegger Golden Era bodybuilding', athleteTemplate: 'Arnold Schwarzenegger' },
  { label: 'LeBron', emoji: '🏀', description: 'LeBron James NBA performance training', athleteTemplate: 'LeBron James', sport: 'Basketball' },
  { label: 'Phelps', emoji: '🏊', description: 'Michael Phelps swimming performance', athleteTemplate: 'Michael Phelps', sport: 'Swimming' },
  { label: 'Fury', emoji: '🥊', description: 'Tyson Fury boxing conditioning', athleteTemplate: 'Tyson Fury', sport: 'Boxing' },
  { label: 'CBum', emoji: '🏋️', description: 'Chris Bumstead Classic Physique bodybuilding', athleteTemplate: 'Chris Bumstead' },
  // Sports
  { label: 'Soccer', emoji: '⚽', description: 'Soccer player conditioning and speed training', sport: 'Soccer' },
  { label: 'Wrestling', emoji: '🤼', description: 'Wrestling strength and conditioning program', sport: 'Wrestling' },
  { label: 'Swimming', emoji: '🏊', description: 'Competitive swimming performance training', sport: 'Swimming' },
  { label: 'Rugby', emoji: '🏉', description: 'Rugby player power and endurance training', sport: 'Rugby' },
  { label: 'Football', emoji: '🏈', description: 'American football athlete training program', sport: 'Football' },
  { label: 'Boxing', emoji: '🥊', description: 'Boxing conditioning and fight preparation', sport: 'Boxing' },
  { label: 'MMA', emoji: '🥋', description: 'MMA fighter strength and conditioning', sport: 'MMA' },
  { label: 'Basketball', emoji: '🏀', description: 'Basketball athleticism and performance training', sport: 'Basketball' },
  // Military
  { label: 'Navy SEAL', emoji: '🔱', description: 'Navy SEAL BUD/S preparation and operational fitness' },
  { label: 'Army Ranger', emoji: '🪖', description: 'Army Ranger physical fitness and combat readiness' },
  { label: 'Firefighter', emoji: '🚒', description: 'Firefighter functional fitness and job readiness' },
  { label: 'Police Academy', emoji: '👮', description: 'Police academy physical fitness preparation' },
  // Phases
  { label: 'Bulk Phase', emoji: '📈', description: 'Aggressive muscle building bulk phase program', phase: 'Bulking' },
  { label: 'Cut Phase', emoji: '✂️', description: 'Fat loss cutting phase with muscle retention', phase: 'Cutting' },
  { label: 'Maintenance', emoji: '🎯', description: 'Maintenance phase to sustain current physique', phase: 'Maintenance' },
  { label: 'Setting the Stage', emoji: '🏗️', description: 'Setting the stage for peak competition prep', phase: 'Setting the Stage' },
  { label: 'Build Muscle', emoji: '💪', description: 'Focused muscle building hypertrophy program', phase: 'Building Muscle' },
];

function goalToPhase(goal: string): string {
  if (goal?.toLowerCase().includes('bulk')) return 'Bulking';
  if (goal?.toLowerCase().includes('cut')) return 'Cutting';
  return 'Maintenance';
}

export default function AthleteTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState, showToast } = useApp();
  const { isSubscribed, hasDailyPass, purchaseDailyPass } = useSubscription();

  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(state.profile.exp || 'Beginner');
  const [phase, setPhase] = useState(goalToPhase(state.profile.goal));
  const [athleteTemplate, setAthleteTemplate] = useState('');
  const [sport, setSport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [dietExpanded, setDietExpanded] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (loading) {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true })
      );
      spinLoop.current.start();
    } else {
      spinLoop.current?.stop();
      spinAnim.setValue(0);
    }
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handleTemplatePress = (t: Template) => {
    console.log('[Athlete] Template selected:', t.label);
    setDescription(t.description);
    if (t.athleteTemplate !== undefined) setAthleteTemplate(t.athleteTemplate);
    if (t.sport !== undefined) setSport(t.sport);
    if (t.phase !== undefined) setPhase(t.phase);
  };

  const handleGenerate = async () => {
    if (!state.apiKey) {
      setError('No API key set. Go to Settings ⚙️ to add your Anthropic API key.');
      return;
    }
    if (!description.trim()) {
      showToast('Describe your ideal routine first!');
      return;
    }
    console.log('[Athlete] Generate routine — level:', level, 'phase:', phase, 'description:', description, 'template:', athleteTemplate, 'sport:', sport);
    setLoading(true);
    setError('');
    setExpandedDay(null);
    try {
      const body: Record<string, unknown> = {
        description,
        level,
        phase,
        apiKey: state.apiKey,
      };
      if (athleteTemplate) body.athleteTemplate = athleteTemplate;
      if (sport) body.sport = sport;
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
        'https://tc9zmyamhv4vudbhz49epzeyr82j76wn.app.specular.dev/api/ai/athlete',
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate routine.';
      console.error('[Athlete] Error:', msg);
      setError(msg || 'Failed to generate routine. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTracker = () => {
    if (!state.athleteResult) return;
    console.log('[Athlete] Add to Tracker pressed — program:', state.athleteResult.name);
    updateState({ activeProg: state.athleteResult });
    showToast(`💪 "${state.athleteResult.name}" added to Tracker!`, true);
    router.push('/(tabs)/tracker' as any);
  };

  const handleSaveRoutine = () => {
    if (!state.athleteResult) return;
    console.log('[Athlete] Save Routine pressed — program:', state.athleteResult.name);
    updateState({ athleteResult: state.athleteResult });
    showToast('✅ Routine saved!', true);
  };

  const result = state.athleteResult;
  const hasInjuries = state.profile.injuries && state.profile.injuries.length > 0;
  const injuryList = hasInjuries ? state.profile.injuries.join(', ') : '';

  if (!isSubscribed && !hasDailyPass) {
    const handleDailyPass = async () => {
      console.log('[Athlete] Daily Pass button pressed');
      try {
        const success = await purchaseDailyPass();
        if (success) showToast('⚡ Daily Pass activated! Good for today.', true);
      } catch {
        showToast('Purchase failed. Try again.');
      }
    };
    return (
      <ProGate
        feature="Athlete AI"
        icon="🤖"
        description="AI-generated routines from any athlete or style"
        showDailyPass={true}
        onDailyPass={handleDailyPass}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>🦍 AI Routine Generator</Text>
          <Text style={styles.pageSubtitle}>Describe your ideal program and Kong will build it</Text>
        </View>
      </View>

      {/* Injury Warning */}
      {hasInjuries && (
        <View style={styles.injuryBanner}>
          <Text style={styles.injuryBannerText}>
            ⚠️ Kong will modify exercises for your {injuryList} injuries
          </Text>
        </View>
      )}

      {/* Quick Templates */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>⚡ QUICK TEMPLATES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
          {TEMPLATES.map((t) => (
            <AnimatedPressable
              key={t.label}
              onPress={() => handleTemplatePress(t)}
              style={[
                styles.templateChip,
                description === t.description && styles.templateChipActive,
              ]}
            >
              <Text style={styles.templateEmoji}>{t.emoji}</Text>
              <Text style={[styles.templateLabel, description === t.description && styles.templateLabelActive]}>
                {t.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      {/* Description Input */}
      <View style={styles.card}>
        <Text style={styles.label}>DESCRIBE YOUR IDEAL ROUTINE</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={(v) => {
            setDescription(v);
          }}
          multiline
          numberOfLines={4}
          placeholder="e.g. Train like Ronaldo, Navy SEAL prep, wrestling conditioning, 4-day PPL bulk..."
          placeholderTextColor={COLORS.textTertiary}
          textAlignVertical="top"
        />
      </View>

      {/* Level Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>EXPERIENCE LEVEL</Text>
        <View style={styles.pillRow}>
          {LEVELS.map((l) => (
            <AnimatedPressable
              key={l}
              onPress={() => {
                console.log('[Athlete] Level selected:', l);
                setLevel(l);
              }}
              style={[styles.pill, level === l && styles.pillActive]}
            >
              <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 4 }]}>TRAINING PHASE</Text>
        <View style={styles.phaseGrid}>
          {PHASES.map((p) => (
            <AnimatedPressable
              key={p}
              onPress={() => {
                console.log('[Athlete] Phase selected:', p);
                setPhase(p);
              }}
              style={[styles.phasePill, phase === p && styles.phasePillActive]}
            >
              <Text style={[styles.phaseText, phase === p && styles.phaseTextActive]}>{p}</Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* Generate Button */}
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

      {/* Result Card */}
      {result && (
        <View style={styles.resultCard}>
          {/* Result Header */}
          <View style={styles.resultHeaderBlock}>
            <Text style={styles.resultName}>{result.name || 'Custom Routine'}</Text>
            <View style={styles.badgeRow}>
              {result.phase && (
                <View style={styles.phaseBadge}>
                  <Text style={styles.phaseBadgeText}>{result.phase}</Text>
                </View>
              )}
              {result.level && (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{result.level}</Text>
                </View>
              )}
            </View>
            {result.athleteInspiration && (
              <View style={styles.inspirationBadge}>
                <Text style={styles.inspirationText}>⭐ Inspired by {result.athleteInspiration}</Text>
              </View>
            )}
          </View>

          {result.description && (
            <Text style={styles.resultDesc}>{result.description}</Text>
          )}

          {result.weeklySchedule && (
            <View style={styles.weeklyBox}>
              <Text style={styles.weeklyLabel}>📅 WEEKLY SCHEDULE</Text>
              <Text style={styles.weeklyText}>{result.weeklySchedule}</Text>
            </View>
          )}

          {/* Days */}
          {result.days && result.days.length > 0 && (
            <View style={styles.daysSection}>
              <Text style={styles.sectionHeader}>📋 PROGRAM DAYS</Text>
              {result.days.map((day: any, idx: number) => {
                const isExpanded = expandedDay === idx;
                const focusText = day.focus || '';
                const durationText = day.duration || '';
                const cardioText = day.cardio || '';
                return (
                  <AnimatedPressable
                    key={idx}
                    onPress={() => {
                      console.log('[Athlete] Toggle day:', idx, day.name);
                      setExpandedDay(isExpanded ? null : idx);
                    }}
                    style={styles.dayCard}
                  >
                    <View style={styles.dayCardHeader}>
                      <View style={styles.dayCardLeft}>
                        <Text style={styles.dayCardName}>{day.name || `Day ${idx + 1}`}</Text>
                        {focusText ? (
                          <View style={styles.focusTag}>
                            <Text style={styles.focusTagText}>{focusText}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.dayCardRight}>
                        {durationText ? (
                          <Text style={styles.durationBadge}>{durationText}</Text>
                        ) : null}
                        <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={styles.exerciseTable}>
                        {/* Table Header */}
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.tableHeaderCell, { flex: 3 }]}>EXERCISE</Text>
                          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>SETS</Text>
                          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>REST</Text>
                        </View>
                        {(day.exercises || []).map((ex: any, i: number) => {
                          const exName = typeof ex === 'string' ? ex : (ex.name || '');
                          const exSets = typeof ex === 'object' ? String(ex.sets || '—') : '—';
                          const exReps = typeof ex === 'object' ? String(ex.reps || '—') : '—';
                          const exRest = typeof ex === 'object' ? String(ex.rest || '—') : '—';
                          const exNotes = typeof ex === 'object' ? (ex.notes || '') : '';
                          return (
                            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                              <View style={{ flex: 3 }}>
                                <Text style={styles.exName}>{exName}</Text>
                                {exNotes ? <Text style={styles.exNotes}>{exNotes}</Text> : null}
                              </View>
                              <Text style={[styles.exCell, { flex: 1 }]}>{exSets}</Text>
                              <Text style={[styles.exCell, { flex: 1 }]}>{exReps}</Text>
                              <Text style={[styles.exCell, { flex: 1 }]}>{exRest}</Text>
                            </View>
                          );
                        })}
                        {cardioText ? (
                          <View style={styles.cardioNote}>
                            <Text style={styles.cardioNoteText}>🏃 {cardioText}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </AnimatedPressable>
                );
              })}
            </View>
          )}

          {/* Diet Section */}
          {result.diet && (
            <View style={styles.dietSection}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Athlete] Toggle diet section');
                  setDietExpanded(!dietExpanded);
                }}
                style={styles.dietHeader}
              >
                <Text style={styles.sectionHeader}>🥗 DIET PROTOCOL</Text>
                <Text style={styles.chevron}>{dietExpanded ? '▲' : '▼'}</Text>
              </AnimatedPressable>

              {dietExpanded && (
                <View style={styles.dietBody}>
                  {result.diet.philosophy && (
                    <Text style={styles.dietPhilosophy}>{result.diet.philosophy}</Text>
                  )}

                  <View style={styles.calorieRow}>
                    <View style={styles.calorieBox}>
                      <Text style={styles.calorieLabel}>DAILY CALORIES</Text>
                      <Text style={styles.calorieNum}>{result.diet.dailyCalories || '—'}</Text>
                    </View>
                  </View>

                  {result.diet.macros && (
                    <View style={styles.macroRow}>
                      <View style={[styles.macroPill, { backgroundColor: `${COLORS.blue}22`, borderColor: COLORS.blue }]}>
                        <Text style={[styles.macroPillLabel, { color: COLORS.blue }]}>PROTEIN</Text>
                        <Text style={[styles.macroPillVal, { color: COLORS.blue }]}>{result.diet.macros.protein}</Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: `${COLORS.gold}22`, borderColor: COLORS.gold }]}>
                        <Text style={[styles.macroPillLabel, { color: COLORS.gold }]}>CARBS</Text>
                        <Text style={[styles.macroPillVal, { color: COLORS.gold }]}>{result.diet.macros.carbs}</Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: `${COLORS.red}22`, borderColor: COLORS.red }]}>
                        <Text style={[styles.macroPillLabel, { color: COLORS.red }]}>FAT</Text>
                        <Text style={[styles.macroPillVal, { color: COLORS.red }]}>{result.diet.macros.fat}</Text>
                      </View>
                    </View>
                  )}

                  {result.diet.meals && result.diet.meals.length > 0 && (
                    <View style={styles.mealsList}>
                      <Text style={styles.subSectionLabel}>MEALS</Text>
                      {result.diet.meals.map((meal: string, i: number) => (
                        <View key={i} style={styles.mealItem}>
                          <Text style={styles.mealDot}>•</Text>
                          <Text style={styles.mealText}>{meal}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {result.diet.supplements && result.diet.supplements.length > 0 && (
                    <View style={styles.supplementsBlock}>
                      <Text style={styles.subSectionLabel}>SUPPLEMENTS</Text>
                      <View style={styles.supplementChips}>
                        {result.diet.supplements.map((s: string, i: number) => (
                          <View key={i} style={styles.supplementChip}>
                            <Text style={styles.supplementChipText}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {result.diet.hydration && (
                    <View style={styles.hydrationBox}>
                      <Text style={styles.hydrationText}>💧 {result.diet.hydration}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Tips */}
          {result.tips && result.tips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.sectionHeader}>💡 KONG'S TIPS</Text>
              {result.tips.map((tip: string, i: number) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>▸</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Recovery Protocol */}
          {result.recoveryProtocol && (
            <View style={styles.recoveryBox}>
              <Text style={styles.subSectionLabel}>🛌 RECOVERY PROTOCOL</Text>
              <Text style={styles.recoveryText}>{result.recoveryProtocol}</Text>
            </View>
          )}

          {/* Injury Modifications */}
          {result.injuryModifications && result.injuryModifications.length > 0 && (
            <View style={styles.injuryModBox}>
              <Text style={styles.injuryModLabel}>⚠️ INJURY MODIFICATIONS</Text>
              {result.injuryModifications.map((mod: string, i: number) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={[styles.tipBullet, { color: COLORS.red }]}>▸</Text>
                  <Text style={styles.injuryModText}>{mod}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <AnimatedPressable onPress={handleAddToTracker} style={styles.trackerBtn}>
              <Text style={styles.trackerBtnText}>Add to Tracker 💪</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleSaveRoutine} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save Routine</Text>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <View style={styles.emptyState}>
          <KongMascot size={80} />
          <Text style={styles.emptyTitle}>Tap a template or describe your ideal routine</Text>
          <Text style={styles.emptySub}>
            Kong will build a fully personalized program. Injuries and limitations are always considered.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  injuryBanner: {
    backgroundColor: `${COLORS.red}18`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}50`,
  },
  injuryBannerText: { fontSize: 13, color: COLORS.red, lineHeight: 20, fontWeight: '600' },

  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase' },
  templateRow: { gap: 8, paddingRight: 16 },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateChipActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  templateEmoji: { fontSize: 15 },
  templateLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  templateLabelActive: { color: COLORS.gold },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  label: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase' },
  textArea: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    lineHeight: 22,
  },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.gold },

  phaseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phasePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  phasePillActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  phaseText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  phaseTextActive: { color: COLORS.gold },

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
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(212,160,23,0.3)' },
      default: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
    }),
    elevation: 6,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingKong: { fontSize: 22 },
  generateBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },

  // Result Card
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 16,
  },
  resultHeaderBlock: { gap: 8 },
  resultName: { fontSize: 22, fontWeight: '900', color: COLORS.gold, letterSpacing: -0.3 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  phaseBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  phaseBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.gold },
  levelBadge: {
    backgroundColor: `${COLORS.blue}22`,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${COLORS.blue}50`,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.blue },
  inspirationBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border2,
    alignSelf: 'flex-start',
  },
  inspirationText: { fontSize: 13, fontWeight: '700', color: COLORS.goldBright },

  resultDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  weeklyBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  weeklyLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  weeklyText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  sectionHeader: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase' },

  daysSection: { gap: 8 },
  dayCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  dayCardLeft: { flex: 1, gap: 4 },
  dayCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayCardName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  focusTag: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  focusTagText: { fontSize: 10, fontWeight: '700', color: COLORS.gold },
  durationBadge: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  chevron: { fontSize: 11, color: COLORS.textSecondary },

  exerciseTable: { borderTopWidth: 1, borderTopColor: COLORS.border },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.bg,
  },
  tableHeaderCell: { fontSize: 10, fontWeight: '800', color: COLORS.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'flex-start' },
  tableRowAlt: { backgroundColor: `${COLORS.surface}80` },
  exName: { fontSize: 13, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  exNotes: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2, lineHeight: 16 },
  exCell: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', fontVariant: ['tabular-nums'] },
  cardioNote: {
    backgroundColor: `${COLORS.green}15`,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cardioNoteText: { fontSize: 12, color: COLORS.green, fontWeight: '600' },

  // Diet
  dietSection: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  dietHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  dietBody: { padding: 14, gap: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  dietPhilosophy: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  calorieRow: { alignItems: 'center' },
  calorieBox: { alignItems: 'center' },
  calorieLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  calorieNum: { fontSize: 44, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroPill: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
  },
  macroPillLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  macroPillVal: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  mealsList: { gap: 8 },
  subSectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  mealItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  mealDot: { fontSize: 14, color: COLORS.gold, marginTop: 1 },
  mealText: { fontSize: 13, color: COLORS.text, lineHeight: 20, flex: 1 },
  supplementsBlock: { gap: 8 },
  supplementChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  supplementChip: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  supplementChipText: { fontSize: 12, fontWeight: '700', color: COLORS.gold },
  hydrationBox: {
    backgroundColor: `${COLORS.blue}15`,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: `${COLORS.blue}30`,
  },
  hydrationText: { fontSize: 13, color: COLORS.blue, fontWeight: '600' },

  // Tips
  tipsSection: { gap: 8 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { fontSize: 12, color: COLORS.gold, marginTop: 3 },
  tipText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, flex: 1 },

  // Recovery
  recoveryBox: {
    backgroundColor: `${COLORS.green}12`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.green}30`,
    gap: 6,
  },
  recoveryText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  // Injury Mods
  injuryModBox: {
    backgroundColor: `${COLORS.red}12`,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: `${COLORS.red}30`,
    gap: 8,
  },
  injuryModLabel: { fontSize: 11, fontWeight: '800', color: COLORS.red, letterSpacing: 1, textTransform: 'uppercase' },
  injuryModText: { fontSize: 13, color: COLORS.red, lineHeight: 20, flex: 1 },

  // Action Buttons
  actionButtons: { gap: 10 },
  trackerBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(212,160,23,0.3)' },
      default: {
        shadowColor: COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
    }),
    elevation: 6,
  },
  trackerBtnText: { fontSize: 16, fontWeight: '900', color: '#0A0A0A' },
  saveBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.gold },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  emptySub: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
});
