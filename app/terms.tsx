import { LegalScrollScreen } from '@/components/LegalScrollScreen';
import { useI18n } from '@/lib/i18n/useI18n';
import { TERMS_SECTIONS } from '@/lib/legal/termsSections';

export default function TermsScreen() {
  const { t } = useI18n();
  return <LegalScrollScreen title={t('legal.termsTitle')} sections={TERMS_SECTIONS} />;
}
