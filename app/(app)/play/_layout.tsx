import { Stack } from 'expo-router';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';

export default function PlayLayout() {
  return (
    <Stack screenOptions={landscapeStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="mode" />
      <Stack.Screen name="quick-length" />
      <Stack.Screen name="team-setup" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="board" />
      <Stack.Screen name="question" />
      <Stack.Screen name="answer" />
      <Stack.Screen name="end" />
    </Stack>
  );
}
