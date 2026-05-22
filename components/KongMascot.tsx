import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageSourcePropType, Platform } from 'react-native';

export type KongMood = 'happy' | 'sad' | 'angry' | 'fat' | 'defeated';

const KONG_IMAGES: Record<KongMood, ImageSourcePropType> = {
  happy: require('@/assets/images/kong-happy.png'),
  sad: require('@/assets/images/kong-sad-1week.png'),
  angry: require('@/assets/images/kong-angry-2week.png'),
  fat: require('@/assets/images/kong-fat-postweek2.png'),
  defeated: require('@/assets/images/kong-defeated-3week.png'),
};

interface KongMascotProps {
  size?: number;
  shake?: boolean;
  celebrate?: boolean;
  mood?: KongMood;
}

const useNativeDriver = Platform.OS !== 'web';

export function KongMascot({ size = 80, shake = false, celebrate = false, mood = 'happy' }: KongMascotProps) {
  const bobAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -10, duration: 1000, useNativeDriver }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1000, useNativeDriver }),
      ])
    );
    bobLoop.start();
    return () => bobLoop.stop();
  }, [bobAnim]);

  useEffect(() => {
    if (!shake) return;
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver }),
        Animated.delay(500),
      ])
    );
    shakeLoop.start();
    return () => shakeLoop.stop();
  }, [shake, shakeAnim]);

  useEffect(() => {
    if (!celebrate) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 150, useNativeDriver }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver }),
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 150, useNativeDriver }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver }),
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 150, useNativeDriver }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver }),
    ]).start();
  }, [celebrate, scaleAnim]);

  const imageSource = KONG_IMAGES[mood];

  return (
    <Animated.View
      style={{
        transform: [
          { translateY: bobAnim },
          { translateX: shake ? shakeAnim : 0 },
          { scale: scaleAnim },
        ],
      }}
    >
      <Image
        source={imageSource}
        resizeMode="contain"
        style={{
          width: size * 1.2,
          height: size * 1.2,
          borderRadius: size * 0.15,
        }}
      />
    </Animated.View>
  );
}
