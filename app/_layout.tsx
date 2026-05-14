import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, Redirect, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/contexts/AppContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "index",
};

const KongDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D4A017',
    background: '#0A0A0A',
    card: '#1E1E1E',
    text: '#F5F5F0',
    border: 'rgba(255,255,255,0.08)',
    notification: '#E84040',
  },
};


function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const onOnboarding = pathname.startsWith("/onboarding");
    if (onOnboarding) return;

    let cancelled = false;
    isOnboardingComplete().then((done) => {
      if (cancelled) return;
      if (!done) return;
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall" as any);
      }
    }).catch(() => {
      if (cancelled) return;
      const onPaywall = pathname === "/paywall";
      if (onPaywall) return;
      if (!isSubscribed) {
        router.replace("/paywall" as any);
      }
    });
    return () => { cancelled = true; };
  }, [isSubscribed, loading, pathname]);

  return null;
}

export default function RootLayout() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    isOnboardingComplete().then((complete) => {
      setOnboardingComplete(complete);
    });
  }, [pathname]);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || onboardingComplete === null) return null;

  return (
    <SubscriptionProvider>
          <SubscriptionRedirect />
  <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={KongDarkTheme}>
        <SafeAreaProvider>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              {onboardingComplete === false && pathname !== "/auth" && pathname !== "/paywall" && pathname !== "/auth-popup" && pathname !== "/auth-callback" && <Redirect href={"/onboarding" as any} />}

              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="splash" options={{ headerShown: false }} />
                <Stack.Screen name="survey" options={{ headerShown: false }} />
                <Stack.Screen name="miss" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="settings"
                  options={{
                    headerShown: true,
                    presentation: 'modal',
                    title: '⚙️ Settings',
                    headerStyle: { backgroundColor: '#1E1E1E' },
                    headerTintColor: '#F5F5F0',
                    headerTitleStyle: { fontWeight: '800', color: '#F5F5F0' },
                  }}
                />
              </Stack>
              <SystemBars style="light" />
            </GestureHandlerRootView>
          </AppProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
    </SubscriptionProvider>
  );
}
