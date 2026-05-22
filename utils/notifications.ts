import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

interface MissNotification {
  daysOffset: number;
  title: string;
  body: string;
}

const MISS_NOTIFICATIONS: MissNotification[] = [
  { daysOffset: 1, title: '🦍 Kong is watching...', body: "One day off. No biggie. Don't make it two." },
  { daysOffset: 2, title: "😅 Kong's side-eye intensifies", body: "2 days. Your gains are texting their lawyer." },
  { daysOffset: 3, title: '😤 The gains are packing', body: '3 days. Time to come back. Kong believes in you.' },
  { daysOffset: 5, title: '😱 EMERGENCY', body: '5 days. Your muscles filed a missing persons report.' },
  { daysOffset: 7, title: '💀 Pre-workout disappointed', body: 'A whole week. Even your shaker bottle is sad.' },
  { daysOffset: 10, title: '🥵 Freshman 15 incoming', body: '10 days off. Kong put on weight FOR you.' },
  { daysOffset: 14, title: '😭 Kong is begging', body: "2 weeks. One workout. That's all he's asking." },
  { daysOffset: 21, title: '☠️ The pump has left the chat', body: '3 weeks. Kong is in mourning. Bring him back.' },
];

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    console.log('[Notifications] Requesting permissions...');
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    console.log('[Notifications] Permission status:', status);
    return granted;
  } catch (err) {
    console.log('[Notifications] Permission request failed:', err);
    return false;
  }
}

export async function scheduleMissNotifications(lastWorkoutDate: string | null): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    console.log('[Notifications] Rescheduling miss notifications for lastWorkout:', lastWorkoutDate);
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Cleared all scheduled notifications');

    const now = new Date();
    const baseDate = lastWorkoutDate ? new Date(lastWorkoutDate) : now;

    let scheduled = 0;
    for (const notif of MISS_NOTIFICATIONS) {
      const fireDate = new Date(baseDate);
      fireDate.setDate(fireDate.getDate() + notif.daysOffset);
      fireDate.setHours(9, 0, 0, 0);

      if (fireDate <= now) {
        console.log('[Notifications] Skipping past notification:', notif.title, fireDate.toISOString());
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.body,
          sound: true,
        },
        trigger: {
          type: 'date',
          date: fireDate,
        } as Notifications.DateTriggerInput,
      });
      scheduled++;
      console.log('[Notifications] Scheduled:', notif.title, 'for', fireDate.toISOString());
    }

    console.log('[Notifications] Total scheduled:', scheduled);
  } catch (err) {
    console.log('[Notifications] Failed to schedule notifications:', err);
  }
}
