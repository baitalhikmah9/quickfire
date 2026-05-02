import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from '@/components/ui/Pressable';
import { useRouter } from 'expo-router';
import { QuickFireTitleLogo } from '@/components/QuickFireTitleLogo';
import { Button } from '@/components/ui/Button';
import { FONT_SIZES, FONTS, SPACING } from '@/constants';
import { SHOW_HOT_SEAT_UI } from '@/constants/featureFlags';
import { PlayScaffold } from '@/features/play/components/PlayScaffold';
import { WagerInfoModal } from '@/features/play/components/WagerInfoModal';
import { SOFT_SURFACE_FACE, softSurfaceLift } from '@/features/play/styles/softSurface';
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
  return {
    ...softSurfaceLift(),
    shadowColor,
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
  ...SOFT_SURFACE_FACE,
};
const RUMBLE_TEAM_COUNT_OPTIONS = [2, 3, 4, 6] as const;
const MAX_WAGERS_PER_TEAM = 9;
const MAX_HOT_SEAT_ROUNDS = 5;

const WAGER_CARD_ICON = require('@/assets/wager.png');
const HOT_SEAT_CARD_ICON = require('@/assets/hot seat.png');

/** Scales rumble team-setup panel so it fits phone landscape and narrow web widths. */
function getRumbleTeamSetupDensity(windowWidth: number, windowHeight: number) {
  const shortSide = Math.min(windowWidth, windowHeight);
  const tight = shortSide < 400;
  const micro = shortSide < 360;
  const horizontalGutter = micro ? 10 : tight ? 14 : 18;

  return {
    horizontalGutter,
    panelPadH: micro ? SPACING.sm : tight ? SPACING.sm + 2 : SPACING.md,
    panelPadV: micro ? SPACING.sm : SPACING.md,
    panelGap: tight ? SPACING.sm : SPACING.md,
    panelRadius: tight ? 14 : 18,
    panelMaxWidth: Math.min(620, Math.max(260, windowWidth - horizontalGutter * 2)),
    cardHeadingSize: micro ? FONT_SIZES.xs : tight ? FONT_SIZES.sm : FONT_SIZES.md,
    nameMinH: micro ? 36 : tight ? 40 : 46,
    nameFontSize: tight ? FONT_SIZES.sm : FONT_SIZES.md,
    namePadH: tight ? SPACING.sm : SPACING.md,
    gridRowGap: micro ? 6 : tight ? SPACING.xs : SPACING.sm,
    gridColGap: micro ? 6 : tight ? SPACING.xs : SPACING.sm,
    /** Perfect circles for 2 / 3 / 4 / 6 (guide). */
    countSize: micro ? 36 : tight ? 40 : 44,
    countGap: micro ? SPACING.xs : tight ? SPACING.sm : SPACING.md,
    countFontSize: tight ? FONT_SIZES.sm : FONT_SIZES.md,
    editIcon: micro ? 12 : tight ? 13 : 15,
    /** Air between name grid and count row (guide: generous). */
    nameToCountGap: micro ? SPACING.sm : tight ? SPACING.md : SPACING.lg,
  };
}

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
  const shortSide = Math.min(windowWidth, windowHeight);
  /** Phones / mobile web narrow view — hug Continue CTA with no extra strip padding. */
  const tightContinueStrip =
    Platform.OS === 'ios' || Platform.OS === 'android' || shortSide < 560;
  const viewportScale = Math.max(0.72, Math.min(1.08, Math.min(windowWidth / 860, windowHeight / 620)));
  const { direction, getTextStyle, t } = useI18n();
  const [wagerInfoOpen, setWagerInfoOpen] = useState(false);
  const [hotSeatInfoOpen, setHotSeatInfoOpen] = useState(false);

  const session = usePlayStore((state) => state.session);
  const ensureDraft = usePlayStore((state) => state.ensureDraft);
  const updateTeamName = usePlayStore((state) => state.updateTeamName);
  const addTeamMember = usePlayStore((state) => state.addTeamMember);
  const removeTeamMember = usePlayStore((state) => state.removeTeamMember);
  const updateTeamMemberName = usePlayStore((state) => state.updateTeamMemberName);
  const setTeamCount = usePlayStore((state) => state.setTeamCount);
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
  const hotSeatAvailable = Boolean(
    session && SHOW_HOT_SEAT_UI && (session.mode === 'classic' || session.mode === 'quickPlay')
  );
  const rumbleMode = session?.mode === 'rumble';
  const hotSeatRounds = session ? hotSeatRoundsFromConfig(session.config) : 0;

  useLayoutEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  const inputMinH = Math.round((shortScreen ? 26 : compact ? 32 : 40) * viewportScale);
  const inputFontSize = Math.round((shortScreen ? FONT_SIZES.xs : compact ? FONT_SIZES.sm : FONT_SIZES.md) * viewportScale);
  const stepperBtn = Math.round((shortScreen ? 34 : compact ? 38 : 42) * viewportScale);
  const stepperValueSize = Math.round((shortScreen ? 18 : compact ? 20 : 24) * viewportScale);
  const cardPad = Math.round((shortScreen ? SPACING.sm : SPACING.md) * viewportScale);
  const centerTitleSize = Math.round((shortScreen ? 14 : FONT_SIZES.lg) * viewportScale);
  const centerIconSize = Math.round((shortScreen ? 40 : 64) * viewportScale);

  const teamSetupLogoWidth = Math.min(
    200,
    Math.max(96, Math.round(Math.min(windowWidth, 700) * 0.28))
  );

  const rumbleDensity = useMemo(
    () => getRumbleTeamSetupDensity(windowWidth, windowHeight),
    [windowWidth, windowHeight]
  );

  const renderStepper = useCallback(
    (value: number, onMinus: () => void, onPlus: () => void, minusDisabled: boolean, plusDisabled: boolean) => (
      <View style={[styles.stepperRow, { gap: shortScreen ? SPACING.md : SPACING.lg }]}>
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
    [getTextStyle, stepperBtn, stepperValueSize, shortScreen]
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
          {memberCount > 1 ? (
            <Pressable
              onPress={() => removeTeamMember(team.id)}
              style={({ pressed }) => [
                styles.playerActionButton,
                styles.removePlayerAction,
                pressed && styles.playerActionPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('play.removeTeamMemberA11y')}
            >
              <Text style={[styles.removePlayerActionText, getTextStyle()]}>
                {t('play.removeLastPlayerLink')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => addTeamMember(team.id)}
            style={({ pressed }) => [
              styles.playerActionButton,
              styles.addPlayerAction,
              pressed && styles.playerActionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('play.addTeamMemberA11y')}
          >
            <Text style={[styles.addPlayerActionText, getTextStyle()]}>{t('play.addPlayerLink')}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const rumbleTeamsPanel = useMemo(() => {
    if (!session || !rumbleMode) return null;

    const d = rumbleDensity;
    /** Guide: 2–3 teams use a single column; 4+ use a 2-column grid (e.g. 2×2 for 4, 3×2 for 6). */
    const stackNamesVertically = session.teams.length <= 3;

    return (
      <View
        style={[
          styles.rumblePanel,
          {
            maxWidth: d.panelMaxWidth,
            paddingHorizontal: d.panelPadH,
            paddingTop: tightContinueStrip ? SPACING.xs : d.panelPadV,
            paddingBottom: tightContinueStrip ? SPACING.xs : d.panelPadV,
            gap: d.panelGap,
            borderRadius: d.panelRadius,
          },
        ]}
      >
        <Text
          style={[
            styles.rumbleCardHeading,
            { fontSize: d.cardHeadingSize },
            getTextStyle(undefined, 'displayBold', 'center'),
          ]}
        >
          {t('play.rumblePartyCountTitle').toUpperCase()}
        </Text>

        <View
          style={[
            styles.rumbleNamesGrid,
            { rowGap: d.gridRowGap, columnGap: d.gridColGap },
            stackNamesVertically && styles.rumbleNamesGridStacked,
          ]}
        >
          {session.teams.map((team) => (
            <View
              key={team.id}
              style={[
                styles.rumbleNameRow,
                { minHeight: d.nameMinH },
                stackNamesVertically && styles.rumbleNameRowFull,
              ]}
            >
              <View style={styles.editableInputWrap}>
                <TextInput
                  value={team.name}
                  onChangeText={(value) => updateTeamName(team.id, value)}
                  style={[
                    styles.rumbleNameInput,
                    styles.inputWithEditIcon,
                    {
                      minHeight: d.nameMinH,
                      fontSize: d.nameFontSize,
                      paddingHorizontal: d.namePadH,
                      borderRadius: d.nameMinH / 2,
                    },
                    getTextStyle(),
                  ]}
                  placeholder={t('play.teamNamePlaceholder')}
                  placeholderTextColor={T.textMuted}
                  accessibilityLabel={t('play.teamNamePlaceholder')}
                  numberOfLines={1}
                />
                <View style={styles.editIconWrap} pointerEvents="none" accessible={false}>
                  <Ionicons name="create-outline" size={d.editIcon} color={T.textMuted} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.rumblePanelCountRow,
            {
              gap: d.countGap,
              paddingTop: tightContinueStrip ? SPACING.xs : d.nameToCountGap,
            },
          ]}
        >
          {RUMBLE_TEAM_COUNT_OPTIONS.map((count) => {
            const selected = session.teams.length === count;
            return (
              <Pressable
                key={count}
                onPress={() => setTeamCount(count)}
                style={({ pressed }) => [
                  styles.rumbleCountButton,
                  {
                    width: d.countSize,
                    height: d.countSize,
                    borderRadius: d.countSize / 2,
                  },
                  selected && styles.rumbleCountButtonSelected,
                  pressed && styles.rumbleCountButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${count} teams`}
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.rumbleCountText,
                    { fontSize: d.countFontSize },
                    selected && styles.rumbleCountTextSelected,
                    getTextStyle(undefined, 'displayBold', 'center'),
                  ]}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }, [rumbleDensity, session, rumbleMode, getTextStyle, setTeamCount, t, tightContinueStrip, updateTeamName]);

  const centerColumn = useMemo(() => {
    if (!session) return null;
    const isBothCenter = hotSeatAvailable && wagerEnabled;
    const stackStyle = landscape 
      ? styles.centerStackLandscape 
      : [styles.centerStackPortrait, isBothCenter && shortScreen && styles.centerStackPortraitCompact];
    const gap = shortScreen ? SPACING.xs : SPACING.md;
    return (
      <View style={[stackStyle, { gap }]}>
        {hotSeatAvailable ? (
          <View style={[
            styles.centerCard, 
            shortScreen && styles.centerCardTight, 
            isBothCenter && shortScreen && styles.centerCardHalfWidth,
            { padding: cardPad }
          ]}>
            <Image
              source={HOT_SEAT_CARD_ICON}
              style={{ width: centerIconSize, height: centerIconSize }}
              contentFit="contain"
              accessible={false}
            />
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
        ) : null}

        {wagerEnabled ? (
          <View style={[
            styles.centerCard, 
            shortScreen && styles.centerCardTight, 
            isBothCenter && shortScreen && styles.centerCardHalfWidth,
            { padding: cardPad }
          ]}>
            <Image
              source={WAGER_CARD_ICON}
              style={{ width: centerIconSize, height: centerIconSize }}
              contentFit="contain"
              accessible={false}
            />
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
    hotSeatAvailable,
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
    centerIconSize,
  ]);

  if (!session) {
    return (
      <PlayScaffold title={t('common.loading')} bodyScrollEnabled={false} backgroundColor={T.canvas}>
        <Text style={{ color: T.textPrimary }}>{t('common.loading')}</Text>
      </PlayScaffold>
    );
  }

  const rumbleGutter = Math.max(SPACING.xs, rumbleDensity.horizontalGutter - 4);

  const teamSetupBody = rumbleMode ? (
    <ScrollView
      style={styles.rumbleScrollOuter}
      contentContainerStyle={[
        styles.rumbleScrollContentContainer,
        tightContinueStrip && styles.rumbleScrollContentContainerTight,
        {
          paddingHorizontal: rumbleGutter,
          alignItems: 'center',
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {rumbleTeamsPanel}
    </ScrollView>
  ) : (
    <ScrollView
      style={styles.cardsViewport}
      contentContainerStyle={styles.teamSetupClassicScrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={Platform.OS !== 'web'}
    >
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
    </ScrollView>
  );

  const mainContent = (
    <View style={styles.fixedViewportLayout}>
      <View style={styles.cardsViewportSlot}>{teamSetupBody}</View>

      <View style={[styles.floatingButtonWrap, tightContinueStrip && styles.floatingButtonWrapTight]}>
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
    </View>
  );

  return (
    <PlayScaffold
      title={t('play.teamSetupTitle')}
      onBack={() => router.replace('/(app)/')}
      customHeader={
        <View style={styles.teamSetupHeader} accessibilityRole="header">
          <Pressable
            onPress={() => router.replace('/(app)/')}
            style={({ pressed }) => [
              styles.headerBackButton,
              PLASTIC_FACE,
              neumorphicLift(T.shadowStrong, 'header'),
              pressed && styles.headerBackButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons
              name={direction === 'rtl' ? 'chevron-forward' : 'chevron-back'}
              size={18}
              color={T.textPrimary}
            />
            <Text style={styles.headerBackLabel}>{t('common.back')}</Text>
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <QuickFireTitleLogo
              width={teamSetupLogoWidth}
              testID="team-setup-brand-logo"
              containerStyle={styles.headerLogoWrap}
            />
            <Text
              numberOfLines={1}
              style={[styles.teamSetupHeaderTitle, getTextStyle(undefined, 'displayBold', 'center')]}
            >
              {t('play.teamSetupTitle').toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerMirrorSpacer} />
        </View>
      }
      bodyScrollEnabled={false}
      bodyFrame={false}
      backgroundColor={T.canvas}
      chromeColumnStyle={[
        tightContinueStrip && { paddingBottom: 0 },
        shortScreen && { paddingHorizontal: SPACING.xs }
      ]}
    >
      <WagerInfoModal visible={wagerInfoOpen} onClose={() => setWagerInfoOpen(false)} />

      {SHOW_HOT_SEAT_UI && hotSeatInfoOpen ? (
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
  teamSetupHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  headerLogoWrap: {
    alignItems: 'center',
  },
  headerBackButton: {
    minWidth: 80,
    height: 38,
    paddingHorizontal: SPACING.sm,
    borderRadius: 14,
    backgroundColor: T.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  headerBackLabel: {
    fontFamily: FONTS.uiBold,
    fontSize: 14,
    color: T.textPrimary,
  },
  headerBackButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  teamSetupHeaderTitle: {
    width: '100%',
    textAlign: 'center',
    fontFamily: FONTS.displayBold,
    color: T.textPrimary,
    fontSize: FONT_SIZES.md,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.sm,
  },
  headerMirrorSpacer: {
    width: 80,
    height: 38,
  },
  bodyFill: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    paddingHorizontal: SPACING.sm,
    paddingBottom: 0,
  },
  fixedViewportLayout: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  /** Non-scroll body (rumble) sits here; classic uses inner ScrollView with same flex contract. */
  cardsViewportSlot: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  cardsViewport: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  teamSetupClassicScrollContent: {
    flexGrow: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    paddingBottom: SPACING.xs,
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
  rumbleScroll: {
    flex: 1,
    minHeight: 0,
  },
  rumbleScrollOuter: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
  },
  rumbleScrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingVertical: SPACING.xs,
  },
  /** Phone / narrow: no vertical inset or flex stretch — panel height follows content. */
  rumbleScrollContentContainerTight: {
    flexGrow: 0,
    justifyContent: 'flex-start',
    paddingVertical: 0,
  },
  rumblePanel: {
    width: '100%',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: 'rgba(51,51,51,0.06)',
    ...PLASTIC_FACE,
    ...neumorphicLift(T.shadowStrong, 'card'),
  },
  /** Single in-card title (guide): "TEAMS" only; count selector implies team count. */
  rumbleCardHeading: {
    fontFamily: FONTS.displayBold,
    letterSpacing: 1.2,
    color: T.textPrimary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  rumbleNamesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rumbleNamesGridStacked: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  rumbleNameRow: {
    width: '48.8%',
  },
  rumbleNameRowFull: {
    width: '100%',
  },
  rumbleNameInput: {
    width: '100%',
    borderWidth: 0,
    /* Pill + slightly stronger fill (guide: light grey bars) */
    backgroundColor: 'rgba(0,0,0,0.045)',
    color: T.textPrimary,
    fontFamily: FONTS.ui,
  },
  rumblePanelCountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rumbleScrollContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  rumbleScrollContentTight: {
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  rumbleTeamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  rumbleTeamSlot: {
    width: '48%',
    flexGrow: 1,
  },
  rumbleCenterSlot: {
    alignSelf: 'stretch',
  },
  rumbleCountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: 'rgba(51,51,51,0.12)',
  },
  rumbleCountButtonSelected: {
    backgroundColor: T.textPrimary,
    borderColor: T.textPrimary,
  },
  rumbleCountButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  rumbleCountText: {
    color: T.textPrimary,
    fontSize: FONT_SIZES.md,
  },
  rumbleCountTextSelected: {
    color: T.surface,
  },
  teamCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 24,
    minHeight: 0,
    ...PLASTIC_FACE,
    ...neumorphicLift(T.shadowStrong, 'card'),
  },
  teamTitleInput: {
    fontFamily: FONTS.displayBold,
    color: T.textPrimary,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
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
    marginBottom: 2,
    paddingVertical: 1,
  },
  teamPlayerList: {
    flex: 1,
    minHeight: 0,
    gap: SPACING.xs,
  },
  playerRowSlot: {
    flexShrink: 0,
    justifyContent: 'flex-start',
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
    width: '100%',
    flexDirection: 'column',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
  teamLinksRowTight: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  playerActionButton: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  playerActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  addPlayerAction: {
    backgroundColor: T.textPrimary,
    borderWidth: 1,
    borderColor: T.textPrimary,
  },
  removePlayerAction: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(51,51,51,0.14)',
  },
  addPlayerActionText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.uiSemibold,
    color: T.canvas,
  },
  removePlayerActionText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.uiSemibold,
    color: T.textMuted,
  },
  linkText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.uiSemibold,
    color: T.textPrimary,
    textDecorationLine: 'underline',
    opacity: 0.7,
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
  centerStackPortraitCompact: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  centerCardHalfWidth: {
    flex: 1,
    paddingHorizontal: SPACING.xs,
  },
  centerCard: {
    backgroundColor: T.surface,
    borderRadius: 24,
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
    paddingTop: SPACING.xs,
    paddingBottom: 0,
    gap: 2,
    flexShrink: 0,
  },
  floatingButtonWrapTight: {
    paddingTop: SPACING.xs,
    paddingBottom: 0,
  },
  footerInner: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  continueBtn: {
    width: '100%',
    maxWidth: 320,
    minHeight: 44,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: T.surface,
    borderRadius: 24,
    ...PLASTIC_FACE,
    ...neumorphicLift(T.shadowStrong, 'pill'),
  },
  continueBtnText: {
    color: T.textPrimary,
    fontFamily: FONTS.displayBold,
    fontSize: 15,
    letterSpacing: 1.1,
  },
  footerHint: {
    marginTop: 0,
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
