import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

type KongState = 'idle' | 'celebrating' | 'disappointed' | 'approving' | 'comeback';

interface KongMascotProps {
  state?: KongState;
  size?: number;
}

export function KongMascot({ state = 'idle', size = 80 }: KongMascotProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.stopAnimation();
    scale.stopAnimation();
    translateX.stopAnimation();

    if (state === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: -6, duration: 1400, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'celebrating') {
      Animated.loop(
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 20, bounciness: 15 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 15 }),
        ])
      ).start();
    } else if (state === 'disappointed') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 6, duration: 300, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    } else if (state === 'approving') {
      Animated.sequence([
        Animated.spring(translateY, { toValue: -12, useNativeDriver: true, speed: 30, bounciness: 10 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 10 }),
      ]).start();
    } else if (state === 'comeback') {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 15, bounciness: 20 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 15, bounciness: 20 }),
      ]).start();
    }
  }, [state]);

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }, { translateX }] }}>
      <Text style={{ fontSize: size, lineHeight: size * 1.2, textAlign: 'center' }}>🦍</Text>
    </Animated.View>
  );
}
