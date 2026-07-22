import { LegalScrollScreen } from '@/components/LegalScrollScreen';
import { useI18n } from '@/lib/i18n/useI18n';
import { DELETE_ACCOUNT_SECTIONS } from '@/lib/legal/deleteAccountSections';

export default function DeleteAccountScreen() {
  const { t } = useI18n();
  return (
    <LegalScrollScreen title={t('legal.deleteAccountTitle')} sections={DELETE_ACCOUNT_SECTIONS} />
  );
}
