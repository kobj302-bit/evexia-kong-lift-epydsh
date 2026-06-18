import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import type { App } from '../index.js';

interface AthleteRequest {
  description: string;
  level: string;
  phase: string;
  athleteTemplate?: string;
  sport?: string;
  trainingGoal?: string;
  useSurveyData?: boolean;
  profile?: {
    age?: number;
    weight?: number;
    sex?: string;
    goal?: string;
    equip?: string;
    days?: number;
    injuries?: string[];
  };
  // New optional customization fields
  planType?: string;
  ageBracket?: string;
  lifeStage?: string;
  focusAreas?: string[];
  holistic?: boolean;
  customCoach?: string;
  daysPerWeek?: number;
  sessionMinutes?: number;
  equipmentOverride?: string[];
  apiKey?: string;
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
  apiKey?: string;
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
  apiKey?: string;
}

interface ParseRoutineRequest {
  text?: string;
  image_base64?: string;
  image_mime?: string;
}

interface ParsedRoutine {
  name: string;
  daysPerWeek: number;
  emoji: string;
  description: string;
  days: Array<{
    name: string;
    exercises: string[];
  }>;
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
  logger: any
): Promise<string> {
  logger.debug(
    { systemPromptLength: systemPrompt.length, userPromptLength: userPrompt.length },
    'Calling Claude API via gateway'
  );

  try {
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4-5'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Strip markdown code fences
    const stripped = text
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    return stripped;
  } catch (error) {
    logger.warn({ err: error }, 'Claude API call failed, using mock response');
    return '';
  }
}

async function callOpenRouterAPI(
  systemPrompt: string,
  messageContent: any,
  logger: any,
  timeoutMs: number = 60000
): Promise<string> {
  logger.debug(
    { systemPromptLength: systemPrompt.length, timeoutMs },
    'Calling OpenRouter API'
  );

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logger.warn('OPENROUTER_API_KEY environment variable not set, using mock response');
    return '';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: messageContent,
          },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.text();
      logger.warn(
        { statusCode: response.status, error: errorData },
        'OpenRouter API error, using mock response'
      );
      return '';
    }

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences
    const stripped = text
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    return stripped;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn({ timeoutMs }, 'OpenRouter API call timeout, using mock response');
    } else {
      logger.warn({ err: error }, 'OpenRouter API call failed, using mock response');
    }
    return '';
  }
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
            trainingGoal: { type: 'string', enum: ['Cutting', 'Maintenance', 'Bulking', 'Muscle Building', 'Overall Strength'] },
            useSurveyData: { type: 'boolean', default: true },
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
            planType: {
              type: 'string',
              enum: ['strength_hypertrophy', 'military_tactical', 'athletic_sport', 'holistic_wellness', 'mobility_recovery', 'endurance_cardio', 'powerlifting', 'calisthenics', 'combat_sports', 'longevity', 'custom'],
            },
            ageBracket: {
              type: 'string',
              enum: ['under_30', '30s', '40s', '50s', '60_plus'],
            },
            lifeStage: { type: 'string' },
            focusAreas: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Strength', 'Hypertrophy', 'Speed', 'Power', 'Mobility', 'Recovery', 'Mental', 'Conditioning', 'Skill', 'Flexibility', 'Balance', 'Endurance'],
              },
            },
            holistic: { type: 'boolean', default: false },
            customCoach: { type: 'string' },
            daysPerWeek: { type: 'number', minimum: 2, maximum: 7 },
            sessionMinutes: { type: 'number' },
            equipmentOverride: { type: 'array', items: { type: 'string' } },
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
      const {
        description,
        level,
        phase,
        athleteTemplate,
        sport,
        trainingGoal,
        useSurveyData = true,
        profile,
        planType,
        ageBracket,
        lifeStage,
        focusAreas,
        holistic,
        customCoach,
        daysPerWeek,
        sessionMinutes,
        equipmentOverride,
      } = request.body;

      app.logger.info(
        {
          level,
          phase,
          athleteTemplate,
          trainingGoal,
          useSurveyData,
          planType,
          ageBracket,
          holistic,
          customCoach,
          daysPerWeek,
          sessionMinutes,
        },
        'Athlete program generation request'
      );

      // Validate trainingGoal if provided
      if (trainingGoal) {
        const validTrainingGoals = ['Cutting', 'Maintenance', 'Bulking', 'Muscle Building', 'Overall Strength'];
        if (!validTrainingGoals.includes(trainingGoal)) {
          return reply.status(400).send({
            error: 'Invalid trainingGoal. Must be one of: Cutting, Maintenance, Bulking, Muscle Building, Overall Strength'
          });
        }
      }

      try {
        // Build dynamic system prompt based on all provided fields

        // 1. Plan Type Insights
        let planTypeInsights = '';
        if (planType) {
          const planTypeMap: Record<string, string> = {
            strength_hypertrophy:
              'PLAN TYPE: Strength & Hypertrophy — classic progressive overload, compound lifts (squat, bench, deadlift), hypertrophy rep ranges (6–12), periodization blocks, volume emphasis.',
            military_tactical:
              'PLAN TYPE: Military Tactical — ruck marches, calisthenics circuits, combat conditioning, functional fitness, PT tests (push-ups, pull-ups, runs), mental toughness blocks, movement under load.',
            athletic_sport:
              'PLAN TYPE: Athletic Sport — sport-specific conditioning, explosive power, agility, speed work, sport skill integration, deceleration training, injury prevention for the sport.',
            holistic_wellness:
              'PLAN TYPE: Holistic Wellness — blend lifting + yoga + breathwork + walking + sleep guidance, balance all pillars of health, focus on movement quality and recovery.',
            mobility_recovery:
              'PLAN TYPE: Mobility & Recovery — primarily mobility flows, soft-tissue work, stretching, low-intensity movement, fascia release, breathwork, restoration.',
            endurance_cardio:
              'PLAN TYPE: Endurance & Cardio — zone-2 base building, tempo runs, long slow distance, VO2max intervals, aerobic periodization, cardiac adaptation.',
            powerlifting:
              'PLAN TYPE: Powerlifting — squat/bench/deadlift focus, heavy triples/singles, RPE-based loading, competition prep structure, peak-week peaking.',
            calisthenics:
              'PLAN TYPE: Calisthenics — bodyweight progressions (planche, front lever, handstand, muscle-up), skill work, ring training, leverage gains.',
            combat_sports:
              'PLAN TYPE: Combat Sports — striking + grappling conditioning, bag work, sparring prep, explosive circuits, fight camp structure, sport-specific conditioning.',
            longevity:
              'PLAN TYPE: Longevity — Bryan-Johnson/Peter-Attia style: zone-2 cardio, strength minimums, mobility, bone density, VO2max, sleep optimization, biomarker awareness.',
            custom: 'PLAN TYPE: Custom — use description and other contextual fields to determine the optimal structure.',
          };
          planTypeInsights = `\n${planTypeMap[planType] || ''}`;
        }

        // 2. Age Bracket Tailoring
        let ageBracketInsights = '';
        if (ageBracket) {
          const ageBracketMap: Record<string, string> = {
            'under_30':
              'AGE BRACKET: Under 30 — high intensity tolerated, fast progression acceptable, minimal extra warm-up emphasis, peak performance years.',
            '30s': 'AGE BRACKET: 30s — solid training intensity, beginning joint awareness, standard warm-ups, balanced recovery.',
            '40s': 'AGE BRACKET: 40s — moderate intensity emphasized, joint-friendly variants encouraged (trap bar over conventional deadlift, neutral-grip presses), warm-up/cool-down blocks, deload every 4th week.',
            '50s': 'AGE BRACKET: 50s — more mobility work integral to sessions, joint-sparing variants mandatory (trap bar deadlifts, neutral-grip presses, goblet squats), longer warm-ups, deload every 3rd week, explicit recovery days.',
            '60_plus':
              'AGE BRACKET: 60+ — balance work, fall prevention priority, bone-density-focused lifts (weighted carries, step-ups, hip hinge), easier conditioning, chair-assisted options, very explicit warm-up/cool-down, deload every 2nd–3rd week.',
          };
          ageBracketInsights = `\n${ageBracketMap[ageBracket] || ''}`;
        }

        // 3. Life Stage Context
        let lifeStageInsights = '';
        if (lifeStage) {
          lifeStageInsights = `\nLIFE STAGE: ${lifeStage} — tailor programming intensity, volume, and recovery expectations to this life phase.`;
        }

        // 4. Focus Areas Emphasis
        let focusAreasInsights = '';
        if (focusAreas && focusAreas.length > 0) {
          focusAreasInsights = `\nFOCUS AREAS (prioritize these): ${focusAreas.join(', ')} — weight weekly day allocation toward these areas. If mobility/recovery heavy, more yoga/mobility days, fewer pure strength days. If strength/power heavy, more compound lift days.`;
        }

        // 5. Holistic Mode Rules
        let holisticInsights = '';
        if (holistic) {
          holisticInsights = `\nHOLISTIC MODE ENABLED — MANDATORY REQUIREMENTS:
- MUST include at least one dedicated yoga/mobility day in the weekly schedule.
- MUST include at least one active-recovery / breathwork block (can be a day or a session block).
- tips MUST include sleep-and-stress guidance (e.g., 7–9 hours sleep, HRV tracking, stress management).
- recoveryProtocol MUST be a detailed paragraph (not just a sentence).
- exercises on holistic days can be yoga poses, breathwork drills, mobility flows — use the name/sets/reps/rest/notes format creatively (e.g., { name: "Box breathing 4-4-4-4", sets: 1, reps: "5 min", rest: "—", notes: "Inhale 4, hold 4, exhale 4, hold 4" }).`;
        }

        // 6. Custom Coach / Coach Philosophy
        let coachInsights = '';
        if (customCoach) {
          coachInsights = `\nCUSTOM COACH: ${customCoach} — surface this coach's name and philosophy in the athleteInspiration field. Let their known methodology shape exercise selection and program structure. Examples:
- David Goggins → ultra-endurance, mental toughness, high-volume running + calisthenics.
- Jocko Willink → disciplined compound lifts, work capacity, minimal fluff.
- Andrew Huberman → sleep/stress optimization, science-backed periodization, neuroplasticity focus.
- Jeff Cavaliere (AthleanX) → anatomically-sound exercise selection, injury prevention, technical mastery.
- Chris Heria → calisthenics skill progressions, street workout style, functional fitness.
- Bryan Johnson Blueprint → longevity focus, biomarkers, zone-2 cardio, strength minimums.
- Peter Attia → VO2max, strength, longevity, precision cardiovascular training.`;
        }

        // 7. Days Per Week Override
        let daysPerWeekInsights = '';
        if (daysPerWeek) {
          daysPerWeekInsights = `\nDAYS PER WEEK OVERRIDE: ${daysPerWeek} training days — build the weekly schedule with exactly ${daysPerWeek} training days.`;
        }

        // 8. Session Minutes / Duration
        let sessionMinutesInsights = '';
        if (sessionMinutes) {
          sessionMinutesInsights = `\nSESSION DURATION TARGET: ${sessionMinutes} minutes per session — design each day's exercises and rep schemes to fit within approximately ${sessionMinutes} minutes. Include duration field on each day reflecting this target.`;
        }

        // 9. Equipment Override
        let equipmentOverrideInsights = '';
        if (equipmentOverride) {
          equipmentOverrideInsights = `\nEQUIPMENT OVERRIDE — NEVER prescribe exercises requiring equipment outside this list:
- Available Equipment: ${equipmentOverride.join(', ')}
- Only use exercises compatible with this equipment. Substitute alternatives if needed.`;
        }

        // 10. Training Goal Insights (existing logic)
        let trainingGoalInsights = '';
        if (trainingGoal === 'Cutting') {
          trainingGoalInsights = `\nTRAINING GOAL: Cutting — design a program with calorie deficit focus, muscle retention emphasis, progressive overload on main lifts, and moderate conditioning. The diet must reflect a deficit with high protein (1.2-1.5g/lb) to preserve muscle. Include more conditioning work and fat-loss metabolic resistance training. Reflect this in diet.dailyCalories (deficit) and macros.`;
        } else if (trainingGoal === 'Maintenance') {
          trainingGoalInsights = `\nTRAINING GOAL: Maintenance — sustain current physique with balanced volume, maintenance calories, and maintenance macros. Include skill work, deload integration, and recovery focus. The diet must reflect maintenance calorie targets with balanced macros.`;
        } else if (trainingGoal === 'Bulking') {
          trainingGoalInsights = `\nTRAINING GOAL: Bulking — design a program with calorie surplus focus, hypertrophy emphasis, progressive overload, and higher volume. The diet must reflect a surplus (300-500+ cal above TDEE) with high protein, abundant carbs, and adequate fat. Emphasize quality mass gain and nutrient density.`;
        } else if (trainingGoal === 'Muscle Building') {
          trainingGoalInsights = `\nTRAINING GOAL: Muscle Building — hard-focus hypertrophy program with 8-15 rep ranges, high volume accumulation, progressive overload, and time-under-tension cues. Include supersets, drop sets, and rest-pause sets. The diet must reflect a surplus with emphasis on carbs around training, high protein, and meal frequency for recovery and muscle protein synthesis.`;
        } else if (trainingGoal === 'Overall Strength') {
          trainingGoalInsights = `\nTRAINING GOAL: Overall Strength — CrossFit-style hybrid program combining compound lifts, endurance/cardio, conditioning, and bodyweight strength. The weekly schedule MUST include BOTH dedicated strength days (compound lifts, power development) AND cardiovascular/endurance days (running, rowing, sled pushes, Zone 2 training, intervals). This hybrid structure balances max strength with work capacity and conditioning. Mention this hybrid structure explicitly in the description and weeklySchedule.`;
        }

        // Build injury safety instructions only if useSurveyData is true AND injuries are provided
        let injurySafetyInsights = '';
        const hasInjuries = useSurveyData && profile?.injuries && profile.injuries.length > 0 && !profile.injuries.every(i => i.toLowerCase() === 'none');
        if (hasInjuries) {
          const injuryList = profile.injuries.join(', ');
          injurySafetyInsights = `INJURY SAFETY PROTOCOL: The user has reported injuries/limitations: ${injuryList}. You MUST:
- Avoid contraindicated exercises for each injury area. Examples:
  - Lower Back → no heavy back squats or conventional deadlifts; substitute goblet squats, hip thrusts, trap-bar deadlifts, Romanian deadlifts.
  - Shoulders → no overhead press or upright rows; substitute landmine press, neutral-grip DB press, cable flyes.
  - Knees → no deep squats or lunges; substitute leg press (partial range), step-ups, seated leg curl.
  - Apply similar logic for any other injury area mentioned.
- Populate injuryModifications[] with concrete exercise swaps and a "why" explanation for each substitution.
- Cap intensity — avoid 1RM testing or max-effort sets when injuries are present.`;
        }

        // Build equipment constraints only if useSurveyData is true
        let equipmentInsights = '';
        if (useSurveyData && profile?.equip) {
          equipmentInsights = `EQUIPMENT CONSTRAINTS — NEVER prescribe exercises requiring equipment the user doesn't have:
- Available Equipment: ${profile.equip}
- Only use exercises compatible with available equipment. If equipment is limited, substitute with appropriate alternatives.`;
        }

        // Build profile context only if useSurveyData is true
        let profileContext = '';
        if (useSurveyData && profile) {
          const profileParts = [];
          if (profile.age) profileParts.push(`Age: ${profile.age}`);
          if (profile.weight) profileParts.push(`Weight: ${profile.weight}${typeof profile.weight === 'number' && profile.weight > 200 ? 'kg' : 'kg'}`);
          if (profile.sex) profileParts.push(`Sex: ${profile.sex}`);
          if (profile.goal) profileParts.push(`User Goal: ${profile.goal}`);
          if (profile.days) profileParts.push(`Training Days Per Week: ${profile.days}`);
          if (profileParts.length > 0) {
            profileContext = `USER PROFILE (use these for personalization): ${profileParts.join(', ')}`;
          }
        }

        const baseSystemPrompt = `You are an elite strength & conditioning coach, sports scientist, and certified personal trainer with 30+ years of experience programming for every population imaginable. You generate complete, periodized workout programs in JSON.

AUTO-DETECT ARCHETYPE: If the user's description mentions a famous athlete, sport, military branch, age group, or goal keyword, automatically apply the matching archetype even if not explicitly tagged.

FAMOUS ATHLETE PROGRAMS — use their REAL documented training methods:
- Cristiano Ronaldo: high-volume sprint intervals, plyometrics, core stability, 3-4x/week strength, 5-6x/week cardio, explosive leg work
- Arnold Schwarzenegger: Golden Era 6-day double-split, high volume (20+ sets/muscle), compound + isolation, mind-muscle connection
- LeBron James: athletic performance, mobility, explosive power, recovery-focused, sport-specific conditioning
- Michael Phelps: swim-specific dryland, core, shoulder stability, high-volume aerobic base
- Tyson Fury: boxing conditioning, roadwork, sparring simulation, strength endurance
- Chris Bumstead: Classic Physique PPL, aesthetic focus, shoulder/back/quad emphasis, contest prep periodization
- Conor McGregor: MMA conditioning, movement patterns, explosive power, striking-specific strength
- Khabib Nurmagomedov: wrestling-based strength, grappling endurance, high-volume GPP
- Usain Bolt: sprint mechanics, power development, plyometrics, minimal unnecessary volume
- Serena Williams: tennis-specific power, agility, upper-body strength, mental toughness conditioning
- Tom Brady: pliability-focused, TB12 method, resistance bands, anti-inflammatory approach, longevity
- Mike Tyson: explosive power, neck training, calisthenics, peekaboo style conditioning
- Bruce Lee: functional strength, isometrics, explosive speed, full-body integration
- David Goggins: ultra-endurance, mental toughness, high-volume running + calisthenics
- Jay Cutler: 4-day split, high volume, mass-building, off-season bulk focus
- Ronnie Coleman: YEAH BUDDY heavy compound lifts, 6-day split, extreme volume
- Dorian Yates: HIT (High Intensity Training), low volume high intensity, blood and guts style
- Kai Greene: artistic bodybuilding, mind-muscle, high volume, posing as training
- Tom Platz: legendary leg training, ultra-high rep squats, quad dominance
- Phil Heath: symmetry-focused, detail work, contest prep precision

SPORTS — apply sport-science-backed periodization for each:
- Soccer/Football: aerobic base, sprint intervals, agility, lower body power, injury prevention (hamstrings/ACL)
- American Football by position: QB (shoulder stability, footwork, core), RB (explosion, contact prep), WR (route running speed, hands), Lineman (max strength, leverage, push power), DB (backpedal, change of direction, tackling)
- Basketball: vertical jump, lateral quickness, conditioning, upper body for contact
- Wrestling (folkstyle/freestyle/Greco): explosive strength, grip, neck, conditioning, weight management
- Swimming (sprint/distance/IM): dryland strength, shoulder health, core, aerobic/anaerobic balance
- Rugby (forwards/backs): forwards=max strength + contact; backs=speed + agility + endurance
- Boxing: punch power, footwork, head movement conditioning, aerobic/anaerobic intervals
- MMA: striking power, grappling strength, cage work conditioning, fight camp periodization
- BJJ: grip strength, hip mobility, explosive scrambles, aerobic base
- Track & Field: sprints (power/speed), jumps (plyometrics/approach), throws (rotational power), distance (aerobic periodization)
- Tennis: rotational power, lateral movement, shoulder health, on-court conditioning
- Golf: rotational power, hip mobility, core stability, shoulder health
- Volleyball: vertical jump, shoulder stability, lateral movement
- Baseball: rotational power, arm care, hip mobility, position-specific demands
- Hockey: skating power, edge work simulation, upper body, anaerobic conditioning
- Lacrosse: multi-directional speed, stick skills conditioning, upper body endurance
- CrossFit: GPP, metcons, Olympic lifting, gymnastics skills, engine building
- Powerlifting: squat/bench/deadlift specificity, peaking, competition prep
- Olympic Lifting: snatch/clean & jerk technique, positional strength, explosive power
- Strongman: event-specific (log press, atlas stones, farmer's carry, yoke), max strength + conditioning
- Climbing: finger strength, pulling power, antagonist balance, footwork
- Cycling: power output, VO2max, threshold work, leg strength
- Triathlon: swim/bike/run periodization, brick workouts, transition fitness
- Skiing: leg power, balance, core stability, injury prevention
- Surfing: paddle fitness, pop-up power, balance, rotational strength
- Skateboarding: lower body power, balance, ankle stability
- Gymnastics: bodyweight mastery, flexibility, strength-to-weight, skill progressions
- Cheer: tumbling strength, stunting power, flexibility, conditioning

MILITARY / FIRST RESPONDER / TACTICAL:
- Navy SEAL BUD/S prep: 4-mile timed runs, ocean swims, PT tests, log PT simulation, mental toughness volume
- Army Ranger RASP: ruck marching, obstacle course prep, ACFT optimization, combat conditioning
- Marine Recon: CFT/PFT excellence, combat swimming, load-bearing endurance
- Green Beret SFAS: sustained effort, land navigation fitness, team events prep
- Air Force PJ: pararescue fitness, PAST test prep, combat dive conditioning
- Coast Guard rescue swimmer: swim fitness, rescue conditioning, PAST-style prep
- Firefighter CPAT: stair climb, hose drag, equipment carry, ladder raise, forcible entry simulation
- Police academy: PT test prep, defensive tactics conditioning, foot pursuit fitness
- SWAT: tactical fitness, obstacle courses, load-bearing, shooting stability
- Military entrance tests: Army ACFT, Navy PRT, Marine PFT, Air Force PT test — optimize each component

AGE-SPECIFIC PROGRAMS:
- Youth (12-17): growth-plate-safe, NO 1RM testing, technique focus, bodyweight + light loads, fun and athletic development
- Young adult (18-30): full training spectrum, peak performance focus
- Masters (40+): joint-friendly progressions, more warmup sets, longer recovery, mobility emphasis, hormone-aware programming
- Seniors (60+): mobility, balance, fall prevention, sarcopenia prevention, functional movement, low-impact options
- Pre-natal: trimester-appropriate modifications, avoid supine after T1, core safety, consult doctor disclaimer
- Post-natal: pelvic floor recovery, diastasis recti awareness, gradual return, consult doctor disclaimer

GOAL-SPECIFIC PROGRAMS:
- Pure strength: 5/3/1, Texas Method, Sheiko, Starting Strength, GZCLP
- Hypertrophy/bodybuilding: PPL, bro split, FST-7, DC Training, Hany Rambod methods, PHUL, PHAT
- Powerlifting: Westside Barbell, RTS, Conjugate, Sheiko, Candito
- Olympic lifting: Bulgarian method, American method, Catalyst Athletics style
- Athletic power: triphasic training, French contrast, plyometric periodization
- Fat loss: metabolic resistance training, HIIT, caloric deficit programming
- Recomposition: concurrent training, body recomp protocols
- Posture correction: upper/lower crossed syndrome correction, thoracic mobility, hip flexor work
- Rehab programs: lower back (McGill Big 3, deload, gradual loading), shoulder (rotator cuff, scapular stability), knee (VMO, quad/hamstring balance), return-to-running, return-from-injury, prehab

BODYBUILDING PHASES:
- Bulking (lean): slight surplus, strength + hypertrophy, minimize fat gain
- Bulking (dirty): aggressive surplus, maximum mass, accept fat gain
- Cutting: caloric deficit, maintain muscle, cardio integration, strength maintenance
- Maintenance: balanced approach, skill work, deload integration
- Peak week: water/carb manipulation, final conditioning, posing prep
- Hypertrophy block: volume accumulation, progressive overload
- Mini-cut: short aggressive deficit, 4-8 weeks
- Reverse diet: gradual calorie increase post-cut, metabolic restoration

${trainingGoalInsights}${planTypeInsights}${ageBracketInsights}${lifeStageInsights}${focusAreasInsights}${holisticInsights}${coachInsights}${daysPerWeekInsights}${sessionMinutesInsights}${equipmentOverrideInsights}

${profileContext ? `\n${profileContext}` : ''}

LEVEL SCALING — ALWAYS apply:
- Beginner: lower volume (3 sets), simpler compound movements, no advanced techniques, RPE 6-7
- Intermediate: moderate volume (4 sets), compound + isolation, occasional intensifiers, RPE 7-8
- Advanced: high volume (5+ sets), advanced techniques (drop sets, supersets, rest-pause, RPE-based loading, periodization blocks), RPE 8-9+

${hasInjuries ? `\n${injurySafetyInsights}` : `INJURY MODIFICATIONS — ALWAYS substitute conflicting exercises and include modifications in injuryModifications field:
- Knee issues: avoid deep knee flexion, substitute leg press for squat, step-ups over lunges
- Hip issues: avoid hip impingement positions, substitute RDL for conventional deadlift
- Lower back: McGill-safe movements, avoid loaded flexion, substitute trap bar deadlift
- Shoulder: avoid overhead if impingement, substitute neutral-grip press, rotator cuff prehab
- Elbow: avoid full extension under load, substitute hammer curls, reduce tricep extension range
- Wrist: use dumbbells over barbell, wrist wraps, avoid wrist extension under load
- Ankle: avoid single-leg balance if unstable, seated calf work, proprioception progressions
- Hernia: avoid Valsalva, reduce intra-abdominal pressure, no heavy compound lifts
- Post-surgery: conservative loading, cleared movements only, progressive return protocol`}

DIET SECTION — ALWAYS include a complete diet section aligned with the phase, sport, athlete, and goal.

LEGAL DISCLAIMER — ALWAYS append as the final tips element: "Not medical advice. Consult a licensed physician before starting any new program — especially if you have injuries, are pregnant, or have a chronic condition."

RETURN ONLY VALID JSON. No markdown. No explanation. No code fences.`;

        // Build user prompt
        const userPromptParts = [
          `Create a workout program with the following details:`,
          `- Description/Goal: ${description}`,
          `- Training Level: ${level}`,
          `- Phase: ${phase}`,
        ];

        if (athleteTemplate) userPromptParts.push(`- Athlete Inspiration: ${athleteTemplate}`);
        if (sport) userPromptParts.push(`- Sport: ${sport}`);
        if (trainingGoal) userPromptParts.push(`- Training Goal: ${trainingGoal}`);
        if (planType) userPromptParts.push(`- Plan Type: ${planType}`);
        if (ageBracket) userPromptParts.push(`- Age Bracket: ${ageBracket}`);
        if (lifeStage) userPromptParts.push(`- Life Stage: ${lifeStage}`);
        if (focusAreas && focusAreas.length > 0) userPromptParts.push(`- Focus Areas: ${focusAreas.join(', ')}`);
        if (holistic) userPromptParts.push(`- Holistic Mode: ENABLED (include yoga/mobility/breathwork)`);
        if (customCoach) userPromptParts.push(`- Custom Coach: ${customCoach}`);
        if (daysPerWeek) userPromptParts.push(`- Training Days Per Week: ${daysPerWeek}`);
        if (sessionMinutes) userPromptParts.push(`- Target Session Duration: ${sessionMinutes} minutes`);
        if (equipmentOverride && equipmentOverride.length > 0) userPromptParts.push(`- Equipment Available: ${equipmentOverride.join(', ')}`);

        if (useSurveyData && profile) {
          if (profile.age) userPromptParts.push(`- Age: ${profile.age}`);
          if (profile.weight) userPromptParts.push(`- Weight: ${profile.weight}`);
          if (profile.sex) userPromptParts.push(`- Sex: ${profile.sex}`);
          if (profile.goal) userPromptParts.push(`- Goal: ${profile.goal}`);
          if (profile.equip && !equipmentOverride) userPromptParts.push(`- Equipment: ${profile.equip}`);
          if (profile.days && !daysPerWeek) userPromptParts.push(`- Training Days Per Week: ${profile.days}`);
          if (hasInjuries) userPromptParts.push(`- Injuries/Limitations: ${profile.injuries.join(', ')}`);
        }

        userPromptParts.push('');
        userPromptParts.push('Generate a complete, expert-level program incorporating ALL specified parameters. Use their real training methodologies, sport science, and military protocols as needed. Apply all injury modifications, equipment constraints, and holistic requirements.');

        const userPrompt = userPromptParts.join('\n');
        const systemPrompt = baseSystemPrompt;

        const responseText = await callClaudeAPI(systemPrompt, userPrompt, app.logger);

        let jsonData: any = {};
        if (responseText) {
          try {
            jsonData = JSON.parse(responseText);
          } catch (parseError) {
            app.logger.warn({ parseError, raw: responseText }, 'Failed to parse athlete response, using mock');
            jsonData = {};
          }
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

        // Add survey data tip if useSurveyData is false or profile is missing
        if (!useSurveyData || !profile) {
          if (!Array.isArray(jsonData.tips)) {
            jsonData.tips = [];
          }
          const surveyTip = 'Survey data was not used — exercise selection is generic. Modify based on your own limits.';
          if (!jsonData.tips.includes(surveyTip)) {
            jsonData.tips.push(surveyTip);
          }
        }

        // ALWAYS add legal disclaimer as the final tip
        if (!Array.isArray(jsonData.tips)) {
          jsonData.tips = [];
        }
        const legalDisclaimer =
          'Not medical advice. Consult a licensed physician before starting any new program — especially if you have injuries, are pregnant, or have a chronic condition.';
        if (!jsonData.tips.includes(legalDisclaimer)) {
          jsonData.tips.push(legalDisclaimer);
        }

        app.logger.info(
          {
            programName: jsonData.name,
            useSurveyData,
            hasProfile: !!profile,
            planType,
            ageBracket,
            holistic,
          },
          'Athlete program generated'
        );
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
      const { calories, protein, carbs, fat, meals, goal, restrictions, athleteMatch, sport, phase } = request.body;

      app.logger.info({ calories, meals, goal }, 'Diet meal plan request');

      try {
        const systemPrompt = `You are a registered sports dietitian and nutrition scientist with expertise in fueling every type of athlete, military operator, and fitness population. You generate complete, personalized diet plans in JSON.

AUTO-DETECT CONTEXT: Match the diet to the athlete archetype, sport, military role, age group, or goal detected from the user's description.

FAMOUS ATHLETE DIETS — use their REAL documented approaches:
- Cristiano Ronaldo: Mediterranean-style, 6 small meals/day, high protein (fish, chicken), complex carbs, avoids sugar and alcohol, heavy hydration
- Arnold Schwarzenegger: classic bulk diet, high protein (1.5g/lb), whole eggs, red meat, milk, high calories, simple and compound carbs
- LeBron James: $1.5M/year recovery diet, anti-inflammatory foods, wine in moderation, carb cycling, elite recovery nutrition, no junk food
- Michael Phelps: ~10,000 calories/day during training, massive carb intake (pasta, pizza, energy drinks), high protein, frequent meals
- Chris Bumstead: classic physique contest prep, precise macro tracking, carb cycling, peak week water/sodium manipulation, off-season lean bulk
- Tyson Fury: high-calorie bulk between fights, weight cut protocol for fight camp, high protein, carb loading pre-fight
- Conor McGregor: precision nutrition, weight cutting expertise, high protein, anti-inflammatory, performance-focused
- David Goggins: functional nutrition for ultra-endurance, high carb on long days, protein for recovery, minimal processed food
- Tom Brady: TB12 method, 80% alkaline plant-based, no sugar/alcohol/caffeine/gluten/dairy, anti-inflammatory focus
- Ronnie Coleman: extreme bulk calories (5000-8000+), high protein, frequent meals, supplements-heavy
- Dorian Yates: HIT-aligned nutrition, precise protein timing, moderate carbs, controlled surplus

SPORT-SPECIFIC FUELING:
- Endurance (cycling, triathlon, distance running): carb-loading protocols, 60-90g carbs/hour during exercise, electrolyte management, glycogen periodization
- Weight-class athletes (wrestling, boxing, MMA, powerlifting): making weight safely, water cut protocols, rapid rehydration and refueling post-weigh-in
- Strength athletes (powerlifting, strongman, Olympic lifting): caloric surplus, high protein (0.8-1g/lb), creatine, peri-workout nutrition
- Team sports (soccer, basketball, football): game-day nutrition, travel nutrition, recovery between games, carb periodization
- Combat sports peri-fight nutrition: fight camp cutting, weigh-in recovery, fight night fueling
- Swimming: high calorie needs, carb-dominant, frequent meals, hydration in pool environment
- CrossFit: mixed demands, carb + protein balance, performance and body composition goals

MILITARY / FIRST RESPONDER FUELING:
- Shift work nutrition: meal timing around irregular schedules, portable high-protein options, caffeine strategy
- High-output training days: increased carb intake, pre/intra/post workout nutrition
- Field/deployment conditions: shelf-stable options, MRE optimization, maintaining performance under stress
- SEAL/Ranger/Recon: extreme caloric demands during selection, recovery nutrition, sustained performance

AGE-SPECIFIC NUTRITION:
- Youth (12-17): adequate calories for growth, calcium and vitamin D priority, protein for development, no extreme cuts
- Young adult (18-30): performance optimization, body composition goals, full nutritional spectrum
- Masters (40+): increased protein needs (1.2-1.6g/kg), omega-3s for joint health, vitamin D, creatine for muscle preservation
- Seniors (60+): sarcopenia prevention (high protein, leucine-rich), bone health (calcium, D3, K2), hydration awareness, smaller frequent meals
- Pre-natal: folate, iron, DHA, adequate calories, food safety (avoid raw fish, deli meats), consult doctor disclaimer
- Post-natal: recovery nutrition, breastfeeding caloric needs (+500 cal), iron replenishment, consult doctor disclaimer

GOAL-SPECIFIC NUTRITION:
- Lean bulk: 200-300 calorie surplus, high protein, carb cycling, minimize fat gain
- Aggressive bulk: 500-1000 calorie surplus, high everything, accept some fat gain
- Mini-cut: 500-750 calorie deficit, very high protein to preserve muscle, 4-8 weeks
- Full cut/contest prep: progressive deficit, carb cycling, peak week protocols
- Recomposition: maintenance calories, high protein, nutrient timing emphasis
- Peak week: carb loading, water/sodium manipulation, glycogen supercompensation
- Off-season: performance focus, gradual surplus, quality food emphasis
- Reverse diet: weekly 50-100 calorie increases, metabolic restoration post-cut

DIET STYLES — apply athlete/cultural variations:
- Balanced: standard macro split, whole foods, flexible approach
- Keto: <30g net carbs, high fat, moderate protein, electrolyte management, keto-adaptation period
- Mediterranean: olive oil, fish, legumes, vegetables, moderate wine, anti-inflammatory
- Carnivore: animal products only, nose-to-tail approach, electrolyte awareness
- Vegan: complete protein combining, B12/iron/zinc/omega-3 supplementation, plant-based performance
- Paleo: whole foods, no grains/legumes/dairy, ancestral eating patterns
- IIFYM: flexible dieting, macro targets, food freedom within numbers
- Intermittent Fasting: 16:8, 5:2, OMAD — training timing around eating windows

ALWAYS include: meal timing, pre/post workout nutrition, hydration targets, supplement recommendations, and weekly meal structure.

RETURN ONLY VALID JSON. No markdown. No explanation. No code fences.`;

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

        const responseText = await callClaudeAPI(systemPrompt, userPrompt, app.logger);

        let jsonData: any = {};
        if (responseText) {
          try {
            jsonData = JSON.parse(responseText);
          } catch (parseError) {
            app.logger.warn({ parseError, raw: responseText }, 'Failed to parse diet response, using mock');
            jsonData = {};
          }
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
      const { age, weight, height, sex, activityLevel, goal, athleteMatch, sport, phase, trainingDays } = request.body;

      app.logger.info({ weight, height, activityLevel, goal }, 'Nutrition calculation request');

      try {
        const systemPrompt = `You are a precision nutrition coach and sports dietitian specializing in macro calculation, meal planning, and supplement protocols for every type of athlete and fitness population. You generate detailed nutrition plans in JSON.

AUTO-DETECT CONTEXT: Match macros, calories, and meal structure to the athlete archetype, sport, military role, age group, or goal detected from the user's description.

FAMOUS ATHLETE NUTRITION PROTOCOLS — use their REAL documented approaches:
- Cristiano Ronaldo: ~3,500-4,000 cal, 6 meals/day, high protein (fish/chicken), Mediterranean carbs, minimal sugar, heavy hydration (3L+/day)
- Arnold Schwarzenegger: ~5,000+ cal bulk, 1.5g protein/lb bodyweight, whole eggs, red meat, milk, high carb, 6 meals/day
- LeBron James: elite recovery nutrition, anti-inflammatory focus, carb cycling, high-quality protein, strategic supplementation
- Michael Phelps: ~10,000 cal/day training, massive carb load, 3-4 full meals + snacks, high protein for recovery
- Chris Bumstead: contest prep precision, carb cycling (high/medium/low days), peak week sodium/water loading then depletion
- Tom Brady: TB12 nutrition, 80% alkaline, plant-heavy, no sugar/gluten/dairy/alcohol/caffeine, anti-inflammatory supplements
- David Goggins: ultra-endurance fueling, high carb on long days, protein for recovery, whole foods focus
- Ronnie Coleman: extreme bulk (5,000-8,000+ cal), 6-8 meals/day, high protein every meal, creatine + supplements

SPORT-SPECIFIC MACRO TARGETS:
- Endurance athletes: 55-65% carbs, 15-20% protein, 20-25% fat; carb-load 2-3 days pre-race
- Strength/power athletes: 40-50% carbs, 25-35% protein, 20-30% fat; creatine essential
- Team sport athletes: 45-55% carbs, 20-25% protein, 25-30% fat; game-day carb emphasis
- Combat sports (cutting): high protein (1.2-1.5g/lb), reduced carbs, strategic water management
- Combat sports (off-season): moderate surplus, balanced macros, performance focus
- Bodybuilders (bulk): 40% carbs, 35% protein, 25% fat; caloric surplus 300-500 cal
- Bodybuilders (cut): 35% carbs, 45% protein, 20% fat; caloric deficit 300-500 cal
- CrossFit: 40% carbs, 30% protein, 30% fat; performance + body composition balance

MILITARY / FIRST RESPONDER NUTRITION:
- High-output training: 3,500-5,000+ cal, high carb on training days, protein every 3-4 hours
- Shift work: portable protein sources, strategic caffeine, meal prep emphasis, avoid energy crashes
- Selection/training camps: maximum caloric density, easy-to-digest foods, electrolyte replacement
- Recovery days: reduced calories, anti-inflammatory foods, sleep nutrition (casein, magnesium)

AGE-SPECIFIC MACRO ADJUSTMENTS:
- Youth (12-17): adequate calories for growth (never deficit), calcium 1300mg/day, protein 0.6-0.8g/lb, vitamin D 600-1000IU
- Young adult (18-30): performance optimization, flexible macro approach, body composition goals achievable
- Masters (40+): protein 1.2-1.6g/kg minimum, omega-3 2-4g/day, vitamin D 2000-4000IU, creatine 3-5g/day for muscle preservation
- Seniors (60+): protein 1.6-2.0g/kg (leucine-rich sources), calcium 1200mg, D3 2000IU, K2 100mcg, smaller frequent meals, hydration reminders
- Pre-natal: +300 cal/day (T2/T3), folate 600mcg, iron 27mg, DHA 200-300mg, avoid high-mercury fish — consult doctor disclaimer
- Post-natal: +500 cal if breastfeeding, iron replenishment, DHA continuation, gradual return to deficit — consult doctor disclaimer

GOAL-SPECIFIC CALORIE AND MACRO PROTOCOLS:
- Lean bulk: TDEE + 200-300 cal, protein 1g/lb, carbs 2-3g/lb, fat 0.4g/lb
- Aggressive bulk: TDEE + 500-1000 cal, protein 1g/lb, carbs 3-4g/lb, fat 0.5g/lb
- Mini-cut (4-8 weeks): TDEE - 500-750 cal, protein 1.2-1.5g/lb, carbs reduced, fat moderate
- Full cut/contest prep: TDEE - 300-500 cal (gradual), protein 1.2-1.5g/lb, carb cycling
- Recomposition: TDEE maintenance, protein 1-1.2g/lb, carb cycling around workouts
- Peak week: carb load days 1-3 (3-4g/lb carbs), depletion days 4-5, final load day 6, show day 7
- Off-season: TDEE + 200-400 cal, performance macros, quality food emphasis
- Reverse diet: start at end-of-cut calories, add 50-100 cal/week until TDEE restored

DIET STYLE MACRO FRAMEWORKS:
- Balanced: 40C/30P/30F — flexible, sustainable, performance-friendly
- Keto: 5C/25P/70F — strict carb limit <30g net, electrolytes critical (sodium 3-5g, potassium 3-4g, magnesium 300-500mg)
- Mediterranean: 45C/25P/30F — olive oil, fish, legumes, vegetables, moderate wine
- Carnivore: 0C/35P/65F — animal products only, electrolyte awareness, organ meats encouraged
- Vegan: 50C/25P/25F — complete proteins (rice+beans, tofu, tempeh), B12 supplement mandatory, iron/zinc/omega-3 monitoring
- Paleo: 35C/30P/35F — no grains/legumes/dairy, whole food carbs only
- IIFYM: flexible macro targets, any food sources, weekly average approach
- Intermittent Fasting: same macros compressed into eating window, protein distribution critical

SUPPLEMENT PROTOCOLS by goal:
- Muscle building: creatine monohydrate 3-5g/day, protein powder if needed, caffeine pre-workout
- Fat loss: caffeine, protein powder, omega-3, vitamin D
- Endurance: electrolytes, beta-alanine, caffeine, carb gels/drinks
- Joint health: omega-3 2-4g/day, collagen 10-15g/day, vitamin D, glucosamine/chondroitin
- Recovery: magnesium glycinate, zinc, vitamin D, tart cherry, ashwagandha
- Masters/seniors: creatine, vitamin D3+K2, omega-3, collagen, B12

MEAL TIMING PROTOCOLS:
- Pre-workout (60-90 min before): 30-50g carbs + 20-30g protein, low fat/fiber
- Intra-workout (60+ min sessions): 30-60g fast carbs, electrolytes
- Post-workout (within 30-60 min): 40-60g carbs + 30-40g protein, fast-absorbing
- Before bed: casein protein 30-40g, magnesium, slow-digesting carbs if bulking

RETURN ONLY VALID JSON. No markdown. No explanation. No code fences.`;

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

        const responseText = await callClaudeAPI(systemPrompt, userPrompt, app.logger);

        let jsonData: any = {};
        if (responseText) {
          try {
            jsonData = JSON.parse(responseText);
          } catch (parseError) {
            app.logger.warn({ parseError, raw: responseText }, 'Failed to parse nutrition response, using mock');
            jsonData = {};
          }
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

  // POST /api/parse-routine
  fastify.post<{ Body: ParseRoutineRequest }>(
    '/api/parse-routine',
    {
      schema: {
        description: 'Parse a workout routine from text or image into structured JSON',
        tags: ['ai', 'routine'],
        body: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Typed workout routine text' },
            image_base64: { type: 'string', description: 'Base64 encoded image' },
            image_mime: { type: 'string', description: 'Image MIME type (e.g. image/jpeg)', default: 'image/jpeg' },
          },
        },
        response: {
          200: {
            description: 'Parsed routine structure',
            type: 'object',
            properties: {
              name: { type: 'string' },
              daysPerWeek: { type: 'number' },
              emoji: { type: 'string' },
              description: { type: 'string' },
              days: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    exercises: { type: 'array', items: { type: 'string' } },
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
    async (request: FastifyRequest<{ Body: ParseRoutineRequest }>, reply: FastifyReply) => {
      const { text, image_base64, image_mime = 'image/jpeg' } = request.body;

      app.logger.info(
        { hasText: !!text, hasImage: !!image_base64 },
        'Parse routine request'
      );

      // Validate at least one input
      if (!text && !image_base64) {
        app.logger.warn('Parse routine request missing both text and image_base64');
        return reply.status(400).send({
          error: 'At least one of text or image_base64 must be provided',
        });
      }

      // Validate base64 format if provided
      if (image_base64) {
        // Basic base64 validation - check for valid characters
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(image_base64)) {
          app.logger.warn('Invalid base64 format provided');
          return reply.status(400).send({
            error: 'Invalid base64 image format',
          });
        }
      }

      try {
        const systemPrompt =
          'You are a fitness coach assistant. Parse the provided workout routine into a structured JSON program. Return ONLY valid JSON with this exact shape: { name, daysPerWeek, emoji, description, days: [{ name, exercises: [string] }] }. Each exercise string should include sets and reps if mentioned (e.g. \'Bench Press 4x8\'). If no sets/reps are mentioned, just include the exercise name. Pick an appropriate emoji for the routine type. Keep day names concise like \'Day 1 — Push\'.';

        let messageContent: any;

        if (image_base64) {
          // Build message with image
          const imageDataUrl = `data:${image_mime};base64,${image_base64}`;
          messageContent = [
            {
              type: 'text',
              text: 'Parse this workout routine image into the required JSON format.',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ];
        } else {
          // Text-only message
          messageContent = `Parse this workout routine into the required JSON format:\n\n${text}`;
        }

        const responseText = await callOpenRouterAPI(
          systemPrompt,
          messageContent,
          app.logger,
          60000
        );

        let jsonData: ParsedRoutine | null = null;

        if (responseText) {
          try {
            jsonData = JSON.parse(responseText);
          } catch (parseError) {
            app.logger.warn(
              { parseError, raw: responseText },
              'Failed to parse routine response as JSON'
            );
            jsonData = null;
          }
        }

        // Create mock response if parsing failed or API returned empty
        if (!jsonData) {
          app.logger.info('Using mock routine response');

          // Extract routine name from text if available
          let routineName = 'Workout Routine';
          if (text) {
            const lines = text.split('\n');
            if (lines.length > 0) {
              routineName = lines[0].trim() || 'Workout Routine';
            }
          }

          jsonData = {
            name: routineName,
            daysPerWeek: 3,
            emoji: '💪',
            description: 'A structured workout routine',
            days: [
              {
                name: 'Day 1',
                exercises: ['Exercise 1', 'Exercise 2', 'Exercise 3'],
              },
              {
                name: 'Day 2',
                exercises: ['Exercise 4', 'Exercise 5', 'Exercise 6'],
              },
              {
                name: 'Day 3',
                exercises: ['Exercise 7', 'Exercise 8', 'Exercise 9'],
              },
            ],
          };
        }

        // Validate required fields
        if (!jsonData.name || jsonData.daysPerWeek === undefined || !jsonData.emoji || !jsonData.description || !Array.isArray(jsonData.days)) {
          app.logger.error(
            { missingFields: { name: !jsonData.name, daysPerWeek: jsonData.daysPerWeek === undefined, emoji: !jsonData.emoji, description: !jsonData.description, days: !Array.isArray(jsonData.days) } },
            'Parsed routine missing required fields'
          );
          return reply.status(400).send({
            error: 'Parsed routine missing required fields',
          });
        }

        app.logger.info(
          { routineName: jsonData.name, daysPerWeek: jsonData.daysPerWeek },
          'Routine parsed successfully'
        );

        return jsonData;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        app.logger.error(
          { err: error, message: errorMsg },
          'Failed to parse routine'
        );
        return reply.status(500).send({
          error: errorMsg || 'Failed to parse routine. Please try again.',
        });
      }
    }
  );
}
