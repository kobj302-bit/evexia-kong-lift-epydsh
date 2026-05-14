import type { ActiveProgram } from './storage';

export interface SplitProgram {
  id: string;
  name: string;
  daysPerWeek: number;
  description: string;
  days: Array<{
    day: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      rest?: string;
    }>;
  }>;
}

export const HARDCODED_SPLITS: SplitProgram[] = [
  {
    id: 'ppl',
    name: 'PPL (6-Day)',
    daysPerWeek: 6,
    description: 'Push/Pull/Legs twice per week. The gold standard for hypertrophy.',
    days: [
      {
        day: 'Push A',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '8', rest: '90s' },
          { name: 'Overhead Press', sets: 3, reps: '10', rest: '90s' },
          { name: 'Incline DB Press', sets: 3, reps: '12', rest: '60s' },
          { name: 'Lateral Raises', sets: 3, reps: '15', rest: '45s' },
          { name: 'Tricep Pushdowns', sets: 3, reps: '12', rest: '45s' },
          { name: 'Skull Crushers', sets: 3, reps: '10', rest: '60s' },
        ],
      },
      {
        day: 'Pull A',
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '6', rest: '120s' },
          { name: 'Barbell Row', sets: 4, reps: '8', rest: '90s' },
          { name: 'Pull-Ups', sets: 3, reps: '10', rest: '90s' },
          { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
          { name: 'Barbell Curl', sets: 3, reps: '12', rest: '60s' },
          { name: 'Hammer Curls', sets: 3, reps: '12', rest: '45s' },
        ],
      },
      {
        day: 'Legs A',
        exercises: [
          { name: 'Squat', sets: 4, reps: '8', rest: '120s' },
          { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: '90s' },
          { name: 'Leg Press', sets: 3, reps: '12', rest: '90s' },
          { name: 'Leg Curl', sets: 3, reps: '12', rest: '60s' },
          { name: 'Calf Raises', sets: 4, reps: '15', rest: '45s' },
        ],
      },
      {
        day: 'Push B',
        exercises: [
          { name: 'Incline Bench Press', sets: 4, reps: '8', rest: '90s' },
          { name: 'DB Shoulder Press', sets: 3, reps: '10', rest: '90s' },
          { name: 'Cable Flyes', sets: 3, reps: '15', rest: '45s' },
          { name: 'Front Raises', sets: 3, reps: '12', rest: '45s' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: '60s' },
          { name: 'Dips', sets: 3, reps: '10', rest: '60s' },
        ],
      },
      {
        day: 'Pull B',
        exercises: [
          { name: 'Weighted Pull-Ups', sets: 4, reps: '6', rest: '120s' },
          { name: 'Seated Cable Row', sets: 4, reps: '10', rest: '90s' },
          { name: 'Lat Pulldown', sets: 3, reps: '12', rest: '60s' },
          { name: 'Rear Delt Flyes', sets: 3, reps: '15', rest: '45s' },
          { name: 'Preacher Curl', sets: 3, reps: '10', rest: '60s' },
          { name: 'Cable Curl', sets: 3, reps: '12', rest: '45s' },
        ],
      },
      {
        day: 'Legs B',
        exercises: [
          { name: 'Front Squat', sets: 4, reps: '8', rest: '120s' },
          { name: 'Hack Squat', sets: 3, reps: '10', rest: '90s' },
          { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
          { name: 'Leg Extension', sets: 3, reps: '15', rest: '45s' },
          { name: 'Seated Calf Raises', sets: 4, reps: '20', rest: '30s' },
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper/Lower (4-Day)',
    daysPerWeek: 4,
    description: 'Upper and lower body split. Great for strength and size.',
    days: [
      {
        day: 'Upper A (Strength)',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '5', rest: '120s' },
          { name: 'Barbell Row', sets: 4, reps: '5', rest: '120s' },
          { name: 'Overhead Press', sets: 3, reps: '8', rest: '90s' },
          { name: 'Pull-Ups', sets: 3, reps: '8', rest: '90s' },
          { name: 'Tricep Dips', sets: 3, reps: '10', rest: '60s' },
          { name: 'Barbell Curl', sets: 3, reps: '10', rest: '60s' },
        ],
      },
      {
        day: 'Lower A (Strength)',
        exercises: [
          { name: 'Squat', sets: 4, reps: '5', rest: '120s' },
          { name: 'Romanian Deadlift', sets: 3, reps: '8', rest: '90s' },
          { name: 'Leg Press', sets: 3, reps: '10', rest: '90s' },
          { name: 'Leg Curl', sets: 3, reps: '10', rest: '60s' },
          { name: 'Calf Raises', sets: 4, reps: '15', rest: '45s' },
        ],
      },
      {
        day: 'Upper B (Hypertrophy)',
        exercises: [
          { name: 'Incline DB Press', sets: 4, reps: '10', rest: '60s' },
          { name: 'Cable Row', sets: 4, reps: '10', rest: '60s' },
          { name: 'DB Lateral Raises', sets: 4, reps: '15', rest: '45s' },
          { name: 'Lat Pulldown', sets: 3, reps: '12', rest: '60s' },
          { name: 'Skull Crushers', sets: 3, reps: '12', rest: '60s' },
          { name: 'Hammer Curls', sets: 3, reps: '12', rest: '60s' },
        ],
      },
      {
        day: 'Lower B (Hypertrophy)',
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '6', rest: '120s' },
          { name: 'Hack Squat', sets: 3, reps: '12', rest: '90s' },
          { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
          { name: 'Leg Extension', sets: 3, reps: '15', rest: '45s' },
          { name: 'Seated Calf Raises', sets: 4, reps: '20', rest: '30s' },
        ],
      },
    ],
  },
  {
    id: 'bro-split',
    name: 'Bro Split (5-Day)',
    daysPerWeek: 5,
    description: 'Classic bodybuilder split. One muscle group per day. Old school, still works.',
    days: [
      {
        day: 'Chest',
        exercises: [
          { name: 'Flat Bench Press', sets: 4, reps: '8', rest: '90s' },
          { name: 'Incline Bench Press', sets: 4, reps: '10', rest: '90s' },
          { name: 'Decline Bench Press', sets: 3, reps: '12', rest: '60s' },
          { name: 'DB Flyes', sets: 3, reps: '15', rest: '45s' },
          { name: 'Cable Crossovers', sets: 3, reps: '15', rest: '45s' },
          { name: 'Push-Ups', sets: 3, reps: 'Failure', rest: '30s' },
        ],
      },
      {
        day: 'Back',
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '6', rest: '120s' },
          { name: 'Pull-Ups', sets: 4, reps: '8', rest: '90s' },
          { name: 'Barbell Row', sets: 4, reps: '8', rest: '90s' },
          { name: 'Lat Pulldown', sets: 3, reps: '12', rest: '60s' },
          { name: 'Seated Cable Row', sets: 3, reps: '12', rest: '60s' },
          { name: 'Face Pulls', sets: 3, reps: '15', rest: '45s' },
        ],
      },
      {
        day: 'Shoulders',
        exercises: [
          { name: 'Overhead Press', sets: 4, reps: '8', rest: '90s' },
          { name: 'DB Shoulder Press', sets: 3, reps: '10', rest: '90s' },
          { name: 'Lateral Raises', sets: 4, reps: '15', rest: '45s' },
          { name: 'Front Raises', sets: 3, reps: '12', rest: '45s' },
          { name: 'Rear Delt Flyes', sets: 3, reps: '15', rest: '45s' },
          { name: 'Shrugs', sets: 3, reps: '15', rest: '60s' },
        ],
      },
      {
        day: 'Arms',
        exercises: [
          { name: 'Barbell Curl', sets: 4, reps: '10', rest: '60s' },
          { name: 'Skull Crushers', sets: 4, reps: '10', rest: '60s' },
          { name: 'Hammer Curls', sets: 3, reps: '12', rest: '45s' },
          { name: 'Tricep Pushdowns', sets: 3, reps: '12', rest: '45s' },
          { name: 'Preacher Curl', sets: 3, reps: '12', rest: '60s' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: '12', rest: '60s' },
        ],
      },
      {
        day: 'Legs',
        exercises: [
          { name: 'Squat', sets: 4, reps: '8', rest: '120s' },
          { name: 'Leg Press', sets: 4, reps: '12', rest: '90s' },
          { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: '90s' },
          { name: 'Leg Curl', sets: 3, reps: '12', rest: '60s' },
          { name: 'Leg Extension', sets: 3, reps: '15', rest: '45s' },
          { name: 'Calf Raises', sets: 5, reps: '20', rest: '30s' },
        ],
      },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body (3-Day)',
    daysPerWeek: 3,
    description: 'Mon/Wed/Fri full body. Perfect for beginners and busy schedules.',
    days: [
      {
        day: 'Monday',
        exercises: [
          { name: 'Squat', sets: 3, reps: '8', rest: '90s' },
          { name: 'Bench Press', sets: 3, reps: '8', rest: '90s' },
          { name: 'Barbell Row', sets: 3, reps: '8', rest: '90s' },
          { name: 'Overhead Press', sets: 3, reps: '10', rest: '60s' },
          { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: '60s' },
          { name: 'Plank', sets: 3, reps: '60s', rest: '30s' },
        ],
      },
      {
        day: 'Wednesday',
        exercises: [
          { name: 'Deadlift', sets: 3, reps: '6', rest: '120s' },
          { name: 'Incline DB Press', sets: 3, reps: '10', rest: '90s' },
          { name: 'Pull-Ups', sets: 3, reps: '8', rest: '90s' },
          { name: 'DB Lateral Raises', sets: 3, reps: '15', rest: '45s' },
          { name: 'Leg Press', sets: 3, reps: '12', rest: '60s' },
          { name: 'Calf Raises', sets: 3, reps: '15', rest: '30s' },
        ],
      },
      {
        day: 'Friday',
        exercises: [
          { name: 'Front Squat', sets: 3, reps: '8', rest: '90s' },
          { name: 'Dips', sets: 3, reps: '10', rest: '60s' },
          { name: 'Lat Pulldown', sets: 3, reps: '12', rest: '60s' },
          { name: 'DB Shoulder Press', sets: 3, reps: '10', rest: '60s' },
          { name: 'Walking Lunges', sets: 3, reps: '12 each', rest: '60s' },
          { name: 'Ab Wheel Rollout', sets: 3, reps: '10', rest: '45s' },
        ],
      },
    ],
  },
  {
    id: 'hit-mentzer',
    name: 'HIT Mentzer',
    daysPerWeek: 3,
    description: 'High Intensity Training by Mike Mentzer. One all-out set per exercise. Maximum intensity, minimum volume.',
    days: [
      {
        day: 'Chest & Back',
        exercises: [
          { name: 'Bench Press (to failure)', sets: 1, reps: '6-10', rest: '3-5min' },
          { name: 'Incline DB Press (to failure)', sets: 1, reps: '8-12', rest: '3-5min' },
          { name: 'Deadlift (to failure)', sets: 1, reps: '5-8', rest: '3-5min' },
          { name: 'Barbell Row (to failure)', sets: 1, reps: '6-10', rest: '3-5min' },
        ],
      },
      {
        day: 'Legs',
        exercises: [
          { name: 'Squat (to failure)', sets: 1, reps: '8-12', rest: '3-5min' },
          { name: 'Leg Press (to failure)', sets: 1, reps: '10-15', rest: '3-5min' },
          { name: 'Leg Curl (to failure)', sets: 1, reps: '10-15', rest: '3-5min' },
          { name: 'Calf Raises (to failure)', sets: 1, reps: '15-20', rest: '2min' },
        ],
      },
      {
        day: 'Shoulders & Arms',
        exercises: [
          { name: 'Overhead Press (to failure)', sets: 1, reps: '6-10', rest: '3-5min' },
          { name: 'Lateral Raises (to failure)', sets: 1, reps: '10-15', rest: '2min' },
          { name: 'Barbell Curl (to failure)', sets: 1, reps: '8-12', rest: '3min' },
          { name: 'Skull Crushers (to failure)', sets: 1, reps: '8-12', rest: '3min' },
        ],
      },
    ],
  },
  {
    id: 'kettlebell',
    name: 'Kettlebell Conditioning',
    daysPerWeek: 4,
    description: '4-day kettlebell program. Builds strength, endurance, and athleticism.',
    days: [
      {
        day: 'Lower Body Power',
        exercises: [
          { name: 'KB Swing', sets: 5, reps: '20', rest: '60s' },
          { name: 'KB Goblet Squat', sets: 4, reps: '12', rest: '60s' },
          { name: 'KB Romanian Deadlift', sets: 4, reps: '10', rest: '60s' },
          { name: 'KB Lunge', sets: 3, reps: '10 each', rest: '60s' },
          { name: 'KB Sumo Deadlift', sets: 3, reps: '12', rest: '60s' },
        ],
      },
      {
        day: 'Upper Body Push',
        exercises: [
          { name: 'KB Press', sets: 4, reps: '8 each', rest: '60s' },
          { name: 'KB Push Press', sets: 3, reps: '10 each', rest: '60s' },
          { name: 'KB Floor Press', sets: 4, reps: '10', rest: '60s' },
          { name: 'KB Tricep Extension', sets: 3, reps: '12', rest: '45s' },
          { name: 'Push-Ups', sets: 3, reps: 'Failure', rest: '30s' },
        ],
      },
      {
        day: 'Full Body Conditioning',
        exercises: [
          { name: 'KB Clean & Press', sets: 5, reps: '5 each', rest: '90s' },
          { name: 'KB Snatch', sets: 4, reps: '8 each', rest: '90s' },
          { name: 'KB Turkish Get-Up', sets: 3, reps: '3 each', rest: '90s' },
          { name: 'KB Windmill', sets: 3, reps: '5 each', rest: '60s' },
        ],
      },
      {
        day: 'Upper Body Pull',
        exercises: [
          { name: 'KB Row', sets: 4, reps: '10 each', rest: '60s' },
          { name: 'KB High Pull', sets: 4, reps: '10 each', rest: '60s' },
          { name: 'KB Renegade Row', sets: 3, reps: '8 each', rest: '60s' },
          { name: 'KB Curl', sets: 3, reps: '12', rest: '45s' },
          { name: 'KB Face Pull', sets: 3, reps: '15', rest: '45s' },
        ],
      },
    ],
  },
];

export function splitToActiveProgram(split: SplitProgram): ActiveProgram {
  return {
    name: split.name,
    days: split.days,
    currentDay: 0,
  };
}
