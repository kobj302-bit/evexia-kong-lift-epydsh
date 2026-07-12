// Initialize Newly console log capture before anything else
import './utils/errorLogger';

// Polyfills
import './utils/polyfills/alert';

// Disable system font scaling globally — prevents Android text scrambling
// when user has large font size set in accessibility settings
import { Text, TextInput } from 'react-native';

const TextAny = Text as any;
const TextInputAny = TextInput as any;
if (TextAny.defaultProps == null) TextAny.defaultProps = {};
TextAny.defaultProps.allowFontScaling = false;
if (TextInputAny.defaultProps == null) TextInputAny.defaultProps = {};
TextInputAny.defaultProps.allowFontScaling = false;

import 'expo-router/entry';
