import ReferralsScreen from '@/app/(admin)/referrals';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRouteReferralsScreen() {
  return (
    <AdminAccessBoundary>
      <ReferralsScreen />
    </AdminAccessBoundary>
  );
}
