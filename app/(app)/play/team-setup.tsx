import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { FONT_SIZES, FONTS, SPACING } from '@/constants';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { WagerInfoModal } from '@/features/play/components/WagerInfoModal';
import { useI18n } from '@/lib/i18n/useI18n';
import { usePlayStore } from '@/store/play';
import type { GameSessionState } from '@/features/shared';
import { HOME_SOFT_UI } from '@/themes';

const T = HOME_SOFT_UI.colors;

/** Deeper drop shadow — reads as a raised plastic tile (tier scales with control size). */
function neumorphicLift(
  shadowColor: string,
  tier: 'hero' | 'header' | 'pill' | 'card'
): ViewStyle {
  const m =
    tier === 'hero'
      ? { h: 14, op: 0.35, r: 28, el: 18 }
      : tier === 'header'
        ? { h: 8, op: 0.28, r: 18, el: 12 }
        : tier === 'card'
          ? { h: 10, op: 0.22, r: 22, el: 10 }
          : { h: 6, op: 0.25, r: 14, el: 8 };
  return {
    shadowColor,
    shadowOffset: { width: 0, height: m.h },
    shadowOpacity: m.op,
    shadowRadius: m.r,
    elevation: m.el,
  };
}

/** Soft amber glow for focal focal squircles. */
const AMBER_GLOW: ViewStyle = {
  shadowColor: '#FFB347',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius: 36,
  elevation: 12,
};

/** Light top lip + soft bottom edge — reads extruded on white squircles. */
const PLASTIC_FACE: ViewStyle = {
  borderTopWidth: 2,
  borderTopColor: 'rgba(255, 255, 255, 0.78)',
  borderBottomWidth: StyleSheet.hairlineWidth * 2,
  borderBottomColor: 'rgba(0, 0, 0, 0.1)',
};
const MAX_WAGERS_PER_TEAM = 9;
const MAX_HOT_SEAT_ROUNDS = 5;


function hotSeatRoundsFromConfig(team: GameSessionState['config']): number {
  if (team.hotSeatRounds !== undefined) return team.hotSeatRounds;
  return team.hotSeatEnabled ? 1 : 0;
}

export default function TeamSetupScreen() {
  const router = useRouter();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const compact = windowHeight < 520 || windowWidth < 340;
  const shortScreen = windowHeight < 700;
  const landscape = windowWidth > windowHeight;
  const { getTextStyle, t } = useI18n();
  const [wagerInfoOpen, setWagerInfoOpen] = useState(false);
  const [hotSeatInfoOpen, setHotSeatInfoOpen] = useState(false);

  const session = usePlayStore((state) => state.session);
  const ensureDraft = usePlayStore((state) => state.ensureDraft);
  const updateTeamName = usePlayStore((state) => state.updateTeamName);
  const addTeamMember = usePlayStore((state) => state.addTeamMember);
  const removeTeamMember = usePlayStore((state) => state.removeTeamMember);
  const updateTeamMemberName = usePlayStore((state) => state.updateTeamMemberName);
  const setWagersPerTeam = usePlayStore((state) => state.setWagersPerTeam);
  const setHotSeatRounds = usePlayStore((state) => state.setHotSeatRounds);

  const canContinue = Boolean(
    session?.teams.every(
      (team) =>
        team.name.trim().length > 0 &&
        (team.playerNames?.length ?? 0) > 0 &&
        team.playerNames?.every((player) => player.trim().length > 0)
    )
  );

  const wagerEnabled = session?.config.wagerEnabled ?? false;
  const hotSeatRounds = session ? hotSeatRoundsFromConfig(session.config) : 0;

  useLayoutEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  const inputMinH = shortScreen ? 26 : compact ? 32 : 40;
  const inputFontSize = shortScreen ? FONT_SIZES.xs : compact ? FONT_SIZES.sm : FONT_SIZES.md;
  const stepperBtn = shortScreen ? 34 : compact ? 38 : 42;
  const stepperValueSize = shortScreen ? 18 : compact ? 20 : 24;
  const cardPad = shortScreen ? SPACING.sm : SPACING.md;
  const centerTitleSize = shortScreen ? FONT_SIZES.md : FONT_SIZES.lg;

  const renderStepper = useCallback(
    (value: number, onMinus: () => void, onPlus: () => void, minusDisabled: boolean, plusDisabled: boolean) => (
      <View style={styles.stepperRow}>
        <Pressable
          style={({ pressed }) => [
            styles.stepperButton,
            { width: stepperBtn, height: stepperBtn, opacity: minusDisabled ? 0.4 : pressed ? 0.92 : 1 },
            neumorphicLift(T.shadowStrong, 'header'),
          ]}
          onPress={onMinus}
          disabled={minusDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: minusDisabled }}
        >
          <Text style={styles.stepperGlyph}>−</Text>
        </Pressable>
        <Text style={[styles.stepperValue, { fontSize: stepperValueSize }, getTextStyle(undefined, 'displayBold', 'center')]}>
          {value}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.stepperButton,
            { width: stepperBtn, height: stepperBtn, opacity: plusDisabled ? 0.4 : pressed ? 0.92 : 1 },
            neumorphicLift(T.shadowStrong, 'header'),
          ]}
          onPress={onPlus}
          disabled={plusDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: plusDisabled }}
        >
          <Text style={styles.stepperGlyph}>+</Text>
        </Pressable>
      </View>
    ),
    [stepperBtn, stepperValueSize]
  );

  const teamCard = (team: GameSessionState['teams'][number]) => {
    const memberCount = team.playerNames?.length ?? 0;
    return (
      <View style={[styles.teamCard, { padding: cardPad }]}>
        <View style={styles.editableInputWrap}>
          <TextInput
            value={team.name}
            onChangeText={(value) => updateTeamName(team.id, value)}
            style={[
              styles.teamTitleInput,
              styles.inputWithEditIcon,
              { fontSize: shortScreen ? 18 : compact ? 20 : 22 },
              shortScreen && styles.teamTitleInputTight,
              getTextStyle(undefined, 'display', 'center'),
            ]}
            placeholder={t('play.teamNamePlaceholder')}
            placeholderTextColor={T.textMuted}
            accessibilityLabel={t('play.teamNamePlaceholder')}
          />
          <View style={styles.editIconWrap} pointerEvents="none" accessible={false}>
            <Ionicons name="create-outline" size={14} color={T.textMuted} />
          </View>
        </View>

        <View style={styles.teamPlayerList}>
          {(team.playerNames ?? []).map((player, index) => (
            <View key={`${team.id}-${index}`} style={styles.playerRowSlot}>
              <View style={styles.editableInputWrap}>
                <TextInput
                  value={player}
                  onChangeText={(value) => updateTeamMemberName(team.id, index, value)}
                  multiline={false}
                  style={[
                    styles.playerInput,
                    styles.inputWithEditIcon,
                    {
                      minHeight: inputMinH,
                      fontSize: inputFontSize,
                    },
                    getTextStyle(),
                  ]}
                  placeholder={t('play.playerPlaceholder', { count: index + 1 })}
                  placeholderTextColor={T.textMuted}
                  accessibilityLabel={`${team.id} ${t('play.playerPlaceholder', { count: index + 1 })}`}
                />
                <View style={styles.editIconWrap} pointerEvents="none" accessible={false}>
                  <Ionicons name="create-outline" size={14} color={T.textMuted} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.teamLinksRow, shortScreen && styles.teamLinksRowTight]}>
          <Pressable
            onPress={() => addTeamMember(team.id)}
            style={styles.addPlayerHit}
            accessibilityRole="button"
            accessibilityLabel={t('play.addTeamMemberA11y')}
          >
            <Text style={[styles.linkText, getTextStyle()]}>{t('play.addPlayerLink')}</Text>
          </Pressable>
          {memberCount > 1 ? (
            <Pressable
              onPress={() => removeTeamMember(team.id)}
              style={styles.addPlayerHit}
              accessibilityRole="button"
              accessibilityLabel={t('play.removeTeamMemberA11y')}
            >
              <Text style={[styles.linkTextMuted, getTextStyle()]}>{t('play.removeLastPlayerLink')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  const centerColumn = useMemo(() => {
    if (!session) return null;
    const stackStyle = landscape ? styles.centerStackLandscape : styles.centerStackPortrait;
    const gap = shortScreen ? SPACING.sm : SPACING.md;
    return (
      <View style={[stackStyle, { gap }]}>
        <View style={[styles.centerCard, shortScreen && styles.centerCardTight, { padding: cardPad }]}>
          <Text style={[styles.centerCardTitle, { fontSize: centerTitleSize }, getTextStyle(undefined, 'display', 'center')]}>
            {t('play.hotSeatTitle')}
          </Text>
          {renderStepper(
            hotSeatRounds,
            () => setHotSeatRounds(hotSeatRounds - 1),
            () => setHotSeatRounds(hotSeatRounds + 1),
            hotSeatRounds <= 0,
            hotSeatRounds >= MAX_HOT_SEAT_ROUNDS
          )}
          <Pressable onPress={() => setHotSeatInfoOpen(true)} style={styles.helpHit} accessibilityRole="button">
            <Text style={[styles.linkText, getTextStyle()]}>{t('play.hotSeatInfoLink')}</Text>
          </Pressable>
        </View>

        {wagerEnabled ? (
          <View style={[styles.centerCard, shortScreen && styles.centerCardTight, { padding: cardPad }]}>
            <Text style={[styles.centerCardTitle, { fontSize: centerTitleSize }, getTextStyle(undefined, 'display', 'center')]}>
              {t('play.wagerCardTitle')}
            </Text>
            {renderStepper(
              session.wagersPerTeam,
              () => setWagersPerTeam(session.wagersPerTeam - 1),
              () => setWagersPerTeam(session.wagersPerTeam + 1),
              session.wagersPerTeam <= 0,
              session.wagersPerTeam >= MAX_WAGERS_PER_TEAM
            )}
            <Pressable
              onPress={() => setWagerInfoOpen(true)}
              style={styles.helpHit}
              accessibilityRole="button"
            >
              <Text style={[styles.linkText, getTextStyle(undefined, 'bodySemibold')]}>{t('play.wagerHelpLink')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }, [
    session,
    wagerEnabled,
    hotSeatRounds,
    renderStepper,
    setHotSeatRounds,
    setWagersPerTeam,
    t,
    getTextStyle,
    landscape,
    shortScreen,
    cardPad,
    centerTitleSize,
  ]);

  if (!session) {
    return (
      <PlayScaffold title={t('common.loading')} bodyScrollEnabled={false} backgroundColor={T.canvas}>
        <Text style={{ color: T.textPrimary }}>{t('common.loading')}</Text>
      </PlayScaffold>
    );
  }

  const mainContent = (
    <>
      {landscape ? (
        <View style={[styles.landscapeRow, shortScreen && styles.landscapeRowTight]}>
          <View style={styles.teamCol}>{teamCard(session.teams[0])}</View>
          <View style={styles.centerCol}>{centerColumn}</View>
          <View style={styles.teamCol}>{teamCard(session.teams[1])}</View>
        </View>
      ) : (
        <View style={[styles.portraitColumn, shortScreen && styles.portraitColumnTight]}>
          <View style={styles.teamSlot}>{teamCard(session.teams[0])}</View>
          <View style={styles.teamSlot}>{teamCard(session.teams[1])}</View>
          <View style={styles.portraitCenterSlot}>{centerColumn}</View>
        </View>
      )}

      <View style={styles.floatingButtonWrap}>
        <Button
          title={t('common.continue').toUpperCase()}
          onPress={() => router.push('/play/categories')}
          disabled={!canContinue}
          style={StyleSheet.flatten([styles.continueBtn, !canContinue && { opacity: 0.5 }])}
          textStyle={StyleSheet.flatten([
            styles.continueBtnText,
            getTextStyle(undefined, 'bodySemibold', 'center'),
          ])}
        />
        {!canContinue && (
          <Text
            style={[
              styles.footerHint,
              { color: T.textMuted },
              getTextStyle(undefined, 'body', 'center'),
            ]}
          >
            {t('play.setupIncompleteHint') || 'Enter all names to continue'}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <PlayScaffold
      title={t('play.teamSetupTitle')}
      bodyScrollEnabled={false}
      bodyFrame={false}
      backgroundColor={T.canvas}
    >
      <WagerInfoModal visible={wagerInfoOpen} onClose={() => setWagerInfoOpen(false)} />

      {hotSeatInfoOpen ? (
        <View accessibilityViewIsModal style={styles.modalOverlay} testID="hot-seat-info-overlay">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHotSeatInfoOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
          <View style={[styles.modalCard, { borderColor: 'rgba(51,51,51,0.12)' }]}>
            <Text
              style={[
                styles.modalTitle,
                { color: T.textPrimary },
                getTextStyle(undefined, 'display', 'start'),
              ]}
            >
              {t('play.hotSeatInfoTitle')}
            </Text>
            <Text style={[styles.modalBody, { color: T.textMuted }, getTextStyle()]}>
              {t('play.hotSeatInfoBody')}
            </Text>

          </View>
        </View>
      ) : null}

      <View style={styles.bodyFill}>{mainContent}</View>
    </PlayScaffold>
  );
}

const styles = StyleSheet.create({
  bodyFill: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    paddingHorizontal: SPACING.sm,
    paddingBottom: 0,
  },
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    minHeight: 0,
    minWidth: 0,
  },
  landscapeRowTight: {
    gap: SPACING.sm,
  },
  teamCol: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  centerCol: {
    width: 200,
    maxWidth: '28%',
    flexShrink: 0,
    minHeight: 0,
  },
  portraitColumn: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  portraitColumnTight: {
    gap: SPACING.xs,
  },
  teamSlot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  portraitCenterSlot: {
    flexShrink: 0,
    flexGrow: 0,
    alignItems: 'stretch',
  },
  teamCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 36,
    minHeight: 0,
    ...PLASTIC_FACE,
    ...neumorphicLift(T.shadowStrong, 'card'),
  },
  teamTitleInput: {
    fontFamily: FONTS.displayBold,
    color: T.textPrimary,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
    borderWidth: 0,
    flexShrink: 0,
    textTransform: 'uppercase',
  },
  editableInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithEditIcon: {
    paddingRight: SPACING.xl + SPACING.sm,
  },
  editIconWrap: {
    position: 'absolute',
    right: SPACING.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamTitleInputTight: {
    marginBottom: SPACING.xs,
    paddingVertical: 2,
  },
  teamPlayerList: {
    flex: 1,
    minHeight: 0,
    gap: SPACING.sm,
  },
  playerRowSlot: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  playerInput: {
    flex: 1,
    width: '100%',
    minHeight: 28,
    borderWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    color: T.textPrimary,
  },
  teamLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  teamLinksRowTight: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  addPlayerHit: {
    paddingVertical: SPACING.xs,
  },
  linkText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.uiSemibold,
    color: T.textPrimary,
    textDecorationLine: 'underline',
    opacity: 0.7,
  },
  linkTextMuted: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.uiSemibold,
    color: T.textMuted,
    textDecorationLine: 'underline',
  },
  centerStackLandscape: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  centerStackPortrait: {
    flexShrink: 0,
    flexGrow: 0,
    paddingHorizontal: SPACING.sm,
  },
  centerCard: {
    backgroundColor: T.surface,
    borderRadius: 32,
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 0,
    ...PLASTIC_FACE,
    ...neumorphicLift(T.shadowStrong, 'card'),
  },
  centerCardTight: {
    gap: 2,
  },
  centerCardTitle: {
    fontFamily: FONTS.displayBold,
    color: T.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: '100%',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  stepperButton: {
    backgroundColor: T.surface,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...PLASTIC_FACE,
  },
  stepperGlyph: {
    fontSize: 28,
    fontFamily: FONTS.display,
    color: T.textPrimary,
    marginTop: -2,
  },
  stepperValue: {
    minWidth: 40,
    textAlign: 'center',
    fontFamily: FONTS.displayBold,
    color: T.textPrimary,
  },
  helpHit: {
    paddingVertical: SPACING.xs,
  },
  floatingButtonWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: 4,
  },
  footerInner: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  continueBtn: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: T.surface,
    borderRadius: 32,
    ...PLASTIC_FACE,
    ...neumorphicLift(T.shadowStrong, 'pill'),
  },
  continueBtnText: {
    color: T.textPrimary,
    fontFamily: FONTS.displayBold,
    letterSpacing: 2,
  },
  footerHint: {
    marginTop: -SPACING.xs,
    opacity: 0.8,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
    backgroundColor: 'rgba(250, 249, 246, 0.4)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    borderRadius: 42,
    backgroundColor: T.surface,
    padding: SPACING.xl,
    maxWidth: 340,
    alignSelf: 'center',
    width: '100%',
    ...PLASTIC_FACE,
    ...neumorphicLift(T.shadowStrong, 'hero'),
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.displayBold,
    marginBottom: SPACING.md,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    fontFamily: FONTS.ui,
  },

});
