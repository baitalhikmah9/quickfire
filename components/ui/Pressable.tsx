import { forwardRef } from 'react';
import { Pressable as RNPressable, type PressableProps, type View } from 'react-native';
import { hapticButtonPress } from '@/lib/haptics';

export const Pressable = forwardRef<View, PressableProps>(function Pressable(
  { onPressIn, disabled, ...rest },
  ref,
) {
  const handlePressIn: PressableProps['onPressIn'] = (event) => {
    if (!disabled) {
      hapticButtonPress();
    }
    onPressIn?.(event);
  };

  return <RNPressable ref={ref} {...rest} disabled={disabled} onPressIn={handlePressIn} />;
});

Pressable.displayName = 'Pressable';
