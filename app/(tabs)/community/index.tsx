import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Trophy, Sword } from 'lucide-react-native';
import { COLORS } from '@/styles/colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PremiumGate } from '@/components/PremiumGate';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getItem, setItem, STORAGE_KEYS, addXP } from '@/utils/storage';
import { XP_AWARDS } from '@/utils/xp';

const TEAMS = [
  { id: 'iron-brotherhood', name: 'Iron Brotherhood', emoji: '🔩', members: 1247, weeklyXP: 48320 },
  { id: 'apex', name: 'Apex', emoji: '⚡', members: 892, weeklyXP: 41200 },
  { id: 'silent-grind', name: 'Silent Grind', emoji: '😤', members: 634, weeklyXP: 29800 },
  { id: 'cardio-club', name: 'Cardio Club', emoji: '🏃', members: 1089, weeklyXP: 35600 },
];

const CHALLENGES = [
  { id: 'streak-7', name: '7-Day Streak Challenge', desc: 'Work out 7 days in a row', xp: 25, emoji: '🔥' },
  { id: 'pushups-100', name: '100 Pushups Challenge', desc: 'Complete 100 pushups in one session', xp: 25, emoji: '💪' },
  { id: 'murph-complete', name: 'Complete the Murph', desc: 'Finish the Murph WOD', xp: 25, emoji: '🏆' },
  { id: 'pr-week', name: 'PR Week', desc: 'Set a new PR in any lift', xp: 25, emoji: '⚡' },
  { id: '1000-total', name: '1,000 lb Total', desc: 'Squat + Bench + Deadlift = 1,000 lbs', xp: 25, emoji: '🦍' },
];

const TEAM_BATTLES = [
  { id: 'b1', team1: 'Iron Brotherhood 🔩', team2: 'Apex ⚡', status: 'Active', endsIn: '2 days' },
  { id: 'b2', team1: 'Silent Grind 😤', team2: 'Cardio Club 🏃', status: 'Active', endsIn: '5 days' },
];

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

function CommunityContent() {
  const insets = useSafeAreaInsets();
  const [myTeam, setMyTeam] = useState<string | null>(null);
  const [joinedChallenges, setJoinedChallenges] = useState<string[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmoji, setNewTeamEmoji] = useState('💪');

  useEffect(() => {
    const load = async () => {
      const [team, challenges] = await Promise.all([
        getItem<string>(STORAGE_KEYS.TEAM),
        getItem<string[]>(STORAGE_KEYS.JOINED_CHALLENGES),
      ]);
      setMyTeam(team);
      setJoinedChallenges(challenges ?? []);
    };
    load();
  }, []);

  const handleJoinTeam = async (teamId: string, teamName: string) => {
    console.log('[Community] Join Team pressed:', teamName);
    await setItem(STORAGE_KEYS.TEAM, teamId);
    setMyTeam(teamId);
  };

  const handleJoinChallenge = async (challengeId: string, challengeName: string) => {
    console.log('[Community] Join Challenge pressed:', challengeName);
    if (joinedChallenges.includes(challengeId)) return;
    const updated = [...joinedChallenges, challengeId];
    await setItem(STORAGE_KEYS.JOINED_CHALLENGES, updated);
    setJoinedChallenges(updated);
    await addXP(XP_AWARDS.CHALLENGE_JOIN);
    console.log('[Community] Challenge joined — XP awarded:', XP_AWARDS.CHALLENGE_JOIN);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    console.log('[Community] Create Team pressed:', newTeamName, newTeamEmoji);
    const teamId = `custom_${Date.now()}`;
    await setItem(STORAGE_KEYS.TEAM, teamId);
    setMyTeam(teamId);
    setNewTeamName('');
  };

  const myTeamData = TEAMS.find((t) => t.id === myTeam);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <Text style={styles.headerSub}>Train together, grow together 👥</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* My team */}
        {myTeamData && (
          <AnimatedListItem index={0}>
            <View style={styles.myTeamCard}>
              <Text style={styles.myTeamLabel}>MY TEAM</Text>
              <View style={styles.myTeamInfo}>
                <Text style={styles.myTeamEmoji}>{myTeamData.emoji}</Text>
                <View>
                  <Text style={styles.myTeamName}>{myTeamData.name}</Text>
                  <Text style={styles.myTeamStats}>{myTeamData.members.toLocaleString()} members • {myTeamData.weeklyXP.toLocaleString()} weekly XP</Text>
                </View>
              </View>
            </View>
          </AnimatedListItem>
        )}

        {/* Teams leaderboard */}
        <AnimatedListItem index={1}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Trophy size={18} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Team Leaderboard</Text>
            </View>
            {TEAMS.map((team, i) => (
              <View key={team.id} style={styles.teamCard}>
                <View style={styles.teamRank}>
                  <Text style={styles.teamRankText}>{i + 1}</Text>
                </View>
                <Text style={styles.teamEmoji}>{team.emoji}</Text>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.teamStats}>{team.members.toLocaleString()} members • {team.weeklyXP.toLocaleString()} XP/wk</Text>
                </View>
                {myTeam === team.id ? (
                  <View style={styles.joinedBadge}>
                    <Text style={styles.joinedBadgeText}>Joined ✓</Text>
                  </View>
                ) : (
                  <AnimatedPressable
                    onPress={() => handleJoinTeam(team.id, team.name)}
                    style={styles.joinButton}
                  >
                    <Text style={styles.joinButtonText}>Join</Text>
                  </AnimatedPressable>
                )}
              </View>
            ))}
          </View>
        </AnimatedListItem>

        {/* Team battles */}
        <AnimatedListItem index={2}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sword size={18} color={COLORS.danger} />
              <Text style={styles.sectionTitle}>Team Battles</Text>
            </View>
            {TEAM_BATTLES.map((battle) => (
              <View key={battle.id} style={styles.battleCard}>
                <View style={styles.battleTeams}>
                  <Text style={styles.battleTeamName}>{battle.team1}</Text>
                  <View style={styles.battleVs}>
                    <Text style={styles.battleVsText}>VS</Text>
                  </View>
                  <Text style={styles.battleTeamName}>{battle.team2}</Text>
                </View>
                <View style={styles.battleMeta}>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>🔴 {battle.status}</Text>
                  </View>
                  <Text style={styles.battleEnds}>Ends in {battle.endsIn}</Text>
                </View>
              </View>
            ))}
          </View>
        </AnimatedListItem>

        {/* Challenges */}
        <AnimatedListItem index={3}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Community Challenges</Text>
            </View>
            {CHALLENGES.map((challenge) => {
              const isJoined = joinedChallenges.includes(challenge.id);
              return (
                <View key={challenge.id} style={[styles.challengeCard, isJoined && styles.challengeCardJoined]}>
                  <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{challenge.name}</Text>
                    <Text style={styles.challengeDesc}>{challenge.desc}</Text>
                  </View>
                  {isJoined ? (
                    <View style={styles.joinedBadge}>
                      <Text style={styles.joinedBadgeText}>✓</Text>
                    </View>
                  ) : (
                    <AnimatedPressable
                      onPress={() => handleJoinChallenge(challenge.id, challenge.name)}
                      style={styles.challengeJoinButton}
                    >
                      <Text style={styles.challengeJoinText}>+{challenge.xp} XP</Text>
                    </AnimatedPressable>
                  )}
                </View>
              );
            })}
          </View>
        </AnimatedListItem>

        {/* Create team */}
        <AnimatedListItem index={4}>
          <View style={styles.createTeamCard}>
            <Text style={styles.createTeamTitle}>Create Your Team</Text>
            <View style={styles.createTeamRow}>
              <TextInput
                style={styles.emojiInput}
                value={newTeamEmoji}
                onChangeText={setNewTeamEmoji}
                maxLength={2}
                placeholder="💪"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TextInput
                style={[styles.teamNameInput, { flex: 1 }]}
                value={newTeamName}
                onChangeText={setNewTeamName}
                placeholder="Team name..."
                placeholderTextColor={COLORS.textTertiary}
                returnKeyType="done"
              />
              <AnimatedPressable
                onPress={handleCreateTeam}
                style={[styles.createButton, !newTeamName.trim() && styles.createButtonDisabled]}
                disabled={!newTeamName.trim()}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </AnimatedPressable>
            </View>
          </View>
        </AnimatedListItem>

        {/* Friends */}
        <AnimatedListItem index={5}>
          <View style={styles.friendsCard}>
            <Text style={styles.friendsTitle}>Friends</Text>
            <View style={styles.friendsEmpty}>
              <Text style={styles.friendsEmptyEmoji}>👥</Text>
              <Text style={styles.friendsEmptyText}>No friends yet</Text>
              <Text style={styles.friendsEmptySub}>Invite your gym bros to join Evexia</Text>
              <AnimatedPressable
                onPress={() => console.log('[Community] Invite Friends pressed')}
                style={styles.inviteButton}
              >
                <Text style={styles.inviteButtonText}>Invite Friends</Text>
              </AnimatedPressable>
            </View>
          </View>
        </AnimatedListItem>
      </ScrollView>
    </View>
  );
}

export default function CommunityScreen() {
  return (
    <PremiumGate featureName="Community & Teams">
      <CommunityContent />
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
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
  content: {
    padding: 16,
    gap: 16,
  },
  myTeamCard: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  myTeamLabel: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
    letterSpacing: 1,
  },
  myTeamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myTeamEmoji: {
    fontSize: 32,
  },
  myTeamName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Nunito_800ExtraBold',
  },
  myTeamStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  teamCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamRankText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_700Bold',
  },
  teamEmoji: {
    fontSize: 22,
  },
  teamInfo: {
    flex: 1,
    gap: 2,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  teamStats: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  joinButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  joinedBadge: {
    backgroundColor: COLORS.successMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  joinedBadgeText: {
    fontSize: 12,
    color: COLORS.success,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  battleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  battleTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  battleTeamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  battleVs: {
    backgroundColor: COLORS.dangerMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  battleVsText: {
    fontSize: 11,
    color: COLORS.danger,
    fontFamily: 'Nunito_800ExtraBold',
    fontWeight: '800',
  },
  battleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    backgroundColor: COLORS.dangerMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    color: COLORS.danger,
    fontFamily: 'Nunito_600SemiBold',
  },
  battleEnds: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_400Regular',
  },
  challengeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  challengeCardJoined: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successMuted,
  },
  challengeEmoji: {
    fontSize: 24,
  },
  challengeInfo: {
    flex: 1,
    gap: 2,
  },
  challengeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  challengeDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
  },
  challengeJoinButton: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  challengeJoinText: {
    fontSize: 12,
    color: COLORS.accent,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  createTeamCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createTeamTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  createTeamRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  emojiInput: {
    width: 48,
    height: 44,
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamNameInput: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: 'Nunito_400Regular',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
  friendsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  friendsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Nunito_700Bold',
  },
  friendsEmpty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  friendsEmptyEmoji: {
    fontSize: 36,
  },
  friendsEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Nunito_600SemiBold',
  },
  friendsEmptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  inviteButton: {
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginTop: 4,
  },
  inviteButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
});
