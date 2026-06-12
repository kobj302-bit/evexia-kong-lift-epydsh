import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/data';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { scheduleGlowUpNotifications } from '@/utils/glowupNotifications';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getISOWeek(): string {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Sun,1=Mon,...,6=Sat
}

// ─── Data ────────────────────────────────────────────────────────────────────

const MORNING_HABITS = [
  { id: 'water', label: '💧 Drink 16–20 oz water with electrolytes', xp: 10 },
  { id: 'sunlight', label: '☀️ 10–15 min direct sunlight', xp: 10 },
  { id: 'creatine', label: '💊 Take creatine (5g) + Vitamin D3/K2', xp: 5 },
  { id: 'breakfast', label: '🍳 High-protein breakfast', xp: 10 },
];

const SKINCARE_ITEMS = [
  'Wash face with natural cleanser',
  'Apply moisturizer (tallow/beeswax/honey blend)',
  'Red light therapy 10–15 min',
  'Apply magnesium body spray',
  'Drink from copper cup',
  'Sleep on silk pillowcase (evening reminder)',
  'Bamboo mouth tape tonight (evening reminder)',
];

const FACIAL_STEPS = [
  'Jaw release: open wide hold 3 sec, close slowly, 10 reps',
  'Masseter release: three fingers, small circles, 30 sec each side',
  'Temporal release: fingertips on temples, slow circles, 30 sec',
  'Brow smoother: index fingers along brow bone, drag outward, 10 reps',
  'Forehead lift: all fingertips flat, drag upward firmly, 10 reps',
  'Neck and platysma: tilt head back, fingers flat, drag downward, 5 reps',
  'Lymph drainage tap: forehead → cheeks → jaw → neck → collarbone, 3 passes',
  'Cheekbone lift: three fingers under cheekbones, press up hold 10 sec, 5 reps',
  'Under-eye tap: ring finger, gentle tap around eye socket, 30 sec each eye',
  'Finish: press both palms warm against face, hold 10 sec, breathe deeply',
  'Mewing reminder: tongue fully on roof of mouth, lips closed, nasal breathing',
];

const POSTURE_ITEMS = [
  { id: 'chin', label: '✅ Chin tucked, not jutting forward', xp: 5 },
  { id: 'shoulders', label: '✅ Shoulders back and down', xp: 5 },
  { id: 'weight', label: '✅ Weight even on both feet', xp: 5 },
  { id: 'screen', label: '✅ Screen at eye level', xp: 5 },
  { id: 'sleep', label: '✅ Sleeping on back, thin or no pillow', xp: 5 },
];

const HEIGHT_HABITS = [
  { id: 'sleep8', label: '😴 Sleep 8–9 hours', xp: 20 },
  { id: 'mewing', label: '👅 Mewing check-in', xp: 10 },
  { id: 'dedhang', label: '🏋️ Dead hang (at least once)', xp: 15 },
  { id: 'noalc', label: '🚫 No alcohol today', xp: 0 },
  { id: 'nolateeating', label: '🌙 No eating 2–3 hours before bed', xp: 10 },
  { id: 'protein', label: '🥩 Protein at every meal', xp: 0 },
];

const HEIGHT_FINISHER = [
  'Dead hang: 3 x 45–60 sec',
  'Cobra stretch: 5 x 20–30 sec',
  'Downward dog: 3 x 30 sec',
  'Child\'s pose: 3 x 45 sec',
  'Standing toe touch: 5 x 20 sec',
  'Spinal twist: 30 sec each side',
  'Overhead wall reach: 5 x 20 sec',
];

const FASCIAL_COOLDOWN = [
  'Foam roll full back: 90 sec',
  'Foam roll IT band: 60 sec each side',
  'Foam roll calves: 45 sec each side',
  'Child\'s pose with side reach: 30 sec each side',
  'Supine spinal twist: 30 sec each side',
  'Legs up the wall: 2 min',
];

const PUSH_EXERCISES = [
  'Barbell bench press: 4 x 5–8',
  'Incline dumbbell press: 3 x 8–12',
  'Seated dumbbell shoulder press: 3 x 8–12',
  'Lateral raises: 3 x 12–15',
  'Cable flyes: 2 x 12–15',
  'Rope pushdowns: 3 x 10–15',
  'Overhead tricep extension: 2 x 10–15',
];

const LOWER_EXERCISES = [
  'Back squat: 4 x 5–8',
  'Romanian deadlift: 3 x 8–10',
  'Walking lunges: 3 x 10 each leg',
  'Leg curl: 3 x 10–15',
  'Leg extension: 2 x 12–15',
  'Standing calf raises: 4 x 12–20',
  'Hanging leg raises: 3 x 15',
];

const PULL_EXERCISES = [
  'Pull-ups: 4 sets to failure',
  'Barbell row: 4 x 6–10',
  'Lat pulldown: 3 x 8–12',
  'Chest-supported row: 3 x 8–12',
  'Face pulls: 3 x 12–15',
  'Dumbbell curls: 3 x 10–12',
  'Hammer curls: 2 x 10–15',
];

const SATURDAY_ARMS = [
  'Close grip bench: 3 x 8–10',
  'Skull crushers: 3 x 10–12',
  'EZ bar curls: 3 x 10–12',
  'Incline dumbbell curls: 3 x 10–12',
  'Hanging leg raises: 3 x 15',
  'Plank: 3 x 60 sec',
];

const REST_FASCIAL_LINES = [
  {
    name: 'Superficial Back Line',
    exercises: [
      'Standing forward fold: 60 sec',
      'Seated forward fold: 45 sec',
      'Foam roll posterior chain: 3 min',
    ],
  },
  {
    name: 'Superficial Front Line',
    exercises: [
      'Cobra: 5 x 20 sec',
      'Kneeling quad stretch: 45 sec each',
      'Hip flexor lunge: 45 sec each',
    ],
  },
  {
    name: 'Lateral Line',
    exercises: [
      'Standing side bend: 30 sec each, 3 rounds',
      'Thread the needle: 30 sec each',
      'Side-lying foam roll: 60 sec each',
    ],
  },
  {
    name: 'Spiral Line',
    exercises: [
      'Seated spinal rotation: 30 sec each, 3 rounds',
      'Cross-body reach: 20 sec each',
      'Lying windshield wiper: 10 reps',
    ],
  },
  {
    name: 'Arm Lines',
    exercises: [
      'Doorway chest opener: 30 sec',
      'Wrist flexor/extensor: 20 sec each',
      'Overhead tricep/lat stretch: 30 sec each',
    ],
  },
  {
    name: 'Deep Front Line',
    exercises: [
      '90/90 hip stretch: 45 sec each',
      'Psoas release: 60 sec each',
      'Diaphragm breathing: 10 breaths',
      'Tongue/jaw release: 10 reps',
    ],
  },
  {
    name: 'Spinal Decompression',
    exercises: [
      'Dead hang: 3 x 60 sec',
      'Child\'s pose: 3 x 45 sec',
      'Thoracic extension: 2 min',
      'Inversion: 30 sec',
    ],
  },
];

const MORNING_BODY_UNLOCK = [
  'Neck and skull base: interlace fingers behind head, pull chin to chest, hold 20 sec; tilt head side to side 5 reps each; roll chin across chest 5 passes',
  'Shoulder and chest opener: doorway stretch 30 sec; one arm across body 20 sec each; interlace hands behind back 20 sec',
  'Thoracic spine: foam roller at mid-back 20–30 sec each segment; seated rotation 20 sec each side 3 rounds',
  'Hip and psoas unlock: low lunge overhead reach 30 sec each; 90/90 hip stretch 45 sec each; supine figure four 45 sec each',
  'Posterior chain: standing forward fold 45 sec; seated hamstring reach 30 sec; lying knee to chest 20 sec each',
  'Ankle and foot: ankle circles 10 each direction; toes up wall 20 sec each; tennis ball roll 60 sec each',
];

const EVENING_STEPS = [
  'Legs up the wall: 3–5 min',
  'Supine spinal twist: 30 sec each side',
  'Figure four glute stretch: 45 sec each side',
  'Chest opener on floor: arms out in T, 2 min',
  'Diaphragm breathing: 10 deep slow breaths',
  'Body scan: 60 sec',
];

const GROCERY_CATEGORIES: { name: string; items: string[] }[] = [
  {
    name: 'Protein',
    items: [
      'Eggs (3 dozen)',
      'Grass-fed ground beef (4–5 lbs)',
      'Steak (2 lbs)',
      'Chicken thighs or breast (2 lbs)',
      'Greek yogurt (4 large tubs)',
      'Kefir (2 bottles)',
      'Bone broth (2 cartons)',
    ],
  },
  {
    name: 'Fruit',
    items: [
      'Bananas (7)',
      'Blueberries (2 containers)',
      'Strawberries (2 containers)',
      'Apples (4)',
      'Oranges (4)',
      'Seasonal fruit (1 bag)',
    ],
  },
  {
    name: 'Vegetables',
    items: [
      'Spinach (1 large bag)',
      'Bell peppers (4)',
      'Broccoli (2 heads)',
      'Sweet potatoes (6)',
      'Avocados (7)',
      'Carrots (1 bag)',
      'Zucchini (2)',
      'Onions (2)',
      'Garlic (1 head)',
      'Sauerkraut (1 jar)',
      'Kimchi (1 jar)',
    ],
  },
  {
    name: 'Carbs',
    items: [
      'Sourdough bread (1 loaf)',
      'White rice (1 bag)',
      'Oats (1 container)',
      'Potatoes (1 bag)',
    ],
  },
  {
    name: 'Fats & Extras',
    items: [
      'Extra virgin olive oil (1 bottle)',
      'Raw honey (1 jar)',
      'Natural peanut butter (1 jar)',
      'Mixed nuts (1 bag)',
      'Coconut oil (1 jar)',
    ],
  },
  {
    name: 'Supplements (restock as needed)',
    items: [
      'Creatine monohydrate',
      'Vitamin D3 + K2',
      'Omega-3 fish oil',
      'Magnesium glycinate',
      'Zinc carnosine',
      'Probiotic',
      'Electrolyte packets',
    ],
  },
  {
    name: 'Skincare & Tools (monthly)',
    items: [
      'Natural cleanser',
      'Beef tallow or beeswax honey moisturizer',
      'Bamboo mouth tape',
      'Magnesium body spray',
      'Essential oil',
    ],
  },
];

const ALL_GROCERY_ITEMS = GROCERY_CATEGORIES.flatMap((c) => c.items);

const GLOW_LEVELS = [
  { label: 'Rookie', min: 0, max: 500 },
  { label: 'Ascending', min: 500, max: 1500 },
  { label: 'Glowing', min: 1500, max: 3500 },
  { label: 'Elite', min: 3500, max: 7000 },
  { label: 'Optimized', min: 7000, max: 15000 },
  { label: 'Ascended', min: 15000, max: Infinity },
];

interface TrainingDay {
  label: string;
  blocks: { name: string; xp: number; exercises: string[] }[];
  totalXP: number;
}

function getTrainingDay(dow: number): TrainingDay {
  switch (dow) {
    case 1: // Monday — Push
      return {
        label: 'Monday — Push Day',
        blocks: [
          { name: 'Fascial Activation', xp: 15, exercises: ['Cat-cow: 10 reps', 'Thread the needle: 30 sec each', 'Hip circles: 10 each direction'] },
          { name: 'Posture Warm-Up', xp: 20, exercises: ['Band pull-aparts: 3 x 15', 'Face pulls: 3 x 15', 'Wall slides: 2 x 10'] },
          { name: 'Push Training', xp: 50, exercises: PUSH_EXERCISES },
          { name: 'Height Finisher', xp: 25, exercises: HEIGHT_FINISHER },
          { name: 'Fascial Cool-Down', xp: 15, exercises: FASCIAL_COOLDOWN },
        ],
        totalXP: 125,
      };
    case 2: // Tuesday — Rest
      return {
        label: 'Tuesday — Rest Day',
        blocks: [{ name: 'Full Fascial Unlock', xp: 40, exercises: REST_FASCIAL_LINES.flatMap((l) => [`— ${l.name}`, ...l.exercises]) }],
        totalXP: 40,
      };
    case 3: // Wednesday — Lower
      return {
        label: 'Wednesday — Lower Day + Sprint Fast',
        blocks: [
          { name: 'Fascial Activation', xp: 15, exercises: ['Hip circles: 10 each', 'Leg swings: 10 each', 'Ankle circles: 10 each'] },
          { name: 'Posture Warm-Up', xp: 20, exercises: ['Glute bridges: 3 x 15', 'Clamshells: 3 x 15', 'Bird-dog: 3 x 10 each'] },
          { name: 'Lower Training', xp: 50, exercises: LOWER_EXERCISES },
          { name: 'Sprint Fast', xp: 40, exercises: ['6 x 40m sprints at 90% effort', 'Rest 90 sec between sprints', 'Walk back to start each time'] },
          { name: 'Height Finisher', xp: 25, exercises: HEIGHT_FINISHER },
          { name: 'Fascial Cool-Down', xp: 15, exercises: FASCIAL_COOLDOWN },
        ],
        totalXP: 165,
      };
    case 4: // Thursday — Rest
      return {
        label: 'Thursday — Rest Day',
        blocks: [{ name: 'Full Fascial Unlock', xp: 40, exercises: REST_FASCIAL_LINES.flatMap((l) => [`— ${l.name}`, ...l.exercises]) }],
        totalXP: 40,
      };
    case 5: // Friday — Pull
      return {
        label: 'Friday — Pull Day',
        blocks: [
          { name: 'Fascial Activation', xp: 15, exercises: ['Shoulder circles: 10 each', 'Arm swings: 10 each', 'Thoracic rotation: 10 each'] },
          { name: 'Posture Warm-Up', xp: 20, exercises: ['Band pull-aparts: 3 x 15', 'Scapular push-ups: 2 x 10', 'Dead hangs: 2 x 20 sec'] },
          { name: 'Pull Training', xp: 50, exercises: PULL_EXERCISES },
          { name: 'Height Finisher', xp: 25, exercises: HEIGHT_FINISHER },
          { name: 'Fascial Cool-Down', xp: 15, exercises: FASCIAL_COOLDOWN },
        ],
        totalXP: 125,
      };
    case 6: // Saturday
      return {
        label: 'Saturday — Arms + Cardio',
        blocks: [
          { name: 'Arms Training', xp: 40, exercises: SATURDAY_ARMS },
          { name: 'Sprint Fast', xp: 40, exercises: ['6 x 40m sprints at 90% effort', 'Rest 90 sec between sprints', 'Walk back to start each time'] },
          { name: 'Full Stretch', xp: 30, exercises: [...HEIGHT_FINISHER, ...FASCIAL_COOLDOWN] },
        ],
        totalXP: 110,
      };
    default: // Sunday
      return {
        label: 'Sunday — Full Recovery',
        blocks: [
          { name: 'Full Recovery', xp: 30, exercises: ['Light walk 20–30 min', 'Full body foam roll: 10 min', ...FASCIAL_COOLDOWN, 'Contrast shower: 3 min hot / 1 min cold x 3'] },
        ],
        totalXP: 30,
      };
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  defaultOpen = false,
  collapsible = true,
  rightBadge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  rightBadge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    if (!collapsible) return;
    const next = !open;
    console.log('[GlowUp] Section toggled:', title, next ? 'open' : 'closed');
    setOpen(next);
  }, [open, collapsible, title]);

  return (
    <View style={cardStyles.card}>
      <TouchableOpacity
        style={cardStyles.header}
        onPress={handleToggle}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <Text style={cardStyles.title} numberOfLines={2}>{title}</Text>
        <View style={cardStyles.headerRight}>
          {rightBadge ? <Text style={cardStyles.badge}>{rightBadge}</Text> : null}
          {collapsible ? <Text style={cardStyles.chevron}>{open ? '▲' : '▼'}</Text> : null}
        </View>
      </TouchableOpacity>
      {(!collapsible || open) ? <View style={cardStyles.body}>{children}</View> : null}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  chevron: {
    fontSize: 11,
    color: COLORS.gold,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

function HabitRow({
  label,
  xp,
  checked,
  onPress,
}: {
  label: string;
  xp: number;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={habitStyles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[habitStyles.check, checked && habitStyles.checkDone]}>
        {checked ? <Text style={habitStyles.checkMark}>✓</Text> : null}
      </View>
      <Text style={[habitStyles.label, checked && habitStyles.labelDone]} numberOfLines={2}>
        {label}
      </Text>
      {xp > 0 ? <Text style={habitStyles.xpBadge}>+{xp} XP</Text> : null}
    </TouchableOpacity>
  );
}

const habitStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkDone: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  checkMark: {
    fontSize: 14,
    color: COLORS.bg,
    fontWeight: '900',
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    flexShrink: 1,
  },
  labelDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  xpBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldBright,
    flexShrink: 0,
  },
});

function GoldButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[btnStyles.btn, disabled && btnStyles.disabled]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={btnStyles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  btn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 0.5,
  },
});

function ExerciseList({ items }: { items: string[] }) {
  return (
    <View style={{ marginTop: 8 }}>
      {items.map((item, i) => (
        <View key={i} style={exStyles.row}>
          <Text style={exStyles.bullet}>•</Text>
          <Text style={exStyles.text} numberOfLines={3}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const exStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 5 },
  bullet: { color: COLORS.gold, fontSize: 14, marginTop: 1, flexShrink: 0 },
  text: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GlowUpScreen() {
  const { state, updateState, addXP, showToast } = useApp();
  const { isSubscribed } = useSubscription();
  const router = useRouter();

  const today = getTodayStr();
  const dow = getDayOfWeek();
  const trainingDay = useMemo(() => getTrainingDay(dow), [dow]);
  const currentWeek = getISOWeek();

  // ── Habit key helpers ──
  const habitKey = useCallback((id: string) => `${id}_${today}`, [today]);
  const isHabitDone = useCallback((id: string) => !!state.glowUpHabits[habitKey(id)], [state.glowUpHabits, habitKey]);

  const markHabit = useCallback((id: string, xp: number, label: string) => {
    if (isHabitDone(id)) return;
    console.log('[GlowUp] Habit marked:', id, '+' + xp + ' XP');
    const key = habitKey(id);
    updateState({ glowUpHabits: { ...state.glowUpHabits, [key]: true } });
    if (xp > 0) {
      addXP(xp);
      showToast(`✨ ${label} +${xp} XP`, true);
    }
  }, [isHabitDone, habitKey, state.glowUpHabits, updateState, addXP, showToast]);

  // Compute real XP earned today from known habits
  const todayXPReal = useMemo(() => {
    let total = 0;
    const allHabits = [
      ...MORNING_HABITS,
      ...POSTURE_ITEMS,
      ...HEIGHT_HABITS,
    ];
    for (const h of allHabits) {
      if (isHabitDone(h.id)) total += h.xp;
    }
    if (isHabitDone('skincare')) total += 10;
    if (isHabitDone('facial')) total += 15;
    if (isHabitDone('bodyunlock')) total += 25;
    if (isHabitDone('evening')) total += 20;
    if (isHabitDone('training_logged')) total += trainingDay.totalXP;
    return total;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHabitDone, trainingDay]);

  // ── Disclaimer ──
  const handleAckDisclaimer = useCallback(async () => {
    console.log('[GlowUp] Disclaimer acknowledged');
    updateState({ glowUpAckDisclaimer: true });
    await scheduleGlowUpNotifications();
    showToast('✨ Glow Up activated! Notifications scheduled.', true);
  }, [updateState, showToast]);

  // ── Skincare ──
  const handleSkincare = useCallback(() => {
    console.log('[GlowUp] Skincare marked complete');
    markHabit('skincare', 10, 'Skincare Routine');
  }, [markHabit]);

  // ── Facial ──
  const handleFacial = useCallback(() => {
    console.log('[GlowUp] Facial fascial release marked complete');
    markHabit('facial', 15, 'Facial Fascial Release');
  }, [markHabit]);

  // ── Body Unlock ──
  const handleBodyUnlock = useCallback(() => {
    console.log('[GlowUp] Morning body unlock marked complete');
    markHabit('bodyunlock', 25, 'Morning Body Unlock');
  }, [markHabit]);

  // ── Evening ──
  const handleEvening = useCallback(() => {
    console.log('[GlowUp] Evening wind-down marked complete');
    markHabit('evening', 20, 'Evening Wind-Down');
  }, [markHabit]);

  // ── Training ──
  const handleLogTraining = useCallback(() => {
    console.log('[GlowUp] Training logged:', trainingDay.label, '+' + trainingDay.totalXP + ' XP');
    markHabit('training_logged', trainingDay.totalXP, trainingDay.label);
  }, [markHabit, trainingDay]);

  // ── Grocery ──
  const groceryActive = state.glowUpGroceryWeek === currentWeek;

  const handleGenerateGrocery = useCallback(() => {
    console.log('[GlowUp] Grocery list generated for week:', currentWeek);
    updateState({ glowUpGroceryWeek: currentWeek, glowUpGrocery: {} });
    showToast('🛒 Grocery list ready!', true);
  }, [currentWeek, updateState, showToast]);

  const toggleGroceryItem = useCallback((item: string) => {
    const next = { ...state.glowUpGrocery, [item]: !state.glowUpGrocery[item] };
    console.log('[GlowUp] Grocery item toggled:', item, next[item] ? 'checked' : 'unchecked');
    updateState({ glowUpGrocery: next });

    const allChecked = ALL_GROCERY_ITEMS.every((i) => next[i]);
    if (allChecked && !state.glowUpGrocery['__grocery_xp_awarded__']) {
      console.log('[GlowUp] All grocery items checked — awarding +25 XP');
      addXP(25);
      showToast('🛒 Grocery list complete! +25 XP', true);
      updateState({ glowUpGrocery: { ...next, '__grocery_xp_awarded__': true } });
    }
  }, [state.glowUpGrocery, updateState, addXP, showToast]);

  // ── Perfect Day ──
  const morningDone = MORNING_HABITS.every((h) => isHabitDone(h.id));
  const postureDone = POSTURE_ITEMS.every((h) => isHabitDone(h.id));
  const eveningDone = isHabitDone('evening');
  const perfectDayParts = [morningDone, postureDone, eveningDone];
  const perfectCount = perfectDayParts.filter(Boolean).length;
  const isPerfectDay = morningDone && postureDone && eveningDone;

  const handlePerfectDayBonus = useCallback(() => {
    if (!isPerfectDay) return;
    if (isHabitDone('perfect_day')) return;
    console.log('[GlowUp] Perfect Day bonus claimed! +50 XP');
    markHabit('perfect_day', 50, 'Perfect Day Bonus');
    showToast('🌟 PERFECT DAY! +50 XP BONUS!', true);
  }, [isPerfectDay, isHabitDone, markHabit, showToast]);

  // ── Glow Level ──
  const currentLevel = useMemo(() => {
    return GLOW_LEVELS.find((l) => state.xp >= l.min && state.xp < l.max) || GLOW_LEVELS[GLOW_LEVELS.length - 1];
  }, [state.xp]);

  // ── Locked screen ──
  if (!isSubscribed) {
    return (
      <View style={styles.lockedContainer}>
        <ScrollView contentContainerStyle={styles.lockedScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.lockedPreview}>
            <Text style={styles.lockedTitle}>✨ GLOW UP</Text>
            <Text style={styles.lockedSubtitle}>The Complete Natural Glow-Up System</Text>
            <View style={styles.lockedFeatureList}>
              {[
                '🌅 Morning Routine & Body Unlock',
                '🧴 Skincare Protocol',
                '💆 Facial Fascial Release',
                '🧍 Posture Check-Ins',
                '📏 Height Maxing Habits',
                '🏋️ Daily Training Programs',
                '🌙 Evening Wind-Down',
                '🛒 Weekly Grocery List',
                '⚡ XP Levels & Perfect Day Bonus',
              ].map((f, i) => (
                <View key={i} style={styles.lockedFeatureRow}>
                  <Text style={styles.lockedFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.lockedOverlay} pointerEvents="none">
          {Platform.OS !== 'web' ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,10,0.85)' }]} />
          )}
        </View>
        <View style={styles.lockedCTA}>
          <Text style={styles.lockedCTATitle}>✨ Unlock Glow Up</Text>
          <Text style={styles.lockedCTASubtitle}>Included with Kong Pro</Text>
          <TouchableOpacity
            style={styles.lockedCTABtn}
            onPress={() => {
              console.log('[GlowUp] Unlock with Kong Pro pressed');
              router.push('/paywall');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.lockedCTABtnText}>Unlock with Kong Pro →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dateDisplay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const todayXPDisplay = todayXPReal;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.headerBlock}>
          <Text style={styles.headerTitle}>✨ GLOW UP</Text>
          <Text style={styles.headerSubtitle}>The Complete Natural Glow-Up System</Text>
          <Text style={styles.headerDate}>{dateDisplay}</Text>
          <View style={styles.xpCounter}>
            <Text style={styles.xpCounterLabel}>TODAY'S XP</Text>
            <Text style={styles.xpCounterValue}>+{todayXPDisplay}</Text>
          </View>
        </View>

        {/* DISCLAIMER */}
        {!state.glowUpAckDisclaimer && (
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              The Glow Up Function is provided for informational and educational purposes only. Newly and its affiliates cannot be held liable for any outcomes resulting from the use of this feature, including but not limited to supplements, dietary changes, skincare routines, exercise programs, fasting protocols, facial massage techniques, natural remedies, or any other recommendations contained within. Always consult a licensed medical professional before beginning any new health, fitness, or supplement regimen. By continuing you agree that you assume full personal responsibility for your choices.
            </Text>
            <GoldButton label="I Understand & Continue" onPress={handleAckDisclaimer} />
          </View>
        )}

        {state.glowUpAckDisclaimer && (
          <>
            {/* SECTION 2: MORNING ROUTINE */}
            <SectionCard title="🌅 Morning Routine" defaultOpen>
              {MORNING_HABITS.map((h) => (
                <HabitRow
                  key={h.id}
                  label={h.label}
                  xp={h.xp}
                  checked={isHabitDone(h.id)}
                  onPress={() => markHabit(h.id, h.xp, h.label)}
                />
              ))}
              <View style={styles.subCard}>
                <TouchableOpacity
                  style={styles.subCardHeader}
                  onPress={() => {
                    console.log('[GlowUp] Morning Body Unlock tapped');
                    handleBodyUnlock();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.subCardTitle}>🧘 Morning Body Unlock (10–12 min)</Text>
                  <Text style={styles.subCardXP}>+25 XP</Text>
                  {isHabitDone('bodyunlock') ? <Text style={styles.subCardDone}>✓</Text> : null}
                </TouchableOpacity>
                <ExerciseList items={MORNING_BODY_UNLOCK} />
              </View>
            </SectionCard>

            {/* SECTION 3: SKINCARE */}
            <SectionCard title="🧴 Skincare" rightBadge="+10 XP">
              {SKINCARE_ITEMS.map((item, i) => (
                <View key={i} style={exStyles.row}>
                  <Text style={exStyles.bullet}>•</Text>
                  <Text style={[exStyles.text, { color: COLORS.text }]} numberOfLines={2}>{item}</Text>
                </View>
              ))}
              <GoldButton
                label={isHabitDone('skincare') ? '✓ Completed' : 'Mark Complete +10 XP'}
                onPress={handleSkincare}
                disabled={isHabitDone('skincare')}
              />
            </SectionCard>

            {/* SECTION 4: FACIAL FASCIAL RELEASE */}
            <SectionCard title="💆 Facial Fascial Release (3–5 min)" rightBadge="+15 XP">
              <ExerciseList items={FACIAL_STEPS} />
              <GoldButton
                label={isHabitDone('facial') ? '✓ Completed' : 'Mark Complete +15 XP'}
                onPress={handleFacial}
                disabled={isHabitDone('facial')}
              />
            </SectionCard>

            {/* SECTION 5: POSTURE CHECK-INS */}
            <SectionCard title="🧍 Posture Check-Ins" collapsible={false} rightBadge="+25 XP total">
              {POSTURE_ITEMS.map((h) => (
                <HabitRow
                  key={h.id}
                  label={h.label}
                  xp={h.xp}
                  checked={isHabitDone(h.id)}
                  onPress={() => markHabit(h.id, h.xp, h.label)}
                />
              ))}
            </SectionCard>

            {/* SECTION 6: HEIGHT MAXING */}
            <SectionCard title="📏 Height Maxing Habits">
              {HEIGHT_HABITS.map((h) => (
                <HabitRow
                  key={h.id}
                  label={h.label}
                  xp={h.xp}
                  checked={isHabitDone(h.id)}
                  onPress={() => markHabit(h.id, h.xp, h.label)}
                />
              ))}
            </SectionCard>

            {/* SECTION 7: TODAY'S TRAINING */}
            <SectionCard title={`🏋️ ${trainingDay.label}`} defaultOpen rightBadge={`+${trainingDay.totalXP} XP`}>
              {trainingDay.blocks.map((block, bi) => (
                <View key={bi} style={styles.trainingBlock}>
                  <View style={styles.trainingBlockHeader}>
                    <Text style={styles.trainingBlockName}>{block.name}</Text>
                    <Text style={styles.trainingBlockXP}>+{block.xp} XP</Text>
                  </View>
                  <ExerciseList items={block.exercises} />
                </View>
              ))}
              <GoldButton
                label={isHabitDone('training_logged') ? '✓ Workout Logged' : `Log This Workout +${trainingDay.totalXP} XP`}
                onPress={handleLogTraining}
                disabled={isHabitDone('training_logged')}
              />
            </SectionCard>

            {/* SECTION 8: EVENING WIND-DOWN */}
            <SectionCard title="🌙 Evening Fascial Wind-Down (8–10 min)" rightBadge="+20 XP">
              <ExerciseList items={EVENING_STEPS} />
              <GoldButton
                label={isHabitDone('evening') ? '✓ Completed' : 'Mark Complete +20 XP'}
                onPress={handleEvening}
                disabled={isHabitDone('evening')}
              />
            </SectionCard>

            {/* SECTION 9: NUTRITION TARGETS */}
            <SectionCard title="🥩 Daily Nutrition Targets">
              <View style={styles.nutritionGrid}>
                {[
                  { label: 'Protein', value: '180–220g/day' },
                  { label: 'Water', value: '3–4 liters/day' },
                  { label: 'Steps', value: '10,000–15,000' },
                  { label: 'Sleep', value: '8–9 hours' },
                  { label: 'Weight Gain', value: '0.5–1 lb/week' },
                ].map((item, i) => (
                  <View key={i} style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>{item.label}</Text>
                    <Text style={styles.nutritionValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.nutritionSectionTitle}>Sample Meals</Text>
              {[
                { meal: 'Breakfast', desc: '4 eggs + sourdough + banana + Greek yogurt with honey' },
                { meal: 'Lunch', desc: 'Ground beef bowl + rice + broccoli + sauerkraut' },
                { meal: 'Snack', desc: 'Kefir + blueberries or banana' },
                { meal: 'Dinner', desc: 'Steak or chicken + sweet potato + vegetables + avocado' },
              ].map((m, i) => (
                <View key={i} style={styles.mealRow}>
                  <Text style={styles.mealLabel}>{m.meal}</Text>
                  <Text style={styles.mealDesc} numberOfLines={2}>{m.desc}</Text>
                </View>
              ))}
              <Text style={styles.nutritionSectionTitle}>Supplements</Text>
              {[
                'Creatine monohydrate: 5g every morning',
                'Vitamin D3 + K2: morning with food',
                'Omega-3 fish oil: with a meal',
                'Magnesium glycinate: at night before bed',
                'Zinc carnosine: with food',
                'Probiotic: morning or with first meal',
                'Electrolytes: morning water and post-workout',
              ].map((s, i) => (
                <View key={i} style={exStyles.row}>
                  <Text style={exStyles.bullet}>•</Text>
                  <Text style={exStyles.text} numberOfLines={2}>{s}</Text>
                </View>
              ))}
            </SectionCard>

            {/* SECTION 10: GROCERY LIST */}
            <SectionCard title="🛒 Weekly Grocery List" rightBadge="+25 XP">
              {!groceryActive ? (
                <GoldButton label="Generate This Week's List" onPress={handleGenerateGrocery} />
              ) : (
                <>
                  {GROCERY_CATEGORIES.map((cat) => (
                    <View key={cat.name} style={styles.groceryCat}>
                      <Text style={styles.groceryCatName}>{cat.name}</Text>
                      {cat.items.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.groceryRow}
                          onPress={() => toggleGroceryItem(item)}
                          activeOpacity={0.7}
                        >
                          <View style={[habitStyles.check, state.glowUpGrocery[item] && habitStyles.checkDone]}>
                            {state.glowUpGrocery[item] ? <Text style={habitStyles.checkMark}>✓</Text> : null}
                          </View>
                          <Text
                            style={[styles.groceryItem, state.glowUpGrocery[item] && styles.groceryItemDone]}
                            numberOfLines={2}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </>
              )}
            </SectionCard>

            {/* SECTION 11: XP LEVELS */}
            <SectionCard title="⚡ Glow Up Levels" collapsible={false}>
              {GLOW_LEVELS.map((level) => {
                const isActive = currentLevel.label === level.label;
                const maxDisplay = level.max === Infinity ? '∞' : level.max.toLocaleString();
                return (
                  <View key={level.label} style={[styles.levelRow, isActive && styles.levelRowActive]}>
                    <View style={styles.levelInfo}>
                      <Text style={[styles.levelName, isActive && styles.levelNameActive]}>{level.label}</Text>
                      <Text style={styles.levelRange}>
                        {level.min.toLocaleString()}–{maxDisplay} XP
                      </Text>
                    </View>
                    {isActive ? <Text style={styles.levelCurrent}>← YOU</Text> : null}
                  </View>
                );
              })}
              <View style={styles.totalXPRow}>
                <Text style={styles.totalXPLabel}>Your Total XP</Text>
                <Text style={styles.totalXPValue}>{state.xp.toLocaleString()}</Text>
              </View>
            </SectionCard>

            {/* SECTION 12: PERFECT DAY */}
            <SectionCard title="🌟 Perfect Day Bonus" collapsible={false} rightBadge="+50 XP">
              <View style={styles.perfectDayGrid}>
                {[
                  { label: 'Morning Habits', done: morningDone },
                  { label: 'Posture Checks', done: postureDone },
                  { label: 'Evening Wind-Down', done: eveningDone },
                ].map((item, i) => (
                  <View key={i} style={[styles.perfectItem, item.done && styles.perfectItemDone]}>
                    <Text style={styles.perfectItemIcon}>{item.done ? '✅' : '⬜'}</Text>
                    <Text style={[styles.perfectItemLabel, item.done && styles.perfectItemLabelDone]} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.perfectProgress}>
                <Text style={styles.perfectProgressText}>
                  {perfectCount}
                </Text>
                <Text style={styles.perfectProgressSlash}>/</Text>
                <Text style={styles.perfectProgressTotal}>3 complete</Text>
              </View>
              {isPerfectDay ? (
                <GoldButton
                  label={isHabitDone('perfect_day') ? '✓ Bonus Claimed!' : '🌟 Claim Perfect Day +50 XP'}
                  onPress={handlePerfectDayBonus}
                  disabled={isHabitDone('perfect_day')}
                />
              ) : (
                <View style={styles.perfectHint}>
                  <Text style={styles.perfectHintText}>
                    Complete all 3 sections to unlock the Perfect Day bonus!
                  </Text>
                </View>
              )}
            </SectionCard>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 12 },

  // Header
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  headerDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  xpCounter: {
    marginTop: 12,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border2,
    alignItems: 'center',
  },
  xpCounterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1.5,
  },
  xpCounterValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.goldBright,
    fontVariant: ['tabular-nums'],
  },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: 'rgba(212,160,23,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.gold,
    marginBottom: 10,
  },
  disclaimerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Sub-card (body unlock)
  subCard: {
    marginTop: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flexShrink: 1,
  },
  subCardXP: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldBright,
    flexShrink: 0,
  },
  subCardDone: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '900',
    flexShrink: 0,
  },

  // Training
  trainingBlock: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trainingBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trainingBlockName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    flexShrink: 1,
  },
  trainingBlockXP: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldBright,
    flexShrink: 0,
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  nutritionItem: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 10,
    minWidth: '45%',
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nutritionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  nutritionValue: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: '800',
  },
  nutritionSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  mealRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.gold,
    width: 70,
    flexShrink: 0,
  },
  mealDesc: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Grocery
  groceryCat: { marginBottom: 14 },
  groceryCatName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  groceryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groceryItem: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  groceryItemDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },

  // Levels
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelRowActive: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
  },
  levelInfo: { flex: 1 },
  levelName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  levelNameActive: {
    color: COLORS.gold,
    fontWeight: '900',
  },
  levelRange: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  levelCurrent: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.goldBright,
  },
  totalXPRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalXPLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  totalXPValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.goldBright,
    fontVariant: ['tabular-nums'],
  },

  // Perfect Day
  perfectDayGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  perfectItem: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  perfectItemDone: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
  },
  perfectItemIcon: { fontSize: 20, marginBottom: 4 },
  perfectItemLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  perfectItemLabelDone: { color: COLORS.gold },
  perfectProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  perfectProgressText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.goldBright,
    fontVariant: ['tabular-nums'],
  },
  perfectProgressSlash: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  perfectProgressTotal: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  perfectHint: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  perfectHintText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Locked screen
  lockedContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  lockedScroll: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 200,
  },
  lockedPreview: {
    alignItems: 'center',
  },
  lockedTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 3,
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  lockedFeatureList: {
    width: '100%',
    gap: 10,
  },
  lockedFeatureRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lockedFeatureText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 80,
    bottom: 120,
  },
  lockedCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border2,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  lockedCTATitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold,
  },
  lockedCTASubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  lockedCTABtn: {
    marginTop: 8,
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  lockedCTABtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.bg,
  },
});
