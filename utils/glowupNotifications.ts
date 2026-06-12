import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export async function scheduleGlowUpNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    console.log('[GlowUpNotifications] Scheduling daily glow-up notifications...');

    // Cancel existing glow-up notifications first
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.glowup) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    console.log('[GlowUpNotifications] Cleared existing glow-up notifications');

    const notifications = [
      { hour: 6, minute: 30, title: '💧 Morning water + salt', body: 'Start your day. +10 XP', id: 'gu_water' },
      { hour: 6, minute: 45, title: '🧘 Morning body unlock', body: '10 min before breakfast. +25 XP', id: 'gu_bodyunlock' },
      { hour: 7, minute: 0, title: '☀️ Get outside', body: '10–15 min sunlight. +10 XP', id: 'gu_sunlight' },
      { hour: 7, minute: 15, title: '🏋️ Morning dead hang', body: '3 sets, 60 sec. Start tall. +15 XP', id: 'gu_dedhang' },
      { hour: 7, minute: 30, title: '💊 Take your morning supplements', body: '+5 XP', id: 'gu_supps' },
      { hour: 8, minute: 0, title: '🍳 Eat your protein breakfast', body: '+10 XP', id: 'gu_breakfast' },
      { hour: 8, minute: 30, title: '💆 Face massage + fascial release', body: '5 min. Reduces puffiness, sharpens features. +15 XP', id: 'gu_face' },
      { hour: 9, minute: 0, title: '🧴 Skincare routine', body: 'Cleanser + moisturizer. +10 XP', id: 'gu_skincare' },
      { hour: 10, minute: 0, title: '👅 Mewing check-in', body: 'Tongue on roof of mouth? +10 XP', id: 'gu_mewing' },
      { hour: 13, minute: 0, title: '🧍 Posture check', body: 'Chin back. Shoulders down. Stand tall. +25 XP', id: 'gu_posture' },
      { hour: 20, minute: 30, title: '🌙 Stop eating now', body: 'Fasted sleep = more HGH. +10 XP', id: 'gu_faststart' },
      { hour: 21, minute: 0, title: '🌙 Evening fascial wind-down', body: '8 min. Legs up the wall first. +20 XP', id: 'gu_winddown' },
      { hour: 21, minute: 0, title: '🌙 Night routine', body: 'Magnesium + mouth tape + no screens. +15 XP', id: 'gu_nightroutine' },
      { hour: 21, minute: 30, title: '🛏️ In bed on time?', body: '+10 XP', id: 'gu_bed' },
    ];

    for (const n of notifications) {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          data: { glowup: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: n.hour,
          minute: n.minute,
        },
      });
      console.log('[GlowUpNotifications] Scheduled:', n.id, 'at', n.hour + ':' + String(n.minute).padStart(2, '0'));
    }

    console.log('[GlowUpNotifications] All', notifications.length, 'notifications scheduled');
  } catch (err) {
    console.log('[GlowUpNotifications] Failed to schedule notifications:', err);
  }
}
