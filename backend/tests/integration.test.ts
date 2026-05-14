import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  describe("AI Endpoints", () => {
    describe("POST /api/athlete/generate", () => {
      test("Generate workout program with required fields", async () => {
        const res = await api("/api/athlete/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "I want to build muscle like a bodybuilder",
            level: "beginner",
            programType: "weekly",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.program).toBeDefined();
        expect(data.program.title).toBeDefined();
        expect(data.program.days).toBeDefined();
      });

      test("Generate workout program with full profile", async () => {
        const res = await api("/api/athlete/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "athletic performance",
            level: "intermediate",
            programType: "daily",
            athleteStyle: "ronaldo",
            profile: {
              age: 28,
              weight: 75,
              height: 180,
              goal: "improve agility",
              equipment: "dumbells",
              trainingDaysPerWeek: 5,
              stage: "muscle building",
              injuries: ["knee pain"],
            },
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.program).toBeDefined();
      });

      test("Return 400 when missing required prompt", async () => {
        const res = await api("/api/athlete/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: "beginner",
            programType: "weekly",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required level", async () => {
        const res = await api("/api/athlete/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "build muscle",
            programType: "weekly",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required programType", async () => {
        const res = await api("/api/athlete/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "build muscle",
            level: "beginner",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when level has invalid enum value", async () => {
        const res = await api("/api/athlete/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "build muscle",
            level: "advanced",
            programType: "weekly",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when programType has invalid enum value", async () => {
        const res = await api("/api/athlete/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "build muscle",
            level: "beginner",
            programType: "monthly",
          }),
        });
        await expectStatus(res, 400);
      });
    });

    describe("POST /api/diet/generate", () => {
      test("Generate meal plan with required fields", async () => {
        const res = await api("/api/diet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "high protein, low sugar",
            goal: "bulk",
            dietStyle: "balanced",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.mealPlan).toBeDefined();
        expect(data.mealPlan.title).toBeDefined();
        expect(data.mealPlan.meals).toBeDefined();
      });

      test("Generate meal plan with full profile", async () => {
        const res = await api("/api/diet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "vegetarian options preferred",
            goal: "cut",
            dietStyle: "mediterranean",
            profile: {
              calories: 2000,
              protein: 120,
              carbs: 200,
              fat: 65,
            },
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.mealPlan).toBeDefined();
      });

      test("Return 400 when missing required prompt", async () => {
        const res = await api("/api/diet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal: "bulk",
            dietStyle: "balanced",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required goal", async () => {
        const res = await api("/api/diet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "high protein",
            dietStyle: "balanced",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required dietStyle", async () => {
        const res = await api("/api/diet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "high protein",
            goal: "bulk",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when goal has invalid enum value", async () => {
        const res = await api("/api/diet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "high protein",
            goal: "gain",
            dietStyle: "balanced",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when dietStyle has invalid enum value", async () => {
        const res = await api("/api/diet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "high protein",
            goal: "bulk",
            dietStyle: "invalid-diet",
          }),
        });
        await expectStatus(res, 400);
      });
    });

    describe("POST /api/nutrition/calculate", () => {
      test("Calculate nutrition with required fields", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            sex: "male",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.tdee).toBeDefined();
        expect(data.targetCalories).toBeDefined();
        expect(data.macros).toBeDefined();
        expect(data.bmi).toBeDefined();
      });

      test("Calculate nutrition with optional body fat percentage", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 75,
            height: 170,
            age: 28,
            sex: "female",
            activityLevel: "active",
            goal: "build_muscle",
            bodyFatPercent: 25,
            dietStyle: "balanced",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.tdee).toBeDefined();
      });

      test("Return 400 when missing required weight", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            height: 180,
            age: 30,
            sex: "male",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required height", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            age: 30,
            sex: "male",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required age", async () => {
        const res = await api("/api/nutrition/calculate", {
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

      test("Return 400 when missing required sex", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required activityLevel", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            sex: "male",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when missing required goal", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            sex: "male",
            activityLevel: "moderate",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when sex has invalid enum value", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            sex: "other",
            activityLevel: "moderate",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when activityLevel has invalid enum value", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            sex: "male",
            activityLevel: "intense",
            goal: "maintain",
          }),
        });
        await expectStatus(res, 400);
      });

      test("Return 400 when goal has invalid enum value", async () => {
        const res = await api("/api/nutrition/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            sex: "male",
            activityLevel: "moderate",
            goal: "lose_weight",
          }),
        });
        await expectStatus(res, 400);
      });
    });
  });
});
