import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { useTheme } from '@/lib/hooks/useTheme';

export default function LobbySettingsModal() {
  const router = useRouter();
  const colors = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.textOnBackground }]}>Close</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textOnBackground }]}>Lobby Settings</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondaryOnBackground }]}>
          Team setup, player names, mode config, and category selection. Full lobby builder coming in
          Phase 3.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.placeholderButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.placeholderButtonText}>Start Game (placeholder)</Text>
        </Pressable>
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
    marginBottom: SPACING.xl,
  },
  placeholderButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  placeholderButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
