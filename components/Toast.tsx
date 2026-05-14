import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/data';

interface ToastProps {
  visible: boolean;
  message: string;
  isGold?: boolean;
}

export function Toast({ visible, message, isGold = false }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const bottomOffset = insets.bottom + 90;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: bottomOffset, opacity, transform: [{ translateY }] },
        isGold ? styles.gold : styles.normal,
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, isGold ? styles.goldText : styles.normalText]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 9999,
    alignItems: 'center',
  },
  gold: {
    backgroundColor: COLORS.gold,
    borderWidth: 1,
    borderColor: COLORS.goldBright,
  },
  normal: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  goldText: {
    color: '#0A0A0A',
  },
  normalText: {
    color: COLORS.text,
  },
});
