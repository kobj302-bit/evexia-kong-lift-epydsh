import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { BlurView } from 'expo-blur';
import { useTheme } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

const PRIMARY_TAB_COUNT = 5;

export interface TabBarItem {
  name: string;
  route: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar({
  tabs,
  containerWidth = screenWidth / 2.5,
  borderRadius = 35,
  bottomMargin,
}: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const animatedValue = useSharedValue(0);
  const [moreSheetVisible, setMoreSheetVisible] = React.useState(false);

  const primaryTabs = tabs.slice(0, PRIMARY_TAB_COUNT);
  const moreTabs = tabs.slice(PRIMARY_TAB_COUNT);

  // Total visible items = primaryTabs + "More" button
  const visibleCount = primaryTabs.length + 1;

  // Improved active tab detection
  const activeTabIndex = React.useMemo(() => {
    let bestMatch = -1;
    let bestMatchScore = 0;

    tabs.forEach((tab, index) => {
      let score = 0;
      if (pathname === tab.route) {
        score = 100;
      } else if (pathname.startsWith(tab.route as string)) {
        score = 80;
      } else if (pathname.includes(tab.name)) {
        score = 60;
      } else if (
        String(tab.route).includes('/(tabs)/') &&
        pathname.includes(String(tab.route).split('/(tabs)/')[1])
      ) {
        score = 40;
      }
      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });

    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, tabs]);

  // Is the active tab one of the overflow tabs?
  const isMoreActive = activeTabIndex >= PRIMARY_TAB_COUNT;

  // Clamp animated index to visible bar (0..PRIMARY_TAB_COUNT)
  const clampedAnimIndex = isMoreActive ? PRIMARY_TAB_COUNT : activeTabIndex;

  React.useEffect(() => {
    animatedValue.value = withSpring(clampedAnimIndex, {
      damping: 20,
      stiffness: 120,
      mass: 1,
    });
  }, [clampedAnimIndex, animatedValue]);

  const handleTabPress = (route: Href) => {
    console.log('[FloatingTabBar] Tab pressed:', route);
    router.push(route);
  };

  const handleMorePress = () => {
    console.log('[FloatingTabBar] More button pressed');
    setMoreSheetVisible(true);
  };

  const handleMoreTabPress = (tab: TabBarItem) => {
    console.log('[FloatingTabBar] More tab selected:', tab.name);
    setMoreSheetVisible(false);
    router.push(tab.route);
  };

  const handleCloseSheet = () => {
    console.log('[FloatingTabBar] More sheet closed');
    setMoreSheetVisible(false);
  };

  const tabWidthPercent = ((100 / visibleCount) - 1).toFixed(2);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = (containerWidth - 8) / visibleCount;
    return {
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, visibleCount - 1],
            [0, tabWidth * (visibleCount - 1)],
          ),
        },
      ],
    };
  });

  const dynamicStyles = {
    blurContainer: {
      ...styles.blurContainer,
      borderWidth: 1.2,
      borderColor: 'rgba(255, 255, 255, 1)',
      ...Platform.select({
        ios: {
          backgroundColor: theme.dark
            ? 'rgba(28, 28, 30, 0.8)'
            : 'rgba(255, 255, 255, 0.6)',
        },
        android: {
          backgroundColor: theme.dark
            ? 'rgba(28, 28, 30, 0.95)'
            : 'rgba(255, 255, 255, 0.6)',
        },
        web: {
          backgroundColor: theme.dark
            ? 'rgba(28, 28, 30, 0.95)'
            : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
        },
      }),
    },
    background: {
      ...styles.background,
    },
    indicator: {
      ...styles.indicator,
      backgroundColor: theme.dark
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.04)',
      width: `${tabWidthPercent}%` as `${number}%`,
    },
  };

  const iconColor = (isActive: boolean) =>
    isActive
      ? theme.colors.primary
      : theme.dark
      ? '#98989D'
      : '#000000';

  const labelColor = (isActive: boolean) =>
    isActive
      ? theme.colors.primary
      : theme.dark
      ? '#98989D'
      : '#8E8E93';

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View
          style={[
            styles.container,
            { width: containerWidth, marginBottom: bottomMargin ?? 20 },
          ]}
        >
          <BlurView
            intensity={80}
            style={[dynamicStyles.blurContainer, { borderRadius }]}
          >
            <View style={dynamicStyles.background} />
            <Animated.View style={[dynamicStyles.indicator, indicatorStyle]} />
            <View style={styles.tabsContainer}>
              {/* Primary tabs */}
              {primaryTabs.map((tab, index) => {
                const isActive = activeTabIndex === index;
                return (
                  <TouchableOpacity
                    key={tab.name}
                    style={styles.tab}
                    onPress={() => handleTabPress(tab.route)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tabContent}>
                      <IconSymbol
                        android_material_icon_name={tab.icon}
                        ios_icon_name={tab.icon}
                        size={22}
                        color={iconColor(isActive)}
                      />
                      <Text
                        style={[
                          styles.tabLabel,
                          { color: labelColor(isActive) },
                          isActive && { fontWeight: '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* More button */}
              <TouchableOpacity
                style={styles.tab}
                onPress={handleMorePress}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  <IconSymbol
                    android_material_icon_name="more-horiz"
                    ios_icon_name="more-horiz"
                    size={22}
                    color={iconColor(isMoreActive)}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: labelColor(isMoreActive) },
                      isMoreActive && { fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    More
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </SafeAreaView>

      {/* More Sheet Modal */}
      <Modal
        visible={moreSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSheet}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseSheet}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>More</Text>

            {moreTabs.map((tab) => {
              const isActive = activeTabIndex === tabs.indexOf(tab);
              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[styles.sheetRow, isActive && styles.sheetRowActive]}
                  onPress={() => handleMoreTabPress(tab)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sheetIconWrap, isActive && styles.sheetIconWrapActive]}>
                    <IconSymbol
                      android_material_icon_name={tab.icon}
                      ios_icon_name={tab.icon}
                      size={22}
                      color={isActive ? '#D4A017' : '#A0A0A0'}
                    />
                  </View>
                  <Text style={[styles.sheetRowLabel, isActive && styles.sheetRowLabelActive]}>
                    {tab.label}
                  </Text>
                  <Text style={styles.sheetChevron}>›</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.sheetCloseBtn} onPress={handleCloseSheet} activeOpacity={0.8}>
              <Text style={styles.sheetCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 2,
    bottom: 4,
    borderRadius: 27,
    width: `${(100 / 2) - 1}%`,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },
  // Modal overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5F5F0',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  sheetRowActive: {
    // subtle highlight for active row
  },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetIconWrapActive: {
    backgroundColor: 'rgba(212,160,23,0.15)',
  },
  sheetRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F0',
  },
  sheetRowLabelActive: {
    color: '#D4A017',
  },
  sheetChevron: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '300',
  },
  sheetCloseBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F0',
  },
});
