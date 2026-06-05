import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  describe("AI Endpoints", () => {
    describe("POST /api/ai/athlete", () => {
      test("Generate athlete program with required fields", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Train like a professional soccer player",
            level: "Intermediate",
            phase: "Building Muscle",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
        expect(data.phase).toBeDefined();
        expect(data.days).toBeDefined();
      });

      test("Generate athlete program with full profile and athlete template", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Peak athletic performance",
            level: "Advanced",
            phase: "Maintenance",
            athleteTemplate: "Cristiano Ronaldo",
            sport: "Soccer",
            profile: {
              age: 28,
              weight: 85,
              sex: "male",
              goal: "speed and power",
              equip: "Full Gym",
              days: 5,
              injuries: ["knee soreness"],
            },
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
        expect(data.diet).toBeDefined();
        expect(data.injuryModifications).toBeDefined();
      });

      test("Generate athlete program with training goal option", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Build muscle mass",
            level: "Beginner",
            phase: "Bulking",
            trainingGoal: "Muscle Building",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
        expect(data.phase).toBeDefined();
      });

      test("Generate athlete program with useSurveyData option", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Strength training program",
            level: "Intermediate",
            phase: "Cutting",
            useSurveyData: false,
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
      });

      test("Generate athlete program with planType and ageBracket", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Powerlifting focused program",
            level: "Intermediate",
            phase: "Strength",
            planType: "powerlifting",
            ageBracket: "30s",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
        expect(data.phase).toBeDefined();
      });

      test("Generate athlete program with focusAreas and daysPerWeek", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Speed and power development",
            level: "Intermediate",
            phase: "Power",
            focusAreas: ["Speed", "Power", "Strength"],
            daysPerWeek: 4,
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
        expect(data.days).toBeDefined();
      });

      test("Generate athlete program with holistic and custom coach", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Holistic wellness program",
            level: "Advanced",
            phase: "Maintenance",
            holistic: true,
            customCoach: "Custom training methodology",
            sessionMinutes: 60,
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
      });

      test("Generate athlete program with lifeStage and equipmentOverride", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Beginner friendly program",
            level: "Beginner",
            phase: "Building Muscle",
            lifeStage: "young adult",
            equipmentOverride: ["dumbbells", "barbell", "bench"],
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
      });

      test("Generate athlete program with different training goals", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Cut body fat",
            level: "Intermediate",
            phase: "Cutting Phase",
            trainingGoal: "Cutting",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
      });

      test("Generate athlete program with military tactical plan type", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Military fitness preparation",
            level: "Advanced",
            phase: "Tactical",
            planType: "military_tactical",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
      });

      test("Generate athlete program with endurance cardio plan type", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Marathon training",
            level: "Intermediate",
            phase: "Building Endurance",
            planType: "endurance_cardio",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
      });

      test("Return 400 when missing required description", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "Beginner",
            phase: "Bulking",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required level", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Build muscle",
            phase: "Bulking",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required phase", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Build muscle",
            level: "Beginner",
          }),
        });
        await expectStatus(res, 400);
      });
    });

    describe("POST /api/ai/diet", () => {
      test("Generate meal plan with required fields", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2500,
            protein: 150,
            carbs: 300,
            fat: 80,
            meals: 4,
            goal: "muscle building",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.meals).toBeDefined();
        expect(data.totalCalories).toBeDefined();
        expect(data.totalProtein).toBeDefined();
      });

      test("Generate meal plan with athlete match and phase", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2800,
            protein: 180,
            carbs: 350,
            fat: 85,
            meals: 5,
            goal: "strength",
            athleteMatch: "Arnold Schwarzenegger",
            phase: "Bulking",
            sport: "Bodybuilding",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.meals).toBeDefined();
        expect(data.athleteInspiration).toBe("Arnold Schwarzenegger");
      });

      test("Generate meal plan with restrictions", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2000,
            protein: 120,
            carbs: 250,
            fat: 65,
            meals: 3,
            goal: "weight loss",
            restrictions: "gluten-free",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.meals).toBeDefined();
      });

      test("Generate meal plan with multiple meals and high protein", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 3000,
            protein: 225,
            carbs: 300,
            fat: 100,
            meals: 6,
            goal: "bulking",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.meals).toBeDefined();
        expect(data.totalProtein).toBeDefined();
      });

      test("Generate meal plan with cutting goal", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 1800,
            protein: 140,
            carbs: 200,
            fat: 50,
            meals: 4,
            goal: "cutting",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.meals).toBeDefined();
      });

      test("Return 400 when missing required calories", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            protein: 150,
            carbs: 300,
            fat: 80,
            meals: 4,
            goal: "muscle building",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required protein", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2500,
            carbs: 300,
            fat: 80,
            meals: 4,
            goal: "muscle building",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required carbs", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2500,
            protein: 150,
            fat: 80,
            meals: 4,
            goal: "muscle building",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required fat", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2500,
            protein: 150,
            carbs: 300,
            meals: 4,
            goal: "muscle building",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required meals", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2500,
            protein: 150,
            carbs: 300,
            fat: 80,
            goal: "muscle building",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required goal", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calories: 2500,
            protein: 150,
            carbs: 300,
            fat: 80,
            meals: 4,
          }),
        });
        await expectStatus(res, 400);
      });
    });

    describe("POST /api/ai/nutrition", () => {
      test("Calculate nutrition with required fields", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 30,
            weight: 80,
            height: 180,
            sex: "male",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.bmr).toBeDefined();
        expect(data.tdee).toBeDefined();
        expect(data.targetCalories).toBeDefined();
        expect(data.protein).toBeDefined();
        expect(data.carbs).toBeDefined();
        expect(data.fat).toBeDefined();
      });

      test("Calculate nutrition with athlete match and training days", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 25,
            weight: 75,
            height: 175,
            sex: "female",
            activityLevel: "active",
            goal: "build_muscle",
            athleteMatch: "Michael Phelps",
            sport: "Swimming",
            phase: "Building Muscle",
            trainingDays: 6,
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.bmr).toBeDefined();
        expect(data.athleteInspiration).toBe("Michael Phelps");
        expect(data.weeklyPlan).toBeDefined();
        expect(data.weeklyPlan.trainingDayCalories).toBeDefined();
        expect(data.weeklyPlan.restDayCalories).toBeDefined();
      });

      test("Calculate nutrition with optional parameters", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 28,
            weight: 82,
            height: 178,
            sex: "male",
            activityLevel: "very_active",
            goal: "cut",
            phase: "Cutting",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.bmr).toBeDefined();
        expect(data.fiber).toBeDefined();
        expect(data.water).toBeDefined();
      });

      test("Calculate nutrition for younger athlete", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 20,
            weight: 70,
            height: 175,
            sex: "male",
            activityLevel: "very_active",
            goal: "build_muscle",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.bmr).toBeDefined();
        expect(data.tdee).toBeDefined();
      });

      test("Calculate nutrition for sedentary individual", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 45,
            weight: 90,
            height: 182,
            sex: "male",
            activityLevel: "sedentary",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.bmr).toBeDefined();
        expect(data.tdee).toBeDefined();
      });

      test("Calculate nutrition with weight loss goal", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 35,
            weight: 95,
            height: 180,
            sex: "female",
            activityLevel: "lightly_active",
            goal: "weight_loss",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.targetCalories).toBeDefined();
      });

      test("Return 400 when missing required age", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            sex: "male",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required weight", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 30,
            height: 180,
            sex: "male",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required height", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 30,
            weight: 80,
            sex: "male",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required sex", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 30,
            weight: 80,
            height: 180,
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required activityLevel", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 30,
            weight: 80,
            height: 180,
            sex: "male",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required goal", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age: 30,
            weight: 80,
            height: 180,
            sex: "male",
            activityLevel: "moderate",
          }),
        });
        await expectStatus(res, 400);
      });
    });
  });
});
