import { commitDocumentsAtomically, fetchDocument } from './supabase';
import { applySale, applyMovement, revertMovement, saleQuantities, stockAt } from './stock';
import type { Product, SaleTransaction, StockTransfer, StockAdjustment, StockRestock } from '../types';

export async function commitSale(next: SaleTransaction, edit = false, previousForStock?: SaleTransaction) {
  const previous = await fetchDocument<SaleTransaction>('transactions', next.id);
  if (previous && !edit) return;
  if (edit && !previous) throw new Error('Transaksi yang diedit tidak ditemukan.');
  const stockPrevious = previousForStock || previous || undefined;
  const ids = [...new Set([...saleQuantities(next).keys(), ...saleQuantities(stockPrevious).keys()])];
  if (!ids.length) throw new Error('Transaksi harus berisi produk.');
  const products = await Promise.all(ids.map(id => fetchDocument<Product>('products', id)));
  if (products.some(product => !product)) throw new Error('Produk tidak ditemukan. Muat ulang katalog.');
  await commitDocumentsAtomically([
    ...products.map(product => ({ collection:'products', id:product!.id, expected:product, data:applySale(product!, next, stockPrevious) })),
    { collection:'transactions', id:next.id, expected:previous, data:next },
  ]);
}

export async function deleteSale(id: string, previousForStock?: SaleTransaction) {
  const previous = await fetchDocument<SaleTransaction>('transactions', id);
  if (!previous) throw new Error('Transaksi tidak ditemukan atau sudah dihapus.');
  const stockPrevious = previousForStock || previous;
  const ids = [...saleQuantities(stockPrevious).keys()];
  const products = await Promise.all(ids.map(productId => fetchDocument<Product>('products', productId)));
  if (products.some(product => !product)) throw new Error('Produk transaksi tidak ditemukan.');
  const emptySale = { ...stockPrevious, items: [] };
  await commitDocumentsAtomically([
    ...products.map(product => ({ collection:'products', id:product!.id, expected:product, data:applySale(product!, emptySale, stockPrevious) })),
    { collection:'transactions', id, expected:previous, delete:true },
  ]);
}

export async function commitMovement(kind: 'transfers' | 'adjustments' | 'restocks', record: StockTransfer | StockAdjustment | StockRestock, updateHpp = false) {
  if (await fetchDocument(kind, record.id)) return;
  const product = await fetchDocument<Product>('products', record.productId);
  if (!product) throw new Error('Produk tidak ditemukan.');
  const storedRecord = enrichMovementRecord(kind, record, product, updateHpp);
  const updated = applyMovement(product, kind, storedRecord, updateHpp);
  await commitDocumentsAtomically([
    { collection:'products', id:product.id, expected:product, data:updated },
    { collection:kind, id:record.id, expected:null, data:storedRecord },
  ]);
}

function enrichMovementRecord(kind: 'transfers' | 'adjustments' | 'restocks', record: StockTransfer | StockAdjustment | StockRestock, product: Product, updateHpp: boolean) {
  if (kind === 'adjustments') {
    const adjustment = record as StockAdjustment;
    const location = adjustment.locationId || adjustment.location;
    const previousStock = stockAt(product, location);
    const actualStock = Number(adjustment.actualStock ?? adjustment.newStock);
    return { ...adjustment, previousStock, actualStock, newStock:actualStock, difference:actualStock-previousStock, previousInitialStock:product.initialStock, previousIncomingStock:product.incomingStock, previousLastOpnameAt:product.lastOpnameAt };
  }
  if (kind === 'restocks') return { ...(record as StockRestock), previousHpp:product.hpp, updateProductHpp:updateHpp };
  return record;
}

export async function updateMovement(kind: 'transfers' | 'adjustments' | 'restocks', next: StockTransfer | StockAdjustment | StockRestock, updateHpp = false) {
  const previous = await fetchDocument<StockTransfer | StockAdjustment | StockRestock>(kind, next.id);
  if (!previous) throw new Error('Catatan yang diedit tidak ditemukan.');
  const ids = [...new Set([previous.productId, next.productId])];
  const products = await Promise.all(ids.map(id => fetchDocument<Product>('products', id)));
  if (products.some(product => !product)) throw new Error('Produk tidak ditemukan.');
  const writes = products.map(product => {
    let result = product!;
    if (previous.productId === product!.id) result = revertMovement(result, kind, previous);
    let storedNext = next;
    if (next.productId === product!.id) {
      storedNext = enrichMovementRecord(kind, next, result, updateHpp);
      result = applyMovement(result, kind, storedNext, updateHpp);
    }
    return { product:product!, result, storedNext };
  });
  const storedNext = writes.find(write => next.productId === write.product.id)?.storedNext || next;
  await commitDocumentsAtomically([
    ...writes.map(write => ({ collection:'products', id:write.product.id, expected:write.product, data:write.result })),
    { collection:kind, id:next.id, expected:previous, data:storedNext },
  ]);
}

export async function deleteMovement(kind: 'transfers' | 'adjustments' | 'restocks', id: string) {
  const previous = await fetchDocument<StockTransfer | StockAdjustment | StockRestock>(kind, id);
  if (!previous) throw new Error('Catatan tidak ditemukan atau sudah dihapus.');
  const product = await fetchDocument<Product>('products', previous.productId);
  if (!product) throw new Error('Produk tidak ditemukan.');
  const restored = revertMovement(product, kind, previous);
  await commitDocumentsAtomically([
    { collection:'products', id:product.id, expected:product, data:restored },
    { collection:kind, id, expected:previous, delete:true },
  ]);
}
