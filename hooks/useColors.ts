import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';

export function useColors() {
  const { state } = useApp();
  const accent = state.accentColor ?? COLORS.gold;
  return {
    ...COLORS,
    gold: accent,
    goldBright: accent,
  };
}
