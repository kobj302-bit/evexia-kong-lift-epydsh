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
            apiKey: "test-key",
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
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.name).toBeDefined();
        expect(data.diet).toBeDefined();
        expect(data.injuryModifications).toBeDefined();
      });

      test("Return 400 when missing required apiKey", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "Build muscle",
            level: "Beginner",
            phase: "Bulking",
          }),
        });
        await expectStatus(res, 400);
        const data = await res.json();
        expect(data.error).toBe("apiKey is required");
      });

      test("Return 400 when missing required description", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "Beginner",
            phase: "Bulking",
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.meals).toBeDefined();
        expect(data.athleteInspiration).toBe("Arnold Schwarzenegger");
      });

      test("Return 400 when missing required apiKey", async () => {
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
        await expectStatus(res, 400);
        const data = await res.json();
        expect(data.error).toBe("apiKey is required");
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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

      test("Return 400 when missing required apiKey", async () => {
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
        await expectStatus(res, 400);
        const data = await res.json();
        expect(data.error).toBe("apiKey is required");
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
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
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 400);
      });
    });
  });
});
