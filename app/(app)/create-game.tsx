import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
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
import { SPACING, FONTS } from '@/constants';
import { getResolvedContentLocaleChain } from '@/lib/i18n/config';
import { useGameStore } from '@/store/game';
import { useLocaleStore } from '@/store/locale';
import { HOME_SOFT_UI } from '@/themes';
import { Ionicons } from '@expo/vector-icons';

const T = HOME_SOFT_UI;

const STEPS = ['categories', 'teamInfo', 'splitTeams'] as const;

/** Raised plastic tile shadow tier. */
function neumorphicLift3D(shadowColor: string, tier: 'hero' | 'header' | 'pill'): any {
  const m =
    tier === 'hero'
      ? { h: 10, r: 0, el: 12 }
      : tier === 'header'
      ? { h: 6, r: 0, el: 8 }
      : { h: 4, r: 0, el: 4 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}

export default function CreateGameScreen() {
  const router = useRouter();
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

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const shadowHex = T.colors.shadowStrong;

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
      <View style={[styles.header, styles.plasticFace, { backgroundColor: surface }, neumorphicLift3D(shadowHex, 'header')]}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
            style={({ pressed }) => [
              styles.backButton,
              styles.plasticFace,
              { backgroundColor: surface, opacity: pressed ? 0.94 : 1, transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }] },
              neumorphicLift3D(shadowHex, 'pill'),
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={textPrimary} />
          </Pressable>
        </View>

        <View style={styles.headerCenter}>
          <View style={styles.stepIndicator}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: i === step ? textPrimary : textMuted,
                    opacity: i === step ? 1 : 0.2,
                    width: i === step ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.headerRight}>
           <Text style={[styles.stepLabel, { color: textMuted }]}>
            {step + 1} / {STEPS.length}
          </Text>
        </View>
      </View>

      <View style={styles.stepBody}>{stepContent}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  plasticFace: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.78)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  safeArea: { flex: 1 },
  stepBody: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    height: 72,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  headerLeft: {
    width: 60,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 11, fontFamily: FONTS.uiBold, letterSpacing: 1 },
});

