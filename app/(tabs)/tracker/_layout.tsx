import { Stack } from 'expo-router';

export default function TrackerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="session" />
    </Stack>
  );
}
