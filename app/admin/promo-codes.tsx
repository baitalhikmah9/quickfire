import PromoCodesScreen from '@/app/(admin)/promo-codes';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRoutePromoCodesScreen() {
  return (
    <AdminAccessBoundary>
      <PromoCodesScreen />
    </AdminAccessBoundary>
  );
}
