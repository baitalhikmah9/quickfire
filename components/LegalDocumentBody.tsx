import { View, Text, StyleSheet } from 'react-native';
import { FONTS, SPACING, TYPE_SCALE } from '@/constants';
import { useI18n } from '@/lib/i18n/useI18n';
import { LEGAL_DOCUMENT_EFFECTIVE_DATE } from '@/lib/legal/effectiveDate';
import type { LegalSection } from '@/lib/legal/documentTypes';

export type LegalDocumentBodyProps = {
  sections: LegalSection[];
  textPrimary: string;
  textSecondary: string;
  /** When set, renders document title + last-updated line above sections (standalone legal pages). */
  preamble?: { title: string };
};

/**
 * Shared legal copy: optional title + effective date, then section blocks.
 * Legal text is authored in English; body keeps LTR for readability in RTL UI locales.
 */
export function LegalDocumentBody({
  sections,
  textPrimary,
  textSecondary,
  preamble,
}: LegalDocumentBodyProps) {
  const { t } = useI18n();

  return (
    <>
      {preamble ? (
        <>
          <Text style={[styles.docTitle, { color: textPrimary, fontFamily: FONTS.displayBold }]}>
            {preamble.title}
          </Text>
          <Text style={[styles.lastUpdated, { color: textSecondary }]}>
            {t('legal.lastUpdated', { date: LEGAL_DOCUMENT_EFFECTIVE_DATE })}
          </Text>
        </>
      ) : null}

      <View style={styles.englishBody}>
        {sections.map((section, index) => (
          <View
            key={section.heading}
            style={[styles.section, index === 0 && !preamble && styles.sectionFirst]}
          >
            <Text style={[styles.sectionHeading, { color: textPrimary }]}>{section.heading}</Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text
                key={`${section.heading}-${index}`}
                style={[styles.paragraph, { color: textSecondary }]}
              >
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  docTitle: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  lastUpdated: {
    ...TYPE_SCALE.bodyS,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  englishBody: {
    writingDirection: 'ltr',
  },
  section: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionFirst: {
    marginTop: 0,
  },
  sectionHeading: {
    fontFamily: FONTS.uiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  paragraph: {
    ...TYPE_SCALE.bodyM,
    lineHeight: 24,
  },
});
