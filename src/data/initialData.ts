import { Product, SaleTransaction, StockTransfer, StockAdjustment } from '../types';

// Empty by default: completely clean canvas for user's own products
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_TRANSFERS: StockTransfer[] = [];
export const INITIAL_TRANSACTIONS: SaleTransaction[] = [];
export const INITIAL_ADJUSTMENTS: StockAdjustment[] = [];

// Optional sample products if user wants to populate test data
export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'AQM-HJB-1001',
    barcode: '89910010001',
    name: 'Voal Paris Ultrafine Lasercut',
    category: 'Hijab',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
    ],
    hpp: 28000,
    priceRetail: 55000,
    priceGrosir: 45000,
    stockToko: 18,
    initialStock: 18,
    outletStocks: { 'outlet-utama': 18 },
    minStockAlert: 10,
    unit: 'Pcs',
    notes: 'Bahan tegak di dahi, tidak mudah kusut',
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'prod-2',
    sku: 'AQM-HJB-1002',
    barcode: '89910010002',
    name: 'Pashmina Silk Shimmer Cradenza',
    category: 'Hijab',
    images: [
      'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
    ],
    hpp: 38000,
    priceRetail: 75000,
    priceGrosir: 65000,
    stockToko: 8,
    initialStock: 8,
    outletStocks: { 'outlet-utama': 8 },
    minStockAlert: 10,
    unit: 'Pcs',
    notes: 'Kilau mewah untuk acara formal & pesta',
    createdAt: '2026-08-03T10:30:00.000Z',
  },
  {
    id: 'prod-3',
    sku: 'AQM-MKN-2001',
    barcode: '89910010003',
    name: 'Mukena Silk Sutra Premium 2-in-1',
    category: 'Mukena',
    images: [
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80',
    ],
    hpp: 165000,
    priceRetail: 285000,
    priceGrosir: 245000,
    stockToko: 5,
    initialStock: 5,
    outletStocks: { 'outlet-utama': 5 },
    minStockAlert: 4,
    unit: 'Set',
    notes: 'Sudah termasuk pouch tas cantik',
    createdAt: '2026-08-05T09:00:00.000Z',
  }
];

export const SAMPLE_TRANSFERS: StockTransfer[] = [];
export const SAMPLE_TRANSACTIONS: SaleTransaction[] = [];
export const SAMPLE_ADJUSTMENTS: StockAdjustment[] = [];
