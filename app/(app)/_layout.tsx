import { Stack } from 'expo-router';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';

export default function AppLayout() {
  return (
    <Stack screenOptions={landscapeStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="store" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="play" />
      <Stack.Screen name="game" />
      <Stack.Screen name="create-game" />
      <Stack.Screen name="rules" />
      <Stack.Screen name="theme-picker" />
      <Stack.Screen name="lobby-settings" />
      <Stack.Screen name="game-recap" />
      <Stack.Screen name="language-picker" />
      <Stack.Screen name="content-languages-picker" />
    </Stack>
  );
}
