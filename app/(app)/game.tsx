import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useGameStore } from '@/store/game';
import { LobbyBuilder } from '@/features/lobby/LobbyBuilder';
import { Board } from '@/features/gameplay/Board';
import type { GameConfig, QuestionCard } from '@/features/shared';
import { SPACING, FONTS } from '@/constants';
import { getResolvedContentLocaleChain } from '@/lib/i18n/config';
import { HOME_SOFT_UI } from '@/themes';
import { useLocaleStore } from '@/store/locale';
import { Ionicons } from '@expo/vector-icons';

const T = HOME_SOFT_UI;

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

/** Blocky plastic shadow tier. */
function neumorphicLift3D(tier: 'pill' | 'card' | 'panel'): any {
  const m =
    tier === 'panel'
      ? { h: 10, el: 12 }
      : tier === 'card'
      ? { h: 8, el: 10 }
      : { h: 6, el: 8 };

  return {
    shadowColor: 'rgba(51, 51, 51, 0.15)',
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: m.el,
  };
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  
  const contentLocaleChain = getResolvedContentLocaleChain(
    useLocaleStore.getState().contentLocales
  );
  const mode = (params.mode as 'classic' | 'quickPlay') ?? 'classic';
  const { session, initSession, dispatch, resetSession } = useGameStore();
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionCard | null>(null);

  const canvas = T.colors.canvas;
  const surface = T.colors.surface;
  const textPrimary = T.colors.textPrimary;
  const textMuted = T.colors.textMuted;
  const accentGlow = T.colors.accentGlow;

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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
        <View style={[styles.header, styles.plasticFace, { backgroundColor: surface }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {mode.toUpperCase()} SETUP
          </Text>
          <View style={{ width: 40 }} />
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: canvas }]}>
      <View style={[styles.header, styles.plasticFace, { backgroundColor: surface }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="close" size={24} color={textPrimary} />
        </Pressable>
        <View style={styles.scores}>
          {session.config.teams.map((t) => (
            <View key={t.id} style={styles.scoreItem}>
              <Text style={[styles.scoreTeamName, { color: textMuted }]}>{t.name.toUpperCase()}</Text>
              <Text style={[styles.scoreValue, { color: textPrimary }]}>{session.scores[t.id] ?? 0}</Text>
            </View>
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {panelQuestion ? (
          <View style={styles.panelWrapper}>
            <View
              style={[
                styles.questionPanel,
                styles.plasticFace,
                { backgroundColor: surface },
                neumorphicLift3D('panel'),
              ]}
            >
              <Text style={[styles.questionCategory, { color: textMuted }]}>
                {panelQuestion.categoryName.toUpperCase()} • {panelQuestion.pointValue} PTS
              </Text>
              <Text style={[styles.questionPrompt, { color: textPrimary }]}>
                {panelQuestion.prompt}
              </Text>
              
              <View style={styles.answerSection}>
                <Text style={[styles.answerLabel, { color: textMuted }]}>ANSWER</Text>
                <Text style={[styles.questionAnswer, { color: '#FFB347' }]}>
                  {panelQuestion.answer}
                </Text>
              </View>

              {isDeliberation ? (
                <>
                  <Text style={[styles.currentTeam, { color: textMuted }]}>
                    ANSWERING: <Text style={{ color: textPrimary }}>{session.config.teams.find((t) => t.id === session.currentTeamId)?.name.toUpperCase()}</Text>
                  </Text>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.plasticFace,
                        { 
                          backgroundColor: surface,
                          opacity: pressed ? 0.94 : 1,
                          transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                        },
                        neumorphicLift3D('pill'),
                      ]}
                      onPress={() => {
                        if (session.currentTeamId) {
                          dispatch({ type: 'LOCK_ANSWER', teamId: session.currentTeamId, correct: true });
                          setSelectedQuestion(null);
                        }
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      <Text style={[styles.actionBtnText, { color: textPrimary }]}>CORRECT</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.plasticFace,
                        { 
                          backgroundColor: surface,
                          opacity: pressed ? 0.94 : 1,
                          transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                        },
                        neumorphicLift3D('pill'),
                      ]}
                      onPress={() => {
                        if (session.currentTeamId) {
                          dispatch({ type: 'LOCK_ANSWER', teamId: session.currentTeamId, correct: false });
                          setSelectedQuestion(null);
                        }
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: textPrimary }]}>INCORRECT</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {stealingTeamId ? (
                <>
                  <Text style={[styles.currentTeam, { color: textMuted }]}>
                    STEAL OPPORTUNITY: <Text style={{ color: textPrimary }}>{session.config.teams.find((t) => t.id === stealingTeamId)?.name.toUpperCase()}</Text>
                  </Text>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.plasticFace,
                        { backgroundColor: surface, opacity: pressed ? 0.94 : 1 },
                        neumorphicLift3D('pill'),
                      ]}
                      onPress={() => {
                        dispatch({ type: 'STEAL_ATTEMPT', teamId: stealingTeamId, correct: true });
                        setSelectedQuestion(null);
                      }}
                    >
                      <Text style={[styles.actionBtnText, { color: textPrimary }]}>CORRECT</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.plasticFace,
                        { backgroundColor: surface, opacity: pressed ? 0.94 : 1 },
                        neumorphicLift3D('pill'),
                      ]}
                      onPress={() => {
                        dispatch({ type: 'STEAL_ATTEMPT', teamId: stealingTeamId, correct: false });
                        setSelectedQuestion(null);
                      }}
                    >
                      <Text style={[styles.actionBtnText, { color: textPrimary }]}>INCORRECT</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.plasticFace,
                        { backgroundColor: surface, opacity: pressed ? 0.94 : 1 },
                        neumorphicLift3D('pill'),
                      ]}
                      onPress={() => {
                        dispatch({ type: 'SKIP_STEAL' });
                        setSelectedQuestion(null);
                      }}
                    >
                      <Text style={[styles.actionBtnText, { color: textPrimary }]}>SKIP</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {isScoring ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.plasticFace,
                    { 
                      backgroundColor: surface,
                      opacity: pressed ? 0.94 : 1,
                      shadowColor: accentGlow,
                    },
                    neumorphicLift3D('pill'),
                  ]}
                  onPress={() => {
                    dispatch({ type: 'NEXT_TURN' });
                    setSelectedQuestion(null);
                  }}
                >
                  <Text style={[styles.primaryBtnText, { color: textPrimary }]}>NEXT QUESTION</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <ScrollView
            horizontal
            style={styles.boardScroll}
            contentContainerStyle={styles.boardScrollContent}
            showsHorizontalScrollIndicator={false}
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
      </View>
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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    height: 80,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    letterSpacing: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scores: {
    flexDirection: 'row',
    gap: SPACING.xxl,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreTeamName: {
    fontSize: 10,
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: FONTS.displayBold,
  },
  content: {
    flex: 1,
  },
  lobbyBody: {
    flex: 1,
  },
  boardScroll: {
    flex: 1,
  },
  boardScrollContent: {
    paddingVertical: SPACING.lg,
  },
  panelWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  questionPanel: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 32,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  questionCategory: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1,
  },
  questionPrompt: {
    fontSize: 32,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
    lineHeight: 40,
  },
  answerSection: {
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  answerLabel: {
    fontSize: 10,
    fontFamily: FONTS.uiBold,
    letterSpacing: 1,
  },
  questionAnswer: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    textAlign: 'center',
  },
  currentTeam: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    letterSpacing: 0.5,
    marginTop: SPACING.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  actionBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
  },
  primaryBtn: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    letterSpacing: 1,
  },
});

