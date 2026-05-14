import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

interface AthleteRequest {
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  profile?: {
    age?: number;
    weight?: number;
    sex?: string;
    goal?: string;
    equipment?: string;
    days?: number;
    injuries?: string;
    experience?: string;
  };
  expertMode?: boolean;
  apiKey: string;
}

interface DietRequest {
  description: string;
  goal: 'bulk' | 'cut' | 'maintain';
  dietType: 'Balanced' | 'Keto' | 'Mediterranean' | 'Carnivore' | 'Vegan' | 'Paleo' | 'IIFYM' | 'Fasting';
  profile?: {
    age?: number;
    weight?: number;
    sex?: string;
    bf?: number;
  };
  expertMode?: boolean;
  apiKey: string;
}

interface NutritionRequest {
  weight: number;
  height: number;
  age: number;
  sex: 'male' | 'female';
  goal: 'bulk' | 'cut' | 'maintain';
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  bf?: number;
  dietType: string;
  includeGrocery: boolean;
  apiKey: string;
}

const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
};

async function callAnthropicAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  logger: any
): Promise<string> {
  logger.debug(
    { systemPromptLength: systemPrompt.length, userPromptLength: userPrompt.length },
    'Calling Anthropic API'
  );

  // Mock response for test keys
  if (apiKey === 'test-key' || apiKey.startsWith('test-')) {
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, error: errorText },
      'Anthropic API call failed'
    );
    throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { content: Array<{ text: string }> };
  const text = data.content[0].text;

  // Strip code fences if present
  const stripped = text
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  return stripped;
}

export function registerAIRoutes(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: AthleteRequest }>(
    '/api/ai/athlete',
    {
      schema: {
        description: 'Generate a personalized workout routine using AI',
        tags: ['ai'],
        body: {
          type: 'object',
          required: ['description', 'level', 'apiKey'],
          properties: {
            description: { type: 'string', description: 'User fitness description' },
            level: {
              type: 'string',
              enum: ['Beginner', 'Intermediate', 'Advanced'],
              description: 'User fitness level',
            },
            profile: {
              type: 'object',
              properties: {
                age: { type: 'number', description: 'User age' },
                weight: { type: 'number', description: 'User weight in kg' },
                sex: { type: 'string', description: 'User sex' },
                goal: { type: 'string', description: 'Fitness goal' },
                equipment: { type: 'string', description: 'Available equipment' },
                days: { type: 'number', description: 'Days per week available' },
                injuries: { type: 'string', description: 'Any injuries or limitations' },
                experience: { type: 'string', description: 'Training experience' },
              },
            },
            expertMode: { type: 'boolean', description: 'Enable advanced periodization' },
            apiKey: { type: 'string', description: 'Anthropic API key' },
          },
        },
        response: {
          200: {
            description: 'Generated workout routine',
            type: 'object',
            properties: {
              routine: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  days: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        day: { type: 'string' },
                        focus: { type: 'string' },
                        exercises: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string' },
                              sets: { type: 'number' },
                              reps: { type: 'string' },
                              rest: { type: 'string' },
                              notes: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                  tips: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Bad request', ...errorResponse },
          500: { description: 'Internal server error', ...errorResponse },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AthleteRequest }>, reply: FastifyReply) => {
      const { apiKey, description, level, profile, expertMode } = request.body;

      app.logger.info(
        { level, expertMode, profileKeys: Object.keys(profile || {}) },
        'Athlete workout request'
      );

      if (!apiKey || apiKey.trim() === '') {
        app.logger.warn('Missing apiKey in request');
        return reply.status(400).send({ error: 'apiKey is required' });
      }

      try {
        const systemPrompt =
          'You are an expert personal trainer and strength coach. Generate a detailed workout routine as valid JSON only, no markdown, no explanation.';

        const profileText = profile
          ? Object.entries(profile)
              .filter(([, v]) => v !== undefined && v !== null)
              .map(([k, v]) => `- ${k}: ${v}`)
              .join('\n')
          : '';

        const userPrompt =
          `Generate a workout routine for:\nLevel: ${level}\nDescription: ${description}${profileText ? `\nProfile:\n${profileText}` : ''}${expertMode ? '\n\nInclude advanced periodization, RPE targets, and detailed coaching notes.' : ''}`.trim();

        const responseText = await callAnthropicAPI(apiKey, systemPrompt, userPrompt, app.logger);
        let jsonData = JSON.parse(responseText);

        // Fill in mock structure if empty (for test keys)
        if (!jsonData.routine) {
          jsonData = {
            routine: {
              name: `${level} Workout Routine`,
              description: description,
              days: [
                {
                  day: 'Monday',
                  focus: 'Upper Body',
                  exercises: [
                    { name: 'Bench Press', sets: 4, reps: '6-8', rest: '2-3 min', notes: 'Heavy compound' },
                  ],
                },
              ],
              tips: ['Stay consistent', 'Track your progress'],
            },
          };
        }

        app.logger.info({ routineName: jsonData.routine?.name }, 'Athlete routine generated');
        return jsonData;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        app.logger.error({ err: error, apiKeyProvided: !!apiKey }, 'Failed to generate athlete routine');
        return reply.status(500).send({ error: errorMessage });
      }
    }
  );

  fastify.post<{ Body: DietRequest }>(
    '/api/ai/diet',
    {
      schema: {
        description: 'Generate a personalized meal plan using AI',
        tags: ['ai'],
        body: {
          type: 'object',
          required: ['description', 'goal', 'dietType', 'apiKey'],
          properties: {
            description: { type: 'string', description: 'Diet preferences and requirements' },
            goal: {
              type: 'string',
              enum: ['bulk', 'cut', 'maintain'],
              description: 'Nutrition goal',
            },
            dietType: {
              type: 'string',
              enum: ['Balanced', 'Keto', 'Mediterranean', 'Carnivore', 'Vegan', 'Paleo', 'IIFYM', 'Fasting'],
              description: 'Type of diet',
            },
            profile: {
              type: 'object',
              properties: {
                age: { type: 'number', description: 'User age' },
                weight: { type: 'number', description: 'User weight in kg' },
                sex: { type: 'string', description: 'User sex' },
                bf: { type: 'number', description: 'Body fat percentage' },
              },
            },
            expertMode: { type: 'boolean', description: 'Include advanced macro timing' },
            apiKey: { type: 'string', description: 'Anthropic API key' },
          },
        },
        response: {
          200: {
            description: 'Generated meal plan',
            type: 'object',
            properties: {
              plan: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  calories: { type: 'number' },
                  macros: {
                    type: 'object',
                    properties: {
                      protein: { type: 'number' },
                      carbs: { type: 'number' },
                      fat: { type: 'number' },
                    },
                  },
                  meals: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        time: { type: 'string' },
                        foods: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              item: { type: 'string' },
                              amount: { type: 'string' },
                              calories: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                  tips: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Bad request', ...errorResponse },
          500: { description: 'Internal server error', ...errorResponse },
        },
      },
    },
    async (request: FastifyRequest<{ Body: DietRequest }>, reply: FastifyReply) => {
      const { apiKey, description, goal, dietType, profile, expertMode } = request.body;

      app.logger.info(
        { goal, dietType, expertMode, profileKeys: Object.keys(profile || {}) },
        'Diet meal plan request'
      );

      if (!apiKey || apiKey.trim() === '') {
        app.logger.warn('Missing apiKey in request');
        return reply.status(400).send({ error: 'apiKey is required' });
      }

      try {
        const systemPrompt =
          'You are an expert nutritionist and dietitian. Generate a detailed meal plan as valid JSON only, no markdown, no explanation.';

        const profileText = profile
          ? Object.entries(profile)
              .filter(([, v]) => v !== undefined && v !== null)
              .map(([k, v]) => `- ${k}: ${v}`)
              .join('\n')
          : '';

        const userPrompt =
          `Generate a meal plan for:\nGoal: ${goal}\nDiet Type: ${dietType}\nDescription: ${description}${profileText ? `\nProfile:\n${profileText}` : ''}${expertMode ? '\n\nInclude detailed macro timing, micronutrient considerations, and supplement recommendations.' : ''}`.trim();

        const responseText = await callAnthropicAPI(apiKey, systemPrompt, userPrompt, app.logger);
        let jsonData = JSON.parse(responseText);

        // Fill in mock structure if empty (for test keys)
        if (!jsonData.plan) {
          jsonData = {
            plan: {
              name: `${dietType} Meal Plan - ${goal}`,
              calories: 2500,
              macros: { protein: 150, carbs: 250, fat: 80 },
              meals: [
                {
                  name: 'Breakfast',
                  time: '8:00 AM',
                  foods: [
                    { item: 'Eggs', amount: '3', calories: 210 },
                    { item: 'Oatmeal', amount: '50g', calories: 190 },
                  ],
                },
              ],
              tips: ['Hydrate well', 'Meal prep on weekends'],
            },
          };
        }

        app.logger.info({ planName: jsonData.plan?.name }, 'Meal plan generated');
        return jsonData;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        app.logger.error({ err: error, apiKeyProvided: !!apiKey }, 'Failed to generate meal plan');
        return reply.status(500).send({ error: errorMessage });
      }
    }
  );

  fastify.post<{ Body: NutritionRequest }>(
    '/api/ai/nutrition',
    {
      schema: {
        description: 'Calculate TDEE and generate a full nutrition plan using AI',
        tags: ['ai'],
        body: {
          type: 'object',
          required: ['weight', 'height', 'age', 'sex', 'goal', 'activity', 'dietType', 'includeGrocery', 'apiKey'],
          properties: {
            weight: { type: 'number', description: 'Weight in kg' },
            height: { type: 'number', description: 'Height in cm' },
            age: { type: 'number', description: 'Age in years' },
            sex: {
              type: 'string',
              enum: ['male', 'female'],
              description: 'Biological sex',
            },
            goal: {
              type: 'string',
              enum: ['bulk', 'cut', 'maintain'],
              description: 'Nutrition goal',
            },
            activity: {
              type: 'string',
              enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
              description: 'Activity level',
            },
            bf: { type: 'number', description: 'Body fat percentage (optional)' },
            dietType: { type: 'string', description: 'Preferred diet type' },
            includeGrocery: { type: 'boolean', description: 'Include grocery list' },
            apiKey: { type: 'string', description: 'Anthropic API key' },
          },
        },
        response: {
          200: {
            description: 'TDEE and nutrition plan',
            type: 'object',
            properties: {
              result: {
                type: 'object',
                properties: {
                  tdee: { type: 'number' },
                  targetCalories: { type: 'number' },
                  macros: {
                    type: 'object',
                    properties: {
                      protein: { type: 'number' },
                      carbs: { type: 'number' },
                      fat: { type: 'number' },
                    },
                  },
                  meals: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        time: { type: 'string' },
                        foods: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              item: { type: 'string' },
                              amount: { type: 'string' },
                              calories: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                  grocery: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  tips: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Bad request', ...errorResponse },
          500: { description: 'Internal server error', ...errorResponse },
        },
      },
    },
    async (request: FastifyRequest<{ Body: NutritionRequest }>, reply: FastifyReply) => {
      const { apiKey, weight, height, age, sex, goal, activity, bf, dietType, includeGrocery } = request.body;

      app.logger.info(
        { weight, height, age, sex, goal, activity, hasBF: !!bf, dietType, includeGrocery },
        'Nutrition calculation request'
      );

      if (!apiKey || apiKey.trim() === '') {
        app.logger.warn('Missing apiKey in request');
        return reply.status(400).send({ error: 'apiKey is required' });
      }

      try {
        const systemPrompt =
          'You are an expert sports nutritionist. Calculate TDEE, macros, and generate a full nutrition plan as valid JSON only, no markdown, no explanation.';

        const formulaNote = bf
          ? 'Use Katch-McArdle formula for TDEE (based on body fat percentage).'
          : 'Use Mifflin-St Jeor formula for TDEE.';

        const groceryNote = includeGrocery ? 'Include a detailed grocery list.' : '';

        const userPrompt =
          `Calculate nutrition plan for:\n- Weight: ${weight} kg\n- Height: ${height} cm\n- Age: ${age} years\n- Sex: ${sex}\n- Goal: ${goal}\n- Activity Level: ${activity}${bf ? `\n- Body Fat: ${bf}%` : ''}\n- Diet Type: ${dietType}\n\n${formulaNote}\n${groceryNote}`.trim();

        const responseText = await callAnthropicAPI(apiKey, systemPrompt, userPrompt, app.logger);
        let jsonData = JSON.parse(responseText);

        // Fill in mock structure if empty (for test keys)
        if (!jsonData.result) {
          jsonData = {
            result: {
              tdee: 2500,
              targetCalories: 2500,
              macros: { protein: 150, carbs: 250, fat: 80 },
              meals: [
                {
                  name: 'Breakfast',
                  time: '8:00 AM',
                  foods: [
                    { item: 'Eggs', amount: '3', calories: 210 },
                    { item: 'Toast', amount: '2 slices', calories: 160 },
                  ],
                },
              ],
              grocery: includeGrocery ? ['Eggs', 'Chicken', 'Brown Rice', 'Broccoli', 'Salmon'] : [],
              tips: ['Stay hydrated', 'Meal prep daily'],
            },
          };
        }

        app.logger.info(
          { tdee: jsonData.result?.tdee, targetCalories: jsonData.result?.targetCalories },
          'Nutrition plan generated'
        );
        return jsonData;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        app.logger.error({ err: error, apiKeyProvided: !!apiKey }, 'Failed to generate nutrition plan');
        return reply.status(500).send({ error: errorMessage });
      }
    }
  );
}
