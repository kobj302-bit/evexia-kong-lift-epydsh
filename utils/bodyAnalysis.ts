// utils/bodyAnalysis.ts

export interface BodyProfile {
  weight: number;      // lbs
  height: number;      // inches
  age: number;
  sex: string;
  bf: number;          // body fat %
  waist: number;       // inches
  neck: number;        // inches
  hip: number;         // inches
  weightUnit: 'lbs' | 'kg';
  heightUnit: 'ft' | 'cm';
}

export interface BodyAnalysisResult {
  // Body composition
  leanMass: number;           // lbs
  fatMass: number;            // lbs
  navyBF: number;             // Navy formula BF%
  bmi: number;
  bmiCategory: string;
  ffmi: number;               // Fat-Free Mass Index
  ffmiNormalized: number;     // FFMI normalized to 1.8m
  ffmiCategory: string;

  // Energy
  bmr: number;                // Mifflin-St Jeor BMR (kcal)
  tdee: Record<string, number>; // TDEE at each activity level

  // Height display
  heightDisplay: string;      // e.g. "5'10\" (178 cm)"

  // Goals
  idealWeightLow: number;     // Devine formula low
  idealWeightHigh: number;    // Devine formula high
  weightToGoal: number;       // lbs to gain/lose to reach ideal midpoint

  // Body fat categories
  bfCategory: string;
  bfIdealLow: number;
  bfIdealHigh: number;

  // Waist-to-height ratio
  waistToHeight: number;
  waistToHeightCategory: string;
}

export function analyzeBody(p: BodyProfile): BodyAnalysisResult {
  const weightKg = p.weight / 2.205;
  const heightCm = p.height * 2.54;
  const heightM = heightCm / 100;

  // Lean & fat mass
  const fatMass = p.weight * (p.bf / 100);
  const leanMass = p.weight - fatMass;
  const leanMassKg = leanMass / 2.205;

  // Navy BF formula
  let navyBF: number;
  if (p.sex === 'Female') {
    navyBF = 163.205 * Math.log10(p.waist + p.hip - p.neck) - 97.684 * Math.log10(p.height) - 78.387;
  } else {
    navyBF = 86.010 * Math.log10(p.waist - p.neck) - 70.041 * Math.log10(p.height) + 36.76;
  }
  navyBF = Math.max(3, Math.min(60, Math.round(navyBF * 10) / 10));

  // BMI
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  const bmiCategory =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25 ? 'Normal' :
    bmi < 30 ? 'Overweight' : 'Obese';

  // FFMI
  const ffmi = Math.round((leanMassKg / (heightM * heightM)) * 10) / 10;
  const ffmiNormalized = Math.round((ffmi + 6.1 * (1.8 - heightM)) * 10) / 10;
  const ffmiCategory =
    ffmiNormalized < 18 ? 'Below Average' :
    ffmiNormalized < 20 ? 'Average' :
    ffmiNormalized < 22 ? 'Above Average' :
    ffmiNormalized < 24 ? 'Excellent' :
    ffmiNormalized < 26 ? 'Superior' : 'Elite / Near Genetic Limit';

  // BMR (Mifflin-St Jeor)
  const bmr = p.sex === 'Female'
    ? Math.round(10 * weightKg + 6.25 * heightCm - 5 * p.age - 161)
    : Math.round(10 * weightKg + 6.25 * heightCm - 5 * p.age + 5);

  // TDEE
  const tdee: Record<string, number> = {
    'Sedentary (desk job)': Math.round(bmr * 1.2),
    'Lightly Active (1–3x/week)': Math.round(bmr * 1.375),
    'Moderately Active (3–5x/week)': Math.round(bmr * 1.55),
    'Very Active (6–7x/week)': Math.round(bmr * 1.725),
    'Athlete (2x/day)': Math.round(bmr * 1.9),
  };

  // Height display
  const ft = Math.floor(p.height / 12);
  const inches = p.height % 12;
  const heightDisplay = `${ft}'${inches}" (${Math.round(heightCm)} cm)`;

  // Ideal weight (Devine formula)
  const idealBase = p.sex === 'Female' ? 45.5 : 50;
  const idealWeightKg = idealBase + 2.3 * (p.height - 60);
  const idealWeightLow = Math.round((idealWeightKg * 0.9) * 2.205);
  const idealWeightHigh = Math.round((idealWeightKg * 1.1) * 2.205);
  const weightToGoal = Math.round(p.weight - (idealWeightKg * 2.205));

  // BF category
  const isMale = p.sex !== 'Female';
  const bfCategory =
    p.bf < (isMale ? 6 : 14) ? 'Essential Fat' :
    p.bf < (isMale ? 14 : 21) ? 'Athletic' :
    p.bf < (isMale ? 18 : 25) ? 'Fitness' :
    p.bf < (isMale ? 25 : 32) ? 'Average' : 'Above Average';
  const bfIdealLow = isMale ? 10 : 18;
  const bfIdealHigh = isMale ? 15 : 24;

  // Waist-to-height ratio
  const waistToHeight = Math.round((p.waist / p.height) * 100) / 100;
  const waistToHeightCategory =
    waistToHeight < 0.4 ? 'Extremely Slim' :
    waistToHeight < 0.5 ? 'Healthy' :
    waistToHeight < 0.6 ? 'Overweight' : 'High Risk';

  return {
    leanMass: Math.round(leanMass),
    fatMass: Math.round(fatMass),
    navyBF,
    bmi,
    bmiCategory,
    ffmi,
    ffmiNormalized,
    ffmiCategory,
    bmr,
    tdee,
    heightDisplay,
    idealWeightLow,
    idealWeightHigh,
    weightToGoal,
    bfCategory,
    bfIdealLow,
    bfIdealHigh,
    waistToHeight,
    waistToHeightCategory,
  };
}

export function formatWeight(lbs: number, unit: 'lbs' | 'kg'): string {
  if (unit === 'kg') return `${Math.round(lbs / 2.205)} kg`;
  return `${lbs} lbs`;
}
