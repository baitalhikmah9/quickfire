import TopicsScreen from '@/app/(admin)/topics';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRouteTopicsScreen() {
  return (
    <AdminAccessBoundary>
      <TopicsScreen />
    </AdminAccessBoundary>
  );
}
