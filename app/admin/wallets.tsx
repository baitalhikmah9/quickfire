import WalletsScreen from '@/app/(admin)/wallets';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRouteWalletsScreen() {
  return (
    <AdminAccessBoundary>
      <WalletsScreen />
    </AdminAccessBoundary>
  );
}
