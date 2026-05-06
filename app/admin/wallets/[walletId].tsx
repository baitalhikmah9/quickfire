import WalletDetailScreen from '@/app/(admin)/wallets/[walletId]';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRouteWalletDetailScreen() {
  return (
    <AdminAccessBoundary>
      <WalletDetailScreen />
    </AdminAccessBoundary>
  );
}
