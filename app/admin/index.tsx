import AdminIndexScreen from '@/app/(admin)';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRouteIndexScreen() {
  return (
    <AdminAccessBoundary>
      <AdminIndexScreen />
    </AdminAccessBoundary>
  );
}
