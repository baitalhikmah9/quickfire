import { StyleSheet, type ViewStyle } from 'react-native';

export const SOFT_SURFACE_FACE: ViewStyle = {
  borderTopWidth: 2,
  borderTopColor: 'rgba(255, 255, 255, 0.78)',
  borderBottomWidth: 3,
  borderBottomColor: 'rgba(0, 0, 0, 0.08)',
};

/**
 * Shared raised treatment based on the categories back button reference.
 * Keep depth consistent across controls; let each component own size/radius.
 */
export function softSurfaceLift(): ViewStyle {
  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  };
}

export const SOFT_SURFACE_STYLES = StyleSheet.create({
  face: SOFT_SURFACE_FACE,
  raised: softSurfaceLift(),
});
