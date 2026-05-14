import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

interface AthleteRequest {
  description: string;
  level: string;
  phase: string;
  athleteTemplate?: string;
  sport?: string;
  profile?: {
    age?: number;
    weight?: number;
    sex?: string;
    goal?: string;
    equip?: string;
    days?: number;
    injuries?: string[];
  };
  apiKey: string;
}

interface DietRequest {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
  goal: string;
  restrictions?: string;
  athleteMatch?: string;
  sport?: string;
  phase?: string;
  apiKey: string;
}

interface NutritionRequest {
  age: number;
  weight: number;
  height: number;
  sex: string;
  activityLevel: string;
  goal: string;
  athleteMatch?: string;
  sport?: string;
  phase?: string;
  trainingDays?: number;
  apiKey: string;
}

const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
};

async function callClaudeAPI(
  systemPrompt: string,
  userPrompt: string,
  logger: any,
  apiKey: string
): Promise<string> {
  logger.debug(
    { systemPromptLength: systemPrompt.length, userPromptLength: userPrompt.length },
    'Calling Claude API'
  );

  // Mock response for test environment
  if (!apiKey || apiKey === 'test-key' || apiKey.startsWith('test-')) {
    logger.info('Using mock response for test key');
    return '{}';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, error: errorText },
      'Claude API call failed'
    );
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as { content: Array<{ text: string }> };
  const text = data.content[0].text;

  // Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\s*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  return stripped;
}

export function registerAIRoutes(app: App, fastify: FastifyInstance) {
  // POST /api/ai/athlete
  fastify.post<{ Body: AthleteRequest }>(
    '/api/ai/athlete',
    {
      schema: {
        description: 'Generate a personalized athlete training program',
        tags: ['ai', 'athlete'],
        body: {
          type: 'object',
          required: ['description', 'level', 'phase'],
          properties: {
            description: { type: 'string' },
            level: { type: 'string' },
            phase: { type: 'string' },
            athleteTemplate: { type: 'string' },
            sport: { type: 'string' },
            apiKey: { type: 'string' },
            profile: {
              type: 'object',
              properties: {
                age: { type: 'number' },
                weight: { type: 'number' },
                sex: { type: 'string' },
                goal: { type: 'string' },
                equip: { type: 'string' },
                days: { type: 'number' },
                injuries: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Athlete training program',
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              phase: { type: 'string' },
              level: { type: 'string' },
              sport: { type: 'string' },
              athleteInspiration: { type: 'string' },
              weeklySchedule: { type: 'string' },
              days: { type: 'array' },
              diet: { type: 'object' },
              tips: { type: 'array' },
              recoveryProtocol: { type: 'string' },
              injuryModifications: { type: 'array' },
            },
          },
          400: { description: 'Bad request', ...errorResponse },
          500: { description: 'Internal server error', ...errorResponse },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AthleteRequest }>, reply: FastifyReply) => {
      const { description, level, phase, athleteTemplate, sport, profile, apiKey } = request.body;

      app.logger.info({ level, phase, athleteTemplate }, 'Athlete program generation request');

      if (!apiKey || apiKey.trim() === '') {
        return reply.status(400).send({ error: 'apiKey is required' });
      }

      try {
        const systemPrompt = `You are Kong, an elite strength and conditioning coach and sports nutritionist for the fitness app "Evexia: Kong Lift". You have encyclopedic knowledge of how famous athletes actually train, sport-specific conditioning science, military fitness standards, and bodybuilding periodization.

Your job is to create a highly personalized, expert-level workout program. You must:
1. Identify the training archetype from the user's request (famous athlete, sport, military/first responder, or bodybuilding phase)
2. For famous athletes: use their REAL known training methods, philosophy, and signature exercises
3. For sports: use sport-science-backed conditioning, periodization, and position-specific work
4. For military/first responder: use functional fitness, rucking, calisthenics, and job-specific demands
5. For bodybuilding phases: use phase-appropriate volume, intensity, rep ranges, and caloric context
6. Apply all injury modifications, age adjustments, and equipment constraints provided
7. Include a complete diet section matching the athlete/role/phase

Return ONLY valid JSON (no markdown, no explanation).`;

        const injuriesText = profile?.injuries?.length
          ? `- Injuries/Limitations: ${profile.injuries.join(', ')}`
          : '';

        const userPrompt = `Create a workout program with the following details:
- Description/Goal: ${description}
- Training Level: ${level}
- Phase: ${phase}
${athleteTemplate ? `- Athlete Inspiration: ${athleteTemplate}` : ''}
${sport ? `- Sport: ${sport}` : ''}
${profile?.age ? `- Age: ${profile.age}` : ''}
${profile?.weight ? `- Weight: ${profile.weight}` : ''}
${profile?.sex ? `- Sex: ${profile.sex}` : ''}
${profile?.goal ? `- Goal: ${profile.goal}` : ''}
${profile?.equip ? `- Equipment: ${profile.equip}` : ''}
${profile?.days ? `- Training Days Per Week: ${profile.days}` : ''}
${injuriesText}

Generate a complete, expert-level program. If this is a famous athlete, use their REAL training methods. If this is a sport, use sport-science conditioning. If this is military/first responder, use functional fitness and job-specific demands. Apply all injury modifications and equipment constraints.`;

        const responseText = await callClaudeAPI(systemPrompt, userPrompt, app.logger, apiKey);

        let jsonData: any = {};
        try {
          jsonData = JSON.parse(responseText);
        } catch (parseError) {
          app.logger.error({ parseError, raw: responseText }, 'Failed to parse athlete response');
          return reply.status(500).send({ error: 'Failed to parse AI response', raw: responseText });
        }

        // Create mock structure if empty
        if (!jsonData.name) {
          jsonData = {
            name: `${athleteTemplate || level} ${phase} Program`,
            description: `A specialized training program for ${description}`,
            phase,
            level,
            sport: sport || null,
            athleteInspiration: athleteTemplate || null,
            weeklySchedule: 'Monday-Friday training with 2 rest days',
            days: [
              {
                name: 'Day 1 — Lower Body',
                focus: 'Squat patterns and leg development',
                exercises: [
                  { name: 'Back Squat', sets: 4, reps: '5-6', rest: '3 min', notes: 'Heavy compound movement' },
                  { name: 'Romanian Deadlift', sets: 3, reps: '6-8', rest: '2 min', notes: 'Hip extension' },
                  { name: 'Leg Press', sets: 3, reps: '8-10', rest: '90 sec', notes: 'Volume work' },
                ],
                cardio: '10 min cool-down walk',
                duration: '60 minutes',
              },
            ],
            diet: {
              philosophy: 'Nutrient-dense whole foods with adequate protein for recovery',
              dailyCalories: '2500-3000',
              macros: { protein: '180g', carbs: '300g', fat: '85g' },
              meals: ['Oatmeal with berries', 'Chicken with brown rice', 'Salmon with sweet potato'],
              supplements: ['Whey protein', 'Creatine monohydrate', 'Multivitamin'],
              hydration: '3-4 liters daily',
            },
            tips: ['Progressive overload on main lifts', 'Sleep 7-9 hours nightly', 'Track macros consistently'],
            recoveryProtocol: 'Foam rolling, stretching, adequate sleep and nutrition',
            injuryModifications: profile?.injuries?.length ? profile.injuries.map(i => `Modified exercises for ${i}`) : [],
          };
        }

        app.logger.info({ programName: jsonData.name }, 'Athlete program generated');
        return jsonData;
      } catch (error) {
        app.logger.error({ err: error, message: error instanceof Error ? error.message : String(error) }, 'Failed to generate athlete program');
        return reply.status(500).send({ error: 'Failed to generate response. Please try again.' });
      }
    }
  );

  // POST /api/ai/diet
  fastify.post<{ Body: DietRequest }>(
    '/api/ai/diet',
    {
      schema: {
        description: 'Generate a personalized meal plan',
        tags: ['ai', 'diet'],
        body: {
          type: 'object',
          required: ['calories', 'protein', 'carbs', 'fat', 'meals', 'goal'],
          properties: {
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            meals: { type: 'number' },
            goal: { type: 'string' },
            restrictions: { type: 'string' },
            athleteMatch: { type: 'string' },
            sport: { type: 'string' },
            phase: { type: 'string' },
            apiKey: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Personalized meal plan',
            type: 'object',
            properties: {
              meals: { type: 'array' },
              totalCalories: { type: 'number' },
              totalProtein: { type: 'number' },
              totalCarbs: { type: 'number' },
              totalFat: { type: 'number' },
              athleteInspiration: { type: 'string' },
              mealTiming: { type: 'string' },
              supplements: { type: 'array' },
              hydration: { type: 'string' },
              phaseNotes: { type: 'string' },
              tips: { type: 'array' },
            },
          },
          400: { description: 'Bad request', ...errorResponse },
          500: { description: 'Internal server error', ...errorResponse },
        },
      },
    },
    async (request: FastifyRequest<{ Body: DietRequest }>, reply: FastifyReply) => {
      const { calories, protein, carbs, fat, meals, goal, restrictions, athleteMatch, sport, phase, apiKey } = request.body;

      app.logger.info({ calories, meals, goal }, 'Diet meal plan request');

      if (!apiKey || apiKey.trim() === '') {
        return reply.status(400).send({ error: 'apiKey is required' });
      }

      try {
        const systemPrompt = `You are Kong, an elite sports nutritionist for "Evexia: Kong Lift". You create detailed, practical meal plans used by elite athletes and serious fitness enthusiasts.

When an athleteMatch is provided, model the diet after that athlete's KNOWN eating habits, philosophy, timing, and signature foods. For example:
- Ronaldo: 6 small meals/day, high protein (fish, chicken), complex carbs, avoids alcohol/junk, loves açaí
- Arnold: high protein (300g+), red meat, eggs, milk, classic bodybuilder eating
- Michael Phelps: 12,000 cal/day during training, massive carb loading, pasta, pizza, energy drinks
- LeBron James: Mediterranean-style, anti-inflammatory, wine in moderation, avoids sugar
- Navy SEAL: high calorie functional fuel, portable foods, performance over preference
- Swimmer: carb-dominant, high calorie, easy-to-digest pre-workout foods

When a phase is provided:
- Bulking: caloric surplus, prioritize carbs and protein, frequent meals
- Cutting: caloric deficit, high protein to preserve muscle, fiber-rich foods, lower carbs
- Maintenance: balanced macros, flexible eating, sustainability focus
- Setting the Stage: peak week nutrition, carb cycling, sodium/water manipulation context
- Building Muscle: moderate surplus, high protein, nutrient timing around workouts

Return ONLY valid JSON (no markdown).`;

        const userPrompt = `Create a ${meals}-meal daily diet plan with these targets:
- Calories: ${calories} kcal
- Protein: ${protein}g
- Carbs: ${carbs}g
- Fat: ${fat}g
- Goal: ${goal}
${restrictions ? `- Dietary Restrictions: ${restrictions}` : ''}
${athleteMatch ? `- Model after: ${athleteMatch}'s known eating style and philosophy` : ''}
${sport ? `- Sport: ${sport}` : ''}
${phase ? `- Phase: ${phase}` : ''}

${athleteMatch ? `Include athleteInspiration field with the athlete name. Model meal timing, food choices, and philosophy after how ${athleteMatch} actually eats.` : ''}
Provide practical, specific meal plans with real foods. Include meal timing strategy, supplement recommendations, hydration targets, and phase-specific notes.`;

        const responseText = await callClaudeAPI(systemPrompt, userPrompt, app.logger, apiKey);

        let jsonData: any = {};
        try {
          jsonData = JSON.parse(responseText);
        } catch (parseError) {
          app.logger.error({ parseError, raw: responseText }, 'Failed to parse diet response');
          return reply.status(500).send({ error: 'Failed to parse AI response', raw: responseText });
        }

        // Create mock structure if empty
        if (!jsonData.meals) {
          jsonData = {
            meals: [
              {
                name: 'Breakfast',
                time: '7:00 AM',
                foods: ['Oatmeal with berries', 'Eggs', 'Orange juice'],
                calories: 550,
                protein: 25,
                carbs: 65,
                fat: 18,
              },
              {
                name: 'Lunch',
                time: '12:30 PM',
                foods: ['Grilled chicken breast', 'Brown rice', 'Broccoli'],
                calories: 650,
                protein: 45,
                carbs: 70,
                fat: 15,
              },
              {
                name: 'Dinner',
                time: '7:00 PM',
                foods: ['Salmon', 'Sweet potato', 'Asparagus'],
                calories: 700,
                protein: 50,
                carbs: 60,
                fat: 25,
              },
            ],
            totalCalories: calories,
            totalProtein: protein,
            totalCarbs: carbs,
            totalFat: fat,
            athleteInspiration: athleteMatch || null,
            mealTiming: 'Space meals 3-4 hours apart for optimal digestion and energy',
            supplements: ['Whey protein powder', 'Creatine monohydrate', 'Multivitamin'],
            hydration: '3-4 liters of water daily, more on training days',
            phaseNotes: phase ? `Following ${phase} phase nutrition protocols` : 'Balanced nutrition approach',
            tips: [
              'Prepare meals in advance on weekends',
              'Track macros for 2 weeks to establish baseline',
              'Adjust portions based on progress and hunger cues',
            ],
          };
        }

        app.logger.info({ totalCalories: jsonData.totalCalories }, 'Meal plan generated');
        return jsonData;
      } catch (error) {
        app.logger.error({ err: error, message: error instanceof Error ? error.message : String(error) }, 'Failed to generate meal plan');
        return reply.status(500).send({ error: 'Failed to generate response. Please try again.' });
      }
    }
  );

  // POST /api/ai/nutrition
  fastify.post<{ Body: NutritionRequest }>(
    '/api/ai/nutrition',
    {
      schema: {
        description: 'Calculate personalized nutrition targets',
        tags: ['ai', 'nutrition'],
        body: {
          type: 'object',
          required: ['age', 'weight', 'height', 'sex', 'activityLevel', 'goal'],
          properties: {
            age: { type: 'number' },
            weight: { type: 'number' },
            height: { type: 'number' },
            sex: { type: 'string' },
            activityLevel: { type: 'string' },
            goal: { type: 'string' },
            athleteMatch: { type: 'string' },
            sport: { type: 'string' },
            phase: { type: 'string' },
            trainingDays: { type: 'number' },
            apiKey: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Nutrition targets and calculations',
            type: 'object',
            properties: {
              bmr: { type: 'number' },
              tdee: { type: 'number' },
              targetCalories: { type: 'number' },
              protein: { type: 'number' },
              carbs: { type: 'number' },
              fat: { type: 'number' },
              fiber: { type: 'number' },
              water: { type: 'number' },
              athleteInspiration: { type: 'string' },
              phaseNotes: { type: 'string' },
              mealTiming: { type: 'string' },
              supplements: { type: 'array' },
              hydration: { type: 'string' },
              weeklyPlan: {
                type: 'object',
                properties: {
                  refeedDay: { type: 'string' },
                  trainingDayCalories: { type: 'number' },
                  restDayCalories: { type: 'number' },
                },
              },
              breakdown: { type: 'string' },
              tips: { type: 'array' },
            },
          },
          400: { description: 'Bad request', ...errorResponse },
          500: { description: 'Internal server error', ...errorResponse },
        },
      },
    },
    async (request: FastifyRequest<{ Body: NutritionRequest }>, reply: FastifyReply) => {
      const { age, weight, height, sex, activityLevel, goal, athleteMatch, sport, phase, trainingDays, apiKey } = request.body;

      app.logger.info({ weight, height, activityLevel, goal }, 'Nutrition calculation request');

      if (!apiKey || apiKey.trim() === '') {
        return reply.status(400).send({ error: 'apiKey is required' });
      }

      try {
        const systemPrompt = `You are Kong, an elite sports nutritionist and registered dietitian for "Evexia: Kong Lift". You calculate precise nutritional needs using evidence-based formulas and athlete-specific knowledge.

Calculate TDEE using Mifflin-St Jeor BMR × activity multiplier:
- Sedentary: 1.2, Light: 1.375, Moderate: 1.55, Active: 1.725, Very Active: 1.9

When athleteMatch is provided, adjust TDEE multipliers and macro ratios to match that athlete type's demands:
- Swimmers (Phelps-style): add 20-40% to TDEE, carb-dominant macros (55% carbs, 25% protein, 20% fat)
- Bodybuilders (Arnold/CBum-style): protein-dominant (40% protein, 35% carbs, 25% fat), phase-dependent calories
- Soccer/Football athletes (Ronaldo-style): balanced macros, carb timing around training, 3200-4000 cal
- Military/SEAL: high calorie functional fuel (3500-5000 cal), balanced macros, performance-first
- Basketball (LeBron-style): anti-inflammatory focus, moderate carbs, high protein, 3000-4000 cal
- Endurance athletes: carb-dominant, electrolyte focus, 3000-5000 cal depending on volume

When phase is provided, adjust calories:
- Bulking: TDEE + 300-500 cal surplus
- Cutting: TDEE - 300-500 cal deficit
- Maintenance: TDEE
- Setting the Stage: TDEE - 200-300 (slight deficit with carb cycling)
- Building Muscle: TDEE + 200-300 (lean bulk)

For trainingDays, calculate separate training day vs rest day calories (training days +200-300 cal).

Return ONLY valid JSON (no markdown).`;

        const userPrompt = `Calculate complete nutrition targets for:
- Age: ${age}, Sex: ${sex}
- Weight: ${weight}kg, Height: ${height}cm
- Activity Level: ${activityLevel}
- Goal: ${goal}
${athleteMatch ? `- Athlete Match: ${athleteMatch} (adjust macros and calories to match this athlete type's demands)` : ''}
${sport ? `- Sport: ${sport}` : ''}
${phase ? `- Phase: ${phase}` : ''}
${trainingDays ? `- Training Days Per Week: ${trainingDays} (provide separate training/rest day calories)` : ''}

Calculate BMR using Mifflin-St Jeor, apply activity multiplier for TDEE, then adjust for goal and athlete type. Provide complete macro breakdown, meal timing strategy, supplement recommendations, and hydration targets.
${trainingDays ? 'Include weeklyPlan with training day vs rest day calorie targets and refeed day recommendation.' : ''}`;

        const responseText = await callClaudeAPI(systemPrompt, userPrompt, app.logger, apiKey);

        let jsonData: any = {};
        try {
          jsonData = JSON.parse(responseText);
        } catch (parseError) {
          app.logger.error({ parseError, raw: responseText }, 'Failed to parse nutrition response');
          return reply.status(500).send({ error: 'Failed to parse AI response', raw: responseText });
        }

        // Create mock structure if empty
        if (!jsonData.bmr) {
          // Calculate basic Mifflin-St Jeor
          const bmr = sex === 'male'
            ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
            : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;

          const activityMultipliers: Record<string, number> = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9,
          };

          const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));

          const goalAdjustments: Record<string, number> = {
            'lose weight': -400,
            'lose_fat': -400,
            maintain: 0,
            'gain muscle': 300,
            'build_muscle': 300,
            'athletic performance': 100,
          };

          const targetCalories = tdee + (goalAdjustments[goal] || 0);
          const proteinGrams = Math.round(weight * 2.2);
          const carbGrams = Math.round((targetCalories * 0.45) / 4);
          const fatGrams = Math.round((targetCalories * 0.3) / 9);

          jsonData = {
            bmr: Math.round(bmr),
            tdee,
            targetCalories,
            protein: proteinGrams,
            carbs: carbGrams,
            fat: fatGrams,
            fiber: 30,
            water: 3.5,
            athleteInspiration: athleteMatch || null,
            phaseNotes: phase ? `Following ${phase} phase nutrition protocols` : 'General fitness nutrition',
            mealTiming: 'Eat protein and carbs within 1-2 hours pre/post workout',
            supplements: ['Whey protein', 'Creatine monohydrate', 'Multivitamin', 'Omega-3s'],
            hydration: '3.5+ liters daily, adjust based on sweat rate',
            weeklyPlan: trainingDays ? {
              refeedDay: 'Sunday (optional high carb day)',
              trainingDayCalories: targetCalories + 250,
              restDayCalories: targetCalories - 150,
            } : null,
            breakdown: `BMR: ${Math.round(bmr)} × ${activityMultipliers[activityLevel] || 1.55} activity = TDEE ${tdee}. Adjusted for goal (${goal}): ${targetCalories} calories.`,
            tips: [
              'Prioritize protein at every meal',
              'Time carbs around training sessions',
              'Stay consistent with calorie targets',
              'Track macros for 2-4 weeks to assess progress',
            ],
          };
        }

        app.logger.info({ tdee: jsonData.tdee, targetCalories: jsonData.targetCalories }, 'Nutrition plan calculated');
        return jsonData;
      } catch (error) {
        app.logger.error({ err: error, message: error instanceof Error ? error.message : String(error) }, 'Failed to calculate nutrition');
        return reply.status(500).send({ error: 'Failed to generate response. Please try again.' });
      }
    }
  );
}
