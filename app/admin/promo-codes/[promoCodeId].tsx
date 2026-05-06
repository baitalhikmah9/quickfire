import PromoCodeDetailScreen from '@/app/(admin)/promo-codes/[promoCodeId]';
import { AdminAccessBoundary } from '@/app/(admin)/_layout';

export default function AdminRoutePromoCodeDetailScreen() {
  return (
    <AdminAccessBoundary>
      <PromoCodeDetailScreen />
    </AdminAccessBoundary>
  );
}
