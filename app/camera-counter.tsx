/**
 * Camera Counter Screen
 *
 * Uses the device camera for visual feedback and the accelerometer to detect
 * repetitive motion patterns (push-ups, sit-ups, squats, pull-ups).
 * When the target rep count is reached, marks the focus challenge as complete.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';
import { scheduleFocusChallengeCompleteNotification } from '@/utils/glowupNotifications';

// Lazy imports for native-only modules
let CameraView: any = null;
let Accelerometer: any = null;
let Haptics: any = null;

if (Platform.OS !== 'web') {
  try { CameraView = require('expo-camera').CameraView; } catch {}
  try { Accelerometer = require('expo-sensors').Accelerometer; } catch {}
  try { Haptics = require('expo-haptics'); } catch {}
}

const EXERCISE_CONFIG: Record<string, { axis: 'x' | 'y' | 'z'; threshold: number; label: string; emoji: string }> = {
  'Push-Ups':  { axis: 'z', threshold: 1.15, label: 'Push-Ups',  emoji: '💪' },
  'Sit-Ups':   { axis: 'y', threshold: 1.10, label: 'Sit-Ups',   emoji: '🔥' },
  'Squats':    { axis: 'y', threshold: 1.20, label: 'Squats',    emoji: '🦵' },
  'Pull-Ups':  { axis: 'z', threshold: 1.15, label: 'Pull-Ups',  emoji: '🏋️' },
};

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CameraCounterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateState } = useApp();

  const [reps, setReps] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [selectedExercise, setSelectedExercise] = useState(state.focusChallengeType || 'Push-Ups');
  const [target] = useState(state.focusChallengeTarget || 50);
  const [completed, setCompleted] = useState(false);

  // Motion graph data (last 30 samples)
  const [motionData, setMotionData] = useState<number[]>(Array(30).fill(0));

  // Animated values
  const repScaleAnim = useRef(new Animated.Value(1)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Rep detection state
  const lastPeak = useRef(false);
  const lastValue = useRef(0);
  const cooldown = useRef(false);

  const config = EXERCISE_CONFIG[selectedExercise] || EXERCISE_CONFIG['Push-Ups'];

  // Request camera permission
  useEffect(() => {
    if (Platform.OS === 'web') {
      setCameraPermission(false);
      return;
    }
    (async () => {
      try {
        const { Camera } = await import('expo-camera');
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('[CameraCounter] Camera permission:', status);
        setCameraPermission(status === 'granted');
      } catch (e) {
        console.log('[CameraCounter] Camera permission error:', e);
        setCameraPermission(false);
      }
    })();
  }, []);

  // Accelerometer subscription
  useEffect(() => {
    if (!isActive || Platform.OS === 'web' || !Accelerometer) return;

    console.log('[CameraCounter] Starting accelerometer for exercise:', selectedExercise);
    Accelerometer.setUpdateInterval(50); // 20 Hz

    const subscription = Accelerometer.addListener((data: { x: number; y: number; z: number }) => {
      const value = Math.abs(data[config.axis]);

      // Update motion graph
      setMotionData((prev) => {
        const next = [...prev.slice(1), value];
        return next;
      });

      // Rep detection: peak crossing
      const isPeak = value > config.threshold;
      if (isPeak && !lastPeak.current && !cooldown.current) {
        lastPeak.current = true;
        cooldown.current = true;

        setReps((prev) => {
          const next = prev + 1;
          console.log('[CameraCounter] Rep detected! Count:', next, '/', target);

          // Haptic feedback
          if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }

          // Animate rep counter
          Animated.sequence([
            Animated.spring(repScaleAnim, { toValue: 1.4, friction: 4, tension: 200, useNativeDriver: true }),
            Animated.spring(repScaleAnim, { toValue: 1.0, friction: 6, tension: 100, useNativeDriver: true }),
          ]).start();

          // Animate progress bar
          Animated.timing(progressAnim, {
            toValue: Math.min(next / target, 1),
            duration: 300,
            useNativeDriver: false,
          }).start();

          return next;
        });

        // Cooldown to prevent double-counting
        setTimeout(() => {
          cooldown.current = false;
        }, 600);
      } else if (!isPeak) {
        lastPeak.current = false;
      }

      lastValue.current = value;
    });

    return () => {
      console.log('[CameraCounter] Stopping accelerometer');
      subscription.remove();
    };
  }, [isActive, selectedExercise, config, target]);

  // Check for completion
  useEffect(() => {
    if (reps >= target && !completed) {
      console.log('[CameraCounter] Target reached! Marking challenge complete');
      setCompleted(true);
      setIsActive(false);

      if (Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      Animated.spring(celebrationAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }).start();

      // Mark focus challenge complete
      updateState({ focusChallengeComplete: getTodayStr() });
      scheduleFocusChallengeCompleteNotification().catch(() => {});
    }
  }, [reps, target, completed]);

  const handleToggleActive = () => {
    const next = !isActive;
    console.log('[CameraCounter] Toggle active:', next);
    setIsActive(next);
  };

  const handleManualRep = () => {
    console.log('[CameraCounter] Manual rep added');
    if (completed) return;
    setReps((prev) => prev + 1);
    Animated.sequence([
      Animated.spring(repScaleAnim, { toValue: 1.3, friction: 4, tension: 200, useNativeDriver: true }),
      Animated.spring(repScaleAnim, { toValue: 1.0, friction: 6, tension: 100, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressAnim, {
      toValue: Math.min((reps + 1) / target, 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleReset = () => {
    console.log('[CameraCounter] Reset pressed');
    Alert.alert('Reset Counter?', 'This will reset your rep count to 0.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setReps(0);
          setCompleted(false);
          setIsActive(false);
          progressAnim.setValue(0);
          celebrationAnim.setValue(0);
        },
      },
    ]);
  };

  const handleDone = () => {
    console.log('[CameraCounter] Done pressed — navigating back');
    router.back();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const repsDisplay = reps;
  const targetDisplay = target;
  const exerciseLabel = config.label;
  const exerciseEmoji = config.emoji;
  const progressPct = Math.min(Math.round((reps / target) * 100), 100);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            console.log('[CameraCounter] Back button pressed');
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {exerciseEmoji}
          {' '}
          {exerciseLabel}
          {' Counter'}
        </Text>
        {/* Manual count button */}
        <TouchableOpacity style={styles.manualBtn} onPress={handleManualRep} activeOpacity={0.7}>
          <Text style={styles.manualBtnText}>+1</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.exerciseScroll}
        contentContainerStyle={styles.exerciseScrollContent}
      >
        {Object.keys(EXERCISE_CONFIG).map((ex) => {
          const isSelected = selectedExercise === ex;
          return (
            <TouchableOpacity
              key={ex}
              style={[styles.exChip, isSelected && styles.exChipSelected]}
              onPress={() => {
                console.log('[CameraCounter] Exercise selected:', ex);
                setSelectedExercise(ex);
                setReps(0);
                setIsActive(false);
                progressAnim.setValue(0);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.exChipText, isSelected && styles.exChipTextSelected]}>
                {EXERCISE_CONFIG[ex].emoji}
                {' '}
                {ex}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Camera preview */}
      <View style={styles.cameraContainer}>
        {cameraPermission && CameraView ? (
          <CameraView style={styles.camera} facing="front" />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraPlaceholderEmoji}>📷</Text>
            <Text style={styles.cameraPlaceholderText}>
              {Platform.OS === 'web'
                ? 'Camera not available on web'
                : cameraPermission === false
                ? 'Camera permission denied'
                : 'Loading camera...'}
            </Text>
          </View>
        )}

        {/* Overlay instruction */}
        {!isActive && !completed && (
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraInstruction}>
              Position yourself so your full body is visible
            </Text>
          </View>
        )}

        {/* Active indicator */}
        {isActive && (
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>DETECTING</Text>
          </View>
        )}
      </View>

      {/* Rep counter */}
      <View style={styles.counterSection}>
        <Animated.Text style={[styles.repCount, { transform: [{ scale: repScaleAnim }] }]}>
          {repsDisplay}
        </Animated.Text>
        <Text style={styles.repTarget}>
          {'/ '}
          {targetDisplay}
          {' '}
          {exerciseLabel}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: progressWidth },
              completed && styles.progressFillComplete,
            ]}
          />
        </View>
        <Text style={styles.progressPct}>
          {progressPct}
          {'% complete'}
        </Text>
      </View>

      {/* Motion graph */}
      <View style={styles.graphContainer}>
        <Text style={styles.graphLabel}>Motion Signal</Text>
        <View style={styles.graph}>
          {motionData.map((v, i) => {
            const barH = Math.min(Math.max(v * 20, 2), 40);
            const isAboveThreshold = v > config.threshold;
            return (
              <View
                key={i}
                style={[
                  styles.graphBar,
                  { height: barH },
                  isAboveThreshold && styles.graphBarActive,
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.graphThresholdLabel}>
          {'Threshold: '}
          {config.threshold}
          {'g'}
        </Text>
      </View>

      {/* Controls */}
      {!completed ? (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.startStopBtn, isActive && styles.stopBtn]}
            onPress={handleToggleActive}
            activeOpacity={0.85}
          >
            <Text style={styles.startStopBtnText}>
              {isActive ? '⏸ Pause' : '▶ Start Counting'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetLink} onPress={handleReset} activeOpacity={0.7}>
            <Text style={styles.resetLinkText}>Reset</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.completionCard,
            {
              opacity: celebrationAnim,
              transform: [{ scale: celebrationAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            },
          ]}
        >
          <Text style={styles.completionEmoji}>🔥</Text>
          <Text style={styles.completionTitle}>Challenge Complete!</Text>
          <Text style={styles.completionSub}>
            {repsDisplay}
            {' '}
            {exerciseLabel}
            {' done. Apps unlocked!'}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done 🦍</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 16, color: COLORS.text, fontWeight: '700' },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  manualBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualBtnText: { fontSize: 16, fontWeight: '900', color: COLORS.gold },
  exerciseScroll: { maxHeight: 48 },
  exerciseScrollContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  exChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exChipSelected: {
    backgroundColor: `${COLORS.gold}20`,
    borderColor: COLORS.gold,
  },
  exChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  exChipTextSelected: { color: COLORS.gold },
  cameraContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  camera: { flex: 1 },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraPlaceholderEmoji: { fontSize: 40 },
  cameraPlaceholderText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    alignItems: 'center',
  },
  cameraInstruction: { fontSize: 12, color: COLORS.text, textAlign: 'center' },
  activeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
  },
  activeText: { fontSize: 10, fontWeight: '900', color: COLORS.text, letterSpacing: 1 },
  counterSection: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  repCount: {
    fontSize: 80,
    fontWeight: '900',
    color: COLORS.gold,
    lineHeight: 88,
    fontVariant: ['tabular-nums'],
  },
  repTarget: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: COLORS.surface2,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 4,
  },
  progressFillComplete: {
    backgroundColor: COLORS.green,
  },
  progressPct: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  graphContainer: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  graphLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1 },
  graph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 44,
    gap: 2,
  },
  graphBar: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 2,
    minHeight: 2,
  },
  graphBarActive: {
    backgroundColor: COLORS.gold,
  },
  graphThresholdLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  controls: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  startStopBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  stopBtn: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  startStopBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
  resetLink: { paddingVertical: 6 },
  resetLinkText: { fontSize: 13, color: COLORS.textSecondary, textDecorationLine: 'underline' },
  completionCard: {
    marginHorizontal: 16,
    backgroundColor: `${COLORS.green}15`,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  completionEmoji: { fontSize: 48 },
  completionTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  completionSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  doneBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  doneBtnText: { fontSize: 15, fontWeight: '900', color: '#0A0A0A' },
});
