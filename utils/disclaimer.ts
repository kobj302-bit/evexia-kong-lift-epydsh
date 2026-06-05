import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DISCLAIMER_KEY = 'kong:disclaimerAck:v1';

export const DISCLAIMER_SHORT =
  '⚠️ Educational use only. Kong\'s plans are AI-generated and are not medical, nutritional, or professional fitness advice. Consult a licensed physician before starting — especially with injuries or chronic conditions.';

export const DISCLAIMER_FULL =
  'IMPORTANT MEDICAL DISCLAIMER\n\n' +
  'Kong\'s AI-generated plans are for educational and informational purposes only. They do NOT constitute medical, nutritional, or professional fitness advice.\n\n' +
  '• Always consult a licensed physician or qualified healthcare provider before starting any new training or nutrition program.\n\n' +
  '• This is especially important if you have existing injuries, chronic conditions, cardiovascular disease, metabolic disorders, or are pregnant.\n\n' +
  '• Stop exercising immediately and seek medical attention if you experience pain, dizziness, shortness of breath, chest tightness, or any unusual symptoms.\n\n' +
  '• AI-generated plans may contain inaccuracies. Use your own judgment and consult professionals.\n\n' +
  '• Kong Lift and its developers are not liable for any injury, illness, or adverse outcome resulting from following these plans.';

export const DISCLAIMER_FOOTER =
  'Always consult a qualified physician before beginning any new training or nutrition program. Stop and seek medical attention if you experience pain, dizziness, or shortness of breath. Plans are AI-generated and may contain inaccuracies.';

export async function isDisclaimerAcknowledged(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(DISCLAIMER_KEY) === '1';
    }
    const value = await SecureStore.getItemAsync(DISCLAIMER_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function acknowledgeDisclaimer(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(DISCLAIMER_KEY, '1');
      return;
    }
    await SecureStore.setItemAsync(DISCLAIMER_KEY, '1');
  } catch {
    // silently fail
  }
}
