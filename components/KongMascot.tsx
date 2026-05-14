import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

interface KongMascotProps {
  size?: number;
  shake?: boolean;
}

export function KongMascot({ size = 80, shake = false }: KongMascotProps) {
  const bobAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -10, duration: 1000, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    bobLoop.start();
    return () => bobLoop.stop();
  }, [bobAnim]);

  useEffect(() => {
    if (!shake) return;
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.delay(500),
      ])
    );
    shakeLoop.start();
    return () => shakeLoop.stop();
  }, [shake, shakeAnim]);

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: bobAnim },
          { translateX: shake ? shakeAnim : 0 },
        ],
      }}
    >
      <Text style={{ fontSize: size, lineHeight: size * 1.2 }}>🦍</Text>
    </Animated.View>
  );
}
