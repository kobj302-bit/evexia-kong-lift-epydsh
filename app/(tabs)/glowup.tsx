import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/data';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { scheduleGlowUpNotifications } from '@/utils/glowupNotifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getISOWeek(): string {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getDayOfWeek(): number {
  return new Date().getDay();
}

function getDayLabel(): string {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[new Date().getDay()];
}

function getMonthDay(): string {
  const d = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function getDaysSince(dateStr: string | null): number {
  if (!dateStr) return 1;
  const start = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MORNING_HABITS = [
  { id: 'water', label: '💧 Water', emoji: '💧', xp: 10 },
  { id: 'sunlight', label: '☀️ Sunlight', emoji: '☀️', xp: 10 },
  { id: 'breakfast', label: '🍳 Breakfast', emoji: '🍳', xp: 10 },
  { id: 'skincare', label: '🧴 Skincare', emoji: '🧴', xp: 10 },
  { id: 'facial', label: '💆 Facial', emoji: '💆', xp: 15 },
  { id: 'bodyunlock', label: '🌅 Body Unlock', emoji: '🌅', xp: 25 },
  { id: 'posture', label: '🧍 Posture', emoji: '🧍', xp: 5 },
  { id: 'height', label: '📏 Height', emoji: '📏', xp: 10 },
  { id: 'evening', label: '🌙 Evening', emoji: '🌙', xp: 15 },
];

const HABIT_RING_DEFS = [
  { id: 'water', emoji: '💧', name: 'Water', xp: 10 },
  { id: 'sunlight', emoji: '☀️', name: 'Sunlight', xp: 10 },
  { id: 'supp_creatine', emoji: '💊', name: 'Supps', xp: 5 },
  { id: 'breakfast', emoji: '🍳', name: 'Breakfast', xp: 10 },
  { id: 'skincare', emoji: '🧴', name: 'Skincare', xp: 10 },
  { id: 'facial', emoji: '💆', name: 'Facial', xp: 15 },
  { id: 'posture', emoji: '🧍', name: 'Posture', xp: 5 },
  { id: 'height', emoji: '📏', name: 'Height', xp: 10 },
  { id: 'evening', emoji: '🌙', name: 'Evening', xp: 15 },
];

const SUPPLEMENTS = [
  { id: 'supp_creatine', label: 'Creatine 5g', time: '☀️', xp: 5 },
  { id: 'supp_d3', label: 'Vitamin D3+K2', time: '☀️', xp: 5 },
  { id: 'supp_omega3', label: 'Omega-3', time: '🍽️', xp: 5 },
  { id: 'supp_mag', label: 'Magnesium Glycinate', time: '🌙', xp: 5 },
  { id: 'supp_zinc', label: 'Zinc Carnosine', time: '🍽️', xp: 5 },
  { id: 'supp_probiotic', label: 'Probiotic', time: '☀️', xp: 5 },
  { id: 'supp_electrolytes', label: 'Electrolytes', time: '💧', xp: 5 },
];

const DEBLOAT_HABITS = [
  { id: 'db_water', emoji: '💧', label: 'Electrolyte water morning', xp: 5 },
  { id: 'db_walk', emoji: '🚶', label: 'Walk after every meal', xp: 5 },
  { id: 'db_fermented', emoji: '🥒', label: 'Fermented foods daily', xp: 5 },
  { id: 'db_probiotic', emoji: '🦠', label: 'Probiotics + zinc carnosine', xp: 5 },
  { id: 'db_magnesium', emoji: '💊', label: 'Magnesium at night', xp: 5 },
  { id: 'db_noprocessed', emoji: '🚫', label: 'No processed food/seed oils', xp: 5 },
];

const SKINCARE_ITEMS = [
  'Wash face with natural cleanser',
  'Apply moisturizer (tallow/beeswax/honey blend)',
  'Red light therapy 10–15 min',
  'Apply magnesium body spray',
  'Drink from copper cup',
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

const HEIGHT_HABITS = [
  { id: 'sleep8', label: '😴 Sleep 8–9 hours', xp: 20 },
  { id: 'mewing', label: '👅 Mewing check-in', xp: 10 },
  { id: 'dedhang', label: '🏋️ Dead hang (at least once)', xp: 15 },
  { id: 'noalc', label: '🚫 No alcohol today', xp: 0 },
  { id: 'nolateeating', label: '🌙 No eating 2–3 hrs before bed', xp: 10 },
  { id: 'protein', label: '🥩 Protein at every meal', xp: 0 },
];

const HEIGHT_FINISHER = [
  'Dead hang: 3 x 45–60 sec',
  'Cobra stretch: 5 x 20–30 sec',
  'Downward dog: 3 x 30 sec',
  "Child's pose: 3 x 45 sec",
  'Standing toe touch: 5 x 20 sec',
  'Spinal twist: 30 sec each side',
  'Overhead wall reach: 5 x 20 sec',
];

const FASCIAL_COOLDOWN = [
  'Foam roll full back: 90 sec',
  'Foam roll IT band: 60 sec each side',
  'Foam roll calves: 45 sec each side',
  "Child's pose with side reach: 30 sec each side",
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
  { name: 'Superficial Back Line', exercises: ['Standing forward fold: 60 sec', 'Seated forward fold: 45 sec', 'Foam roll posterior chain: 3 min'] },
  { name: 'Superficial Front Line', exercises: ['Cobra: 5 x 20 sec', 'Kneeling quad stretch: 45 sec each', 'Hip flexor lunge: 45 sec each'] },
  { name: 'Lateral Line', exercises: ['Standing side bend: 30 sec each, 3 rounds', 'Thread the needle: 30 sec each', 'Side-lying foam roll: 60 sec each'] },
  { name: 'Spiral Line', exercises: ['Seated spinal rotation: 30 sec each, 3 rounds', 'Cross-body reach: 20 sec each', 'Lying windshield wiper: 10 reps'] },
  { name: 'Arm Lines', exercises: ['Doorway chest opener: 30 sec', 'Wrist flexor/extensor: 20 sec each', 'Overhead tricep/lat stretch: 30 sec each'] },
  { name: 'Deep Front Line', exercises: ['90/90 hip stretch: 45 sec each', 'Psoas release: 60 sec each', 'Diaphragm breathing: 10 breaths', 'Tongue/jaw release: 10 reps'] },
  { name: 'Spinal Decompression', exercises: ['Dead hang: 3 x 60 sec', "Child's pose: 3 x 45 sec", 'Thoracic extension: 2 min', 'Inversion: 30 sec'] },
];

const MORNING_BODY_UNLOCK_AREAS = [
  { id: 'neck', label: 'Neck', instructions: 'Interlace fingers behind head, pull chin to chest, hold 20 sec. Tilt head side to side 5 reps each. Roll chin across chest 5 passes.' },
  { id: 'shoulders', label: 'Shoulders', instructions: 'Doorway stretch 30 sec. One arm across body 20 sec each. Interlace hands behind back 20 sec.' },
  { id: 'thoracic', label: 'Thoracic', instructions: 'Foam roller at mid-back 20–30 sec each segment. Seated rotation 20 sec each side 3 rounds.' },
  { id: 'hips', label: 'Hips', instructions: 'Low lunge overhead reach 30 sec each. 90/90 hip stretch 45 sec each. Supine figure four 45 sec each.' },
  { id: 'posterior', label: 'Posterior', instructions: 'Standing forward fold 45 sec. Seated hamstring reach 30 sec. Lying knee to chest 20 sec each.' },
  { id: 'ankles', label: 'Ankles', instructions: 'Ankle circles 10 each direction. Toes up wall 20 sec each. Tennis ball roll 60 sec each.' },
];

const EVENING_STEPS = [
  'Legs up the wall: 3–5 min',
  'Supine spinal twist: 30 sec each side',
  'Figure four glute stretch: 45 sec each side',
  'Chest opener on floor: arms out in T, 2 min',
  'Diaphragm breathing: 10 deep slow breaths',
  'Body scan: 60 sec',
];

const POSTURE_ITEMS = [
  { id: 'chin', label: 'Chin tucked, not jutting forward', xp: 5 },
  { id: 'shoulders', label: 'Shoulders back and down', xp: 5 },
  { id: 'weight', label: 'Weight even on both feet', xp: 5 },
  { id: 'screen', label: 'Screen at eye level', xp: 5 },
  { id: 'sleep', label: 'Sleeping on back, thin or no pillow', xp: 5 },
];

const GROCERY_CATEGORIES: { name: string; items: string[] }[] = [
  { name: 'Protein', items: ['Eggs (3 dozen)', 'Grass-fed ground beef (4–5 lbs)', 'Steak (2 lbs)', 'Chicken thighs or breast (2 lbs)', 'Greek yogurt (4 large tubs)', 'Kefir (2 bottles)', 'Bone broth (2 cartons)'] },
  { name: 'Fruit', items: ['Bananas (7)', 'Blueberries (2 containers)', 'Strawberries (2 containers)', 'Apples (4)', 'Oranges (4)', 'Seasonal fruit (1 bag)'] },
  { name: 'Vegetables', items: ['Spinach (1 large bag)', 'Bell peppers (4)', 'Broccoli (2 heads)', 'Sweet potatoes (6)', 'Avocados (7)', 'Carrots (1 bag)', 'Zucchini (2)', 'Onions (2)', 'Garlic (1 head)', 'Sauerkraut (1 jar)', 'Kimchi (1 jar)'] },
  { name: 'Carbs', items: ['Sourdough bread (1 loaf)', 'White rice (1 bag)', 'Oats (1 container)', 'Potatoes (1 bag)'] },
  { name: 'Fats & Extras', items: ['Extra virgin olive oil (1 bottle)', 'Raw honey (1 jar)', 'Natural peanut butter (1 jar)', 'Mixed nuts (1 bag)', 'Coconut oil (1 jar)'] },
  { name: 'Supplements', items: ['Creatine monohydrate', 'Vitamin D3 + K2', 'Omega-3 fish oil', 'Magnesium glycinate', 'Zinc carnosine', 'Probiotic', 'Electrolyte packets'] },
  { name: 'Skincare & Tools', items: ['Natural cleanser', 'Beef tallow or beeswax honey moisturizer', 'Bamboo mouth tape', 'Magnesium body spray', 'Essential oil'] },
];

const ALL_GROCERY_ITEMS = GROCERY_CATEGORIES.flatMap((c) => c.items);

const GLOW_LEVELS = [
  { label: 'Rookie', emoji: '🌱', min: 0, max: 500 },
  { label: 'Ascending', emoji: '⬆️', min: 500, max: 1500 },
  { label: 'Glowing', emoji: '✨', min: 1500, max: 3500 },
  { label: 'Elite', emoji: '⚡', min: 3500, max: 7000 },
  { label: 'Optimized', emoji: '🔥', min: 7000, max: 15000 },
  { label: 'Ascended', emoji: '👑', min: 15000, max: Infinity },
];

const DAILY_MISSIONS: Record<number, { emoji: string; title: string; xp: number; habitId: string }> = {
  1: { emoji: '💪', title: 'Morning Body Unlock', xp: 25, habitId: 'bodyunlock' },
  2: { emoji: '🧘', title: 'Full Fascial Unlock', xp: 40, habitId: 'training_logged' },
  3: { emoji: '⚡', title: 'Sprint Fast Protocol', xp: 40, habitId: 'training_logged' },
  4: { emoji: '🌿', title: 'Rest + Decompress', xp: 30, habitId: 'evening' },
  5: { emoji: '🏋️', title: 'Pull Training Day', xp: 50, habitId: 'training_logged' },
  6: { emoji: '💥', title: 'Arms + Cardio', xp: 40, habitId: 'training_logged' },
  0: { emoji: '🌙', title: 'Full Recovery Day', xp: 30, habitId: 'evening' },
};

const WEEK_SCHEDULE = [
  { day: 'MON', emoji: '💪', type: 'Push', xp: 125 },
  { day: 'TUE', emoji: '🧘', type: 'Rest', xp: 40 },
  { day: 'WED', emoji: '⚡', type: 'Lower', xp: 165 },
  { day: 'THU', emoji: '🌿', type: 'Rest', xp: 40 },
  { day: 'FRI', emoji: '🏋️', type: 'Pull', xp: 125 },
  { day: 'SAT', emoji: '💥', type: 'Arms', xp: 110 },
  { day: 'SUN', emoji: '🌙', type: 'Recovery', xp: 30 },
];

interface TrainingDay {
  label: string;
  type: string;
  blocks: { name: string; xp: number; color: string; exercises: string[] }[];
  totalXP: number;
}

function getTrainingDay(dow: number): TrainingDay {
  switch (dow) {
    case 1:
      return {
        label: 'PUSH DAY',
        type: 'Training',
        blocks: [
          { name: 'Fascial Activation', xp: 15, color: COLORS.blue, exercises: ['Cat-cow: 10 reps', 'Thread the needle: 30 sec each', 'Hip circles: 10 each direction'] },
          { name: 'Posture Warm-Up', xp: 20, color: COLORS.blue, exercises: ['Band pull-aparts: 3 x 15', 'Face pulls: 3 x 15', 'Wall slides: 2 x 10'] },
          { name: 'Push Training', xp: 50, color: COLORS.gold, exercises: PUSH_EXERCISES },
          { name: 'Height Finisher', xp: 25, color: COLORS.gold, exercises: HEIGHT_FINISHER },
          { name: 'Fascial Cool-Down', xp: 15, color: COLORS.green, exercises: FASCIAL_COOLDOWN },
        ],
        totalXP: 125,
      };
    case 2:
      return {
        label: 'REST DAY',
        type: 'Rest',
        blocks: [{ name: 'Full Fascial Unlock', xp: 40, color: COLORS.blue, exercises: REST_FASCIAL_LINES.flatMap((l) => [`— ${l.name}`, ...l.exercises]) }],
        totalXP: 40,
      };
    case 3:
      return {
        label: 'LOWER DAY',
        type: 'Training',
        blocks: [
          { name: 'Fascial Activation', xp: 15, color: COLORS.blue, exercises: ['Hip circles: 10 each', 'Leg swings: 10 each', 'Ankle circles: 10 each'] },
          { name: 'Posture Warm-Up', xp: 20, color: COLORS.blue, exercises: ['Glute bridges: 3 x 15', 'Clamshells: 3 x 15', 'Bird-dog: 3 x 10 each'] },
          { name: 'Lower Training', xp: 50, color: COLORS.gold, exercises: LOWER_EXERCISES },
          { name: 'Sprint Fast', xp: 40, color: COLORS.gold, exercises: ['6 x 40m sprints at 90% effort', 'Rest 90 sec between sprints', 'Walk back to start each time'] },
          { name: 'Height Finisher', xp: 25, color: COLORS.gold, exercises: HEIGHT_FINISHER },
          { name: 'Fascial Cool-Down', xp: 15, color: COLORS.green, exercises: FASCIAL_COOLDOWN },
        ],
        totalXP: 165,
      };
    case 4:
      return {
        label: 'REST DAY',
        type: 'Rest',
        blocks: [{ name: 'Full Fascial Unlock', xp: 40, color: COLORS.blue, exercises: REST_FASCIAL_LINES.flatMap((l) => [`— ${l.name}`, ...l.exercises]) }],
        totalXP: 40,
      };
    case 5:
      return {
        label: 'PULL DAY',
        type: 'Training',
        blocks: [
          { name: 'Fascial Activation', xp: 15, color: COLORS.blue, exercises: ['Shoulder circles: 10 each', 'Arm swings: 10 each', 'Thoracic rotation: 10 each'] },
          { name: 'Posture Warm-Up', xp: 20, color: COLORS.blue, exercises: ['Band pull-aparts: 3 x 15', 'Scapular push-ups: 2 x 10', 'Dead hangs: 2 x 20 sec'] },
          { name: 'Pull Training', xp: 50, color: COLORS.gold, exercises: PULL_EXERCISES },
          { name: 'Height Finisher', xp: 25, color: COLORS.gold, exercises: HEIGHT_FINISHER },
          { name: 'Fascial Cool-Down', xp: 15, color: COLORS.green, exercises: FASCIAL_COOLDOWN },
        ],
        totalXP: 125,
      };
    case 6:
      return {
        label: 'ARMS + CARDIO',
        type: 'Training',
        blocks: [
          { name: 'Arms Training', xp: 40, color: COLORS.gold, exercises: SATURDAY_ARMS },
          { name: 'Sprint Fast', xp: 40, color: COLORS.gold, exercises: ['6 x 40m sprints at 90% effort', 'Rest 90 sec between sprints', 'Walk back to start each time'] },
          { name: 'Full Stretch', xp: 30, color: COLORS.green, exercises: [...HEIGHT_FINISHER, ...FASCIAL_COOLDOWN] },
        ],
        totalXP: 110,
      };
    default:
      return {
        label: 'FULL RECOVERY',
        type: 'Recovery',
        blocks: [{ name: 'Full Recovery', xp: 30, color: COLORS.green, exercises: ['Light walk 20–30 min', 'Full body foam roll: 10 min', ...FASCIAL_COOLDOWN, 'Contrast shower: 3 min hot / 1 min cold x 3'] }],
        totalXP: 30,
      };
  }
}

function getGlowLevel(xp: number) {
  return GLOW_LEVELS.filter((l) => l.min <= xp).pop() || GLOW_LEVELS[0];
}

function getNextGlowLevel(xp: number) {
  return GLOW_LEVELS.find((l) => l.min > xp) || null;
}

// ─── Animated Ring Component ──────────────────────────────────────────────────

function HabitRing({
  emoji,
  name,
  xp,
  done,
  onPress,
}: {
  emoji: string;
  name: string;
  xp: number;
  done: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    console.log('[GlowUp] Habit ring tapped:', name, 'done:', !done);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  }, [onPress, scaleAnim, name, done]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.ringWrapper}>
      <Animated.View
        style={[
          styles.ringOuter,
          done ? styles.ringDone : styles.ringUndone,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.ringEmoji}>{emoji}</Text>
        <Text style={styles.ringName} numberOfLines={1}>{name}</Text>
      </Animated.View>
      <Text style={styles.ringXP}>
        {'+'}
        {xp}
        {' XP'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Progress Ring (arc-style) ────────────────────────────────────────────────

function CircleProgress({
  size,
  progress,
  color,
  label,
  sublabel,
  emoji,
}: {
  size: number;
  progress: number; // 0–1
  color: string;
  label: string;
  sublabel: string;
  emoji: string;
}) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const borderWidth = 5;
  const innerSize = size - borderWidth * 2;

  return (
    <View style={{ alignItems: 'center', width: size + 16 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: clampedProgress >= 1 ? color : COLORS.border,
          backgroundColor: clampedProgress >= 1 ? `${color}22` : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {clampedProgress > 0 && clampedProgress < 1 && (
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: borderWidth,
              borderColor: 'transparent',
              borderTopColor: color,
              borderRightColor: clampedProgress > 0.25 ? color : 'transparent',
              borderBottomColor: clampedProgress > 0.5 ? color : 'transparent',
              borderLeftColor: clampedProgress > 0.75 ? color : 'transparent',
              transform: [{ rotate: '-45deg' }],
            }}
          />
        )}
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.text, marginTop: 1 }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{sublabel}</Text>
    </View>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  defaultOpen = false,
  collapsible = true,
  rightBadge,
  accentColor,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  rightBadge?: string;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    if (!collapsible) return;
    const next = !open;
    console.log('[GlowUp] Section toggled:', title, next ? 'open' : 'closed');
    setOpen(next);
  }, [open, collapsible, title]);

  const borderColor = accentColor ? `${accentColor}40` : COLORS.border;

  return (
    <View style={[styles.card, { borderColor }]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={handleToggle}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.cardHeaderRight}>
          {rightBadge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rightBadge}</Text>
            </View>
          ) : null}
          {collapsible ? (
            <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      {(!collapsible || open) ? <View style={styles.cardBody}>{children}</View> : null}
    </View>
  );
}

// ─── Habit Row ────────────────────────────────────────────────────────────────

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
    <TouchableOpacity style={styles.habitRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.habitCheck, checked && styles.habitCheckDone]}>
        {checked ? <Text style={styles.habitCheckMark}>✓</Text> : null}
      </View>
      <Text style={[styles.habitLabel, checked && styles.habitLabelDone]} numberOfLines={2}>{label}</Text>
      {xp > 0 ? (
        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeText}>
            {'+'}
            {xp}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────

function MacroBar({
  emoji,
  label,
  current,
  target,
  unit,
  onAdd,
}: {
  emoji: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  onAdd: () => void;
}) {
  const pct = Math.min(1, current / target);
  const done = pct >= 1;
  const pctDisplay = Math.round(pct * 100);

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLeft}>
        <Text style={styles.macroEmoji}>{emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.macroLabel}>{label}</Text>
            <Text style={[styles.macroValue, done && { color: COLORS.goldBright }]}>
              {current}
              {'/'}
              {target}
              {unit}
            </Text>
          </View>
          <View style={styles.macroTrack}>
            <View style={[styles.macroFill, { width: `${pctDisplay}%`, backgroundColor: done ? COLORS.goldBright : COLORS.gold }]} />
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.macroAddBtn, done && styles.macroAddBtnDone]}
        onPress={() => {
          console.log('[GlowUp] Macro logged:', label, current, '->', current + 1);
          onAdd();
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.macroAddText}>{done ? '✓' : '+'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Dead Hang Timer Modal ────────────────────────────────────────────────────

function DeadHangModal({
  visible,
  onClose,
  onComplete,
}: {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!visible) {
      setSeconds(60);
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      progressAnim.setValue(0);
    }
  }, [visible, progressAnim]);

  useEffect(() => {
    if (running) {
      console.log('[GlowUp] Dead hang timer started');
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 60 * 1000,
        useNativeDriver: false,
      }).start();
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            console.log('[GlowUp] Dead hang timer completed');
            setTimeout(() => onCompleteRef.current(), 300);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, progressAnim]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeDisplay = `${mins}:${String(secs).padStart(2, '0')}`;
  const progressPct = Math.round(((60 - seconds) / 60) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>DEAD HANG TIMER</Text>
          <Text style={styles.modalSubtitle}>🏋️ Grip the bar and hold</Text>

          <View style={styles.timerRing}>
            <View style={[styles.timerRingInner, { borderColor: seconds === 0 ? COLORS.goldBright : COLORS.gold }]}>
              <Text style={styles.timerDisplay}>{timeDisplay}</Text>
              <Text style={styles.timerPct}>
                {progressPct}
                {'%'}
              </Text>
            </View>
          </View>

          <View style={styles.timerTrack}>
            <Animated.View
              style={[
                styles.timerFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <View style={styles.modalButtons}>
            {!running && seconds === 60 ? (
              <TouchableOpacity
                style={styles.modalStartBtn}
                onPress={() => {
                  console.log('[GlowUp] Dead hang timer start pressed');
                  setRunning(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalStartText}>START HANG</Text>
              </TouchableOpacity>
            ) : running ? (
              <TouchableOpacity
                style={styles.modalStopBtn}
                onPress={() => {
                  console.log('[GlowUp] Dead hang timer stopped early');
                  setRunning(false);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalStopText}>STOP</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.modalStartBtn}
                onPress={() => {
                  console.log('[GlowUp] Dead hang timer complete claimed');
                  onComplete();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalStartText}>CLAIM +15 XP</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Locked Screen ────────────────────────────────────────────────────────────

function LockedScreen() {
  return (
    <SafeAreaView style={styles.lockedContainer} edges={['top']}>
      <ScrollView contentContainerStyle={styles.lockedScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.lockedHero}>
          <Text style={styles.lockedCrown}>👑</Text>
          <Text style={styles.lockedTitle}>GLOW UP SYSTEM</Text>
          <Text style={styles.lockedSubtitle}>The most complete self-optimization protocol ever built into a mobile app.</Text>
          <View style={styles.lockedSocialProof}>
            <Text style={styles.lockedSocialText}>Join 10,000+ members optimizing their glow up</Text>
          </View>
        </View>

        <View style={styles.lockedFeatures}>
          {[
            { icon: '🔥', text: 'Daily habit rings with XP & streaks' },
            { icon: '💪', text: 'Day-specific training programs' },
            { icon: '🧴', text: 'Skincare + facial fascial protocol' },
            { icon: '📏', text: 'Height maxing dashboard + dead hang timer' },
            { icon: '💊', text: 'Full supplement stack tracker' },
            { icon: '🛒', text: 'Weekly grocery list generator' },
          ].map((f) => (
            <View key={f.text} style={styles.lockedFeatureRow}>
              <Text style={styles.lockedFeatureIcon}>{f.icon}</Text>
              <Text style={styles.lockedFeatureText}>{f.text}</Text>
              <Text style={styles.lockedCheck}>✓</Text>
            </View>
          ))}
        </View>

        <View style={styles.lockedLevels}>
          <Text style={styles.lockedLevelsTitle}>YOUR JOURNEY AWAITS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {GLOW_LEVELS.map((l) => (
              <View key={l.label} style={styles.lockedLevelPill}>
                <Text style={styles.lockedLevelEmoji}>{l.emoji}</Text>
                <Text style={styles.lockedLevelLabel}>{l.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.lockedCTA}>
          <Text style={styles.lockedCTAText}>UNLOCK GLOW UP — KONG PRO</Text>
          <Text style={styles.lockedCTASub}>Available with Kong Pro subscription</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GlowUpScreen() {
  const { state, updateState, addXP, showToast } = useApp();
  const { isSubscribed } = useSubscription();

  const today = getTodayStr();
  const dow = getDayOfWeek();
  const habits = state.glowUpHabits;
  const grocery = state.glowUpGrocery;

  // ── Disclaimer / start date ──
  const [showDisclaimer, setShowDisclaimer] = useState(!state.glowUpAckDisclaimer);

  const handleAckDisclaimer = useCallback(() => {
    console.log('[GlowUp] Disclaimer acknowledged');
    const startDate = state.glowUpStartDate || today;
    updateState({ glowUpAckDisclaimer: true, glowUpStartDate: startDate });
    setShowDisclaimer(false);
    scheduleGlowUpNotifications();
  }, [state.glowUpStartDate, today, updateState]);

  // ── Habit helpers ──
  const getHabit = useCallback(
    (id: string) => !!habits[`${id}_${today}`],
    [habits, today],
  );

  const toggleHabit = useCallback(
    (id: string, xp: number, label: string) => {
      const key = `${id}_${today}`;
      const wasOn = !!habits[key];
      const nowOn = !wasOn;
      console.log('[GlowUp] Habit toggled:', label, 'id:', id, 'now:', nowOn ? 'done' : 'undone');
      const updated = { ...habits, [key]: nowOn };
      updateState({ glowUpHabits: updated });
      if (nowOn && xp > 0) {
        addXP(xp);
        showToast(`+${xp} XP — ${label}`, true);
      }
    },
    [habits, today, updateState, addXP, showToast],
  );

  // ── Nutrition tracker ──
  const getNutritionVal = useCallback(
    (key: string): number => {
      const raw = habits[`${key}_${today}`];
      if (raw === undefined || raw === null) return 0;
      const n = Number(raw);
      return isNaN(n) ? 0 : n;
    },
    [habits, today],
  );

  const addNutrition = useCallback(
    (key: string, increment: number, label: string) => {
      const current = getNutritionVal(key);
      const next = current + increment;
      console.log('[GlowUp] Nutrition logged:', label, current, '->', next);
      updateState({ glowUpHabits: { ...habits, [`${key}_${today}`]: next as unknown as boolean } });
    },
    [getNutritionVal, habits, today, updateState],
  );

  // ── Computed stats ──
  const totalHabits = HABIT_RING_DEFS.length;
  const doneHabits = HABIT_RING_DEFS.filter((h) => getHabit(h.id)).length;
  const habitProgress = totalHabits > 0 ? doneHabits / totalHabits : 0;

  const todayXP = useMemo(() => {
    let xp = 0;
    HABIT_RING_DEFS.forEach((h) => { if (getHabit(h.id)) xp += h.xp; });
    SUPPLEMENTS.forEach((s) => { if (getHabit(s.id)) xp += s.xp; });
    HEIGHT_HABITS.forEach((h) => { if (getHabit(h.id)) xp += h.xp; });
    DEBLOAT_HABITS.forEach((h) => { if (getHabit(h.id)) xp += h.xp; });
    if (getHabit('training_logged')) xp += 50;
    if (getHabit('perfect_day')) xp += 50;
    return xp;
  }, [getHabit]);

  const XP_TARGET = 450;
  const xpProgress = Math.min(1, todayXP / XP_TARGET);

  // Glow streak: days with at least 1 habit done (approximate from state.streak)
  const glowStreak = state.streak;
  const streakProgress = Math.min(1, glowStreak / 7);

  const glowLevel = getGlowLevel(state.xp);
  const nextGlowLevel = getNextGlowLevel(state.xp);
  const levelProgress = nextGlowLevel
    ? (state.xp - glowLevel.min) / (nextGlowLevel.min - glowLevel.min)
    : 1;

  const daysSince = getDaysSince(state.glowUpStartDate);
  const dayLabel = getDayLabel();
  const monthDay = getMonthDay();
  const isPerfectDayInReach = habitProgress >= 0.8;

  // ── Perfect day pillars ──
  const pillars = [
    { id: 'bodyunlock', label: 'Morning', emoji: '🌅' },
    { id: 'training_logged', label: 'Training', emoji: '💪' },
    { id: 'skincare', label: 'Skincare', emoji: '🧴' },
    { id: 'posture', label: 'Posture', emoji: '🧍' },
    { id: 'evening', label: 'Evening', emoji: '🌙' },
  ];
  const pillarsDone = pillars.filter((p) => getHabit(p.id)).length;
  const perfectDayDone = getHabit('perfect_day');

  // ── Training ──
  const trainingDay = getTrainingDay(dow);
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const toggleBlock = useCallback((name: string) => {
    console.log('[GlowUp] Training block toggled:', name);
    setExpandedBlocks((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  // ── Body unlock area ──
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // ── Grocery ──
  const currentWeek = getISOWeek();
  const groceryGenerated = state.glowUpGroceryWeek === currentWeek;
  const groceryDone = ALL_GROCERY_ITEMS.filter((item) => !!grocery[item]).length;
  const groceryTotal = ALL_GROCERY_ITEMS.length;
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleGrocery = useCallback(
    (item: string) => {
      console.log('[GlowUp] Grocery item toggled:', item);
      const updated = { ...grocery, [item]: !grocery[item] };
      updateState({ glowUpGrocery: updated });
      if (!grocery[item] && groceryDone + 1 === groceryTotal) {
        addXP(25);
        showToast('🛒 All groceries checked! +25 XP', true);
      }
    },
    [grocery, groceryDone, groceryTotal, updateState, addXP, showToast],
  );

  const generateGrocery = useCallback(() => {
    console.log('[GlowUp] Grocery list generated for week:', currentWeek);
    updateState({ glowUpGroceryWeek: currentWeek, glowUpGrocery: {} });
  }, [currentWeek, updateState]);

  // ── Dead hang modal ──
  const [hangModalVisible, setHangModalVisible] = useState(false);

  const handleHangComplete = useCallback(() => {
    console.log('[GlowUp] Dead hang completed, awarding XP');
    setHangModalVisible(false);
    toggleHabit('dedhang', 15, 'Dead Hang');
    showToast('🏋️ Dead hang complete! +15 XP', true);
  }, [toggleHabit, showToast]);

  // ── Pulse animation ──
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
      ]),
    );
    const flame = Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(flameAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    flame.start();
    return () => { pulse.stop(); flame.stop(); };
  }, [pulseAnim, flameAnim]);

  if (!isSubscribed) return <LockedScreen />;

  if (showDisclaimer) {
    return (
      <SafeAreaView style={styles.disclaimerContainer} edges={['top']}>
        <ScrollView contentContainerStyle={styles.disclaimerScroll}>
          <Text style={styles.disclaimerEmoji}>⚠️</Text>
          <Text style={styles.disclaimerTitle}>BEFORE YOU BEGIN</Text>
          <Text style={styles.disclaimerBody}>
            The Glow Up System is an educational wellness protocol for informational purposes only. It is not medical advice. Consult a qualified healthcare professional before starting any new exercise, nutrition, or supplement regimen. Results vary. Kong Lift is not responsible for any outcomes.
          </Text>
          <TouchableOpacity
            style={styles.disclaimerBtn}
            onPress={handleAckDisclaimer}
            activeOpacity={0.8}
          >
            <Text style={styles.disclaimerBtnText}>I UNDERSTAND — START MY GLOW UP</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const dailyMission = DAILY_MISSIONS[dow];
  const missionDone = getHabit(dailyMission.habitId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DeadHangModal
        visible={hangModalVisible}
        onClose={() => setHangModalVisible(false)}
        onComplete={handleHangComplete}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>GLOW UP</Text>
          <View style={styles.xpChip}>
            <Text style={styles.xpChipText}>
              {state.xp}
              {' XP'}
            </Text>
          </View>
        </View>

        {/* ── SECTION 1: HERO DASHBOARD ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroDateRow}>
            <Text style={styles.heroDay}>{dayLabel}</Text>
            <Text style={styles.heroDate}>{monthDay}</Text>
          </View>
          <Text style={styles.heroDayCounter}>
            {'DAY '}
            {daysSince}
            {' OF YOUR GLOW UP'}
          </Text>

          <View style={styles.heroRings}>
            <CircleProgress
              size={76}
              progress={habitProgress}
              color={COLORS.gold}
              emoji="🔥"
              label={`${doneHabits}/${totalHabits}`}
              sublabel="HABITS"
            />
            <CircleProgress
              size={76}
              progress={xpProgress}
              color={COLORS.goldBright}
              emoji="⚡"
              label={`${todayXP}`}
              sublabel="XP TODAY"
            />
            <CircleProgress
              size={76}
              progress={streakProgress}
              color={COLORS.green}
              emoji="🌟"
              label={`${glowStreak}/7`}
              sublabel="STREAK"
            />
          </View>

          <View style={styles.heroLevelRow}>
            <View style={styles.heroLevelBadge}>
              <Text style={styles.heroLevelEmoji}>{glowLevel.emoji}</Text>
              <Text style={styles.heroLevelLabel}>{glowLevel.label.toUpperCase()}</Text>
            </View>
            {nextGlowLevel ? (
              <Text style={styles.heroLevelNext}>
                {'→ '}
                {nextGlowLevel.label}
              </Text>
            ) : null}
          </View>

          <View style={styles.heroLevelTrack}>
            <View style={[styles.heroLevelFill, { width: `${Math.round(levelProgress * 100)}%` }]} />
          </View>
          <Text style={styles.heroLevelXP}>
            {state.xp}
            {' / '}
            {nextGlowLevel ? nextGlowLevel.min : glowLevel.min}
            {' XP'}
          </Text>

          {isPerfectDayInReach ? (
            <Animated.View style={[styles.perfectBanner, { opacity: pulseAnim }]}>
              <Text style={styles.perfectBannerText}>⚡ PERFECT DAY IN REACH</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* ── SECTION 13: WEEKLY SCHEDULE ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} numberOfLines={1}>📅 WEEKLY SCHEDULE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {WEEK_SCHEDULE.map((d, i) => {
              const dayIndex = i + 1 === 7 ? 0 : i + 1;
              const isToday = dayIndex === dow;
              const isPast = dayIndex < dow || (dow === 0 && dayIndex > 0);
              return (
                <View
                  key={d.day}
                  style={[
                    styles.weekPill,
                    isToday && styles.weekPillToday,
                    isPast && !isToday && styles.weekPillPast,
                  ]}
                >
                  <Text style={[styles.weekPillDay, isToday && styles.weekPillDayToday]}>{d.day}</Text>
                  <Text style={styles.weekPillEmoji}>{d.emoji}</Text>
                  <Text style={[styles.weekPillType, isToday && styles.weekPillTypeToday]} numberOfLines={1}>{d.type}</Text>
                  <Text style={styles.weekPillXP}>
                    {'+'}
                    {d.xp}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── SECTION 2: DAILY MISSION ── */}
        <View style={[styles.card, styles.missionCard]}>
          <View style={styles.missionHeader}>
            <Text style={styles.missionLabel}>TODAY'S MISSION</Text>
            <View style={styles.missionXPBadge}>
              <Text style={styles.missionXPText}>
                {'+'}
                {dailyMission.xp}
                {' XP'}
              </Text>
            </View>
          </View>
          <View style={styles.missionBody}>
            <Text style={styles.missionEmoji}>{dailyMission.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.missionTitle} numberOfLines={2}>{dailyMission.title}</Text>
              <Text style={styles.missionDow}>{dayLabel}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.missionBtn, missionDone && styles.missionBtnDone]}
            onPress={() => {
              console.log('[GlowUp] Daily mission button pressed:', dailyMission.title, 'done:', !missionDone);
              toggleHabit(dailyMission.habitId, missionDone ? 0 : dailyMission.xp, dailyMission.title);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.missionBtnText}>{missionDone ? '✓ COMPLETED' : 'START NOW →'}</Text>
          </TouchableOpacity>

          <Text style={styles.missionAlsoLabel}>Also due today</Text>
          <View style={styles.missionPills}>
            {[
              { id: 'water', emoji: '💧', label: 'Water', xp: 10 },
              { id: 'sunlight', emoji: '☀️', label: 'Sunlight', xp: 10 },
              { id: 'posture', emoji: '🧍', label: 'Posture', xp: 5 },
            ].map((h) => {
              const done = getHabit(h.id);
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.missionPill, done && styles.missionPillDone]}
                  onPress={() => {
                    console.log('[GlowUp] Quick habit pill pressed:', h.label);
                    toggleHabit(h.id, h.xp, h.label);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.missionPillEmoji}>{h.emoji}</Text>
                  <Text style={[styles.missionPillLabel, done && styles.missionPillLabelDone]} numberOfLines={1}>{h.label}</Text>
                  {done ? <Text style={styles.missionPillCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── SECTION 3: HABIT RINGS ── */}
        <SectionCard title="🔥 HABIT RINGS" defaultOpen rightBadge={`${doneHabits}/${totalHabits}`} accentColor={COLORS.gold}>
          <View style={styles.ringsGrid}>
            {HABIT_RING_DEFS.map((h) => (
              <HabitRing
                key={h.id}
                emoji={h.emoji}
                name={h.name}
                xp={h.xp}
                done={getHabit(h.id)}
                onPress={() => toggleHabit(h.id, h.xp, h.name)}
              />
            ))}
          </View>
        </SectionCard>

        {/* ── SECTION 4: TODAY'S TRAINING ── */}
        <SectionCard
          title={`💪 ${trainingDay.label}`}
          defaultOpen
          rightBadge={`+${trainingDay.totalXP} XP`}
          accentColor={COLORS.gold}
        >
          <View style={styles.trainingTypeBadge}>
            <Text style={styles.trainingTypeText}>{trainingDay.type.toUpperCase()}</Text>
          </View>
          {trainingDay.blocks.map((block) => (
            <View key={block.name} style={[styles.trainingBlock, { borderLeftColor: block.color }]}>
              <TouchableOpacity
                style={styles.trainingBlockHeader}
                onPress={() => toggleBlock(block.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.trainingBlockName} numberOfLines={1}>{block.name}</Text>
                <View style={styles.trainingBlockRight}>
                  <Text style={styles.trainingBlockXP}>
                    {'+'}
                    {block.xp}
                    {' XP'}
                  </Text>
                  <Text style={styles.trainingBlockChevron}>{expandedBlocks[block.name] ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>
              {expandedBlocks[block.name] ? (
                <View style={styles.trainingBlockBody}>
                  {block.exercises.map((ex, i) => (
                    <Text key={i} style={styles.trainingExercise} numberOfLines={2}>
                      {'• '}
                      {ex}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.logWorkoutBtn, getHabit('training_logged') && styles.logWorkoutBtnDone]}
            onPress={() => {
              console.log('[GlowUp] Log workout button pressed, day:', trainingDay.label);
              toggleHabit('training_logged', 50, 'Workout Logged');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.logWorkoutText}>
              {getHabit('training_logged') ? '✓ WORKOUT LOGGED' : `LOG ${trainingDay.type === 'Rest' ? 'REST DAY' : 'WORKOUT'} +50 XP`}
            </Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── SECTION 5: BODY UNLOCK TIMER ── */}
        <SectionCard title="🌅 MORNING BODY UNLOCK" defaultOpen={false} rightBadge="+25 XP" accentColor={COLORS.blue}>
          <View style={styles.bodyUnlockMeta}>
            <Text style={styles.bodyUnlockTime}>⏱ 10–12 min</Text>
            <Text style={styles.bodyUnlockSub}>6 body areas — tap to expand</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {MORNING_BODY_UNLOCK_AREAS.map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[styles.areaPill, selectedArea === area.id && styles.areaPillActive]}
                onPress={() => {
                  console.log('[GlowUp] Body unlock area selected:', area.label);
                  setSelectedArea(selectedArea === area.id ? null : area.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.areaPillText, selectedArea === area.id && styles.areaPillTextActive]}>{area.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedArea ? (
            <View style={styles.areaInstructions}>
              <Text style={styles.areaInstructionsTitle} numberOfLines={1}>
                {MORNING_BODY_UNLOCK_AREAS.find((a) => a.id === selectedArea)?.label}
              </Text>
              <Text style={styles.areaInstructionsText}>
                {MORNING_BODY_UNLOCK_AREAS.find((a) => a.id === selectedArea)?.instructions}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.completeBtn, getHabit('bodyunlock') && styles.completeBtnDone]}
            onPress={() => {
              console.log('[GlowUp] Body unlock complete button pressed');
              toggleHabit('bodyunlock', 25, 'Morning Body Unlock');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>
              {getHabit('bodyunlock') ? '✓ BODY UNLOCK DONE' : 'COMPLETE BODY UNLOCK +25 XP'}
            </Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── SECTION 6: NUTRITION TRACKER ── */}
        <SectionCard title="🥗 NUTRITION TRACKER" defaultOpen={false} accentColor={COLORS.green}>
          <MacroBar
            emoji="🥩"
            label="Protein"
            current={getNutritionVal('protein_val')}
            target={200}
            unit="g"
            onAdd={() => addNutrition('protein_val', 25, 'Protein')}
          />
          <MacroBar
            emoji="💧"
            label="Water"
            current={getNutritionVal('water_val')}
            target={16}
            unit=" glasses"
            onAdd={() => addNutrition('water_val', 1, 'Water')}
          />
          <MacroBar
            emoji="👟"
            label="Steps"
            current={getNutritionVal('steps_val')}
            target={10}
            unit="k steps"
            onAdd={() => addNutrition('steps_val', 1, 'Steps')}
          />
          <MacroBar
            emoji="😴"
            label="Sleep"
            current={getNutritionVal('sleep_val')}
            target={9}
            unit=" hrs"
            onAdd={() => addNutrition('sleep_val', 1, 'Sleep')}
          />
        </SectionCard>

        {/* ── SECTION 7: SUPPLEMENT STACK ── */}
        <SectionCard
          title="💊 SUPPLEMENT STACK"
          defaultOpen={false}
          rightBadge={`${SUPPLEMENTS.filter((s) => getHabit(s.id)).length}/${SUPPLEMENTS.length}`}
          accentColor={COLORS.gold}
        >
          {SUPPLEMENTS.map((s) => {
            const done = getHabit(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.suppRow, done && styles.suppRowDone]}
                onPress={() => {
                  console.log('[GlowUp] Supplement toggled:', s.label);
                  toggleHabit(s.id, s.xp, s.label);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.suppCheck, done && styles.suppCheckDone]}>
                  {done ? <Text style={styles.suppCheckMark}>✓</Text> : null}
                </View>
                <Text style={[styles.suppLabel, done && styles.suppLabelDone]} numberOfLines={1}>{s.label}</Text>
                <Text style={styles.suppTime}>{s.time}</Text>
                <Text style={styles.suppXP}>
                  {'+'}
                  {s.xp}
                </Text>
              </TouchableOpacity>
            );
          })}
          {SUPPLEMENTS.every((s) => getHabit(s.id)) ? (
            <View style={styles.allDoneBanner}>
              <Text style={styles.allDoneBannerText}>✓ All supplements taken!</Text>
            </View>
          ) : null}
        </SectionCard>

        {/* ── SECTION 8: SKINCARE + FACIAL ── */}
        <SectionCard title="🧴 SKINCARE + FACIAL PROTOCOL" defaultOpen={false} accentColor={COLORS.gold}>
          <Text style={styles.subCardTitle}>SKINCARE ROUTINE</Text>
          {SKINCARE_ITEMS.map((item, i) => {
            const id = `skincare_item_${i}`;
            const done = getHabit(id);
            return (
              <TouchableOpacity
                key={id}
                style={styles.habitRow}
                onPress={() => {
                  console.log('[GlowUp] Skincare item toggled:', item);
                  toggleHabit(id, 0, item);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.habitCheck, done && styles.habitCheckDone]}>
                  {done ? <Text style={styles.habitCheckMark}>✓</Text> : null}
                </View>
                <Text style={[styles.habitLabel, done && styles.habitLabelDone]} numberOfLines={2}>{item}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.completeBtn, getHabit('skincare') && styles.completeBtnDone]}
            onPress={() => {
              console.log('[GlowUp] Skincare done button pressed');
              toggleHabit('skincare', 10, 'Skincare');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>{getHabit('skincare') ? '✓ SKINCARE DONE' : 'DONE +10 XP'}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <Text style={styles.subCardTitle}>FACIAL FASCIAL RELEASE</Text>
          {FACIAL_STEPS.map((step, i) => {
            const id = `facial_step_${i}`;
            const done = getHabit(id);
            return (
              <TouchableOpacity
                key={id}
                style={styles.habitRow}
                onPress={() => {
                  console.log('[GlowUp] Facial step toggled:', i + 1);
                  toggleHabit(id, 0, `Facial step ${i + 1}`);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.stepNumber, done && styles.stepNumberDone]}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[styles.habitLabel, done && styles.habitLabelDone]} numberOfLines={3}>{step}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.completeBtn, getHabit('facial') && styles.completeBtnDone]}
            onPress={() => {
              console.log('[GlowUp] Facial done button pressed');
              toggleHabit('facial', 15, 'Facial Fascial Release');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>{getHabit('facial') ? '✓ FACIAL DONE' : 'DONE +15 XP'}</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── SECTION 9: HEIGHT MAXING ── */}
        <SectionCard title="📏 HEIGHT MAXING DASHBOARD" defaultOpen={false} accentColor={COLORS.gold}>
          {HEIGHT_HABITS.map((h) => (
            <HabitRow
              key={h.id}
              label={h.label}
              xp={h.xp}
              checked={getHabit(h.id)}
              onPress={() => toggleHabit(h.id, h.xp, h.label)}
            />
          ))}
          <TouchableOpacity
            style={styles.deadHangBtn}
            onPress={() => {
              console.log('[GlowUp] Dead hang timer button pressed');
              setHangModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.deadHangBtnText}>🏋️ DEAD HANG TIMER</Text>
            <Text style={styles.deadHangBtnSub}>60 sec • +15 XP</Text>
          </TouchableOpacity>

          {(dow === 3 || dow === 6) ? (
            <View style={styles.sprintCard}>
              <Text style={styles.sprintTitle}>⚡ SPRINT FAST PROTOCOL</Text>
              {['6 x 40m sprints at 90% effort', 'Rest 90 sec between sprints', 'Walk back to start each time'].map((line, i) => (
                <Text key={i} style={styles.sprintLine} numberOfLines={2}>
                  {'• '}
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </SectionCard>

        {/* ── SECTION 10: GROCERY LIST ── */}
        <SectionCard
          title="🛒 WEEKLY GROCERY LIST"
          defaultOpen={false}
          rightBadge={`${groceryDone}/${groceryTotal}`}
          accentColor={COLORS.green}
        >
          <View style={styles.groceryHeader}>
            <Text style={styles.groceryWeek}>{currentWeek}</Text>
            <Text style={styles.groceryReminder}>Restock Sunday</Text>
          </View>
          <View style={styles.groceryProgressRow}>
            <View style={styles.groceryTrack}>
              <View style={[styles.groceryFill, { width: `${groceryTotal > 0 ? Math.round((groceryDone / groceryTotal) * 100) : 0}%` }]} />
            </View>
            <Text style={styles.groceryPct}>
              {groceryTotal > 0 ? Math.round((groceryDone / groceryTotal) * 100) : 0}
              {'%'}
            </Text>
          </View>

          {!groceryGenerated ? (
            <TouchableOpacity style={styles.generateBtn} onPress={generateGrocery} activeOpacity={0.8}>
              <Text style={styles.generateBtnText}>GENERATE LIST</Text>
            </TouchableOpacity>
          ) : (
            <>
              {GROCERY_CATEGORIES.map((cat) => (
                <View key={cat.name} style={styles.groceryCat}>
                  <TouchableOpacity
                    style={styles.groceryCatHeader}
                    onPress={() => {
                      console.log('[GlowUp] Grocery category toggled:', cat.name);
                      setExpandedCategories((prev) => ({ ...prev, [cat.name]: !prev[cat.name] }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.groceryCatName} numberOfLines={1}>{cat.name}</Text>
                    <Text style={styles.groceryCatCount}>
                      {cat.items.filter((i) => !!grocery[i]).length}
                      {'/'}
                      {cat.items.length}
                    </Text>
                    <Text style={styles.chevron}>{expandedCategories[cat.name] ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {expandedCategories[cat.name] ? (
                    <View style={styles.groceryCatBody}>
                      {cat.items.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.groceryItem}
                          onPress={() => toggleGrocery(item)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.habitCheck, grocery[item] ? styles.habitCheckDone : undefined]}>
                            {grocery[item] ? <Text style={styles.habitCheckMark}>✓</Text> : null}
                          </View>
                          <Text style={[styles.groceryItemText, grocery[item] ? styles.groceryItemDone : undefined]} numberOfLines={2}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
              {groceryDone === groceryTotal && groceryTotal > 0 ? (
                <View style={styles.allDoneBanner}>
                  <Text style={styles.allDoneBannerText}>🛒 All groceries checked! +25 XP</Text>
                </View>
              ) : null}
            </>
          )}
        </SectionCard>

        {/* ── SECTION 11: GLOW UP STREAK + LEVELS ── */}
        <SectionCard title="🌟 GLOW UP STREAK + LEVELS" defaultOpen={false} accentColor={COLORS.gold}>
          <View style={styles.streakRow}>
            <Animated.Text style={[styles.streakFlame, { opacity: flameAnim }]}>🔥</Animated.Text>
            <View>
              <Text style={styles.streakCount}>{glowStreak}</Text>
              <Text style={styles.streakLabel}>DAY STREAK</Text>
            </View>
            {state.glowUpStreakShield ? (
              <View style={styles.shieldBadge}>
                <Text style={styles.shieldText}>🛡 SHIELD ACTIVE</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.levelProgressRow}>
            <Text style={styles.levelProgressLabel}>
              {glowLevel.emoji}
              {' '}
              {glowLevel.label.toUpperCase()}
            </Text>
            {nextGlowLevel ? (
              <Text style={styles.levelProgressNext}>
                {'→ '}
                {nextGlowLevel.label}
              </Text>
            ) : null}
          </View>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${Math.round(levelProgress * 100)}%` }]} />
          </View>
          <Text style={styles.levelXPText}>
            {state.xp}
            {' / '}
            {nextGlowLevel ? nextGlowLevel.min : '∞'}
            {' XP'}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            {GLOW_LEVELS.map((l) => {
              const isCurrentLevel = l.label === glowLevel.label;
              const isUnlocked = state.xp >= l.min;
              return (
                <View
                  key={l.label}
                  style={[
                    styles.levelPill,
                    isCurrentLevel && styles.levelPillCurrent,
                    !isUnlocked && styles.levelPillLocked,
                  ]}
                >
                  <Text style={styles.levelPillEmoji}>{l.emoji}</Text>
                  <Text style={[styles.levelPillLabel, isCurrentLevel && styles.levelPillLabelCurrent]} numberOfLines={1}>{l.label}</Text>
                  <Text style={styles.levelPillXP}>
                    {l.min}
                    {'+'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </SectionCard>

        {/* ── SECTION 12: PERFECT DAY BONUS ── */}
        <SectionCard title="⭐ PERFECT DAY BONUS" defaultOpen={false} accentColor={COLORS.goldBright}>
          <View style={styles.pillarsRow}>
            {pillars.map((p) => {
              const done = getHabit(p.id);
              return (
                <View key={p.id} style={[styles.pillarCard, done && styles.pillarCardDone]}>
                  <Text style={styles.pillarEmoji}>{p.emoji}</Text>
                  <Text style={[styles.pillarLabel, done && styles.pillarLabelDone]} numberOfLines={1}>{p.label}</Text>
                  {done ? <Text style={styles.pillarCheck}>✓</Text> : <Text style={styles.pillarPending}>○</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.perfectProgressRow}>
            <Text style={styles.perfectProgressText}>
              {pillarsDone}
              {'/5'}
              {pillarsDone >= 4 ? ' — SO CLOSE!' : pillarsDone === 5 ? ' — PERFECT!' : ''}
            </Text>
          </View>
          <View style={styles.perfectTrack}>
            <View style={[styles.perfectFill, { width: `${Math.round((pillarsDone / 5) * 100)}%` }]} />
          </View>

          {pillarsDone === 5 && !perfectDayDone ? (
            <Animated.View style={{ opacity: pulseAnim }}>
              <TouchableOpacity
                style={styles.claimPerfectBtn}
                onPress={() => {
                  console.log('[GlowUp] Perfect day claimed!');
                  toggleHabit('perfect_day', 50, 'Perfect Day');
                  showToast('🌟 PERFECT DAY! +50 XP', true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.claimPerfectText}>CLAIM PERFECT DAY +50 XP</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : perfectDayDone ? (
            <View style={styles.allDoneBanner}>
              <Text style={styles.allDoneBannerText}>🌟 Perfect Day Claimed! +50 XP</Text>
            </View>
          ) : null}
        </SectionCard>

        {/* ── SECTION 14: DEBLOAT PROTOCOL ── */}
        <SectionCard
          title="🌿 DEBLOAT PROTOCOL"
          defaultOpen={false}
          rightBadge={`${DEBLOAT_HABITS.filter((h) => getHabit(h.id)).length}/${DEBLOAT_HABITS.length}`}
          accentColor={COLORS.green}
        >
          {DEBLOAT_HABITS.map((h) => {
            const done = getHabit(h.id);
            return (
              <TouchableOpacity
                key={h.id}
                style={[styles.suppRow, done && styles.suppRowDone]}
                onPress={() => {
                  console.log('[GlowUp] Debloat habit toggled:', h.label);
                  toggleHabit(h.id, h.xp, h.label);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.suppCheck, done && styles.suppCheckDone]}>
                  {done ? <Text style={styles.suppCheckMark}>✓</Text> : null}
                </View>
                <Text style={styles.debloatEmoji}>{h.emoji}</Text>
                <Text style={[styles.suppLabel, done && styles.suppLabelDone]} numberOfLines={2}>{h.label}</Text>
                <Text style={styles.suppXP}>
                  {'+'}
                  {h.xp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        {/* ── EVENING ROUTINE ── */}
        <SectionCard title="🌙 EVENING ROUTINE" defaultOpen={false} rightBadge="+15 XP" accentColor={COLORS.blue}>
          {EVENING_STEPS.map((step, i) => {
            const id = `evening_step_${i}`;
            const done = getHabit(id);
            return (
              <TouchableOpacity
                key={id}
                style={styles.habitRow}
                onPress={() => {
                  console.log('[GlowUp] Evening step toggled:', i + 1);
                  toggleHabit(id, 0, `Evening step ${i + 1}`);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.stepNumber, done && styles.stepNumberDone]}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={[styles.habitLabel, done && styles.habitLabelDone]} numberOfLines={2}>{step}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.completeBtn, getHabit('evening') && styles.completeBtnDone]}
            onPress={() => {
              console.log('[GlowUp] Evening routine complete button pressed');
              toggleHabit('evening', 15, 'Evening Routine');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.completeBtnText}>{getHabit('evening') ? '✓ EVENING DONE' : 'COMPLETE EVENING +15 XP'}</Text>
          </TouchableOpacity>
        </SectionCard>

        {/* ── POSTURE CHECK ── */}
        <SectionCard title="🧍 POSTURE CHECK" defaultOpen={false} accentColor={COLORS.gold}>
          {POSTURE_ITEMS.map((item) => (
            <HabitRow
              key={item.id}
              label={item.label}
              xp={item.xp}
              checked={getHabit(item.id)}
              onPress={() => toggleHabit(item.id, item.xp, item.label)}
            />
          ))}
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 3,
  },
  xpChip: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  xpChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.goldBright,
  },

  // Hero Card
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 2,
  },
  heroDay: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
  },
  heroDate: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1,
  },
  heroDayCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  heroRings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  heroLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  heroLevelEmoji: {
    fontSize: 16,
  },
  heroLevelLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 1,
  },
  heroLevelNext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  heroLevelTrack: {
    height: 6,
    backgroundColor: COLORS.surface3,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  heroLevelFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 3,
  },
  heroLevelXP: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  perfectBanner: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border2,
    marginTop: 4,
  },
  perfectBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldBright,
    letterSpacing: 1.5,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    letterSpacing: 0.5,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  badge: {
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
  },
  chevron: {
    fontSize: 11,
    color: COLORS.gold,
  },

  // Weekly schedule
  weekPill: {
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 60,
  },
  weekPillToday: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
  },
  weekPillPast: {
    opacity: 0.5,
  },
  weekPillDay: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  weekPillDayToday: {
    color: COLORS.gold,
  },
  weekPillEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  weekPillType: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  weekPillTypeToday: {
    color: COLORS.goldBright,
  },
  weekPillXP: {
    fontSize: 9,
    color: COLORS.gold,
    fontWeight: '700',
  },

  // Mission Card
  missionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  missionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  missionXPBadge: {
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  missionXPText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldBright,
  },
  missionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  missionEmoji: {
    fontSize: 40,
  },
  missionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  missionDow: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  missionBtn: {
    marginHorizontal: 16,
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  missionBtnDone: {
    backgroundColor: COLORS.surface3,
  },
  missionBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1.5,
  },
  missionAlsoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  missionPills: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  missionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  missionPillDone: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.border2,
  },
  missionPillEmoji: {
    fontSize: 14,
  },
  missionPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    flex: 1,
  },
  missionPillLabelDone: {
    color: COLORS.gold,
  },
  missionPillCheck: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: '800',
  },

  // Habit Rings Grid
  ringsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  ringWrapper: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 4,
  },
  ringOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  ringDone: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldMuted,
  },
  ringUndone: {
    borderColor: COLORS.border2,
    backgroundColor: 'transparent',
  },
  ringEmoji: {
    fontSize: 22,
  },
  ringName: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
    textAlign: 'center',
  },
  ringXP: {
    fontSize: 10,
    color: COLORS.gold,
    fontWeight: '700',
    marginTop: 4,
  },

  // Habit Row
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  habitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  habitCheckDone: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  habitCheckMark: {
    fontSize: 11,
    color: COLORS.bg,
    fontWeight: '900',
  },
  habitLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  habitLabelDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  xpBadge: {
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  xpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gold,
  },

  // Training
  trainingTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border2,
    marginBottom: 12,
  },
  trainingTypeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 1,
  },
  trainingBlock: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
    marginBottom: 8,
    paddingLeft: 12,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  trainingBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 10,
  },
  trainingBlockName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  trainingBlockRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainingBlockXP: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
  },
  trainingBlockChevron: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  trainingBlockBody: {
    paddingBottom: 10,
    paddingRight: 10,
  },
  trainingExercise: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingVertical: 2,
    lineHeight: 18,
  },
  logWorkoutBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  logWorkoutBtnDone: {
    backgroundColor: COLORS.surface3,
  },
  logWorkoutText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1,
  },

  // Body Unlock
  bodyUnlockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bodyUnlockTime: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
  },
  bodyUnlockSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  areaPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  areaPillActive: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
  },
  areaPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  areaPillTextActive: {
    color: COLORS.gold,
  },
  areaInstructions: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  areaInstructionsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
    marginBottom: 6,
  },
  areaInstructionsText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  completeBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  completeBtnDone: {
    backgroundColor: COLORS.surface3,
  },
  completeBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1,
  },

  // Macro Bar
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  macroLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  macroEmoji: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  macroTrack: {
    height: 6,
    backgroundColor: COLORS.surface3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.goldMuted,
    borderWidth: 1,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  macroAddBtnDone: {
    backgroundColor: COLORS.gold,
  },
  macroAddText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gold,
    lineHeight: 22,
  },

  // Supplements
  suppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suppRowDone: {
    opacity: 0.7,
  },
  suppCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  suppCheckDone: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  suppCheckMark: {
    fontSize: 11,
    color: COLORS.bg,
    fontWeight: '900',
  },
  suppLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  suppLabelDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  suppTime: {
    fontSize: 14,
    width: 22,
    textAlign: 'center',
  },
  suppXP: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
    width: 28,
    textAlign: 'right',
  },
  debloatEmoji: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },

  // All done banner
  allDoneBanner: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  allDoneBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.goldBright,
  },

  // Skincare / Facial
  subCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberDone: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.text,
  },

  // Height / Dead Hang
  deadHangBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  deadHangBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
  deadHangBtnSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  sprintCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
  },
  sprintTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sprintLine: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingVertical: 2,
  },

  // Grocery
  groceryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groceryWeek: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  groceryReminder: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  groceryProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  groceryTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  groceryFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  groceryPct: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
    width: 36,
    textAlign: 'right',
  },
  generateBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1,
  },
  groceryCat: {
    marginBottom: 4,
  },
  groceryCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  groceryCatName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  groceryCatCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  groceryCatBody: {
    paddingLeft: 8,
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groceryItemText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  groceryItemDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },

  // Streak / Levels
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  streakFlame: {
    fontSize: 36,
  },
  streakCount: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.gold,
    lineHeight: 40,
  },
  streakLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
  },
  shieldBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  shieldText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
  },
  levelProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelProgressLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gold,
  },
  levelProgressNext: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  levelTrack: {
    height: 8,
    backgroundColor: COLORS.surface3,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  levelFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 4,
  },
  levelXPText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  levelPill: {
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
  },
  levelPillCurrent: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  levelPillLocked: {
    opacity: 0.4,
  },
  levelPillEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  levelPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  levelPillLabelCurrent: {
    color: COLORS.gold,
  },
  levelPillXP: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  // Perfect Day
  pillarsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  pillarCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillarCardDone: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.border2,
  },
  pillarEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  pillarLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  pillarLabelDone: {
    color: COLORS.gold,
  },
  pillarCheck: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '900',
  },
  pillarPending: {
    fontSize: 12,
    color: COLORS.border2,
  },
  perfectProgressRow: {
    marginBottom: 6,
  },
  perfectProgressText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  perfectTrack: {
    height: 8,
    backgroundColor: COLORS.surface3,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  perfectFill: {
    height: '100%',
    backgroundColor: COLORS.goldBright,
    borderRadius: 4,
  },
  claimPerfectBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  claimPerfectText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1,
  },

  // Dead Hang Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  timerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timerRingInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDisplay: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  timerPct: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  timerTrack: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surface3,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  timerFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 3,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  modalStartBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalStartText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1,
  },
  modalStopBtn: {
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalStopText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  modalCloseBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Disclaimer
  disclaimerContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  disclaimerScroll: {
    padding: 24,
    alignItems: 'center',
  },
  disclaimerEmoji: {
    fontSize: 48,
    marginBottom: 16,
    marginTop: 24,
  },
  disclaimerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  disclaimerBody: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  disclaimerBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  disclaimerBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1,
  },

  // Locked Screen
  lockedContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  lockedScroll: {
    padding: 24,
    paddingBottom: 48,
  },
  lockedHero: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 16,
  },
  lockedCrown: {
    fontSize: 56,
    marginBottom: 12,
  },
  lockedTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 3,
    marginBottom: 10,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  lockedSocialProof: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  lockedSocialText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    textAlign: 'center',
  },
  lockedFeatures: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lockedFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lockedFeatureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  lockedFeatureText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  lockedCheck: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '900',
  },
  lockedLevels: {
    marginBottom: 28,
  },
  lockedLevelsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  lockedLevelPill: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
  },
  lockedLevelEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  lockedLevelLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  lockedCTA: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  lockedCTAText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  lockedCTASub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
