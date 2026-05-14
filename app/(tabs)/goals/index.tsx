import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Target, Edit2 } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { getItem, setItem, STORAGE_KEYS, addXP } from '@/utils/storage';
import { XP_AWARDS } from '@/utils/xp';
import type { Goal } from '@/utils/storage';
import { useFocusEffect } from 'expo-router';

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newName, setNewName] = useState('');
  const [newCurrent, setNewCurrent] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  const loadGoals = useCallback(async () => {
    const saved = await getItem<Goal[]>(STORAGE_KEYS.GOALS);
    setGoals(saved ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const openAddModal = () => {
    console.log('[Goals] Add Goal pressed');
    setEditingGoal(null);
    setNewName('');
    setNewCurrent('');
    setNewTarget('');
    setNewUnit('');
    setShowModal(true);
  };

  const openEditModal = (goal: Goal) => {
    console.log('[Goals] Edit Goal pressed:', goal.name);
    setEditingGoal(goal);
    setNewName(goal.name);
    setNewCurrent(String(goal.current));
    setNewTarget(String(goal.target));
    setNewUnit(goal.unit);
    setShowModal(true);
  };

  const handleSaveGoal = async () => {
    if (!newName.trim() || !newTarget) return;
    console.log('[Goals] Save Goal pressed:', newName);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const currentVal = parseFloat(newCurrent) || 0;
    const targetVal = parseFloat(newTarget) || 0;

    if (editingGoal) {
      const updated = goals.map((g) =>
        g.id === editingGoal.id
          ? { ...g, name: newName, current: currentVal, target: targetVal, unit: newUnit }
          : g
      );
      setGoals(updated);
      await setItem(STORAGE_KEYS.GOALS, updated);

      // Check if goal hit
      if (currentVal >= targetVal && editingGoal.current < editingGoal.target) {
        console.log('[Goals] Goal achieved!', newName);
        await addXP(XP_AWARDS.GOAL_HIT);
        triggerCelebration(editingGoal.id);
      }
    } else {
      const newGoal: Goal = {
        id: Date.now().toString(),
        name: newName,
        current: currentVal,
        target: targetVal,
        unit: newUnit,
        createdAt: new Date().toISOString(),
      };
      const updated = [...goals, newGoal];
      setGoals(updated);
      await setItem(STORAGE_KEYS.GOALS, updated);
    }

    setShowModal(false);
  };

  const handleDeleteGoal = async (id: string) => {
    console.log('[Goals] Delete Goal pressed:', id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    await setItem(STORAGE_KEYS.GOALS, updated);
  };

  const triggerCelebration = (id: string) => {
    setCelebratingId(id);
    Animated.sequence([
      Animated.timing(celebrateAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(celebrateAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setCelebratingId(null));
  };

  const celebrateScale = celebrateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Goals</Text>
          <Text style={styles.headerSub}>Track your progress 🎯</Text>
        </View>
        <AnimatedPressable onPress={openAddModal} style={styles.addButton}>
          <Plus size={20} color="#FFFFFF" />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Target size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySubtitle}>
              Set your first goal and let Kong hold you accountable. No excuses.
            </Text>
            <AnimatedPressable onPress={openAddModal} style={styles.emptyButton}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Set your first goal 🎯</Text>
            </AnimatedPressable>
          </View>
        ) : (
          goals.map((goal, index) => {
            const progress = Math.min(1, goal.current / Math.max(1, goal.target));
            const progressPct = Math.round(progress * 100);
            const isComplete = goal.current >= goal.target;
            const isCelebrating = celebratingId === goal.id;

            return (
              <AnimatedListItem key={goal.id} index={index}>
                <Animated.View
                  style={[
                    styles.goalCard,
                    isComplete && styles.goalCardComplete,
                    isCelebrating && { transform: [{ scale: celebrateScale }] },
                  ]}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleRow}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      {isComplete && (
                        <View style={styles.completeBadge}>
                          <Text style={styles.completeBadgeText}>🏆 Done!</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.goalActions}>
                      <AnimatedPressable onPress={() => openEditModal(goal)} style={styles.editButton}>
                        <Edit2 size={14} color={COLORS.textSecondary} />
                      </AnimatedPressable>
                      <AnimatedPressable onPress={() => handleDeleteGoal(goal.id)} style={styles.deleteButton}>
                        <X size={14} color={COLORS.danger} />
                      </AnimatedPressable>
                    </View>
                  </View>

                  <View style={styles.goalProgress}>
                    <View style={styles.goalProgressTrack}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          { width: `${progressPct}%` },
                          isComplete && styles.goalProgressFillComplete,
                        ]}
                      />
                    </View>
                    <Text style={styles.goalProgressPct}>{progressPct}%</Text>
                  </View>

                  <View style={styles.goalStats}>
                    <Text style={styles.goalCurrent}>
                      {goal.current.toLocaleString()} {goal.unit}
                    </Text>
                    <Text style={styles.goalSeparator}>/</Text>
                    <Text style={styles.goalTarget}>
                      {goal.target.toLocaleString()} {goal.unit}
                    </Text>
                  </View>
                </Animated.View>
              </AnimatedListItem>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingGoal ? 'Edit Goal' : 'New Goal'}</Text>
              <AnimatedPressable onPress={() => setShowModal(false)} style={styles.modalClose}>
                <X size={20} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Goal Name</Text>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Bench Press 225 lbs"
                  placeholderTextColor={COLORS.textTertiary}
                  autoFocus
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Current</Text>
                  <TextInput
                    style={styles.input}
                    value={newCurrent}
                    onChangeText={setNewCurrent}
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Target</Text>
                  <TextInput
                    style={styles.input}
                    value={newTarget}
                    onChangeText={setNewTarget}
                    placeholder="100"
                    placeholderTextColor={COLORS.textTertiary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholder="lbs"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
              </View>

              <AnimatedPressable
                onPress={handleSaveGoal}
                style={[styles.saveButton, (!newName.trim() || !newTarget) && styles.saveButtonDisabled]}
                disabled={!newName.trim() || !newTarget}
              >
                <Text style={styles.saveButtonText}>{editingGoal ? 'Update Goal' : 'Add Goal 🎯'}</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Nunito_400Regular',
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  goalCardComplete: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successMuted,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  completeBadge: {
    backgroundColor: COLORS.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  completeBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  goalActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalProgressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  goalProgressFillComplete: {
    backgroundColor: COLORS.success,
  },
  goalProgressPct: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_700Bold',
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  goalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalCurrent: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
    fontVariant: ['tabular-nums'],
  },
  goalSeparator: {
    fontSize: 16,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
  },
  goalTarget: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: 'Nunito_400Regular',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
  },
});
