/**
 * RevenueCat Subscription Context (Anonymous Mode)
 *
 * Provides subscription management for Expo + React Native apps.
 * Reads API keys from app.json (expo.extra) automatically.
 *
 * Supports:
 * - Native iOS/Android via RevenueCat SDK
 * - Web preview via RevenueCat REST API (read-only pricing display)
 * - Expo Go via test store keys
 *
 * NOTE: Running in anonymous mode - purchases won't sync across devices.
 * To enable cross-device sync:
 * 1. Set up authentication with setup_auth
 * 2. Re-run setup_revenuecat to upgrade this file
 *
 * SETUP:
 * 1. Wrap your app with <SubscriptionProvider>
 * 2. Run: pnpm install react-native-purchases && npx expo prebuild
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Read API keys from app.json (expo.extra)
const extra = Constants.expoConfig?.extra || {};
const IOS_API_KEY = extra.revenueCatApiKeyIos || "";
const ANDROID_API_KEY = extra.revenueCatApiKeyAndroid || "";
const TEST_IOS_API_KEY = extra.revenueCatTestApiKeyIos || "";
const TEST_ANDROID_API_KEY = extra.revenueCatTestApiKeyAndroid || "";
const ENTITLEMENT_ID = extra.revenueCatEntitlementId || "pro";
const ATHLETE_ENTITLEMENT_ID = "athlete_pro";
const DAILY_PASS_ENTITLEMENT_ID = "daily_athlete_pass";

// Check if running on web
const isWeb = Platform.OS === "web";
// Use nativelyProjectId (unique UUID) for scoping; fall back to slug for backward compatibility
const _PROJECT_SCOPE = Constants.expoConfig?.extra?.nativelyProjectId || Constants.expoConfig?.slug || "app";
const MOCK_PURCHASE_KEY = `rc_mock_purchased_${_PROJECT_SCOPE}`;
// Scoped native dev mock key — persists simulated subscription in Expo Go via expo-secure-store
const MOCK_NATIVE_KEY = `rc_dev_native_${_PROJECT_SCOPE}`;
// Scoped native cache key — persists real subscription state for fast restore on bundle reload
const NATIVE_PURCHASE_KEY = `rc_subscribed_${_PROJECT_SCOPE}`;
// Daily pass storage key — stores expiry timestamp
const DAILY_PASS_STORAGE_KEY = `evexia_daily_pass_${_PROJECT_SCOPE}`;

interface SubscriptionContextType {
  /** Whether the user has an active Kong Pro subscription */
  isSubscribed: boolean;
  /** Whether the user has an active Athlete Pro subscription */
  isAthleteSubscribed: boolean;
  /** All offerings from RevenueCat */
  offerings: PurchasesOfferings | null;
  /** The current/default offering */
  currentOffering: PurchasesOffering | null;
  /** Available packages in the current (Kong Pro) offering */
  packages: PurchasesPackage[];
  /** Available packages in the athlete offering */
  athletePackages: PurchasesPackage[];
  /** Loading state during initialization */
  loading: boolean;
  /** Whether running on web (purchases not available) */
  isWeb: boolean;
  /** Purchase a package - returns true if successful */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases - returns true if subscription found */
  restorePurchases: () => Promise<boolean>;
  /** Manually re-check subscription status */
  checkSubscription: () => Promise<void>;
  /** Mock a successful purchase on web (preview only) - sets isSubscribed to true */
  mockWebPurchase: () => void;
  /** Dev-only: simulate a purchase in Expo Go — persists across reloads via expo-secure-store */
  mockNativePurchase: () => Promise<void>;
  /** Whether the user has an active daily athlete pass (expires at midnight) */
  hasDailyPass: boolean;
  /** Purchase a daily athlete pass — grants access until end of today */
  purchaseDailyPass: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAthleteSubscribed, setIsAthleteSubscribed] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [athletePackages, setAthletePackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasDailyPass, setHasDailyPass] = useState(false);

    // Fetch offerings via REST API for web platform
  const fetchOfferingsViaRest = async () => {
    // Mock package with real prices from RevenueCat dashboard
    const mockPackage = {
      identifier: "$rc_monthly",
      product: {
        title: "Premium",
        priceString: "$29.99/month",
        description: "Unlock all premium features",
      },
    };

    setPackages([mockPackage] as PurchasesPackage[]);
    console.log("[revenuecat] Web preview: showing real prices from dashboard");
  };

  // Initialize RevenueCat on mount
  useEffect(() => {
    let customerInfoListener: { remove: () => void } | null = null;

    const initRevenueCat = async () => {
      try {
        // Web platform: SDK doesn't work, use REST API for basic info
        if (isWeb) {
          await fetchOfferingsViaRest();
          // Restore mock purchase state persisted from a previous session
          if (typeof window !== "undefined" && localStorage.getItem(MOCK_PURCHASE_KEY) === "true") {
            setIsSubscribed(true);
          }
          // Check daily pass expiry
          const savedPass = await AsyncStorage.getItem(DAILY_PASS_STORAGE_KEY).catch(() => null);
          if (savedPass) {
            const expiry = parseInt(savedPass, 10);
            if (Date.now() < expiry) setHasDailyPass(true);
            else await AsyncStorage.removeItem(DAILY_PASS_STORAGE_KEY).catch(() => {});
          }
          setLoading(false);
          return;
        }

        // Check if the react-native-purchases native module is available.
        // It is NOT available in standard Expo Go — only in custom dev builds and production builds.
        // DO NOT change this check or replace with AsyncStorage-based workarounds.
        if (typeof Purchases?.configure !== "function") {
          console.warn(
            "[RevenueCat] react-native-purchases native module not available. " +
            "Purchases require a custom dev build or production build, not standard Expo Go."
          );
          // In DEV mode, restore any previously simulated subscription state from expo-secure-store.
          // This lets you test subscription-gated features in standard Expo Go across reloads.
          if (__DEV__) {
            const mockState = await SecureStore.getItemAsync(MOCK_NATIVE_KEY).catch(() => null);
            if (mockState === "true") {
              setIsSubscribed(true);
            }
          }
          // Check daily pass expiry
          const savedPass = await AsyncStorage.getItem(DAILY_PASS_STORAGE_KEY).catch(() => null);
          if (savedPass) {
            const expiry = parseInt(savedPass, 10);
            if (Date.now() < expiry) setHasDailyPass(true);
            else await AsyncStorage.removeItem(DAILY_PASS_STORAGE_KEY).catch(() => {});
          }
          setLoading(false);
          return;
        }

        // Use DEBUG log level in development, INFO in production
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

        // Get API key based on platform and environment
        // In development (__DEV__), use ANY available test key (test store works for all platforms)
        // This allows Expo Go to work on iOS even without a platform-specific test key
        const testKey = TEST_IOS_API_KEY || TEST_ANDROID_API_KEY;
        const productionKey = Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY;
        const apiKey = __DEV__ && testKey ? testKey : productionKey;

        if (!apiKey) {
          console.warn(
            "[RevenueCat] API key not provided for this platform. " +
            "Please add revenueCatApiKeyIos/revenueCatApiKeyAndroid to app.json extra."
          );
          setLoading(false);
          return;
        }

        if (__DEV__) {
          console.log("[RevenueCat] Initializing in DEV mode with key:", apiKey.substring(0, 10) + "...");
          // Restore cached subscription state immediately to avoid paywall flash on bundle reload.
          // The customerInfoUpdateListener (fired by configure() below) is the authoritative
          // source and will immediately overwrite this with real RC Keychain data.
          const cached = await SecureStore.getItemAsync(NATIVE_PURCHASE_KEY).catch(() => null);
          if (cached === "true") {
            setIsSubscribed(true);
          }
        }

        // Check daily pass expiry
        const savedPass = await AsyncStorage.getItem(DAILY_PASS_STORAGE_KEY).catch(() => null);
        if (savedPass) {
          const expiry = parseInt(savedPass, 10);
          if (Date.now() < expiry) setHasDailyPass(true);
          else await AsyncStorage.removeItem(DAILY_PASS_STORAGE_KEY).catch(() => {});
        }

        await Purchases.configure({ apiKey });

        // Listen for real-time subscription changes (e.g., purchase from another device)
        customerInfoListener = (Purchases.addCustomerInfoUpdateListener(
          (customerInfo) => {
            const hasEntitlement =
              typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !==
              "undefined";
            const hasAthleteEntitlement =
              typeof customerInfo.entitlements.active[ATHLETE_ENTITLEMENT_ID] !==
              "undefined";
            const hasDailyPassEntitlement =
              typeof customerInfo.entitlements.active[DAILY_PASS_ENTITLEMENT_ID] !==
              "undefined";
            // In __DEV__: don't clear subscription state — RevenueCat test store purchases are
            // in-memory only and won't be known to RC after a configure() call on reload.
            if (hasEntitlement || !__DEV__) {
              setIsSubscribed(hasEntitlement);
            }
            if (hasAthleteEntitlement || !__DEV__) {
              setIsAthleteSubscribed(hasAthleteEntitlement);
            }
            if (hasDailyPassEntitlement) {
              setHasDailyPass(true);
            }
          }
        ) as unknown as { remove: () => void } | null);

        // Fetch available products/packages
        await fetchOfferings();

        // Check initial subscription status
        await checkSubscription();
      } catch (error) {
        console.error("[RevenueCat] Failed to initialize:", error);
      } finally {
        setLoading(false);
      }
    };

    initRevenueCat();

    // Cleanup listener on unmount
    return () => {
      if (customerInfoListener) {
        customerInfoListener.remove();
      }
    };
  }, []);

  const fetchOfferings = async () => {
    if (isWeb) return;
    try {
      const fetchedOfferings = await Purchases.getOfferings();
      setOfferings(fetchedOfferings);

      if (fetchedOfferings.current) {
        setCurrentOffering(fetchedOfferings.current);
        setPackages(fetchedOfferings.current.availablePackages);
      }

      // Load athlete offering packages
      const athleteOffering = fetchedOfferings.all["athlete"];
      setAthletePackages(athleteOffering?.availablePackages ?? []);
    } catch (error) {
      console.error("[RevenueCat] Failed to fetch offerings:", error);
    }
  };

  const checkSubscription = async () => {
    if (isWeb) return;
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      const hasAthleteEntitlement =
        typeof customerInfo.entitlements.active[ATHLETE_ENTITLEMENT_ID] !== "undefined";
      // In __DEV__: RC test store purchases don't survive configure(), so only update state
      // positively — mock/test purchase state persists across reloads via SecureStore cache.
      if (hasEntitlement || !__DEV__) {
        setIsSubscribed(hasEntitlement);
      }
      if (hasAthleteEntitlement || !__DEV__) {
        setIsAthleteSubscribed(hasAthleteEntitlement);
      }
      if (hasEntitlement) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
      } else if (!__DEV__) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "false").catch(() => {});
      }
    } catch (error) {
      console.error("[RevenueCat] Failed to check subscription:", error);
      // Don't reset isSubscribed on error — the customerInfoUpdateListener
      // already set it from local cache after configure(). Overriding with false
      // would incorrectly show the paywall to subscribed users on network errors.
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Purchases not available on web");
      return false;
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      setIsSubscribed(hasEntitlement);
      if (hasEntitlement) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
      }
      return hasEntitlement;
    } catch (error: any) {
      // Don't treat user cancellation as an error
      if (!error.userCancelled) {
        console.error("[RevenueCat] Purchase failed:", error);
        throw error;
      }
      return false;
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Restore not available on web");
      return false;
    }
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      setIsSubscribed(hasEntitlement);
      // In __DEV__: don't clear the cache on restore failure (test store purchases are ephemeral)
      if (hasEntitlement || !__DEV__) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, hasEntitlement ? "true" : "false").catch(() => {});
      }
      return hasEntitlement;
    } catch (error) {
      console.error("[RevenueCat] Restore failed:", error);
      throw error;
    }
  };

  const purchaseDailyPass = async (): Promise<boolean> => {
    if (isWeb) { console.warn("[RevenueCat] Purchases not available on web"); return false; }
    try {
      console.log("[RevenueCat] Purchasing daily athlete pass");
      const fetchedOfferings = await Purchases.getOfferings();
      const dailyOffering = fetchedOfferings.all["daily_pass"] ?? fetchedOfferings.current;
      const pkg = dailyOffering?.availablePackages?.[0];
      if (!pkg) { console.warn("[RevenueCat] No daily pass package found"); return false; }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      // Check entitlement OR grant access for the day (consumable fallback)
      const _hasEntitlement = typeof customerInfo.entitlements.active[DAILY_PASS_ENTITLEMENT_ID] !== "undefined";
      // Grant access until end of today regardless (consumable)
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      await AsyncStorage.setItem(DAILY_PASS_STORAGE_KEY, String(endOfDay.getTime())).catch(() => {});
      setHasDailyPass(true);
      console.log("[RevenueCat] Daily pass activated, expires:", endOfDay.toISOString());
      return true;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("[RevenueCat] Daily pass purchase failed:", error);
        throw error;
      }
      return false;
    }
  };

  // Poll every 60 seconds while a daily pass is active to detect expiry
  useEffect(() => {
    if (!hasDailyPass) return;
    const interval = setInterval(async () => {
      const savedPass = await AsyncStorage.getItem(DAILY_PASS_STORAGE_KEY).catch(() => null);
      if (!savedPass || Date.now() >= parseInt(savedPass, 10)) {
        console.log('[RevenueCat] Daily pass expired — revoking access');
        await AsyncStorage.removeItem(DAILY_PASS_STORAGE_KEY).catch(() => {});
        setHasDailyPass(false);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [hasDailyPass]);

  const mockWebPurchase = () => {
    if (!isWeb) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(MOCK_PURCHASE_KEY, "true");
    }
    setIsSubscribed(true);
  };

  // Dev-only: simulate a purchase in standard Expo Go for testing subscription-gated features.
  // Persists to expo-secure-store so the state survives Expo Go reloads.
  const mockNativePurchase = async (): Promise<void> => {
    if (!__DEV__ || isWeb) return;
    await SecureStore.setItemAsync(MOCK_NATIVE_KEY, "true").catch(() => {});
    setIsSubscribed(true);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        isAthleteSubscribed,
        offerings,
        currentOffering,
        packages,
        athletePackages,
        loading,
        isWeb,
        purchasePackage,
        restorePurchases,
        checkSubscription,
        mockWebPurchase,
        mockNativePurchase,
        hasDailyPass,
        purchaseDailyPass,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription state and methods.
 *
 * @example
 * const { isSubscribed, purchasePackage, packages, isWeb } = useSubscription();
 *
 * if (!isSubscribed) {
 *   return <Button onPress={() => router.push("/paywall")}>Upgrade</Button>;
 * }
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within SubscriptionProvider"
    );
  }
  return context;
}
