import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

export default function Index() {
  const { state, updateState } = useApp();
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
          router.replace('/miss');
          return;
        }
      }
      router.replace('/(tabs)/home');
      return;
    }

    // Default: splash
    router.replace('/splash');
  }, [state.view]);

  return null;
}
