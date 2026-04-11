import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';

export default function GameRecapModal() {
  const router = useRouter();
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.textOnBackground }]}>Close</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textOnBackground }]}>Game Recap</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondaryOnBackground }]}>
          Final scores, winner, and session summary. Coming with gameplay MVP in Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  closeText: {
    fontSize: FONT_SIZES.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
  },
});
