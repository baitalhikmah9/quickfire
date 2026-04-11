import { Ionicons } from '@expo/vector-icons';

/**
 * Maps question category ids (from questions.json groups, e.g. h1, gen2, pc9)
 * to a topic glyph for the center column on the question screen.
 */
export function getCategoryTopicIcon(categoryId: string): keyof typeof Ionicons.glyphMap {
  if (categoryId.startsWith('gen')) return 'earth-outline';
  if (categoryId.startsWith('pc')) return 'film-outline';
  const head = categoryId.charAt(0);
  if (head === 'h') return 'time-outline';
  if (head === 'g') return 'game-controller-outline';
  if (head === 's') return 'football-outline';
  return 'library-outline';
}
