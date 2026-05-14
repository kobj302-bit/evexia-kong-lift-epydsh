import React, { createContext, useContext, useState, useEffect } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  purchasePremium: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  isLoading: false,
  purchasePremium: async () => {},
  restorePurchases: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize RevenueCat - replace with your actual API key
    try {
      Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      // Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });
    } catch (e) {
      console.log('[Subscription] RevenueCat init error:', e);
    }
  }, []);

  const purchasePremium = async () => {
    console.log('[Subscription] Purchase premium triggered');
  };

  const restorePurchases = async () => {
    console.log('[Subscription] Restore purchases triggered');
  };

  return (
    <SubscriptionContext.Provider value={{ isPremium, isLoading, purchasePremium, restorePurchases }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
