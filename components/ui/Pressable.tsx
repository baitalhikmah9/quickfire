import { forwardRef } from 'react';
import { Pressable as RNPressable, type PressableProps, type View } from 'react-native';
import { hapticButtonPress } from '@/lib/haptics';

type AppPressableProps = PressableProps & {
  hapticFeedback?: boolean;
};

export const Pressable = forwardRef<View, AppPressableProps>(function Pressable(
  { onPressIn, disabled, hapticFeedback = false, ...rest },
  ref,
) {
  const handlePressIn: PressableProps['onPressIn'] = (event) => {
    if (!disabled && hapticFeedback) {
      hapticButtonPress();
    }
    onPressIn?.(event);
  };

  return <RNPressable ref={ref} {...rest} disabled={disabled} onPressIn={handlePressIn} />;
});

Pressable.displayName = 'Pressable';
