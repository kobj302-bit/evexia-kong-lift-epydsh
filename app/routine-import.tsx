import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { COLORS } from '@/constants/data';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const BACKEND_URL = 'https://wrgejy47mr3yn2qj2ev46cbvxar4yx46.app.specular.dev';

type Mode = 'text' | 'image';
type Status = 'idle' | 'loading' | 'result' | 'error';

interface ParsedDay {
  name: string;
  exercises: string[];
}

interface ParsedRoutine {
  name: string;
  emoji: string;
  description: string;
  daysPerWeek: number;
  days: ParsedDay[];
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function RoutineImportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { updateState, showToast } = useApp();

  const [mode, setMode] = useState<Mode>('text');
  const [textInput, setTextInput] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [parsedRoutine, setParsedRoutine] = useState<ParsedRoutine | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePickImage = async () => {
    console.log('[RoutineImport] Pick image pressed');
    try {
      const ImagePicker = await import('expo-image-picker');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('[RoutineImport] Image selected:', uri);
        setImageUri(uri);
      } else {
        console.log('[RoutineImport] Image picker cancelled');
      }
    } catch (e) {
      console.error('[RoutineImport] Image picker error:', e);
      showToast('Could not open image picker.');
    }
  };

  const handlePickFile = async () => {
    console.log('[RoutineImport] Pick file pressed');
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        console.log('[RoutineImport] Document picker cancelled');
        return;
      }
      const asset = result.assets[0];
      console.log('[RoutineImport] File selected:', asset.name, asset.mimeType);

      const FileSystem = await import('expo-file-system/legacy');
      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log('[RoutineImport] File content length:', content.length);
      setTextInput(content);
      setMode('text');
    } catch (e) {
      console.error('[RoutineImport] File picker error:', e);
      showToast('Could not read file. Try pasting text instead.');
    }
  };

  const handleParseText = async () => {
    if (!textInput.trim()) {
      showToast('Please enter your routine text first.');
      return;
    }
    console.log('[RoutineImport] Parse text pressed, length:', textInput.trim().length);
    setStatus('loading');
    setErrorMsg('');
    try {
      console.log('[RoutineImport] POST /api/parse-routine (text mode)');
      const response = await fetch(`${BACKEND_URL}/api/parse-routine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput.trim() }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('[RoutineImport] Parse error response:', response.status, errText);
        throw new Error(`Server error ${response.status}: ${errText.slice(0, 200)}`);
      }
      const data = await response.json();
      console.log('[RoutineImport] Parse success:', data?.name);
      setParsedRoutine(data);
      setStatus('result');
    } catch (e: any) {
      console.error('[RoutineImport] Parse failed:', e);
      setErrorMsg(e?.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const handleParseImage = async () => {
    if (!imageUri) {
      showToast('Please select an image first.');
      return;
    }
    console.log('[RoutineImport] Parse image pressed:', imageUri);
    setStatus('loading');
    setErrorMsg('');
    try {
      const FileSystem = await import('expo-file-system/legacy');
      console.log('[RoutineImport] Reading image as base64...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[RoutineImport] POST /api/parse-routine (image mode), base64 length:', base64.length);
      const response = await fetch(`${BACKEND_URL}/api/parse-routine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, image_mime: 'image/jpeg' }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('[RoutineImport] Parse image error response:', response.status, errText);
        throw new Error(`Server error ${response.status}: ${errText.slice(0, 200)}`);
      }
      const data = await response.json();
      console.log('[RoutineImport] Parse image success:', data?.name);
      setParsedRoutine(data);
      setStatus('result');
    } catch (e: any) {
      console.error('[RoutineImport] Parse image failed:', e);
      setErrorMsg(e?.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const handleAddToTracker = () => {
    if (!parsedRoutine) return;
    console.log('[RoutineImport] Add to Tracker pressed:', parsedRoutine.name);
    updateState({ activeProg: parsedRoutine });
    showToast(`✅ "${parsedRoutine.name}" added to your tracker!`);
    router.back();
  };

  const handleTryAgain = () => {
    console.log('[RoutineImport] Try Again pressed');
    setStatus('idle');
    setParsedRoutine(null);
    setErrorMsg('');
  };

  const handleClose = () => {
    console.log('[RoutineImport] Close pressed');
    router.back();
  };

  const isLoading = status === 'loading';
  const topPad = Platform.OS === 'ios' ? insets.top + 8 : insets.top + 16;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Import Routine</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Segmented Control */}
        <View style={styles.segmentRow}>
          <AnimatedPressable
            onPress={() => {
              console.log('[RoutineImport] Mode switched to: text');
              setMode('text');
            }}
            style={[styles.segmentPill, mode === 'text' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentText, mode === 'text' && styles.segmentTextActive]}>
              ✏️ Type It
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              console.log('[RoutineImport] Mode switched to: image');
              setMode('image');
            }}
            style={[styles.segmentPill, mode === 'image' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentText, mode === 'image' && styles.segmentTextActive]}>
              📷 Upload Image
            </Text>
          </AnimatedPressable>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Kong is reading your routine... 🦍</Text>
          </View>
        )}

        {/* Result State */}
        {status === 'result' && parsedRoutine && (
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>{parsedRoutine.emoji || '📋'}</Text>
            <Text style={styles.resultName}>{parsedRoutine.name}</Text>
            {parsedRoutine.description ? (
              <Text style={styles.resultDesc}>{parsedRoutine.description}</Text>
            ) : null}
            <View style={styles.resultBadgeRow}>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>{parsedRoutine.daysPerWeek} days/week</Text>
              </View>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>{parsedRoutine.days?.length || 0} days total</Text>
              </View>
            </View>
            <View style={styles.resultDaysList}>
              {(parsedRoutine.days || []).map((day, i) => {
                const exCount = day.exercises?.length || 0;
                const exCountText = `${exCount} exercise${exCount !== 1 ? 's' : ''}`;
                return (
                  <View key={i} style={styles.resultDayRow}>
                    <Text style={styles.resultDayName}>{day.name}</Text>
                    <Text style={styles.resultDayCount}>{exCountText}</Text>
                  </View>
                );
              })}
            </View>
            <AnimatedPressable onPress={handleAddToTracker} style={styles.addBtn}>
              <Text style={styles.addBtnText}>✅ Add to Tracker</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleTryAgain} style={styles.tryAgainBtn}>
              <Text style={styles.tryAgainBtnText}>🔄 Try Again</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Error State */}
        {status === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Parse Failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            <AnimatedPressable onPress={handleTryAgain} style={styles.tryAgainBtn}>
              <Text style={styles.tryAgainBtnText}>🔄 Try Again</Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Idle / Input State */}
        {(status === 'idle' || status === 'error') && (
          <>
            {mode === 'text' ? (
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>YOUR ROUTINE</Text>
                <TextInput
                  style={styles.textArea}
                  value={textInput}
                  onChangeText={setTextInput}
                  placeholder={
                    'Paste or type your workout routine here...\n\nExample:\nMonday: Bench 4x8, OHP 3x10\nWednesday: Squat 4x5, RDL 3x8\nFriday: Pull-ups 4x8, Rows 3x10'
                  }
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  textAlignVertical="top"
                  scrollEnabled={false}
                />
                <AnimatedPressable
                  onPress={handleParseText}
                  style={[styles.parseBtn, isLoading && styles.parseBtnDisabled]}
                  disabled={isLoading}
                >
                  <Text style={styles.parseBtnText}>Parse with AI ✨</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>ROUTINE IMAGE</Text>
                {imageUri ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={resolveImageSource(imageUri)}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity onPress={handlePickImage} style={styles.changeImageBtn}>
                      <Text style={styles.changeImageText}>Change Image</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handlePickImage} style={styles.uploadZone}>
                    <Text style={styles.uploadIcon}>📷</Text>
                    <Text style={styles.uploadText}>Tap to select an image of your routine</Text>
                    <Text style={styles.uploadSub}>Photos, screenshots, handwritten notes</Text>
                  </TouchableOpacity>
                )}
                <AnimatedPressable
                  onPress={handleParseImage}
                  style={[styles.parseBtn, (!imageUri || isLoading) && styles.parseBtnDisabled]}
                  disabled={!imageUri || isLoading}
                >
                  <Text style={styles.parseBtnText}>Parse with AI ✨</Text>
                </AnimatedPressable>
                <AnimatedPressable onPress={handlePickFile} style={styles.fileBtn}>
                  <Text style={styles.fileBtnText}>📄 Upload File</Text>
                </AnimatedPressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },

  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: COLORS.gold,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: '#0A0A0A',
  },

  // Input card
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  textArea: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 160,
    lineHeight: 22,
  },

  // Upload zone
  uploadZone: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.surface2,
  },
  uploadIcon: { fontSize: 40 },
  uploadText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  uploadSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },

  // Image preview
  imagePreviewWrap: { gap: 10 },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.surface2,
  },
  changeImageBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  changeImageText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // Buttons
  parseBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  parseBtnDisabled: {
    opacity: 0.45,
  },
  parseBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0A0A',
  },
  fileBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // Loading
  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Result
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    alignItems: 'center',
  },
  resultEmoji: { fontSize: 40 },
  resultName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.gold,
    textAlign: 'center',
  },
  resultDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  resultBadge: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border2,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
  },
  resultDaysList: {
    width: '100%',
    gap: 6,
  },
  resultDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultDayName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  resultDayCount: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0A0A0A',
  },
  tryAgainBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tryAgainBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // Error
  errorCard: {
    backgroundColor: `${COLORS.red}15`,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: `${COLORS.red}40`,
    alignItems: 'center',
    gap: 10,
  },
  errorIcon: { fontSize: 32 },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.red,
  },
  errorMsg: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
