import type { SaleTransaction, SalesChannelType, StoreOutlet } from '../types';

export const MAIN_OUTLET_ID = 'outlet-main';

export function transactionChannelType(tx: Partial<SaleTransaction>): SalesChannelType {
  if (tx.salesChannelType) return tx.salesChannelType;
  const description = [tx.salesChannelName, tx.channelName, tx.bazaarName, tx.outletName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (description.includes('bazaar') || description.includes('event')) return 'bazaar';
  if (description.includes('whatsapp') || description.includes('online wa')) return 'whatsapp';
  return 'toko';
}

export function isBazaarTransaction(tx: Partial<SaleTransaction>): boolean {
  return transactionChannelType(tx) === 'bazaar';
}

export function mainOutlet(outlets: StoreOutlet[]): StoreOutlet | undefined {
  return outlets.find(outlet => outlet.isDefault) || outlets.find(outlet => outlet.id === MAIN_OUTLET_ID) || outlets[0];
}

export function stockOutletIdForSale(tx: Partial<SaleTransaction>): string {
  if (isBazaarTransaction(tx)) return MAIN_OUTLET_ID;
  return tx.stockDeductedOutletId || tx.outletId || MAIN_OUTLET_ID;
}
