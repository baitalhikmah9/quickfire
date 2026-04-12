import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useGameStore } from '@/store/game';
import { LobbyBuilder } from '@/features/lobby/LobbyBuilder';
import { Board } from '@/features/gameplay/Board';
import type { GameConfig, QuestionCard } from '@/features/shared';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '@/constants';
import { getResolvedContentLocaleChain } from '@/lib/i18n/config';
import { useTheme } from '@/lib/hooks/useTheme';
import { useLocaleStore } from '@/store/locale';

/** Mock questions for offline/guest play when Convex is not seeded */
function getMockQuestions(count: number): QuestionCard[] {
  const categories = ['History', 'Pop Culture', 'Science', 'Sports', 'General'];
  const questions: QuestionCard[] = [];
  const points = [200, 400, 600];
  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    const pt = points[i % 3];
    questions.push({
      id: `q_mock_${i}`,
      canonicalKey: `mock:${i}`,
      categoryId: `cat_${cat}`,
      categoryName: cat,
      prompt: `Sample question ${i + 1}?`,
      answer: `Answer ${i + 1}`,
      pointValue: pt,
      locale: 'en',
      resolvedFromFallback: false,
      used: false,
    });
  }
  return questions;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const colors = useTheme();
  const contentLocaleChain = getResolvedContentLocaleChain(
    useLocaleStore.getState().contentLocales
  );
  const mode = (params.mode as 'classic' | 'quickPlay') ?? 'classic';
  const { session, initSession, dispatch, resetSession } = useGameStore();
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionCard | null>(null);

  const handleStartGame = (config: GameConfig) => {
    const boardSize = config.boardSize ?? 36;
    const questions = getMockQuestions(boardSize);
    const seed = `seed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    initSession(
      {
        ...config,
        contentLocaleChain: config.contentLocaleChain ?? contentLocaleChain,
      },
      seed,
      questions
    );
  };

  const handleSelectQuestion = (question: QuestionCard) => {
    setSelectedQuestion(question);
    dispatch({ type: 'REVEAL_QUESTION', questionId: question.id, question });
  };

  const otherTeamId = session?.config.teams.find((t) => t.id !== session.currentTeamId)?.id;

  const handleBack = () => {
    if (session) {
      resetSession();
      setSelectedQuestion(null);
    } else {
      router.back();
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.textOnBackground }]}>← Back</Text>
          </Pressable>
        </View>
        <View style={styles.lobbyBody}>
          <LobbyBuilder mode={mode} onStart={handleStartGame} />
        </View>
      </SafeAreaView>
    );
  }

  const showQuestionPanel = Boolean(
    (selectedQuestion || session.phase === 'stealWindow' || session.phase === 'scoring') &&
    session.currentQuestion
  );
  const isDeliberation = session.phase === 'deliberation';
  const stealingTeamId = session.phase === 'stealWindow' ? otherTeamId ?? null : null;
  const isScoring = session.phase === 'scoring';
  const panelQuestion = showQuestionPanel && session.currentQuestion ? session.currentQuestion : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.textOnBackground }]}>← Back</Text>
        </Pressable>
        <View style={styles.scores}>
          {session.config.teams.map((t) => (
            <Text key={t.id} style={[styles.scoreText, { color: colors.textOnBackground }]}>
              {t.name}: {session.scores[t.id] ?? 0}
            </Text>
          ))}
        </View>
      </View>

      {panelQuestion ? (
        <View style={styles.questionPanel}>
          <Text style={[styles.questionCategory, { color: colors.textSecondaryOnBackground }]}>
            {panelQuestion.categoryName} • {panelQuestion.pointValue} pts
          </Text>
          <Text style={[styles.questionPrompt, { color: colors.textOnBackground }]}>
            {panelQuestion.prompt}
          </Text>
          <Text style={[styles.questionAnswer, { color: colors.secondary }]}>
            {panelQuestion.answer}
          </Text>

          {isDeliberation ? (
            <>
              <Text style={[styles.currentTeam, { color: colors.textSecondaryOnBackground }]}>
                Answering: {session.config.teams.find((t) => t.id === session.currentTeamId)?.name}
              </Text>
              <View style={styles.answerButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.answerBtn,
                    { backgroundColor: colors.success },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    if (session.currentTeamId) {
                      dispatch({ type: 'LOCK_ANSWER', teamId: session.currentTeamId, correct: true });
                      setSelectedQuestion(null);
                    }
                  }}
                >
                  <Text style={styles.answerBtnText}>Correct</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.answerBtn,
                    { backgroundColor: colors.error },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    if (session.currentTeamId) {
                      dispatch({ type: 'LOCK_ANSWER', teamId: session.currentTeamId, correct: false });
                      setSelectedQuestion(null);
                    }
                  }}
                >
                  <Text style={styles.answerBtnText}>Incorrect</Text>
                </Pressable>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                onPress={() => setSelectedQuestion(null)}
              >
                <Text style={[styles.closeBtnText, { color: colors.textSecondaryOnBackground }]}>
                  Close (no points)
                </Text>
              </Pressable>
            </>
          ) : null}

          {stealingTeamId ? (
            <>
              <Text style={[styles.currentTeam, { color: colors.textSecondaryOnBackground }]}>
                Steal: {session.config.teams.find((t) => t.id === stealingTeamId)?.name}
              </Text>
              <View style={[styles.answerButtons, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.answerBtn,
                    { backgroundColor: colors.success },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    dispatch({ type: 'STEAL_ATTEMPT', teamId: stealingTeamId, correct: true });
                    setSelectedQuestion(null);
                  }}
                >
                  <Text style={styles.answerBtnText}>Correct</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.answerBtn,
                    { backgroundColor: colors.error },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    dispatch({ type: 'STEAL_ATTEMPT', teamId: stealingTeamId, correct: false });
                    setSelectedQuestion(null);
                  }}
                >
                  <Text style={styles.answerBtnText}>Incorrect</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.answerBtn,
                    { backgroundColor: colors.secondary },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    dispatch({ type: 'SKIP_STEAL' });
                    setSelectedQuestion(null);
                  }}
                >
                  <Text style={styles.answerBtnText}>Skip</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {isScoring ? (
            <Pressable
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                dispatch({ type: 'NEXT_TURN' });
                setSelectedQuestion(null);
              }}
            >
              <Text style={styles.nextBtnText}>Next Question</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <ScrollView
          horizontal
          style={styles.boardScroll}
          contentContainerStyle={styles.boardScrollContent}
          showsHorizontalScrollIndicator
        >
          <Board
            questions={session.board.map((q) => ({
              ...q,
              used: session.usedQuestionIds.has(q.id),
            }))}
            onSelectQuestion={handleSelectQuestion}
            selectedQuestionId={selectedQuestion?.id}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  lobbyBody: {
    flex: 1,
    minHeight: 0,
  },
  boardScroll: {
    flex: 1,
  },
  boardScrollContent: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {},
  backText: {
    fontSize: FONT_SIZES.md,
  },
  scores: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  scoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  questionPanel: {
    flex: 1,
    padding: SPACING.lg,
  },
  questionCategory: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  questionPrompt: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  questionAnswer: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.md,
  },
  currentTeam: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  answerButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  answerBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  answerBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeBtn: {
    paddingVertical: SPACING.sm,
  },
  closeBtnText: {},
  nextBtn: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
