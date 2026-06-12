import { WorkoutHistory, SessionSet } from '@/contexts/AppContext';

export function getCoachingMessage(
  history: WorkoutHistory[],
  session: SessionSet[],
  streak: number,
  totalWorkouts: number
): string {
  // 1. First ever workout
  if (history.length === 0) {
    return "First workout logged! Kong is proud. The journey of a thousand gains begins with a single rep. 🦍";
  }

  // 2. New PR detected — check if any exercise in session has higher max weight than any previous history entry
  for (const ex of session) {
    const exLower = ex.exercise.toLowerCase();
    const sessionMax = Math.max(...ex.sets.map((s) => parseFloat(s.weight) || 0));
    if (sessionMax <= 0) continue;
    let historyMax = 0;
    for (const h of history) {
      const found = h.exercises.find((e) => e.exercise.toLowerCase() === exLower);
      if (found) {
        const hMax = Math.max(...found.sets.map((s) => parseFloat(s.weight) || 0));
        if (hMax > historyMax) historyMax = hMax;
      }
    }
    if (historyMax > 0 && sessionMax > historyMax) {
      return "NEW PR ALERT 🏆 You just broke your own record. That's what separates the beasts from the rest.";
    }
  }

  // 3. Streak milestone
  const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100];
  if (STREAK_MILESTONES.includes(streak)) {
    return `🔥 ${streak}-DAY STREAK! You're not just building muscle — you're building a lifestyle. Unstoppable.`;
  }

  // 4. Volume comparison vs last 3 sessions
  const sessionVolume = session.reduce((sum, ex) =>
    sum + ex.sets.reduce((s2, set) =>
      s2 + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0), 0), 0);

  if (sessionVolume > 0 && history.length >= 1) {
    const last3 = history.slice(0, 3);
    const exerciseNames = session.map((ex) => ex.exercise.toLowerCase());
    const avgVolumes = last3.map((h) =>
      h.exercises
        .filter((ex) => exerciseNames.includes(ex.exercise.toLowerCase()))
        .reduce((sum, ex) =>
          sum + ex.sets.reduce((s2, set) =>
            s2 + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0), 0), 0)
    );
    const validAvgs = avgVolumes.filter((v) => v > 0);
    if (validAvgs.length > 0) {
      const avg = validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length;
      if (avg > 0) {
        const pct = Math.round(((sessionVolume - avg) / avg) * 100);
        if (sessionVolume > avg * 1.1) {
          return `📈 Volume UP ${pct}% from your average. Progressive overload is working. Keep pushing.`;
        }
        if (sessionVolume < avg * 0.9) {
          return "Recovery session noted. Smart training includes knowing when to pull back. 🧠";
        }
      }
    }
  }

  // 5. Exercise count
  if (session.length >= 6) {
    return "6+ exercises in one session — full beast mode activated. Kong respects the grind. 💪";
  }
  if (session.length <= 2) {
    return "Short but focused. Quality over quantity — Kong approves of the intensity. 🎯";
  }

  // 6. Time of day
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 8) {
    return "Early morning warrior 🌅 While others sleep, you grind. That's the Kong way.";
  }
  if (hour >= 21 || hour <= 4) {
    return "Late night session 🌙 The gym is yours when the world sleeps. Respect.";
  }

  // 7. Workout count milestones
  const newTotal = totalWorkouts + 1;
  if (newTotal === 10) return "10 workouts logged! You've officially left the beginner zone. 🎯";
  if (newTotal === 25) return "25 workouts! You're consistent. Consistency beats intensity every time. 💎";
  if (newTotal === 50) return "50 WORKOUTS! Half a century of iron. You're a different person than when you started. 👑";
  if (newTotal === 100) return "100 WORKOUTS! LEGEND STATUS. Kong bows to your dedication. 🦍👑";

  // 8. Default rotation
  const defaults = [
    "Solid session. Every workout is a deposit in the bank of gains. 💰",
    "Work done. Rest earned. Come back stronger. 🔄",
    "The weights don't lie — you showed up and delivered. 🏋️",
    "Another session in the books. The compound effect is real. 📚",
    "Kong sees your dedication. The results are coming. 🦍",
  ];
  return defaults[history.length % 5];
}
