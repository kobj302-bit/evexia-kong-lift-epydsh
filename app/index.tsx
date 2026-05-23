import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

export default function Index() {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    const view = state.view;

    if (view === 'splash') {
      router.replace('/splash');
      return;
    }

    if (view === 'survey') {
      router.replace('/survey');
      return;
    }

    if (view === 'app') {
      // Check if missed workout
      if (state.lastWorkout) {
        const last = new Date(state.lastWorkout);
        const now = new Date();
        const diffMs = now.getTime() - last.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 1) {
          console.log('[Index] Missed workout detected — days missed:', Math.floor(diffDays));
          router.replace('/miss');
          return;
        }
      }
      console.log('[Index] Navigating to home tab');
      router.replace('/(tabs)/home');
      return;
    }

    // Default: splash
    console.log('[Index] Default — navigating to splash');
    router.replace('/splash');
  }, [state.view, state.lastWorkout, router]);

  return null;
}
