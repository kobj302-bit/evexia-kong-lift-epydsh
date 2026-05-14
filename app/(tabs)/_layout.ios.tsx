import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  ClipboardList,
  Zap,
  Utensils,
  Layers,
  Flame,
  Heart,
  Users,
  Target,
} from 'lucide-react-native';
import { COLORS } from '@/styles/colors';

const TABS = [
  { name: '(home)', label: 'Home', Icon: Home },
  { name: 'tracker', label: 'Tracker', Icon: ClipboardList },
  { name: 'athlete', label: 'Athlete', Icon: Zap },
  { name: 'diet', label: 'Diet', Icon: Utensils },
  { name: 'splits', label: 'Splits', Icon: Layers },
  { name: 'wods', label: 'WODs', Icon: Flame },
  { name: 'nutrition', label: 'Nutrition', Icon: Heart },
  { name: 'community', label: 'Community', Icon: Users },
  { name: 'goals', label: 'Goals', Icon: Target },
];

export default function TabLayoutIOS() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="tracker" />
      <Tabs.Screen name="athlete" />
      <Tabs.Screen name="diet" />
      <Tabs.Screen name="splits" />
      <Tabs.Screen name="wods" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="goals" />
    </Tabs>
  );
}

function FloatingTabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.tabBar}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          const { Icon } = tab;

          const onPress = () => {
            console.log('[TabBar] Tab pressed:', tab.label);
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[index]?.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(state.routes[index]?.name);
            }
          };

          return (
            <Pressable
              key={tab.name}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityLabel={tab.label}
            >
              <View style={[styles.tabIconContainer, isFocused && styles.tabIconContainerActive]}>
                <Icon
                  size={20}
                  color={isFocused ? COLORS.primary : COLORS.textTertiary}
                  strokeWidth={isFocused ? 2.5 : 2}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: COLORS.background,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  tabIconContainer: {
    width: 36,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerActive: {
    backgroundColor: COLORS.primaryMuted,
  },
  tabLabel: {
    fontSize: 9,
    color: COLORS.textTertiary,
    fontFamily: 'Nunito_600SemiBold',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
});
