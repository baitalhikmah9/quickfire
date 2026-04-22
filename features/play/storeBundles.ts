import type { TranslationKey } from '@/lib/i18n/messages/en';

export interface StoreBundle {
  id: string;
  nameKey: TranslationKey;
  tokens: number;
  bonus?: number;
  priceLabel: string;
  icon: string;
  featured?: boolean;
}

export const STORE_BUNDLES: StoreBundle[] = [
  {
    id: 'b10',
    nameKey: 'store.packQuick',
    tokens: 10,
    priceLabel: '£5',
    icon: 'flash-outline',
  },
  {
    id: 'b20',
    nameKey: 'store.packValue',
    tokens: 20,
    priceLabel: '£9',
    icon: 'layers-outline',
  },
  {
    id: 'b30',
    nameKey: 'store.packPro',
    tokens: 30,
    priceLabel: '£12',
    icon: 'star-outline',
    featured: true,
  },
  {
    id: 'b50',
    nameKey: 'store.packPower',
    tokens: 50,
    priceLabel: '£17',
    icon: 'rocket-outline',
  },
  {
    id: 'b70',
    nameKey: 'store.packMega',
    tokens: 70,
    priceLabel: '£21',
    icon: 'trophy-outline',
  },
];
