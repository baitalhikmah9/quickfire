import { LegalScrollScreen } from '@/components/LegalScrollScreen';
import { useI18n } from '@/lib/i18n/useI18n';
import { PRIVACY_SECTIONS } from '@/lib/legal/privacySections';

export default function PrivacyScreen() {
  const { t } = useI18n();
  return <LegalScrollScreen title={t('legal.privacyTitle')} sections={PRIVACY_SECTIONS} />;
}
