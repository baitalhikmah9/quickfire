import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { PALETTES } from '@/constants/theme';

interface Props {
  /** The subtree to render normally when no error has occurred. */
  children: ReactNode;
  /** Optional custom fallback UI. When omitted the default error screen is shown. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary that catches unhandled exceptions from its child tree
 * and renders a safe fallback screen instead of crashing the app.
 *
 * Wrap feature roots or the full app layout with this component.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const c = PALETTES.default;
      return (
        <ErrorFallback
          palette={c}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  button: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

function ErrorFallback({
  palette,
  error,
  onReset,
}: {
  palette: typeof PALETTES.default;
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            { color: palette.textOnBackground },
          ]}
        >
          Something went wrong
        </Text>
        <Text
          style={[
            styles.message,
            { color: palette.textSecondaryOnBackground },
          ]}
        >
          {__DEV__ && error
            ? error.message
            : 'An unexpected error occurred. Please try again.'}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: palette.primary }]}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
