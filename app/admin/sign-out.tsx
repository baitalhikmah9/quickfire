import AdminSignOutScreen from '@/app/(admin)/sign-out';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRouteSignOutScreen() {
  return (
    <AdminAccessBoundary>
      <AdminSignOutScreen />
    </AdminAccessBoundary>
  );
}
