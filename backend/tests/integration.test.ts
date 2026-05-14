import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  describe("AI Endpoints", () => {
    describe("POST /api/ai/athlete", () => {
      test("Generate workout routine with required fields", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "I want to build muscle",
            level: "Beginner",
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.routine).toBeDefined();
      });

      test("Generate workout routine with full profile and expertMode", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "I want to build muscle",
            level: "Intermediate",
            profile: {
              age: 30,
              weight: 80,
              sex: "male",
              goal: "Build muscle",
              equipment: "Full gym",
              days: 5,
              injuries: "None",
              experience: "2 years",
            },
            expertMode: true,
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
      });

      test("Return 400 when missing required description", async () => {
        const res = await api("/api/ai/athlete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
            description: "I prefer high protein foods",
            goal: "bulk",
            dietType: "Balanced",
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.plan).toBeDefined();
      });

      test("Generate meal plan with full profile and expertMode", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "I prefer high protein foods",
            goal: "cut",
            dietType: "Keto",
            profile: {
              age: 28,
              weight: 75,
              sex: "female",
              bf: 25,
            },
            expertMode: true,
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
      });

      test("Return 400 when missing required goal", async () => {
        const res = await api("/api/ai/diet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: "I prefer high protein foods",
            dietType: "Balanced",
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 400);
      });
    });

    describe("POST /api/ai/nutrition", () => {
      test("Generate nutrition plan with required fields", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 80,
            height: 180,
            age: 30,
            sex: "male",
            goal: "maintain",
            activity: "moderate",
            dietType: "Balanced",
            includeGrocery: true,
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
        const data = await res.json();
        expect(data.result).toBeDefined();
      });

      test("Generate nutrition plan with optional body fat percentage", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: 75,
            height: 170,
            age: 28,
            sex: "female",
            goal: "cut",
            activity: "active",
            dietType: "Mediterranean",
            includeGrocery: false,
            bf: 25,
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 200);
      });

      test("Return 400 when missing required weight", async () => {
        const res = await api("/api/ai/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            height: 180,
            age: 30,
            sex: "male",
            goal: "maintain",
            activity: "moderate",
            dietType: "Balanced",
            includeGrocery: true,
            apiKey: "test-key",
          }),
        });
        await expectStatus(res, 400);
      });
    });
  });
});
