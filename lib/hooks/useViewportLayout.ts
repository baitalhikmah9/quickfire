import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  getContentMaxWidth,
  getViewportLayout,
  type ContentWidthKind,
  type ViewportLayout,
} from '@/lib/layout/viewportLayout';

export type UseViewportLayoutResult = ViewportLayout & {
  contentMaxWidth: (kind: ContentWidthKind) => number;
};

/**
 * Hybrid viewport placement for phone + large web.
 * Use for max-width columns, modest scale, and vertical centering on tall windows.
 */
export function useViewportLayout(): UseViewportLayoutResult {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const layout = getViewportLayout(width, height);
    return {
      ...layout,
      contentMaxWidth: getContentMaxWidth,
    };
  }, [width, height]);
}
