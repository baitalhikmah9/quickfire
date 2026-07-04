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

/** Team with the highest score; ties favor the earliest team in roster order. */
export function getLeadingTeamId(teams: { id: string; score: number }[]): string | undefined {
  if (!teams.length) return undefined;
  return teams.reduce((leader, team) =>
    team.score > leader.score ? team : leader
  ).id;
}
