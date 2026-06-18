import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, LayoutAnimation } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useApp, getRank } from '@/contexts/AppContext';
import { COLORS, STARTER_TEAMS, CHALLENGES, FAKE_LEADERBOARD, FAKE_FRIENDS } from '@/constants/data';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProGate } from '@/components/ProGate';

const TEAM_EMOJIS = ['🦁', '🦅', '💀', '🌊', '🔥', '⚡', '🐺', '👑', '🦍', '🏆'];
const TEAM_COLORS = [COLORS.red, COLORS.blue, '#606060', COLORS.green, '#FF6B00', COLORS.gold];

const FAKE_TONNAGE_BOARD = [
  { name: 'IronKing_88', avatar: '🦁', tonnage: 284500 },
  { name: 'GainzGod', avatar: '💪', tonnage: 201200 },
  { name: 'SteelPhoenix', avatar: '🔥', tonnage: 178400 },
  { name: 'BarbellBeast', avatar: '🏋️', tonnage: 154900 },
  { name: 'ApexLifter', avatar: '⚡', tonnage: 132700 },
];

export default function CommunityTab() {
  const insets = useSafeAreaInsets();
  const { state, updateState, addXP, showToast } = useApp();
  const { isSubscribed } = useSubscription();
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmoji, setNewTeamEmoji] = useState('🦁');
  const [newTeamColor, setNewTeamColor] = useState(COLORS.red);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isSubscribed) return <ProGate feature="Community" icon="👥" description="Team leaderboards, battles, and challenges" />;

  const allTeams = [...STARTER_TEAMS, ...state.teams];

  const handleJoinTeam = (teamId: string, teamName: string) => {
    console.log('[Community] Join team:', teamName);
    updateState({ myTeam: teamId });
    showToast(`🦁 Joined ${teamName}!`, true);
  };

  const handleLeaveTeam = () => {
    console.log('[Community] Leave team');
    updateState({ myTeam: null });
    showToast('Left team');
  };

  const handleJoinChallenge = (challengeId: string, challengeName: string, xp: number) => {
    console.log('[Community] Join challenge:', challengeName, 'XP:', xp);
    if (state.joinedChallenges.includes(challengeId)) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateState({ joinedChallenges: [...state.joinedChallenges, challengeId] });
    addXP(xp);
    showToast(`🏆 Joined "${challengeName}"! +${xp} XP`, true);
  };

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    console.log('[Community] Create team:', newTeamName);
    const newTeam = {
      id: `custom-${Date.now()}`,
      name: newTeamName.trim(),
      emoji: newTeamEmoji,
      color: newTeamColor,
      members: 1,
    };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateState({ teams: [...state.teams, newTeam], myTeam: newTeam.id });
    setNewTeamName('');
    setShowCreateForm(false);
    showToast(`🎉 Team "${newTeam.name}" created!`, true);
  };

  const myTeamData = allTeams.find((t) => t.id === state.myTeam);
  const rank = getRank(state.xp);

  // Calculate user's total tonnage
  const userTonnage = (state.history || []).reduce((sum, h) =>
    sum + h.exercises.reduce((s2, ex) =>
      s2 + ex.sets.reduce((s3, set) =>
        s3 + (parseFloat(set.reps) || 0) * (parseFloat(set.weight) || 0), 0), 0), 0);
  const userTonnageFormatted = Math.round(userTonnage).toLocaleString();
  const username = state.profile.username || 'You';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>🏆 Community</Text>
      <Text style={styles.pageSubtitle}>Compete, challenge, and conquer</Text>

      {/* Pro Tonnage Board */}
      <View style={styles.section}>
        <Text style={styles.proExclusiveLabel}>👑 PRO EXCLUSIVE</Text>
        <Text style={styles.sectionTitle}>🏆 Pro Tonnage Board</Text>
        <View style={styles.leaderboardCard}>
          {FAKE_TONNAGE_BOARD.map((user, idx) => {
            const isFirst = idx === 0;
            return (
              <View key={user.name} style={[styles.leaderRow, isFirst && styles.leaderRowFirst]}>
                <Text style={[styles.leaderRank, isFirst && styles.leaderRankGold]}>#{idx + 1}</Text>
                <Text style={styles.leaderAvatar}>{user.avatar}</Text>
                <View style={styles.leaderInfo}>
                  <Text style={[styles.leaderName, isFirst && { color: COLORS.gold }]}>{user.name}</Text>
                  <Text style={styles.leaderRankName}>Pro Member</Text>
                </View>
                <Text style={[styles.leaderXP, isFirst && { color: COLORS.gold }]}>
                  {user.tonnage.toLocaleString()} lb
                </Text>
              </View>
            );
          })}
          {/* User row */}
          <View style={[styles.leaderRow, styles.leaderRowMe]}>
            <Text style={[styles.leaderRank, { color: COLORS.gold }]}>You</Text>
            <Text style={styles.leaderAvatar}>{state.profile.avatar}</Text>
            <View style={styles.leaderInfo}>
              <Text style={[styles.leaderName, { color: COLORS.gold }]}>{username}</Text>
              <Text style={styles.leaderRankName}>{rank.name}</Text>
            </View>
            <Text style={[styles.leaderXP, { color: COLORS.gold }]}>{userTonnageFormatted} lb</Text>
          </View>
        </View>
      </View>

      {/* My Team */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👥 My Team</Text>
        {myTeamData ? (
          <View style={[styles.myTeamCard, { borderColor: myTeamData.color }]}>
            <Text style={styles.myTeamEmoji}>{myTeamData.emoji}</Text>
            <View style={styles.myTeamInfo}>
              <Text style={[styles.myTeamName, { color: myTeamData.color }]}>{myTeamData.name}</Text>
              <Text style={styles.myTeamMembers}>{myTeamData.members.toLocaleString()} members</Text>
            </View>
            <AnimatedPressable onPress={handleLeaveTeam} style={styles.leaveBtn}>
              <Text style={styles.leaveBtnText}>Leave</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={styles.noTeamCard}>
            <Text style={styles.noTeamEmoji}>🤷</Text>
            <Text style={styles.noTeamText}>No Team Yet</Text>
            <Text style={styles.noTeamSub}>Join a team below to compete</Text>
          </View>
        )}
      </View>

      {/* Teams */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚔️ Teams</Text>
          <AnimatedPressable onPress={() => setShowCreateForm(!showCreateForm)} style={styles.createBtn}>
            <Text style={styles.createBtnText}>{showCreateForm ? '✕ Cancel' : '+ Create'}</Text>
          </AnimatedPressable>
        </View>

        {showCreateForm && (
          <View style={styles.createForm}>
            <Text style={styles.label}>Team Name</Text>
            <TextInput
              style={styles.input}
              value={newTeamName}
              onChangeText={setNewTeamName}
              placeholder="Enter team name..."
              placeholderTextColor={COLORS.textTertiary}
            />
            <Text style={styles.label}>Emoji</Text>
            <View style={styles.emojiRow}>
              {TEAM_EMOJIS.map((e) => (
                <AnimatedPressable key={e} onPress={() => setNewTeamEmoji(e)} style={[styles.emojiBtn, newTeamEmoji === e && styles.emojiBtnActive]}>
                  <Text style={styles.emojiText}>{e}</Text>
                </AnimatedPressable>
              ))}
            </View>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {TEAM_COLORS.map((c) => (
                <AnimatedPressable key={c} onPress={() => setNewTeamColor(c)} style={[styles.colorBtn, { backgroundColor: c }, newTeamColor === c && styles.colorBtnActive]} />
              ))}
            </View>
            <AnimatedPressable onPress={handleCreateTeam} style={styles.createSubmitBtn}>
              <Text style={styles.createSubmitBtnText}>Create Team {newTeamEmoji}</Text>
            </AnimatedPressable>
          </View>
        )}

        {allTeams.map((team) => {
          const isJoined = state.myTeam === team.id;
          return (
            <View key={team.id} style={[styles.teamCard, { borderLeftColor: team.color, borderLeftWidth: 4 }]}>
              <Text style={styles.teamEmoji}>{team.emoji}</Text>
              <View style={styles.teamInfo}>
                <Text style={[styles.teamName, { color: team.color }]}>{team.name}</Text>
                <Text style={styles.teamMembers}>{team.members.toLocaleString()} members</Text>
              </View>
              {isJoined ? (
                <View style={styles.joinedBadge}>
                  <Text style={styles.joinedBadgeText}>✓ Joined</Text>
                </View>
              ) : (
                <AnimatedPressable onPress={() => handleJoinTeam(team.id, team.name)} style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>Join</Text>
                </AnimatedPressable>
              )}
            </View>
          );
        })}
      </View>

      {/* Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Leaderboard</Text>
        <View style={styles.leaderboardCard}>
          {FAKE_LEADERBOARD.map((user, idx) => (
            <View key={user.name} style={[styles.leaderRow, idx === 0 && styles.leaderRowFirst]}>
              <Text style={styles.leaderRank}>#{idx + 1}</Text>
              <Text style={styles.leaderAvatar}>{user.avatar}</Text>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName}>{user.name}</Text>
                <Text style={styles.leaderRankName}>{user.rank}</Text>
              </View>
              <Text style={styles.leaderXP}>{user.xp.toLocaleString()} XP</Text>
            </View>
          ))}
          <View style={[styles.leaderRow, styles.leaderRowMe]}>
            <Text style={styles.leaderRank}>?</Text>
            <Text style={styles.leaderAvatar}>{state.profile.avatar}</Text>
            <View style={styles.leaderInfo}>
              <Text style={[styles.leaderName, { color: COLORS.gold }]}>{state.profile.username || 'You'}</Text>
              <Text style={styles.leaderRankName}>{rank.name}</Text>
            </View>
            <Text style={[styles.leaderXP, { color: COLORS.gold }]}>{state.xp.toLocaleString()} XP</Text>
          </View>
        </View>
      </View>

      {/* Battles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚔️ Active Battles</Text>
        {state.battles.map((battle) => (
          <View key={battle.id} style={styles.battleCard}>
            <View style={styles.battleTeam}>
              <Text style={styles.battleTeamName}>{battle.team1}</Text>
              <Text style={styles.battleScore}>{battle.score1.toLocaleString()}</Text>
            </View>
            <View style={styles.battleVs}>
              <Text style={styles.battleVsText}>VS</Text>
            </View>
            <View style={[styles.battleTeam, styles.battleTeamRight]}>
              <Text style={styles.battleTeamName}>{battle.team2}</Text>
              <Text style={styles.battleScore}>{battle.score2.toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Challenges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Challenges</Text>
        {CHALLENGES.map((ch) => {
          const isJoined = state.joinedChallenges.includes(ch.id);
          return (
            <View key={ch.id} style={styles.challengeCard}>
              <Text style={styles.challengeEmoji}>{ch.emoji}</Text>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeName}>{ch.name}</Text>
                <Text style={styles.challengeDesc}>{ch.description}</Text>
              </View>
              <View style={styles.challengeRight}>
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+{ch.xp} XP</Text>
                </View>
                {isJoined ? (
                  <View style={styles.joinedBadge}>
                    <Text style={styles.joinedBadgeText}>✓ Joined</Text>
                  </View>
                ) : (
                  <AnimatedPressable onPress={() => handleJoinChallenge(ch.id, ch.name, ch.xp)} style={styles.joinChallengeBtn}>
                    <Text style={styles.joinChallengeBtnText}>Join</Text>
                  </AnimatedPressable>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Friends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👫 Friends</Text>
        {FAKE_FRIENDS.map((friend) => (
          <View key={friend.name} style={styles.friendRow}>
            <Text style={styles.friendAvatar}>{friend.avatar}</Text>
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{friend.name}</Text>
              <Text style={styles.friendRank}>{friend.rank}</Text>
            </View>
            <Text style={styles.friendXP}>{friend.xp.toLocaleString()} XP</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  pageSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: -8 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  proExclusiveLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  myTeamCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myTeamEmoji: { fontSize: 36 },
  myTeamInfo: { flex: 1, gap: 3 },
  myTeamName: { fontSize: 18, fontWeight: '800' },
  myTeamMembers: { fontSize: 13, color: COLORS.textSecondary },
  leaveBtn: {
    backgroundColor: `${COLORS.red}20`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  leaveBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.red },
  noTeamCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 6,
  },
  noTeamEmoji: { fontSize: 32 },
  noTeamText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary },
  noTeamSub: { fontSize: 13, color: COLORS.textTertiary },
  createBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  createBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  createForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border2,
    gap: 10,
  },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiBtnActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.gold },
  emojiText: { fontSize: 20 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorBtnActive: { borderColor: COLORS.text, borderWidth: 3 },
  createSubmitBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createSubmitBtnText: { fontSize: 14, fontWeight: '900', color: '#0A0A0A' },
  teamCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamEmoji: { fontSize: 28 },
  teamInfo: { flex: 1, gap: 2 },
  teamName: { fontSize: 15, fontWeight: '800' },
  teamMembers: { fontSize: 12, color: COLORS.textSecondary },
  joinedBadge: {
    backgroundColor: `${COLORS.green}20`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  joinedBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.green },
  joinBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  joinBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.gold },
  leaderboardCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leaderRowFirst: { backgroundColor: `${COLORS.gold}10` },
  leaderRowMe: { backgroundColor: `${COLORS.gold}08` },
  leaderRank: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary, width: 28, textAlign: 'center' },
  leaderRankGold: { color: COLORS.gold },
  leaderAvatar: { fontSize: 24 },
  leaderInfo: { flex: 1, gap: 1 },
  leaderName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  leaderRankName: { fontSize: 11, color: COLORS.textSecondary },
  leaderXP: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, fontVariant: ['tabular-nums'] },
  battleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  battleTeam: { flex: 1, gap: 3 },
  battleTeamRight: { alignItems: 'flex-end' },
  battleTeamName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  battleScore: { fontSize: 18, fontWeight: '900', color: COLORS.gold, fontVariant: ['tabular-nums'] },
  battleVs: { paddingHorizontal: 12 },
  battleVsText: { fontSize: 14, fontWeight: '900', color: COLORS.textTertiary },
  challengeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  challengeEmoji: { fontSize: 26 },
  challengeInfo: { flex: 1, gap: 2 },
  challengeName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  challengeDesc: { fontSize: 12, color: COLORS.textSecondary },
  challengeRight: { alignItems: 'flex-end', gap: 6 },
  xpBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  xpBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.gold },
  joinChallengeBtn: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  joinChallengeBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.gold },
  friendRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendAvatar: { fontSize: 28 },
  friendInfo: { flex: 1, gap: 2 },
  friendName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  friendRank: { fontSize: 12, color: COLORS.textSecondary },
  friendXP: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, fontVariant: ['tabular-nums'] },
});
