import { Alert } from 'react-native';
// @ts-expect-error – polyfillGlobal exists at runtime but has no type declaration
import { polyfillGlobal } from 'react-native/Libraries/Utilities/PolyfillFunctions';

// Add global alert() on iOS/Android — it doesn't exist by default in React Native.
// On web, alert.web.ts is used instead (Metro picks .web.ts automatically).
polyfillGlobal('alert', () => (message?: string) => {
  Alert.alert('', String(message ?? ''));
});
