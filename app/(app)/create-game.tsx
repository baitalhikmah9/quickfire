import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { StepCategories, type CategoryOption } from '@/features/lobby/StepCategories';
import { StepTeamInfo } from '@/features/lobby/StepTeamInfo';
import { StepSplitTeams } from '@/features/lobby/StepSplitTeams';
import { lifelinesToConfig } from '@/features/shared';
import type { GameConfig, TeamConfig, LifelineId, QuestionCard } from '@/features/shared';
import { FALLBACK_CATEGORIES } from '@/constants/categories';
import { SPACING, FONT_SIZES } from '@/constants';
import { getResolvedContentLocaleChain } from '@/lib/i18n/config';
import { useTheme } from '@/lib/hooks/useTheme';
import { useGameStore } from '@/store/game';
import { useLocaleStore } from '@/store/locale';

const STEPS = ['categories', 'teamInfo', 'splitTeams'] as const;

export default function CreateGameScreen() {
  const router = useRouter();
  const colors = useTheme();
  const contentLocaleChain = getResolvedContentLocaleChain(
    useLocaleStore.getState().contentLocales
  );
  const convexCategories = useQuery(api.content.listPlayableCategories, {
    localeChain: contentLocaleChain,
  });
  const { initSession } = useGameStore();

  const [step, setStep] = useState(0);
  const [team1Categories, setTeam1Categories] = useState<string[]>([]);
  const [team2Categories, setTeam2Categories] = useState<string[]>([]);
  const [team1Name, setTeam1Name] = useState('Team 1');
  const [team2Name, setTeam2Name] = useState('Team 2');
  const [team1Lifelines, setTeam1Lifelines] = useState<LifelineId[]>([]);
  const [team2Lifelines, setTeam2Lifelines] = useState<LifelineId[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(4);
  const [team1Count, setTeam1Count] = useState(2);
  const [team2Count, setTeam2Count] = useState(2);

  const categories: CategoryOption[] =
    convexCategories && convexCategories.length > 0
      ? convexCategories.map((c) => ({
          id: c._id,
          slug: c.slug,
          title: c.title,
        }))
      : FALLBACK_CATEGORIES.map((c) => ({
          id: c.id,
          slug: c.slug,
          title: c.title,
        }));

  useEffect(() => {
    if (totalPlayers < 2) return;
    const sum = team1Count + team2Count;
    if (sum !== totalPlayers) {
      const half = Math.floor(totalPlayers / 2);
      setTeam1Count(half);
      setTeam2Count(totalPlayers - half);
    }
  }, [team1Count, team2Count, totalPlayers]);

  const toggleCategory = (slug: string, team: 1 | 2) => {
    const setter = team === 1 ? setTeam1Categories : setTeam2Categories;
    setter((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length < 3 ? [...prev, slug] : prev
    );
  };

  const toggleLifeline = (id: LifelineId, team: 1 | 2) => {
    const setter = team === 1 ? setTeam1Lifelines : setTeam2Lifelines;
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const getMockQuestions = (count: number): QuestionCard[] => {
    const slugs = [...team1Categories, ...team2Categories];
    const catNames = slugs.length
      ? [...new Set(slugs.map((s) => categories.find((x) => x.slug === s)?.title ?? s))]
      : ['General'];
    const questions: QuestionCard[] = [];
    const points = [200, 400, 600];
    for (let i = 0; i < count; i++) {
      const cat = catNames[i % catNames.length] ?? 'General';
      questions.push({
        id: `q_mock_${i}`,
        canonicalKey: `mock:${i}`,
        categoryId: `cat_${cat}`,
        categoryName: cat,
        prompt: `Sample question ${i + 1}?`,
        answer: `Answer ${i + 1}`,
        pointValue: points[i % 3],
        locale: 'en',
        resolvedFromFallback: false,
        used: false,
      });
    }
    return questions;
  };

  const handleStart = () => {
    const allCategories = [...team1Categories, ...team2Categories];
    const teams: TeamConfig[] = [
      {
        id: 'team_1',
        name: team1Name.trim() || 'Team 1',
        playerNames: Array(team1Count)
          .fill(0)
          .map((_, i) => `Player ${i + 1}`),
      },
      {
        id: 'team_2',
        name: team2Name.trim() || 'Team 2',
        playerNames: Array(team2Count)
          .fill(0)
          .map((_, i) => `Player ${i + 1}`),
      },
    ];
    const config: GameConfig = {
      mode: 'classic',
      teams,
      categories: allCategories,
      contentLocaleChain,
      teamLifelines: {
        team_1: lifelinesToConfig(team1Lifelines),
        team_2: lifelinesToConfig(team2Lifelines),
      },
      hotSeatEnabled: false,
      wagerEnabled: true,
      boardSize: 36,
    };
    const seed = `seed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const questions = getMockQuestions(36);
    initSession(config, seed, questions);
    router.replace({ pathname: '/(app)/game', params: { mode: 'classic' } });
  };

  const currentStep = STEPS[step];
  const stepContent =
    currentStep === 'categories' ? (
      <StepCategories
        categories={categories}
        team1Selected={team1Categories}
        team2Selected={team2Categories}
        onTeam1Toggle={(s) => toggleCategory(s, 1)}
        onTeam2Toggle={(s) => toggleCategory(s, 2)}
        onNext={() => setStep(1)}
      />
    ) : currentStep === 'teamInfo' ? (
      <StepTeamInfo
        team1Name={team1Name}
        team2Name={team2Name}
        team1Lifelines={team1Lifelines}
        team2Lifelines={team2Lifelines}
        onTeam1NameChange={setTeam1Name}
        onTeam2NameChange={setTeam2Name}
        onTeam1LifelineToggle={(id) => toggleLifeline(id, 1)}
        onTeam2LifelineToggle={(id) => toggleLifeline(id, 2)}
        onNext={() => setStep(2)}
      />
    ) : (
      <StepSplitTeams
        totalPlayers={totalPlayers}
        team1Count={team1Count}
        team2Count={team2Count}
        onTotalChange={setTotalPlayers}
        onTeam1CountChange={setTeam1Count}
        onTeam2CountChange={setTeam2Count}
        onStart={handleStart}
      />
    );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.textOnBackground }]}>← Back</Text>
        </Pressable>
        <View style={styles.stepIndicator}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                {
                  backgroundColor: i <= step ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.textSecondaryOnBackground }]}>
          {step + 1} of {STEPS.length}
        </Text>
      </View>

      <View style={styles.stepBody}>{stepContent}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, minHeight: 0 },
  stepBody: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  backButton: {},
  backText: { fontSize: FONT_SIZES.md },
  stepIndicator: { flexDirection: 'row', gap: SPACING.xs },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLabel: { fontSize: FONT_SIZES.sm },
});
