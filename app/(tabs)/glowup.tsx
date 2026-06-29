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
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/data';
import { useApp } from '@/contexts/AppContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { scheduleGlowUpNotifications } from '@/utils/glowupNotifications';
import { analyzeBody, BodyAnalysisResult } from '@/utils/bodyAnalysis';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getISOWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
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
  if (!dateStr) return 0;
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

const HEIGHT_MORNING_PROTOCOL = [
  'Inversion hang or dead hang: 3 x 60 sec',
  'Cobra pose: 5 x 30 sec',
  'Cat-cow spinal mobilization: 3 x 10 slow reps',
  'Thoracic extension over foam roller: 2 min moving up spine',
  "Child's pose: 3 x 45 sec",
  'Overhead wall reach: 5 x 20 sec',
  'Spinal twist: 30 sec each side',
];

const HEIGHT_MIDDAY_DECOMPRESSION = [
  'Dead hang: 2 x 45 sec',
  'Standing forward fold: 60 sec',
  'Doorway chest opener: 30 sec',
];

const HEIGHT_EVENING_RESET = [
  'Legs up the wall: 5 min',
  'Supine spinal twist: 45 sec each side',
  'Psoas release: 60 sec each side',
  'Diaphragm breathing: 10 deep breaths',
  'Inversion: knees to chest, rock gently 30 sec',
];

const FLAT_FOOT_EXERCISES = [
  { name: 'Short Foot Exercise', sets: '3 x 30 sec each foot', instructions: 'Scrunch toes toward heel without curling them. Creates arch activation.' },
  { name: 'Towel Scrunches', sets: '3 x 20 reps each foot', instructions: 'Place towel on floor, scrunch with toes.' },
  { name: 'Calf Raises (single leg)', sets: '3 x 15 each', instructions: 'Slow eccentric (3 sec down). Builds arch support.' },
  { name: 'Tibialis Anterior Raises', sets: '3 x 20', instructions: 'Stand with back to wall, lift toes up. Balances calf dominance.' },
  { name: 'Arch Doming', sets: '3 x 10 each', instructions: 'Press big toe down, lift other toes, hold 5 sec.' },
  { name: 'Intrinsic Foot Strengthening', sets: 'Daily', instructions: 'Walk barefoot on grass/sand 10 min daily.' },
  { name: 'Plantar Fascia Stretch', sets: '3 x 30 sec each', instructions: 'Pull toes back toward shin.' },
  { name: 'Tennis Ball Roll', sets: '60 sec each foot', instructions: 'Deep tissue release of plantar fascia.' },
  { name: 'Ankle Inversion/Eversion', sets: '3 x 15 each direction', instructions: 'Use resistance band.' },
  { name: 'Balance Board / Single Leg Stand', sets: '3 x 60 sec each foot', instructions: 'Builds proprioception and arch stability.' },
];

const FLAT_FOOT_TIPS = [
  'Wear minimalist shoes or go barefoot at home',
  'Avoid thick-soled shoes that weaken intrinsic muscles',
  'Use arch support insoles only as a bridge, not a crutch',
  'Walk with feet parallel, not turned out',
];

const FASCIAL_HYDRATION_TIPS = [
  'Drink 500ml water immediately on waking',
  'Drink 250ml every 2 hours throughout the day',
  'Fascia is 70% water — dehydration compresses discs',
  'Collagen-supporting foods: bone broth, eggs, citrus, berries, leafy greens',
];

const HGH_TIPS = [
  'Sleep 8–9 hours — 90% of HGH releases during deep sleep',
  'Sprint fasting 2–3x per week — highest natural HGH stimulus',
  'No eating 2–3 hours before bed — fasted sleep maximizes overnight HGH pulse',
  'Cold exposure: cold shower 2–3 min post-workout boosts HGH 200–300%',
  'Zinc + Magnesium before bed — supports HGH release',
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

const ALL_GROCERY_ITEMS = GROCERY_CATEGORIES.flatMap((c) => c.items ?? []);

const GLOW_LEVELS = [
  { label: 'Dormant', emoji: '🪨', min: 0, max: 500, color: '#6B7280', description: 'Your journey begins. Most never start.' },
  { label: 'Awakening', emoji: '🌱', min: 500, max: 1500, color: '#10B981', description: 'The body is listening. Keep going.' },
  { label: 'Rising', emoji: '🔥', min: 1500, max: 3500, color: '#F59E0B', description: 'Momentum is building. You feel it.' },
  { label: 'Forged', emoji: '⚡', min: 3500, max: 7000, color: '#3B82F6', description: 'Discipline is becoming identity.' },
  { label: 'Ascendant', emoji: '🦅', min: 7000, max: 15000, color: '#8B5CF6', description: 'You operate at a level most cannot see.' },
  { label: 'Sovereign', emoji: '👑', min: 15000, max: 30000, color: '#F59E0B', description: 'Rare. Optimized. Unstoppable.' },
  { label: 'Transcendent', emoji: '✨', min: 30000, max: Infinity, color: '#FFFFFF', description: 'You have become the standard.' },
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
  const router = useRouter();

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

  // ── Body analysis ──
  const analysis = useMemo(() => {
    const p = state.profile;
    if (!p?.height || !p?.weight) return null;
    console.log('[GlowUp] Computing body analysis for profile:', p.username);
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

  // ── Rank celebration modal ──
  const [rankCelebration, setRankCelebration] = useState<{ label: string; emoji: string; color: string; description: string } | null>(null);
  const prevGlowLevelRef = useRef(getGlowLevel(state.xp).label);
  useEffect(() => {
    const current = getGlowLevel(state.xp);
    if (current.label !== prevGlowLevelRef.current) {
      console.log('[GlowUp] Rank ascension!', prevGlowLevelRef.current, '->', current.label);
      prevGlowLevelRef.current = current.label;
      setRankCelebration(current);
    }
  }, [state.xp, setRankCelebration]);

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

      {/* ── RANK CELEBRATION MODAL ── */}
      <Modal visible={!!rankCelebration} transparent animationType="fade" onRequestClose={() => setRankCelebration(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: rankCelebration?.color || COLORS.gold }]}>
            <Text style={{ fontSize: 72, marginBottom: 12 }}>{rankCelebration?.emoji}</Text>
            <Text style={styles.rankCelebTitle}>YOU'VE ASCENDED</Text>
            <Text style={[styles.rankCelebRank, { color: rankCelebration?.color || COLORS.gold }]}>{rankCelebration?.label?.toUpperCase()}</Text>
            <Text style={styles.rankCelebDesc}>{rankCelebration?.description}</Text>
            <TouchableOpacity
              style={[styles.modalStartBtn, { backgroundColor: rankCelebration?.color || COLORS.gold, marginTop: 20 }]}
              onPress={() => {
                console.log('[GlowUp] Rank celebration dismissed:', rankCelebration?.label);
                setRankCelebration(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalStartText}>CONTINUE ASCENDING →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            {daysSince === 0 ? '—' : daysSince}
            {' OF YOUR ASCENSION'}
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
            <View style={[styles.heroLevelBadge, { borderColor: glowLevel.color || COLORS.gold, backgroundColor: `${glowLevel.color || COLORS.gold}22` }]}>
              <Text style={styles.heroLevelEmoji}>{glowLevel.emoji}</Text>
              <Text style={[styles.heroLevelLabel, { color: glowLevel.color || COLORS.gold }]}>{glowLevel.label.toUpperCase()}</Text>
            </View>
            {nextGlowLevel ? (
              <Text style={styles.heroLevelNext}>
                {'→ '}
                {nextGlowLevel.label}
              </Text>
            ) : null}
          </View>

          <View style={styles.heroLevelTrack}>
            <View style={[styles.heroLevelFill, { width: `${Math.round(levelProgress * 100)}%`, backgroundColor: glowLevel.color || COLORS.gold }]} />
          </View>
          <Text style={styles.heroLevelXP}>
            {state.xp}
            {' / '}
            {nextGlowLevel ? nextGlowLevel.min : glowLevel.min}
            {' XP  •  '}
            {nextGlowLevel ? (nextGlowLevel.min - state.xp) + ' XP to ' + nextGlowLevel.label : 'MAX RANK'}
          </Text>
          <Text style={[styles.heroLevelXP, { fontStyle: 'italic', marginTop: 4, color: glowLevel.color || COLORS.textSecondary }]} numberOfLines={2}>{glowLevel.description}</Text>

          {isPerfectDayInReach ? (
            <Animated.View style={[styles.perfectBanner, { opacity: pulseAnim }]}>
              <Text style={styles.perfectBannerText}>⚡ PERFECT DAY IN REACH</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* ── FACIAL ANALYSIS BUTTON ── */}
        <TouchableOpacity
          style={styles.facialAnalysisCard}
          onPress={() => {
            console.log('[GlowUp] Facial Analysis button pressed');
            router.push('/facial-analysis');
          }}
          activeOpacity={0.85}
        >
          <View style={styles.facialAnalysisLeft}>
            <Text style={styles.facialAnalysisEmoji}>🔬</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.facialAnalysisTitle}>Facial Analysis</Text>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>
              <Text style={styles.facialAnalysisSub} numberOfLines={1}>Symmetry • Jawline • Skin • Harmony</Text>
            </View>
          </View>
          <Text style={styles.facialAnalysisArrow}>→</Text>
        </TouchableOpacity>

        {/* ── BODY ANALYSIS ── */}
        <BodyAnalysisSection analysis={analysis} bf={state.profile?.bf || 15} router={router} />

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
              if (!getHabit('training_logged') && trainingDay.type !== 'Rest' && trainingDay.type !== 'Recovery') {
                const allExercises = trainingDay.blocks.flatMap((b) => b.exercises);
                const parsed = allExercises
                  .filter((ex) => ex.includes(':'))
                  .map((ex) => {
                    const name = ex.split(':')[0].trim();
                    const setsMatch = ex.match(/(\d+)\s*x/i);
                    const numSets = setsMatch ? parseInt(setsMatch[1], 10) : 3;
                    return {
                      exercise: name,
                      sets: Array.from({ length: numSets }, () => ({ reps: '', weight: '' })),
                    };
                  });
                if (parsed.length > 0) {
                  console.log('[GlowUp] Pre-loading tracker with', parsed.length, 'exercises');
                  updateState({ session: parsed });
                  router.push('/(tabs)/tracker');
                  return;
                }
              }
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
        <HeightMaxingSection
          getHabit={getHabit}
          toggleHabit={toggleHabit}
          setHangModalVisible={setHangModalVisible}
          dow={dow}
        />

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
              const rankColor = l.color;
              return (
                <View
                  key={l.label}
                  style={[
                    styles.levelPill,
                    isCurrentLevel && { borderColor: rankColor, backgroundColor: `${rankColor}22`, shadowColor: rankColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
                    !isUnlocked && styles.levelPillLocked,
                  ]}
                >
                  <Text style={styles.levelPillEmoji}>{l.emoji}</Text>
                  <Text style={[styles.levelPillLabel, isCurrentLevel && { color: rankColor }]} numberOfLines={1}>{l.label}</Text>
                  <Text style={[styles.levelPillXP, isUnlocked && { color: rankColor }]}>
                    {l.min}
                    {'+'}
                  </Text>
                  {isCurrentLevel ? <Text style={{ fontSize: 8, color: rankColor, fontWeight: '800', marginTop: 2 }}>CURRENT</Text> : null}
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

        {/* ── LIFESTYLE OPTIMIZATION ── */}
        <LifestyleSection />

        {/* ── CLEAN BODY CARE ── */}
        <BodyCareSection />

        {/* ── PRODUCTIVITY SYSTEM ── */}
        <ProductivitySection />

        {/* ── LOOKSMAXING ── */}
        <LooksmaxingSection />

        {/* ── LIFESTYLE INTELLIGENCE ── */}
        <LifestyleIntelligenceSection />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Body Analysis Section ────────────────────────────────────────────────────

function getBmiColor(category: string): string {
  if (category === 'Normal') return COLORS.green;
  if (category === 'Underweight') return COLORS.blue;
  if (category === 'Overweight') return '#F59E0B';
  return COLORS.red;
}

function getWthColor(category: string): string {
  if (category === 'Healthy' || category === 'Extremely Slim') return COLORS.green;
  if (category === 'Overweight') return '#F59E0B';
  return COLORS.red;
}

const FFMI_TIERS = [
  { label: 'Below Average', range: '< 18' },
  { label: 'Average', range: '18–20' },
  { label: 'Above Average', range: '20–22' },
  { label: 'Excellent', range: '22–24' },
  { label: 'Superior', range: '24–26' },
  { label: 'Elite / Near Genetic Limit', range: '26+' },
];

function BodyAnalysisSection({
  analysis,
  bf,
  router,
}: {
  analysis: BodyAnalysisResult | null;
  bf: number;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    console.log('[GlowUp] Body Analysis section toggled:', !open ? 'open' : 'closed');
    setOpen((v) => !v);
  }, [open]);

  const handleUpdateMeasurements = useCallback(() => {
    console.log('[GlowUp] Update Measurements button pressed');
    router.push('/survey');
  }, [router]);

  if (!analysis) {
    return (
      <View style={glowStyles.card}>
        <TouchableOpacity style={glowStyles.cardHeader} onPress={handleToggle} activeOpacity={0.7}>
          <View style={glowStyles.cardHeaderLeft}>
            <View style={glowStyles.goldAccent} />
            <Text style={glowStyles.cardTitle}>📊 Body Analysis</Text>
          </View>
          <Text style={glowStyles.chevron}>{open ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {open && (
          <View style={glowStyles.cardBody}>
            <View style={bodyStyles.promptCard}>
              <Text style={bodyStyles.promptText}>Complete the survey to unlock your body composition analysis — FFMI, Navy BF%, TDEE, BMI, and more.</Text>
              <TouchableOpacity style={bodyStyles.updateBtn} onPress={handleUpdateMeasurements} activeOpacity={0.8}>
                <Text style={bodyStyles.updateBtnText}>Complete Survey →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  const bmiColor = getBmiColor(analysis.bmiCategory);
  const wthColor = getWthColor(analysis.waistToHeightCategory);
  const tdeeEntries = Object.entries(analysis.tdee);
  const weightToGoalAbs = Math.abs(analysis.weightToGoal);
  const weightToGoalText =
    analysis.weightToGoal > 0
      ? `You are ${weightToGoalAbs} lbs above ideal range`
      : analysis.weightToGoal < 0
      ? `You are ${weightToGoalAbs} lbs below ideal range`
      : '✓ You are within your ideal weight range';
  const weightToGoalColor =
    analysis.weightToGoal === 0 ? COLORS.green :
    Math.abs(analysis.weightToGoal) < 10 ? '#F59E0B' : COLORS.red;

  return (
    <View style={glowStyles.card}>
      <TouchableOpacity style={glowStyles.cardHeader} onPress={handleToggle} activeOpacity={0.7}>
        <View style={glowStyles.cardHeaderLeft}>
          <View style={glowStyles.goldAccent} />
          <Text style={glowStyles.cardTitle}>📊 Body Analysis</Text>
        </View>
        <Text style={glowStyles.chevron}>{open ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={glowStyles.cardBody}>
          {/* Row 1 — 2x2 key metrics */}
          <View style={bodyStyles.metricsGrid}>
            <View style={bodyStyles.metricCard}>
              <Text style={bodyStyles.metricLabel}>HEIGHT</Text>
              <Text style={bodyStyles.metricValue} numberOfLines={1}>{analysis.heightDisplay}</Text>
            </View>
            <View style={bodyStyles.metricCard}>
              <Text style={bodyStyles.metricLabel}>BODY FAT</Text>
              <Text style={bodyStyles.metricValue} numberOfLines={1}>
                {bf}
                {'% '}
              </Text>
              <Text style={bodyStyles.metricSub} numberOfLines={1}>{analysis.bfCategory}</Text>
            </View>
            <View style={bodyStyles.metricCard}>
              <Text style={bodyStyles.metricLabel}>LEAN MASS</Text>
              <Text style={bodyStyles.metricValue} numberOfLines={1}>
                {analysis.leanMass}
                {' lbs'}
              </Text>
            </View>
            <View style={bodyStyles.metricCard}>
              <Text style={bodyStyles.metricLabel}>FFMI</Text>
              <Text style={[bodyStyles.metricValue, { color: COLORS.gold }]} numberOfLines={1}>{analysis.ffmiNormalized}</Text>
              <Text style={bodyStyles.metricSub} numberOfLines={1}>{analysis.ffmiCategory}</Text>
            </View>
          </View>

          {/* Row 2 — BMI */}
          <View style={[bodyStyles.infoCard, { borderLeftColor: bmiColor }]}>
            <View style={bodyStyles.infoRow}>
              <Text style={bodyStyles.infoLabel}>BMI</Text>
              <Text style={[bodyStyles.infoValue, { color: bmiColor }]}>
                {analysis.bmi}
                {' — '}
                {analysis.bmiCategory}
              </Text>
            </View>
          </View>

          {/* Row 3 — Navy BF% */}
          <View style={[bodyStyles.infoCard, { borderLeftColor: COLORS.blue }]}>
            <Text style={bodyStyles.infoLabel}>NAVY BODY FAT FORMULA</Text>
            <View style={bodyStyles.infoRow}>
              <Text style={bodyStyles.infoSubLabel}>Navy Formula</Text>
              <Text style={[bodyStyles.infoValue, { color: COLORS.blue }]}>
                {analysis.navyBF}
                {'%'}
              </Text>
            </View>
            <View style={bodyStyles.infoRow}>
              <Text style={bodyStyles.infoSubLabel}>Self-reported</Text>
              <Text style={bodyStyles.infoValue}>
                {bf}
                {'%'}
              </Text>
            </View>
            <Text style={bodyStyles.infoNote}>Uses waist + neck measurements (+ hip for females)</Text>
          </View>

          {/* Row 4 — BMR & TDEE */}
          <View style={[bodyStyles.infoCard, { borderLeftColor: COLORS.gold }]}>
            <Text style={bodyStyles.infoLabel}>BMR & TDEE</Text>
            <View style={bodyStyles.infoRow}>
              <Text style={bodyStyles.infoSubLabel}>Base Metabolic Rate</Text>
              <Text style={[bodyStyles.infoValue, { color: COLORS.gold }]}>
                {analysis.bmr}
                {' kcal/day'}
              </Text>
            </View>
            <View style={bodyStyles.divider} />
            {tdeeEntries.map(([level, cals]) => (
              <View key={level} style={bodyStyles.tdeeRow}>
                <Text style={bodyStyles.tdeeLevel} numberOfLines={1}>{level}</Text>
                <Text style={bodyStyles.tdeeCals}>
                  {cals}
                  {' kcal'}
                </Text>
              </View>
            ))}
          </View>

          {/* Row 5 — Ideal weight */}
          <View style={[bodyStyles.infoCard, { borderLeftColor: COLORS.green }]}>
            <Text style={bodyStyles.infoLabel}>IDEAL WEIGHT RANGE</Text>
            <View style={bodyStyles.infoRow}>
              <Text style={bodyStyles.infoSubLabel}>Devine Formula</Text>
              <Text style={[bodyStyles.infoValue, { color: COLORS.green }]}>
                {analysis.idealWeightLow}
                {'–'}
                {analysis.idealWeightHigh}
                {' lbs'}
              </Text>
            </View>
            <Text style={[bodyStyles.infoNote, { color: weightToGoalColor }]}>{weightToGoalText}</Text>
          </View>

          {/* Row 6 — Waist-to-height */}
          <View style={[bodyStyles.infoCard, { borderLeftColor: wthColor }]}>
            <View style={bodyStyles.infoRow}>
              <Text style={bodyStyles.infoLabel}>WAIST-TO-HEIGHT RATIO</Text>
              <Text style={[bodyStyles.infoValue, { color: wthColor }]}>
                {analysis.waistToHeight}
                {' — '}
                {analysis.waistToHeightCategory}
              </Text>
            </View>
          </View>

          {/* Row 7 — FFMI reference table */}
          <View style={[bodyStyles.infoCard, { borderLeftColor: COLORS.gold }]}>
            <Text style={bodyStyles.infoLabel}>FFMI REFERENCE TABLE</Text>
            {FFMI_TIERS.map((tier) => {
              const isCurrentTier = tier.label === analysis.ffmiCategory;
              return (
                <View
                  key={tier.label}
                  style={[bodyStyles.ffmiRow, isCurrentTier && bodyStyles.ffmiRowActive]}
                >
                  <Text style={[bodyStyles.ffmiTierLabel, isCurrentTier && { color: COLORS.gold }]} numberOfLines={1}>{tier.label}</Text>
                  <Text style={[bodyStyles.ffmiTierRange, isCurrentTier && { color: COLORS.goldBright }]}>{tier.range}</Text>
                  {isCurrentTier ? <Text style={bodyStyles.ffmiYou}>YOU</Text> : null}
                </View>
              );
            })}
          </View>

          {/* Update button */}
          <TouchableOpacity style={bodyStyles.updateBtn} onPress={handleUpdateMeasurements} activeOpacity={0.8}>
            <Text style={bodyStyles.updateBtnText}>📏 Update Measurements</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const bodyStyles = StyleSheet.create({
  promptCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  promptText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    gap: 6,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoSubLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  infoNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  tdeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  tdeeLevel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  tdeeCals: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  ffmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  ffmiRowActive: {
    backgroundColor: `${COLORS.gold}15`,
    borderRadius: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0,
    marginHorizontal: -6,
  },
  ffmiTierLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  ffmiTierRange: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  ffmiYou: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.gold,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    letterSpacing: 1,
  },
  updateBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border2,
    marginTop: 4,
  },
  updateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 0.5,
  },
});

// ─── Lifestyle Section ────────────────────────────────────────────────────────

function LifestyleSection() {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});

  const toggleSub = (key: string) => {
    console.log('[GlowUp] Lifestyle sub-section toggled:', key);
    setOpenSub((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SUB_SECTIONS = [
    {
      key: 'clean_living',
      title: '🧺 Clean Living',
      items: [
        { heading: 'Laundry', body: 'Use fragrance-free, dye-free detergent (Branch Basics or Molly\'s Suds). Wash on cold. Line dry when possible. Avoid dryer sheets — use wool dryer balls with a few drops of lavender essential oil instead. Wash bedsheets weekly.' },
        { heading: 'Dishes', body: 'Use Branch Basics dish soap or castile soap (Dr. Bronner\'s). Avoid antibacterial soaps with triclosan. Run dishwasher on eco mode. Let dishes air dry.' },
        { heading: 'House Cleaning', body: 'Branch Basics All-Purpose Concentrate for all surfaces. Baking soda + white vinegar for drains. Microfiber cloths instead of paper towels. Open windows 10 min daily for air exchange.' },
      ],
    },
    {
      key: 'air_quality',
      title: '🌿 Air Quality',
      items: [
        { heading: 'Best Air-Filtering Plants (NASA Clean Air Study)', body: '• Peace Lily — removes benzene, formaldehyde, trichloroethylene\n• Spider Plant — removes formaldehyde, xylene\n• Snake Plant (Sansevieria) — releases oxygen at night, removes toxins\n• Pothos — removes benzene, formaldehyde\n• Boston Fern — removes formaldehyde, xylene\n• Rubber Plant — removes formaldehyde\n• Bamboo Palm — removes benzene, formaldehyde, trichloroethylene\n\nTip: 1 plant per 100 sq ft for meaningful air filtration.' },
      ],
    },
    {
      key: 'water_quality',
      title: '💧 Water Quality',
      items: [
        { heading: 'Best Reverse Osmosis Filters', body: '#1 Pick: APEC ROES-50 — 5-stage, removes 99% of contaminants, ~$200, under-sink\n\nRunner-up: iSpring RCC7AK — adds alkaline remineralization stage, ~$230\n\nCountertop: Waterdrop D6 — no installation needed, ~$300, great for renters\n\nPitcher: Clearly Filtered — removes 365+ contaminants including fluoride, ~$90\n\nAlways remineralize RO water with a pinch of Himalayan salt or electrolyte drops. Test your tap water first: use a TDS meter (~$15 on Amazon).' },
      ],
    },
    {
      key: 'food_prep',
      title: '🥦 Food Prep',
      items: [
        { heading: 'Clean Produce with Baking Soda', body: '1. Fill a large bowl with cold water\n2. Add 1 tsp baking soda per 2 cups water\n3. Soak produce 12–15 minutes (removes pesticide residue up to 96% per studies)\n4. Rinse thoroughly under cold running water\n5. Pat dry and store\n\nWorks best on: apples, grapes, strawberries, leafy greens, bell peppers.' },
      ],
    },
    {
      key: 'cheat_meals',
      title: '🍔 Cheat Meal Upgrades',
      items: [
        { heading: 'Better Burger', body: 'Grass-fed beef patty, sourdough bun, raw cheese, avocado, mustard, no seed-oil condiments.' },
        { heading: 'Better Pizza', body: 'Sourdough crust, San Marzano tomatoes, fresh mozzarella, olive oil drizzle, fresh basil.' },
        { heading: 'Better Fries', body: 'Russet potatoes, tallow or avocado oil, sea salt, air fryer or oven at 425°F.' },
        { heading: 'Better Ice Cream', body: 'Coconut milk base, raw honey sweetener, vanilla bean — brands: Coconut Bliss, Nada Moo.' },
        { heading: 'Better Pasta', body: 'Sourdough pasta or chickpea pasta, olive oil, garlic, grass-fed butter, parmesan.' },
        { heading: 'Better Chocolate', body: '85%+ dark chocolate — Lindt 90%, Alter Eco, Hu Kitchen.' },
        { heading: 'Better Chips', body: 'Siete grain-free chips (avocado oil), Jackson\'s sweet potato chips (coconut oil).' },
        { heading: 'Better Soda', body: 'Olipop or Poppi (prebiotic), sparkling water + fruit juice, kombucha.' },
      ],
    },
  ];

  return (
    <View style={glowStyles.card}>
      <TouchableOpacity
        style={glowStyles.cardHeader}
        onPress={() => {
          console.log('[GlowUp] Lifestyle Optimization section toggled');
          setOpen((v) => !v);
        }}
        activeOpacity={0.7}
      >
        <View style={glowStyles.cardHeaderLeft}>
          <View style={glowStyles.goldAccent} />
          <Text style={glowStyles.cardTitle}>🏠 Lifestyle Optimization</Text>
        </View>
        <Text style={glowStyles.chevron}>{open ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={glowStyles.cardBody}>
          {SUB_SECTIONS.map((sub) => (
            <View key={sub.key} style={glowStyles.subCard}>
              <TouchableOpacity
                style={glowStyles.subHeader}
                onPress={() => toggleSub(sub.key)}
                activeOpacity={0.7}
              >
                <Text style={glowStyles.subTitle}>{sub.title}</Text>
                <Text style={glowStyles.subChevron}>{openSub[sub.key] ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {openSub[sub.key] && (
                <View style={glowStyles.subBody}>
                  {sub.items.map((item, i) => (
                    <View key={i} style={glowStyles.tipItem}>
                      <Text style={glowStyles.tipHeading}>{item.heading}</Text>
                      <Text style={glowStyles.tipBody}>{item.body}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Body Care Section ────────────────────────────────────────────────────────

function BodyCareSection() {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});

  const toggleSub = (key: string) => {
    console.log('[GlowUp] Body care sub-section toggled:', key);
    setOpenSub((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const CATEGORIES = [
    {
      key: 'shampoo',
      title: '💇 Shampoo & Hair',
      products: [
        { name: 'Prose Custom Shampoo', why: 'Sulfate-free, personalized formula' },
        { name: 'Acure Organics Shampoo', why: 'Clean ingredients, affordable' },
        { name: 'Briogeo Scalp Revival', why: 'Charcoal + tea tree, removes buildup' },
        { name: 'Moroccanoil Treatment', why: 'Argan oil, reduces frizz and breakage' },
      ],
    },
    {
      key: 'body_wash',
      title: '🚿 Body Wash',
      products: [
        { name: "Dr. Bronner's Pure Castile Soap", why: '18-in-1, organic, no synthetics' },
        { name: 'Necessaire The Body Wash', why: 'Niacinamide + AHAs, skin-improving' },
        { name: 'Dove Men+Care Extra Fresh', why: 'Gentle, no harsh sulfates (budget pick)' },
      ],
    },
    {
      key: 'deodorant',
      title: '🌿 Deodorant',
      products: [
        { name: 'Native Deodorant', why: 'Aluminum-free, coconut oil + shea butter' },
        { name: 'Lume Whole Body Deodorant', why: 'Clinically proven 72-hour odor control' },
        { name: "Schmidt's Natural Deodorant", why: 'Baking soda + arrowroot, effective' },
      ],
    },
    {
      key: 'face_wash',
      title: '🧴 Face Wash',
      products: [
        { name: 'CeraVe Hydrating Cleanser', why: 'Ceramides, gentle, dermatologist recommended' },
        { name: 'Cetaphil Gentle Skin Cleanser', why: 'Fragrance-free, non-stripping' },
        { name: "Kiehl's Ultra Facial Cleanser", why: 'Hydrating, for all skin types' },
      ],
    },
    {
      key: 'moisturizer',
      title: '💧 Moisturizer',
      products: [
        { name: 'Tallow & Honey Balm (Santa Cruz Medicinals)', why: 'Bioidentical to skin sebum' },
        { name: 'CeraVe Moisturizing Cream', why: 'Ceramides + hyaluronic acid' },
        { name: 'Neutrogena Hydro Boost', why: 'Water gel, lightweight, non-comedogenic' },
      ],
    },
    {
      key: 'sunscreen',
      title: '☀️ Sunscreen',
      products: [
        { name: 'EltaMD UV Clear SPF 46', why: 'Zinc oxide, niacinamide, dermatologist favorite' },
        { name: 'Supergoop Unseen Sunscreen SPF 40', why: 'Invisible, no white cast' },
        { name: 'Badger Clear Zinc SPF 30', why: 'Mineral, reef-safe, clean ingredients' },
      ],
    },
    {
      key: 'oral',
      title: '🦷 Oral Care',
      products: [
        { name: 'Risewell Hydroxyapatite Toothpaste', why: 'Remineralizes enamel, fluoride-free option' },
        { name: 'Cocofloss', why: 'Coconut oil infused, removes more plaque than regular floss' },
        { name: 'Bite Toothpaste Bits', why: 'Zero-waste, clean ingredients' },
        { name: 'Copper Tongue Scraper', why: 'Removes bacteria, improves breath' },
      ],
    },
    {
      key: 'tools',
      title: '🔧 Tools',
      products: [
        { name: 'Gua Sha Stone (rose quartz or jade)', why: 'Facial lymph drainage' },
        { name: 'Jade Roller', why: 'Reduces puffiness, improves circulation' },
        { name: 'Derma Roller 0.25mm', why: 'Stimulates collagen (weekly use only)' },
        { name: 'Red Light Therapy Device (Joovv Go or Mito Red)', why: 'Skin rejuvenation, collagen' },
      ],
    },
  ];

  return (
    <View style={glowStyles.card}>
      <TouchableOpacity
        style={glowStyles.cardHeader}
        onPress={() => {
          console.log('[GlowUp] Clean Body Care section toggled');
          setOpen((v) => !v);
        }}
        activeOpacity={0.7}
      >
        <View style={glowStyles.cardHeaderLeft}>
          <View style={glowStyles.goldAccent} />
          <Text style={glowStyles.cardTitle}>🚿 Clean Body Care</Text>
        </View>
        <Text style={glowStyles.chevron}>{open ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={glowStyles.cardBody}>
          {CATEGORIES.map((cat) => (
            <View key={cat.key} style={glowStyles.subCard}>
              <TouchableOpacity
                style={glowStyles.subHeader}
                onPress={() => toggleSub(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={glowStyles.subTitle}>{cat.title}</Text>
                <Text style={glowStyles.subChevron}>{openSub[cat.key] ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {openSub[cat.key] && (
                <View style={glowStyles.subBody}>
                  {cat.products.map((p, i) => (
                    <View key={i} style={glowStyles.productRow}>
                      <Text style={glowStyles.productName}>{p.name}</Text>
                      <Text style={glowStyles.productWhy}>{p.why}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Height Maxing Section ────────────────────────────────────────────────────

function HeightMaxingSection({
  getHabit,
  toggleHabit,
  setHangModalVisible,
  dow,
}: {
  getHabit: (id: string) => boolean;
  toggleHabit: (id: string, xp: number, label: string) => void;
  setHangModalVisible: (v: boolean) => void;
  dow: number;
}) {
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});
  const toggleSub = (key: string) => {
    console.log('[GlowUp] Height sub-section toggled:', key);
    setOpenSub((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={glowStyles.card}>
      <TouchableOpacity
        style={glowStyles.cardHeader}
        onPress={() => toggleSub('main')}
        activeOpacity={0.7}
      >
        <View style={glowStyles.cardHeaderLeft}>
          <View style={glowStyles.goldAccent} />
          <Text style={glowStyles.cardTitle}>📏 Height Maxing System</Text>
        </View>
        <Text style={glowStyles.chevron}>{openSub['main'] ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {openSub['main'] && (
        <View style={glowStyles.cardBody}>
          {/* Daily habits */}
          {HEIGHT_HABITS.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={[glowStyles.habitRowInline, getHabit(h.id) && glowStyles.habitRowInlineDone]}
              onPress={() => {
                console.log('[GlowUp] Height habit toggled:', h.label);
                toggleHabit(h.id, h.xp, h.label);
              }}
              activeOpacity={0.7}
            >
              <View style={[glowStyles.inlineCheck, getHabit(h.id) && glowStyles.inlineCheckDone]}>
                {getHabit(h.id) ? <Text style={glowStyles.inlineCheckMark}>✓</Text> : null}
              </View>
              <Text style={[glowStyles.inlineLabel, getHabit(h.id) && glowStyles.inlineLabelDone]} numberOfLines={2}>{h.label}</Text>
              {h.xp > 0 ? <Text style={glowStyles.inlineXP}>{'+' + h.xp}</Text> : null}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={glowStyles.deadHangBtn}
            onPress={() => {
              console.log('[GlowUp] Dead hang timer button pressed');
              setHangModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={glowStyles.deadHangBtnText}>🏋️ DEAD HANG TIMER</Text>
            <Text style={glowStyles.deadHangBtnSub}>60 sec • +15 XP</Text>
          </TouchableOpacity>

          {/* Morning Protocol */}
          <View style={glowStyles.subCard}>
            <TouchableOpacity style={glowStyles.subHeader} onPress={() => toggleSub('morning')} activeOpacity={0.7}>
              <Text style={glowStyles.subTitle}>🌅 Morning Protocol (15 min)</Text>
              <Text style={glowStyles.subChevron}>{openSub['morning'] ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {openSub['morning'] && (
              <View style={glowStyles.subBody}>
                {HEIGHT_MORNING_PROTOCOL.map((ex, i) => (
                  <Text key={i} style={glowStyles.tipBody}>{'• ' + ex}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Midday Decompression */}
          <View style={glowStyles.subCard}>
            <TouchableOpacity style={glowStyles.subHeader} onPress={() => toggleSub('midday')} activeOpacity={0.7}>
              <Text style={glowStyles.subTitle}>☀️ Midday Decompression (5 min)</Text>
              <Text style={glowStyles.subChevron}>{openSub['midday'] ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {openSub['midday'] && (
              <View style={glowStyles.subBody}>
                {HEIGHT_MIDDAY_DECOMPRESSION.map((ex, i) => (
                  <Text key={i} style={glowStyles.tipBody}>{'• ' + ex}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Evening Reset */}
          <View style={glowStyles.subCard}>
            <TouchableOpacity style={glowStyles.subHeader} onPress={() => toggleSub('evening_height')} activeOpacity={0.7}>
              <Text style={glowStyles.subTitle}>🌙 Evening Spinal Reset (10 min)</Text>
              <Text style={glowStyles.subChevron}>{openSub['evening_height'] ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {openSub['evening_height'] && (
              <View style={glowStyles.subBody}>
                {HEIGHT_EVENING_RESET.map((ex, i) => (
                  <Text key={i} style={glowStyles.tipBody}>{'• ' + ex}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Flat Foot Correction */}
          <View style={glowStyles.subCard}>
            <TouchableOpacity style={glowStyles.subHeader} onPress={() => toggleSub('flatfoot')} activeOpacity={0.7}>
              <Text style={glowStyles.subTitle}>🦶 Flat Foot & Arch Restoration</Text>
              <Text style={glowStyles.subChevron}>{openSub['flatfoot'] ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {openSub['flatfoot'] && (
              <View style={glowStyles.subBody}>
                <Text style={glowStyles.tipHeading}>Flat feet compress your spine and steal 0.5–1 inch of visible height. Fix them.</Text>
                {FLAT_FOOT_EXERCISES.map((ex, i) => (
                  <View key={i} style={glowStyles.tipItem}>
                    <Text style={glowStyles.tipHeading}>{ex.name} — {ex.sets}</Text>
                    <Text style={glowStyles.tipBody}>{ex.instructions}</Text>
                  </View>
                ))}
                <Text style={[glowStyles.tipHeading, { marginTop: 8 }]}>Lifestyle Tips</Text>
                {FLAT_FOOT_TIPS.map((tip, i) => (
                  <Text key={i} style={glowStyles.tipBody}>{'• ' + tip}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Fascial Hydration */}
          <View style={glowStyles.subCard}>
            <TouchableOpacity style={glowStyles.subHeader} onPress={() => toggleSub('fascial_hydration')} activeOpacity={0.7}>
              <Text style={glowStyles.subTitle}>💧 Fascial Hydration Protocol</Text>
              <Text style={glowStyles.subChevron}>{openSub['fascial_hydration'] ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {openSub['fascial_hydration'] && (
              <View style={glowStyles.subBody}>
                {FASCIAL_HYDRATION_TIPS.map((tip, i) => (
                  <Text key={i} style={glowStyles.tipBody}>{'• ' + tip}</Text>
                ))}
              </View>
            )}
          </View>

          {/* HGH Maximization */}
          <View style={glowStyles.subCard}>
            <TouchableOpacity style={glowStyles.subHeader} onPress={() => toggleSub('hgh')} activeOpacity={0.7}>
              <Text style={glowStyles.subTitle}>⚡ HGH Maximization</Text>
              <Text style={glowStyles.subChevron}>{openSub['hgh'] ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {openSub['hgh'] && (
              <View style={glowStyles.subBody}>
                {HGH_TIPS.map((tip, i) => (
                  <Text key={i} style={glowStyles.tipBody}>{'• ' + tip}</Text>
                ))}
              </View>
            )}
          </View>

          {(dow === 3 || dow === 6) ? (
            <View style={glowStyles.sprintCard}>
              <Text style={glowStyles.sprintTitle}>⚡ SPRINT FAST PROTOCOL</Text>
              {['6 x 40m sprints at 90% effort', 'Rest 90 sec between sprints', 'Walk back to start each time'].map((line, i) => (
                <Text key={i} style={glowStyles.tipBody} numberOfLines={2}>{'• ' + line}</Text>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ─── Productivity Section ─────────────────────────────────────────────────────

function ProductivitySection() {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});

  const toggleSub = (key: string) => {
    console.log('[GlowUp] Productivity sub-section toggled:', key);
    setOpenSub((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SUB_SECTIONS = [
    {
      key: 'time_blocking',
      title: '🗓 Time Blocking Mastery',
      items: [
        { heading: 'The MIT Method', body: 'Identify your 3 Most Important Tasks each morning before opening any app.' },
        { heading: 'Daily Schedule', body: '6–8 AM: Morning protocol\n8–10 AM: Deep work block 1 (hardest task first)\n10–10:15 AM: Movement break\n10:15 AM–12 PM: Deep work block 2\n12–1 PM: Lunch + walk\n1–3 PM: Meetings, emails, admin\n3–5 PM: Creative or secondary work\n5–6 PM: Training\n6–8 PM: Wind-down, family, reading\n8–9 PM: Night protocol\n9:30 PM: Lights out' },
        { heading: 'Rules', body: 'No phone first 60 min of day. No email before 10 AM. Batch all notifications to 2x per day.' },
      ],
    },
    {
      key: 'deep_focus',
      title: '🎯 Deep Focus Protocol',
      items: [
        { heading: 'Pomodoro+ Method', body: '50 min deep work / 10 min break (better than 25/5 for complex tasks). During work: phone in another room, website blocker on, one task only. During break: walk, stretch, water — no phone. After 3 rounds: 30 min full rest.' },
        { heading: 'Environment Design', body: 'Desk faces wall or window, not door. Temperature: 68–72°F. Lighting: bright white during work, dim warm in evening. Noise: brown noise or lo-fi for focus, silence for memorization. No clutter on desk — visual noise = cognitive load.' },
      ],
    },
    {
      key: 'weekly_review',
      title: '📋 Weekly Review System',
      items: [
        { heading: 'Every Sunday Evening (30 min)', body: '1. Brain dump: write everything on your mind\n2. Review last week: what got done, what didn\'t, why\n3. Identify wins: write 3 things you did well\n4. Identify gaps: write 1 thing to improve\n5. Set next week\'s top 3 priorities\n6. Schedule non-negotiables: training, sleep, deep work\n7. Clear inbox to zero\n8. Update goals tracker' },
        { heading: 'Monthly Review (1st Sunday)', body: 'Review all goals progress. Adjust targets if needed. Celebrate milestones. Identify patterns in productivity data.' },
      ],
    },
    {
      key: 'learning',
      title: '📚 Learning Acceleration',
      items: [
        { heading: 'The Feynman Technique', body: '1. Pick a concept to learn\n2. Explain it as if teaching a 12-year-old\n3. Identify gaps in your explanation\n4. Go back to source material for gaps\n5. Simplify and use analogies' },
        { heading: 'Spaced Repetition', body: 'Review new material at: 1 day, 3 days, 7 days, 14 days, 30 days. Use Anki or physical flashcards. Study in 25-min focused sessions, not marathon cramming.' },
        { heading: 'Active Recall', body: 'Close the book and write what you remember. Test yourself before re-reading. Teach the material to someone else.' },
        { heading: 'Reading System', body: 'Read with a pen — underline, margin notes. After each chapter: write 3 key ideas from memory. Weekly: review all notes from that week\'s reading.' },
      ],
    },
    {
      key: 'goal_architecture',
      title: '🏆 Goal Architecture',
      items: [
        { heading: 'The 3-Layer Goal System', body: 'Layer 1 — Identity goal: "I am someone who..."\nLayer 2 — Outcome goal: specific measurable result with deadline\nLayer 3 — Process goal: daily/weekly actions that guarantee the outcome' },
        { heading: 'Example', body: 'Identity: I am someone who is physically elite\nOutcome: 185 lbs at 10% body fat by December 31\nProcess: Train 5x/week, hit 180g protein daily, sleep 8 hours' },
        { heading: 'Anti-Goals', body: 'What you will NOT do to achieve this. What you will sacrifice. What you will protect at all costs. Review goals every Sunday. Adjust process, never abandon identity.' },
      ],
    },
    {
      key: 'sleep_opt',
      title: '😴 Sleep Optimization',
      items: [
        { heading: 'Pre-Sleep Protocol (60 min before bed)', body: 'Dim all lights — blue light suppresses melatonin for 3+ hours. No screens or use blue light glasses. Temperature: drop room to 65–68°F. Magnesium glycinate: 400mg. Bamboo mouth tape. Write tomorrow\'s top 3 tasks. 5 min body scan meditation.' },
        { heading: 'Sleep Environment', body: 'Complete darkness — even small light sources disrupt deep sleep. White noise or silence. Back sleeping with thin or no pillow. No phone in bedroom.' },
        { heading: 'What Destroys Sleep', body: 'Alcohol (fragments sleep architecture even in small amounts). Eating within 2 hours of bed. Inconsistent sleep/wake times. Caffeine after 2 PM. Intense exercise within 2 hours of bed.' },
      ],
    },
    {
      key: 'study_habits',
      title: '📖 Study Habits & Academic Excellence',
      items: [
        { heading: 'Before Studying', body: 'Clear desk completely. Write the specific goal for this session. Set a timer — no open-ended study sessions. Water bottle on desk.' },
        { heading: 'During Study', body: 'Active recall over passive re-reading. Cornell note method: main notes on right, key questions on left, summary at bottom. Every 25 min: stand, stretch, drink water. If stuck: skip and come back.' },
        { heading: 'After Studying', body: 'Write 5 things you learned from memory. Identify 1 thing still unclear — research it tomorrow. Review flashcards for 5 min.' },
        { heading: 'Test Preparation', body: 'Start 2 weeks before, not 2 days. Practice tests under real conditions (timed, no notes). Focus on weak areas, not comfortable material. Sleep the night before — cramming hurts performance.' },
      ],
    },
    {
      key: 'digital_minimalism',
      title: '📵 Digital Minimalism & Mental Clarity',
      items: [
        { heading: 'Phone Rules', body: 'No phone first 60 min of day. No phone last 60 min of day. Phone in another room during deep work. Notifications off except calls and texts. Social media: 1 scheduled 20-min window per day max. Delete apps that don\'t serve your goals.' },
        { heading: 'Mental Clarity Habits', body: 'Morning pages: 3 pages of stream-of-consciousness writing on waking. Daily brain dump: 5 min writing everything on your mind. Inbox zero: process email 2x per day. Single-tasking: one tab, one task, one focus. Weekly digital detox: 4+ hours with no screens on Sunday.' },
        { heading: 'Information Diet', body: 'Unsubscribe from all newsletters that don\'t add value. Curate your feed ruthlessly — every account you follow programs your mind. Read books over articles — depth over breadth. Limit news to 10 min per day.' },
      ],
    },
  ];

  return (
    <View style={glowStyles.card}>
      <TouchableOpacity
        style={glowStyles.cardHeader}
        onPress={() => {
          console.log('[GlowUp] Productivity System section toggled');
          setOpen((v) => !v);
        }}
        activeOpacity={0.7}
      >
        <View style={glowStyles.cardHeaderLeft}>
          <View style={glowStyles.goldAccent} />
          <Text style={glowStyles.cardTitle}>⚡ Productivity System</Text>
        </View>
        <Text style={glowStyles.chevron}>{open ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={glowStyles.cardBody}>
          {SUB_SECTIONS.map((sub) => (
            <View key={sub.key} style={glowStyles.subCard}>
              <TouchableOpacity
                style={glowStyles.subHeader}
                onPress={() => toggleSub(sub.key)}
                activeOpacity={0.7}
              >
                <Text style={glowStyles.subTitle}>{sub.title}</Text>
                <Text style={glowStyles.subChevron}>{openSub[sub.key] ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {openSub[sub.key] && (
                <View style={glowStyles.subBody}>
                  {sub.items.map((item, i) => (
                    <View key={i} style={glowStyles.tipItem}>
                      <Text style={glowStyles.tipHeading}>{item.heading}</Text>
                      <Text style={glowStyles.tipBody}>{item.body}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Lifestyle Intelligence Section ──────────────────────────────────────────

// ─── Looksmaxing Section ─────────────────────────────────────────────────────

function LooksmaxingSection() {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});

  const toggleSub = (key: string) => {
    console.log('[GlowUp] Looksmaxing sub-section toggled:', key);
    setOpenSub((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SUB_SECTIONS = [
    {
      key: 'facial_asymmetry',
      title: '🔄 Facial Asymmetry Correction',
      items: [
        {
          heading: 'Understanding Facial Asymmetry',
          body: 'All faces have some asymmetry — it\'s normal. The goal is to minimize functional asymmetry caused by habits, posture, and muscle imbalances.',
        },
        {
          heading: 'Common Causes',
          body: '• Sleeping on one side (compresses facial bones over time)\n• Chewing on one side only\n• Poor tongue posture (tongue not on roof of mouth)\n• Uneven jaw muscle development\n• Forward head posture pulling one side more',
        },
        {
          heading: 'Correction Protocol',
          body: '1. Mewing — tongue flat on roof of mouth, teeth lightly touching, lips sealed. Do this 24/7. This is the #1 intervention.\n2. Chew on both sides equally — alternate sides with every bite. Use mastic gum or falim gum for jaw development.\n3. Sleep on your back — use a cervical pillow. If you must side-sleep, alternate sides nightly.\n4. Facial massage — 5 min daily. Use upward strokes on the weaker/flatter side. Gua sha tool recommended.\n5. Jaw exercises — open mouth wide, move jaw left/right 10× each. Clench and release 20×. Do 2× daily.\n6. Neck stretches — tilt head to each side, hold 30 sec. Releases SCM tension that pulls the face asymmetrically.\n7. Posture correction — forward head posture causes asymmetric muscle tension. Fix your posture first.\n8. Unilateral chewing gum — chew on your weaker side for 10 min/day to build up underdeveloped masseter.',
        },
        {
          heading: 'Timeline & Notes',
          body: 'Noticeable improvement in 3–6 months with consistent mewing + sleep position + chewing habits.\n\nNote: Severe asymmetry (from injury, genetics, or bone structure) may require professional evaluation.',
        },
      ],
    },
    {
      key: 'oil_pulling',
      title: '🫙 Oil Pulling & Oral Health',
      items: [
        {
          heading: 'What is Oil Pulling?',
          body: 'Ancient Ayurvedic practice of swishing oil in the mouth for 10–20 minutes. Shown to reduce harmful bacteria, improve gum health, and whiten teeth naturally.',
        },
        {
          heading: 'How to Do It',
          body: '1. First thing in the morning, before eating or drinking\n2. Take 1 tablespoon of cold-pressed coconut oil (or sesame oil)\n3. Swish gently for 10–20 minutes — don\'t gargle, don\'t swallow\n4. Spit into trash (not sink — clogs pipes)\n5. Rinse with warm salt water\n6. Brush teeth normally',
        },
        {
          heading: 'Benefits',
          body: '• Reduces Streptococcus mutans (cavity-causing bacteria) by up to 20%\n• Reduces plaque and gingivitis\n• Freshens breath (kills anaerobic bacteria)\n• May reduce inflammation systemically\n• Whitens teeth over 2–4 weeks',
        },
        {
          heading: 'Best Oils',
          body: '• Coconut oil — most popular, antimicrobial lauric acid, pleasant taste\n• Sesame oil — traditional Ayurvedic choice, high in antioxidants\n• Sunflower oil — neutral taste, effective',
        },
        {
          heading: 'Tips & Frequency',
          body: '• Start with 5 minutes if 20 feels too long\n• Do while showering or getting ready to save time\n• Consistency matters more than duration — daily beats occasional 20-min sessions\n• Don\'t swallow — the oil contains pulled bacteria and toxins\n\nFrequency: Daily, ideally. Minimum 3–4× per week for results.',
        },
      ],
    },
    {
      key: 'advanced_health',
      title: '💎 Advanced Health Protocols',
      items: [
        {
          heading: '🧊 Cold Exposure',
          body: 'Cold shower protocol: 30 sec cold at end of shower → build to 2–3 min full cold\n\nBenefits: norepinephrine spike (+300%), dopamine increase (+250%), brown fat activation, improved mood and focus\n\nWim Hof method: 3 rounds of 30 deep breaths + breath hold + cold exposure\n\nBest time: morning for energy, post-workout for recovery\n\nDo NOT do cold immediately after strength training (blunts hypertrophy signal) — wait 4+ hours',
        },
        {
          heading: '🌬️ Breathwork',
          body: 'Box breathing: 4 sec inhale → 4 hold → 4 exhale → 4 hold. 4 rounds. Activates parasympathetic nervous system.\n\n4-7-8 breathing: 4 sec inhale → 7 hold → 8 exhale. Powerful for sleep and anxiety.\n\nPhysiological sigh: double inhale through nose + long exhale through mouth. Fastest stress reset (1 breath).\n\nNasal breathing only during exercise — improves VO2 max, nitric oxide production, and facial structure.',
        },
        {
          heading: '🦷 Oral Microbiome Optimization',
          body: '• Tongue scraping every morning (removes 75% of morning bacteria)\n• Xylitol gum after meals (starves S. mutans bacteria)\n• Avoid mouthwash with alcohol (kills beneficial bacteria)\n• Remineralizing toothpaste (nano-hydroxyapatite > fluoride for enamel repair)\n• Floss before brushing, not after\n• Water flosser (Waterpik) for gum health',
        },
        {
          heading: '🧠 Cognitive Enhancement',
          body: '• Morning sunlight within 30 min of waking (sets circadian rhythm, boosts cortisol at right time)\n• No caffeine for first 90 min after waking (let adenosine clear naturally)\n• Lion\'s mane mushroom (500–1000mg) — NGF stimulation, neuroplasticity\n• Omega-3 (2–3g EPA+DHA daily) — brain structure, anti-inflammatory\n• Magnesium glycinate before bed (400mg) — sleep quality, muscle relaxation\n• Cold exposure + exercise = BDNF spike (brain-derived neurotrophic factor)',
        },
        {
          heading: '🩸 Circulation & Lymphatic Flow',
          body: '• Dry brushing before shower (5 min, always toward heart) — lymphatic drainage\n• Rebounding (mini trampoline, 10 min) — most effective lymphatic exercise\n• Inversion (legs up wall, 5 min) — reverses lymph pooling in legs\n• Contrast shower: 1 min hot → 30 sec cold → repeat 3× — pumps lymph\n• Facial gua sha (upward strokes, 5 min) — reduces puffiness, improves circulation\n• Stay hydrated — lymph is 95% water',
        },
        {
          heading: '🌿 Gut-Skin Axis',
          body: 'The gut microbiome directly affects skin clarity, inflammation, and aging\n\n• Fermented foods daily: kefir, kimchi, sauerkraut, kombucha\n• Prebiotic fiber: garlic, onion, leeks, asparagus, green banana\n• Eliminate seed oils (linoleic acid → oxidative stress → skin aging)\n• L-glutamine (5g/day) — repairs gut lining, reduces leaky gut\n• Zinc (15–30mg) — critical for skin repair and testosterone\n• Avoid antibiotics unless necessary — devastates microbiome for 6–12 months',
        },
      ],
    },
  ];

  return (
    <View style={glowStyles.card}>
      <TouchableOpacity
        style={glowStyles.cardHeader}
        onPress={() => {
          console.log('[GlowUp] Looksmaxing section toggled');
          setOpen((v) => !v);
        }}
        activeOpacity={0.7}
      >
        <View style={glowStyles.cardHeaderLeft}>
          <View style={glowStyles.goldAccent} />
          <Text style={glowStyles.cardTitle}>💎 Looksmaxing Protocols</Text>
        </View>
        <Text style={glowStyles.chevron}>{open ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={glowStyles.cardBody}>
          {SUB_SECTIONS.map((sub) => (
            <View key={sub.key} style={glowStyles.subCard}>
              <TouchableOpacity
                style={glowStyles.subHeader}
                onPress={() => toggleSub(sub.key)}
                activeOpacity={0.7}
              >
                <Text style={glowStyles.subTitle}>{sub.title}</Text>
                <Text style={glowStyles.subChevron}>{openSub[sub.key] ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {openSub[sub.key] && (
                <View style={glowStyles.subBody}>
                  {sub.items.map((item, i) => (
                    <View key={i} style={glowStyles.tipItem}>
                      <Text style={glowStyles.tipHeading}>{item.heading}</Text>
                      <Text style={glowStyles.tipBody}>{item.body}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LifestyleIntelligenceSection() {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<Record<string, boolean>>({});

  const toggleSub = (key: string) => {
    console.log('[GlowUp] Lifestyle Intelligence sub-section toggled:', key);
    setOpenSub((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SUB_SECTIONS = [
    {
      key: 'sleep_science',
      title: '🧠 Sleep Science',
      items: [
        { heading: 'The 90-Minute Sleep Cycle', body: 'Sleep in 90-min multiples: 6h, 7.5h, or 9h — not 8h flat. Wake during light sleep phase = feel rested. Use a sleep calculator: bedtime = wake time minus 7.5 or 9 hours.' },
        { heading: 'Deep Sleep Maximizers', body: 'Cold room (65–68°F). Complete darkness. Consistent wake time (even weekends). No alcohol — it blocks REM sleep. Magnesium glycinate 400mg before bed. Mouth tape for nasal breathing.' },
        { heading: 'Things That Destroy Sleep Quality', body: 'Alcohol (even 1 drink fragments sleep architecture). Blue light within 2 hours of bed. Eating within 2 hours of bed. Inconsistent sleep schedule. Stress without a wind-down protocol.' },
      ],
    },
    {
      key: 'pre_bed',
      title: '🌙 Pre-Bed Protocol',
      items: [
        { heading: '90 Min Before Bed', body: 'Dim all lights in home. Set room temperature to 65–68°F. No more food or alcohol. Blue light glasses if using screens.' },
        { heading: '60 Min Before Bed', body: 'No screens (or blue light glasses strictly on). Magnesium glycinate. Light stretching or yoga. Read physical book.' },
        { heading: '30 Min Before Bed', body: "Write tomorrow's top 3 tasks. 5-min body scan or breathing exercise. Bamboo mouth tape on. Lights out." },
        { heading: 'Morning Quality Check', body: 'Rate sleep 1–10 each morning. Note how you feel at 10 AM (true indicator of sleep quality). Track patterns: what correlates with best sleep?' },
      ],
    },
    {
      key: 'study_habits_li',
      title: '📖 Study Habits',
      items: [
        { heading: 'Before Studying', body: 'Clear desk completely. Write the specific goal for this session. Set a timer — no open-ended study sessions. Water bottle on desk.' },
        { heading: 'During Study', body: 'Active recall over passive re-reading. Cornell note method: main notes on right, key questions on left, summary at bottom. Every 25 min: stand, stretch, drink water.' },
        { heading: 'After Studying', body: 'Write 5 things you learned from memory. Identify 1 thing still unclear — research it tomorrow. Review flashcards for 5 min.' },
        { heading: 'Test Preparation', body: 'Start 2 weeks before, not 2 days. Practice tests under real conditions (timed, no notes). Focus on weak areas, not comfortable material. Sleep the night before — cramming hurts performance.' },
      ],
    },
    {
      key: 'lifestyle_habits',
      title: '🌿 Lifestyle Habits',
      items: [
        { heading: 'Non-Negotiable Daily Habits', body: 'Wake same time every day (even weekends). No phone first 60 min. Cold exposure: 2–3 min cold shower. Sunlight within 30 min of waking. Move your body before noon. Eat whole foods, avoid ultra-processed. Hydrate before caffeinating. Read 10 pages per day minimum. Reflect 5 min before bed.' },
        { heading: 'Weekly Habits', body: 'Sunday meal prep. Weekly review (30 min). One full day without social media. Call or see someone you care about. Do something that scares you slightly.' },
        { heading: 'Environment Design', body: 'Make good habits easy (water bottle on desk, gym bag by door). Make bad habits hard (delete apps, keep junk food out of house). Your environment shapes your behavior more than willpower.' },
      ],
    },
    {
      key: 'not_before_bed',
      title: '❌ Things NOT to Do Before Bed',
      items: [
        { heading: 'Avoid These in the 2 Hours Before Sleep', body: '❌ Intense exercise (raises core temp and cortisol)\n❌ Alcohol (fragments sleep architecture, blocks REM)\n❌ Large meals (digestion disrupts sleep)\n❌ Bright overhead lights (suppresses melatonin)\n❌ Heated arguments or stressful conversations\n❌ Checking work email or messages\n❌ Scrolling social media (dopamine spike delays sleep onset)\n❌ Caffeine (half-life is 5–7 hours — 3 PM coffee = half still active at 10 PM)\n❌ Hot shower immediately before bed (wait 90 min after)\n❌ Sleeping with TV on (even with eyes closed, light and sound disrupt cycles)' },
      ],
    },
    {
      key: 'educational',
      title: '🧬 Educational Insights',
      items: [
        { heading: 'Neuroscience of Habits', body: 'Habits form in the basal ganglia, not the prefrontal cortex. A habit loop: cue → routine → reward. To build a habit: stack it onto an existing one. To break a habit: change the environment, not the willpower. It takes 66 days on average to automate a behavior (not 21).' },
        { heading: 'Hormones and Performance', body: 'Cortisol: peaks at 8–9 AM (use it for hard tasks), crashes at 3 PM. Testosterone: highest in morning — train in AM for best hormonal response. HGH: releases in pulses during deep sleep — protect sleep at all costs. Dopamine: released in anticipation, not just reward — use this for motivation. Serotonin: produced in gut (90%) — gut health = mood health.' },
        { heading: 'The Compound Effect', body: '1% better every day = 37x better in one year. 1% worse every day = nearly zero in one year. Small consistent actions beat large inconsistent ones every time. The gap between who you are and who you want to be closes with daily reps.' },
      ],
    },
  ];

  return (
    <View style={glowStyles.card}>
      <TouchableOpacity
        style={glowStyles.cardHeader}
        onPress={() => {
          console.log('[GlowUp] Lifestyle Intelligence section toggled');
          setOpen((v) => !v);
        }}
        activeOpacity={0.7}
      >
        <View style={glowStyles.cardHeaderLeft}>
          <View style={glowStyles.goldAccent} />
          <Text style={glowStyles.cardTitle}>🌿 Lifestyle Intelligence</Text>
        </View>
        <Text style={glowStyles.chevron}>{open ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={glowStyles.cardBody}>
          {SUB_SECTIONS.map((sub) => (
            <View key={sub.key} style={glowStyles.subCard}>
              <TouchableOpacity
                style={glowStyles.subHeader}
                onPress={() => toggleSub(sub.key)}
                activeOpacity={0.7}
              >
                <Text style={glowStyles.subTitle}>{sub.title}</Text>
                <Text style={glowStyles.subChevron}>{openSub[sub.key] ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {openSub[sub.key] && (
                <View style={glowStyles.subBody}>
                  {sub.items.map((item, i) => (
                    <View key={i} style={glowStyles.tipItem}>
                      <Text style={glowStyles.tipHeading}>{item.heading}</Text>
                      <Text style={glowStyles.tipBody}>{item.body}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Shared styles for new sections ──────────────────────────────────────────

const glowStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  habitRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  habitRowInlineDone: {
    opacity: 0.7,
  },
  inlineCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inlineCheckDone: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  inlineCheckMark: {
    fontSize: 11,
    color: COLORS.bg,
    fontWeight: '900',
  },
  inlineLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  inlineLabelDone: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  inlineXP: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gold,
  },
  deadHangBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
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
    marginTop: 8,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  goldAccent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  cardBody: {
    marginTop: 14,
    gap: 8,
  },
  subCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  subChevron: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  subBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  tipItem: {
    gap: 3,
  },
  tipHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
  },
  tipBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  productRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  productWhy: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  heroRings: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    alignItems: 'center',
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
  },
  chevron: {
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  weekPillTypeToday: {
    color: COLORS.goldBright,
  },
  weekPillXP: {
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
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
    fontSize: 12,
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

  // Rank Celebration Modal
  rankCelebTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 3,
    marginBottom: 6,
  },
  rankCelebRank: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  rankCelebDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // Facial Analysis Card
  facialAnalysisCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  facialAnalysisLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  facialAnalysisEmoji: {
    fontSize: 32,
  },
  facialAnalysisTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  facialAnalysisSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  facialAnalysisArrow: {
    fontSize: 20,
    color: COLORS.gold,
    fontWeight: '800',
    marginLeft: 8,
  },
  newBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.bg,
    letterSpacing: 1,
  },
});
