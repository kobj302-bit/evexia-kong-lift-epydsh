import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/data';
import { useApp } from '@/contexts/AppContext';
import { analyzeBody } from '@/utils/bodyAnalysis';

// ─── Types ────────────────────────────────────────────────────────────────────

type SliderKey =
  | 'jawline'
  | 'skin'
  | 'symmetry'
  | 'cheekbones'
  | 'harmony'
  | 'neck';

interface SliderConfig {
  key: SliderKey;
  label: string;
  emoji: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'jawline', label: 'Jawline Definition', emoji: '🦷' },
  { key: 'skin', label: 'Skin Clarity', emoji: '✨' },
  { key: 'symmetry', label: 'Eye Symmetry', emoji: '👁' },
  { key: 'cheekbones', label: 'Cheekbone Prominence', emoji: '💎' },
  { key: 'harmony', label: 'Overall Facial Harmony', emoji: '🎯' },
  { key: 'neck', label: 'Neck / Posture Alignment', emoji: '🏛' },
];

const ASCENSION_TIPS: Record<SliderKey, string> = {
  jawline: 'Mewing protocol + masseter exercises + reduce sodium intake. Chew mastic gum daily. Reduce processed foods that cause facial bloating.',
  skin: 'Red light therapy + tallow moisturizer + collagen foods. Drink 3L water daily. Eliminate seed oils and sugar. Add zinc and vitamin A.',
  symmetry: 'Unilateral chewing + sleep position correction + posture work. Sleep on your back. Chew on both sides equally. Address forward head posture.',
  cheekbones: 'Facial massage + mewing + reduce body fat %. Gua sha lymphatic drainage daily. Mewing raises the maxilla over time. Lower body fat reveals bone structure.',
  harmony: 'Full facial fascial release protocol + posture correction. Myofascial release of jaw, temples, and neck. Correct forward head posture. Improve nasal breathing.',
  neck: 'Chin tucks 3x daily + dead hangs + forward head posture correction. 3 x 10 chin tucks against wall. Dead hang 3 x 60 sec. Strengthen deep neck flexors.',
};

function getScoreColor(score: number): string {
  if (score >= 8) return '#10B981';
  if (score >= 6) return '#F59E0B';
  if (score >= 4) return '#F97316';
  return '#EF4444';
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Elite';
  if (score >= 7) return 'Strong';
  if (score >= 5) return 'Average';
  if (score >= 3) return 'Developing';
  return 'Needs Work';
}

// ─── Score Arc Component ──────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  return (
    <View style={arcStyles.container}>
      <View style={[arcStyles.ring, { borderColor: color }]}>
        <Text style={[arcStyles.score, { color }]}>{score.toFixed(1)}</Text>
        <Text style={arcStyles.outOf}>/10</Text>
      </View>
      <Text style={[arcStyles.label, { color }]}>{label}</Text>
      <Text style={arcStyles.title}>Facial Harmony Score</Text>
    </View>
  );
}

const arcStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ring: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  score: {
    fontSize: 44,
    fontWeight: '900',
  },
  outOf: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: -4,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

// ─── Photo Slot Component ─────────────────────────────────────────────────────

function PhotoSlot({ label, icon }: { label: string; icon: string }) {
  return (
    <View style={photoStyles.slot}>
      <View style={photoStyles.placeholder}>
        <Text style={photoStyles.icon}>{icon}</Text>
      </View>
      <Text style={photoStyles.label} numberOfLines={1}>{label}</Text>
      <Text style={photoStyles.hint} numberOfLines={1}>Tap to select</Text>
    </View>
  );
}

const photoStyles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

// ─── Slider Row Component ─────────────────────────────────────────────────────

function SliderRow({
  config,
  value,
  onChange,
}: {
  config: SliderConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  const color = getScoreColor(value);
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.header}>
        <Text style={sliderStyles.emoji}>{config.emoji}</Text>
        <Text style={sliderStyles.label} numberOfLines={1}>{config.label}</Text>
        <Text style={[sliderStyles.value, { color }]}>{value}</Text>
      </View>
      <View style={sliderStyles.steps}>
        {steps.map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              sliderStyles.step,
              s <= value && { backgroundColor: color },
            ]}
            onPress={() => {
              console.log('[FacialAnalysis] Slider changed:', config.key, '->', s);
              onChange(s);
            }}
            activeOpacity={0.7}
          />
        ))}
      </View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.labelMin}>1</Text>
        <Text style={sliderStyles.labelMax}>10</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    width: 28,
    textAlign: 'right',
  },
  steps: {
    flexDirection: 'row',
    gap: 4,
  },
  step: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface3,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  labelMin: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  labelMax: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ScreenPhase = 'intro' | 'form' | 'loading' | 'results';

export default function FacialAnalysisScreen() {
  const { state } = useApp();
  const [phase, setPhase] = useState<ScreenPhase>('intro');
  const [scores, setScores] = useState<Record<SliderKey, number>>({
    jawline: 5,
    skin: 5,
    symmetry: 5,
    cheekbones: 5,
    harmony: 5,
    neck: 5,
  });

  const bodyAnalysis = useMemo(() => {
    const p = state.profile;
    if (!p?.height || !p?.weight) return null;
    return analyzeBody({
      weight: p.weight,
      height: p.height,
      age: p.age || 25,
      sex: p.sex || 'Male',
      bf: p.bf || 15,
      waist: p.waist || 32,
      neck: p.neck || 15,
      hip: p.hip || 38,
      weightUnit: p.weightUnit || 'lbs',
      heightUnit: p.heightUnit || 'ft',
    });
  }, [state.profile]);

  const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / 6;

  const lowestKeys = (Object.keys(scores) as SliderKey[])
    .sort((a, b) => scores[a] - scores[b])
    .slice(0, 3);

  const handleAnalyze = useCallback(() => {
    console.log('[FacialAnalysis] Analyze button pressed, scores:', scores);
    setPhase('loading');
    setTimeout(() => {
      console.log('[FacialAnalysis] Analysis complete, overall score:', overallScore.toFixed(1));
      setPhase('results');
    }, 2000);
  }, [scores, overallScore]);

  const handleRetake = useCallback(() => {
    console.log('[FacialAnalysis] Retake analysis pressed');
    setScores({ jawline: 5, skin: 5, symmetry: 5, cheekbones: 5, harmony: 5, neck: 5 });
    setPhase('intro');
  }, []);

  const updateScore = useCallback((key: SliderKey, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (phase === 'loading') {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={s.loadingTitle}>Analyzing...</Text>
          <Text style={s.loadingSubtitle}>Processing facial structure data</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'results') {
    const bfDisplay = state.profile?.bf ?? 15;
    const navyBFDisplay = bodyAnalysis ? bodyAnalysis.navyBF : null;
    const ffmiDisplay = bodyAnalysis ? bodyAnalysis.ffmiNormalized : null;
    const ffmiCatDisplay = bodyAnalysis ? bodyAnalysis.ffmiCategory : null;
    const bmiDisplay = bodyAnalysis ? bodyAnalysis.bmi : null;
    const bmiCatDisplay = bodyAnalysis ? bodyAnalysis.bmiCategory : null;

    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <ScoreArc score={overallScore} />

          {/* Body Composition Context */}
          {bodyAnalysis && (
            <View style={s.card}>
              <Text style={s.sectionTitle}>BODY COMPOSITION CONTEXT</Text>
              <Text style={s.bodyContextNote}>These metrics inform your facial structure analysis — lower body fat reveals more bone structure</Text>
              <View style={s.bodyContextGrid}>
                <View style={s.bodyContextItem}>
                  <Text style={s.bodyContextLabel}>BODY FAT</Text>
                  <Text style={s.bodyContextValue}>
                    {bfDisplay}
                    {'%'}
                  </Text>
                  {navyBFDisplay !== null && (
                    <Text style={s.bodyContextSub}>
                      {'Navy: '}
                      {navyBFDisplay}
                      {'%'}
                    </Text>
                  )}
                </View>
                <View style={s.bodyContextItem}>
                  <Text style={s.bodyContextLabel}>FFMI</Text>
                  <Text style={[s.bodyContextValue, { color: COLORS.gold }]}>
                    {ffmiDisplay}
                  </Text>
                  {ffmiCatDisplay !== null && (
                    <Text style={s.bodyContextSub} numberOfLines={1}>{ffmiCatDisplay}</Text>
                  )}
                </View>
                <View style={s.bodyContextItem}>
                  <Text style={s.bodyContextLabel}>BMI</Text>
                  <Text style={s.bodyContextValue}>
                    {bmiDisplay}
                  </Text>
                  {bmiCatDisplay !== null && (
                    <Text style={s.bodyContextSub}>{bmiCatDisplay}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Category Scores */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>CATEGORY BREAKDOWN</Text>
            {SLIDERS.map((sl) => {
              const val = scores[sl.key];
              const color = getScoreColor(val);
              const pct = (val / 10) * 100;
              return (
                <View key={sl.key} style={s.resultRow}>
                  <Text style={s.resultEmoji}>{sl.emoji}</Text>
                  <View style={s.resultRight}>
                    <View style={s.resultLabelRow}>
                      <Text style={s.resultLabel} numberOfLines={1}>{sl.label}</Text>
                      <Text style={[s.resultScore, { color }]}>{val}/10</Text>
                    </View>
                    <View style={s.resultTrack}>
                      <View style={[s.resultFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Ascension Plan */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>YOUR ASCENSION PLAN</Text>
            <Text style={s.ascensionSubtitle}>Based on your lowest-scoring areas</Text>
            {lowestKeys.map((key, i) => {
              const sl = SLIDERS.find((x) => x.key === key);
              const tip = ASCENSION_TIPS[key];
              return (
                <View key={key} style={s.tipCard}>
                  <View style={s.tipHeader}>
                    <View style={s.tipNumber}>
                      <Text style={s.tipNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={s.tipEmoji}>{sl?.emoji}</Text>
                    <Text style={s.tipTitle} numberOfLines={1}>{sl?.label}</Text>
                  </View>
                  <Text style={s.tipBody}>{tip}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={s.retakeBtn} onPress={handleRetake} activeOpacity={0.8}>
            <Text style={s.retakeBtnText}>↺ RETAKE ANALYSIS</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'form') {
    return (
      <SafeAreaView style={s.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.sectionTitle}>SELF-ASSESSMENT</Text>
            <Text style={s.formSubtitle}>Rate each area honestly from 1–10</Text>
            {SLIDERS.map((sl) => (
              <SliderRow
                key={sl.key}
                config={sl}
                value={scores[sl.key]}
                onChange={(v) => updateScore(sl.key, v)}
              />
            ))}
          </View>

          <TouchableOpacity style={s.analyzeBtn} onPress={handleAnalyze} activeOpacity={0.8}>
            <Text style={s.analyzeBtnText}>ANALYZE MY FACE →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Intro phase
  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Intro Card */}
        <View style={s.introCard}>
          <Text style={s.introEmoji}>🔬</Text>
          <Text style={s.introTitle}>Facial Analysis</Text>
          <Text style={s.introDesc}>
            Upload 3 photos for a complete facial structure analysis. We analyze symmetry, jawline definition, skin quality, and facial harmony to give you a personalized ascension plan.
          </Text>
        </View>

        {/* Photo Slots */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>PHOTO UPLOAD</Text>
          <Text style={s.photoNote} numberOfLines={2}>
            Photo upload requires camera permissions. For now, proceed to self-assessment.
          </Text>
          <View style={s.photoRow}>
            <PhotoSlot label="Front View" icon="📸" />
            <PhotoSlot label="Left Profile" icon="📸" />
            <PhotoSlot label="Right Profile" icon="📸" />
          </View>
        </View>

        {/* What we analyze */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>WHAT WE ANALYZE</Text>
          {[
            { emoji: '🦷', label: 'Jawline Definition', desc: 'Bone structure, masseter development, facial fat distribution' },
            { emoji: '✨', label: 'Skin Clarity', desc: 'Texture, tone, inflammation, and overall skin health' },
            { emoji: '👁', label: 'Eye Symmetry', desc: 'Orbital symmetry, brow positioning, eye shape balance' },
            { emoji: '💎', label: 'Cheekbone Prominence', desc: 'Zygomatic arch definition and midface structure' },
            { emoji: '🎯', label: 'Facial Harmony', desc: 'Golden ratio proportions and overall aesthetic balance' },
            { emoji: '🏛', label: 'Neck & Posture', desc: 'Cervical alignment, forward head posture, neck definition' },
          ].map((item, i) => (
            <View key={i} style={s.analyzeRow}>
              <Text style={s.analyzeEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.analyzeLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={s.analyzeDesc} numberOfLines={2}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={s.analyzeBtn}
          onPress={() => {
            console.log('[FacialAnalysis] Begin self-assessment pressed');
            setPhase('form');
          }}
          activeOpacity={0.8}
        >
          <Text style={s.analyzeBtnText}>BEGIN SELF-ASSESSMENT →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    padding: 16,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Intro
  introCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    alignItems: 'center',
  },
  introEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  introDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 12,
    lineHeight: 18,
  },

  // Photos
  photoNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // What we analyze
  analyzeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  analyzeEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
    marginTop: 2,
  },
  analyzeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  analyzeDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Form
  formSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Buttons
  analyzeBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  analyzeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1.5,
  },
  retakeBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },

  // Results
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  resultEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  resultRight: {
    flex: 1,
  },
  resultLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  resultScore: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  resultTrack: {
    height: 6,
    backgroundColor: COLORS.surface3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  resultFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Body Composition Context
  bodyContextNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  bodyContextGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bodyContextItem: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  bodyContextLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    lineHeight: 18,
  },
  bodyContextValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  bodyContextSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },

  // Ascension Plan
  ascensionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  tipCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipNumberText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.bg,
    lineHeight: 18,
  },
  tipEmoji: {
    fontSize: 16,
  },
  tipTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  tipBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
