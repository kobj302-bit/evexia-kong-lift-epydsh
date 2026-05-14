import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { COLORS } from '@/styles/colors';

function SkeletonLine({ width, height = 14 }: { width: number | string; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: COLORS.surface2,
        },
        { width: width as any },
        { opacity },
      ]}
    />
  );
}

export function SkeletonWorkout() {
  return (
    <View style={{ gap: 12, padding: 16, backgroundColor: COLORS.surface, borderRadius: 16 }}>
      <SkeletonLine width="60%" height={20} />
      <SkeletonLine width="90%" height={14} />
      <SkeletonLine width="75%" height={14} />
      <View style={{ gap: 8, marginTop: 8 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ backgroundColor: COLORS.surface2, borderRadius: 10, padding: 12, gap: 6 }}>
            <SkeletonLine width="50%" height={14} />
            <SkeletonLine width="30%" height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}
