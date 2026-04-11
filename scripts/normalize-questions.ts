/**
 * Normalizes constants/questions.json into one-question-per-record format.
 * Output: convex/seed/questions.json and convex/seed/categories.json
 *
 * Run with: npx tsx scripts/normalize-questions.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface SourceQA {
  text: string;
  answer: string;
}

interface SourceGroup {
  id: string;
  questionAndanswer: SourceQA[];
  categoryId: string;
  name: string;
  points: number;
}

interface NormalizedCategory {
  slug: string;
  title: string;
  themeGroup: string;
  enabled: boolean;
}

interface NormalizedCategoryTranslation {
  categorySlug: string;
  locale: string;
  title: string;
}

interface NormalizedQuestion {
  categorySlug: string;
  canonicalKey: string;
  prompt: string;
  answer: string;
  pointValue: number;
  locale: string;
  status: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function main() {
  const inputPath = path.join(
    process.cwd(),
    'constants',
    'questions.json'
  );
  const seedDir = path.join(process.cwd(), 'convex', 'seed');
  const categoriesPath = path.join(seedDir, 'categories.json');
  const categoryTranslationsPath = path.join(seedDir, 'categoryTranslations.json');
  const questionsPath = path.join(seedDir, 'questions.json');

  const raw = fs.readFileSync(inputPath, 'utf-8');
  const groups: SourceGroup[] = JSON.parse(raw);

  const categoryMap = new Map<string, NormalizedCategory>();
  const categoryTranslations: NormalizedCategoryTranslation[] = [];
  const questions: NormalizedQuestion[] = [];

  for (const g of groups) {
    const slug = slugify(g.name);
    if (!categoryMap.has(slug)) {
      categoryMap.set(slug, {
        slug,
        title: g.name,
        themeGroup: g.categoryId,
        enabled: true,
      });
      categoryTranslations.push({
        categorySlug: slug,
        locale: 'en',
        title: g.name,
      });
    }

    for (const [index, qa] of g.questionAndanswer.entries()) {
      questions.push({
        categorySlug: slug,
        canonicalKey: `${slug}:${g.points}:${index}`,
        prompt: qa.text,
        answer: qa.answer,
        pointValue: g.points,
        locale: 'en',
        status: 'active',
      });
    }
  }

  const categories = Array.from(categoryMap.values());

  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir, { recursive: true });
  }

  fs.writeFileSync(
    categoriesPath,
    JSON.stringify(categories, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    categoryTranslationsPath,
    JSON.stringify(categoryTranslations, null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    questionsPath,
    JSON.stringify(questions, null, 2),
    'utf-8'
  );

  console.log(`Wrote ${categories.length} categories to ${categoriesPath}`);
  console.log(`Wrote ${categoryTranslations.length} category translations to ${categoryTranslationsPath}`);
  console.log(`Wrote ${questions.length} questions to ${questionsPath}`);
}

main();
