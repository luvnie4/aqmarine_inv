export type ProductCategory = 'Hijab' | 'Mukena' | 'Gamis' | 'Aksesoris' | 'Lainnya' | string;

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  subCategory?: string;
  images?: string[];
  image?: string;
  hpp: number;
  priceRetail: number;
  priceGrosir: number;
  stockToko: number;
  initialStock?: number; // Stok awal sebelum pengurangan penjualan berjalan / awal periode audit
  incomingStock?: number; // Akumulasi stok masuk (restock) dalam periode audit berjalan sebelum stok opname
  lastOpnameAt?: string; // Waktu terakhir dilakukan reset via Stok Opname
  stockGudang?: number;
  outletStocks?: Record<string, number>;
  minStockAlert: number;
  unit: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreOutlet {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export type SalesChannelType = 
  | 'toko'
  | 'bazaar'
  | 'whatsapp'
  | 'offline_store' 
  | 'online_shopee' 
  | 'online_tokopedia' 
  | 'online_tiktok' 
  | 'online_whatsapp' 
  | 'custom'
  | 'manual' 
  | string;

export interface SalesChannel {
  id: string;
  name: string;
  type: SalesChannelType;
  color?: string;
  description?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface BazaarEvent {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status?: 'upcoming' | 'active' | 'completed';
  picName?: string;
  phone?: string;
  isActive?: boolean;
  notes?: string;
  createdAt?: string;
}

export type UserRole = 'owner' | 'admin' | 'gudang' | 'kasir' | 'superadmin';

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleLabel?: string;
  email?: string;
  avatar?: string;
  outletId?: string;
  outletName?: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit' | 'credit' | 'other';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedPriceType: 'retail' | 'grosir' | 'custom';
  unitPrice: number;
  customPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  subtotal: number;
  notes?: string;
}

export interface SaleTransaction {
  id: string;
  transactionNumber: string;
  date: string;
  items: any[];
  totalItems?: number;
  subtotal: number;
  discountTotal?: number;
  discount?: number;
  grandTotal?: number;
  total?: number;
  paymentMethod: PaymentMethod;
  customerType?: 'retail' | 'grosir' | string;
  cashPaid?: number;
  changeAmount?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  outletId?: string;
  outletName?: string;
  channelId?: string;
  channelName?: string;
  salesChannelName?: string;
  salesChannelType?: string;
  customChannelName?: string;
  stockDeductedOutletId?: string;
  stockDeductedLocationName?: string;
  bazaarId?: string;
  bazaarName?: string;
  operator?: string;
  cashier?: string;
  notes?: string;
  createdAt?: string;
}

export type LocationType = 'gudang' | 'toko' | 'outlet' | string;

export interface StockTransfer {
  id: string;
  transferNumber: string;
  date: string;
  productId: string;
  sku: string;
  barcode?: string;
  productName: string;
  quantity: number;
  fromLocation: LocationType;
  fromLocationId?: string;
  fromLocationName?: string;
  toLocation: LocationType;
  toLocationId?: string;
  toLocationName?: string;
  operator: string;
  notes?: string;
  createdAt?: string;
}

export type AdjustmentReason = 
  | 'selisih_fisik' 
  | 'rusak' 
  | 'hilang' 
  | 'retur_supplier' 
  | 'koreksi_input' 
  | 'sampel_display' 
  | 'lainnya';

export interface StockAdjustment {
  id: string;
  adjustmentNumber?: string;
  date: string;
  productId: string;
  sku: string;
  barcode?: string;
  productName: string;
  location: LocationType;
  locationId?: string;
  locationName?: string;
  previousStock: number;
  actualStock?: number;
  newStock?: number;
  difference: number;
  reason: string;
  operator: string;
  notes?: string;
  createdAt?: string;
}

export interface StockRestock {
  id: string;
  restockNumber?: string;
  date: string;
  productId: string;
  sku: string;
  barcode?: string;
  productName: string;
  quantity: number;
  location: LocationType;
  locationId?: string;
  locationName?: string;
  supplier?: string;
  purchasePrice?: number;
  unitCost?: number;
  invoiceNumber?: string;
  operator?: string;
  notes?: string;
  createdAt?: string;
}

export type ActiveTab = 'dashboard' | 'inventory' | 'restocks' | 'sales' | 'pos' | 'transfers' | 'adjustments' | 'reports' | 'profit_loss';
