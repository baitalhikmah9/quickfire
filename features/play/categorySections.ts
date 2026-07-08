import type { CategoryOption } from '@/features/shared';

export type CategorySectionId = 'history' | 'gaming' | 'popCulture' | 'sports' | 'general';

export interface CategorySection {
  id: CategorySectionId;
  title: string;
  categories: CategoryOption[];
}

const SECTION_ORDER: CategorySectionId[] = [
  'history',
  'gaming',
  'popCulture',
  'sports',
  'general',
];

const SECTION_TITLES: Record<CategorySectionId, string> = {
  history: 'History',
  gaming: 'Gaming',
  popCulture: 'Pop Culture',
  sports: 'Sports',
  general: 'General Knowledge',
};

export function getCategorySectionId(categoryId: string): CategorySectionId {
  if (categoryId.startsWith('h')) return 'history';
  if (categoryId.startsWith('g')) return 'gaming';
  if (categoryId.startsWith('pc')) return 'popCulture';
  if (categoryId.startsWith('s')) return 'sports';
  return 'general';
}

export function groupCategoriesBySection(categories: CategoryOption[]): CategorySection[] {
  const buckets = new Map<CategorySectionId, CategoryOption[]>();
  for (const sectionId of SECTION_ORDER) {
    buckets.set(sectionId, []);
  }

  for (const category of categories) {
    const sectionId = getCategorySectionId(category.id);
    buckets.get(sectionId)!.push(category);
  }

  return SECTION_ORDER.map((id) => ({
    id,
    title: SECTION_TITLES[id],
    categories: buckets.get(id) ?? [],
  })).filter((section) => section.categories.length > 0);
}

/** Only the sole highest-scoring team leads; ties do not highlight team 1 by default. */
export function getLeadingTeamId(teams: { id: string; score: number }[]): string | undefined {
  const highScore = Math.max(...teams.map((team) => team.score));
  const leaders = teams.filter((team) => team.score === highScore);
  return leaders.length === 1 ? leaders[0]?.id : undefined;
}
