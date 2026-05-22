import { Alert, Platform } from 'react-native';

// On native, expose a global `alert()` that maps to RN's Alert.alert so legacy code can call it.
// On web, the browser already provides `window.alert`, so we leave it alone.
if (Platform.OS !== 'web' && typeof (globalThis as any).alert !== 'function') {
  (globalThis as any).alert = (message?: unknown) => {
    Alert.alert('', String(message ?? ''));
  };
}

export {};
