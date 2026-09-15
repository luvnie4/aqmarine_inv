import type { Product, SaleTransaction, StockTransfer, StockAdjustment, StockRestock } from '../types';

export function stockAt(product: Product, location: string): number {
  if (location === 'gudang') return product.stockGudang || 0;
  return product.outletStocks?.[location] ?? (location === 'outlet-main' && !product.outletStocks ? product.stockToko || 0 : 0);
}
export function setStock(product: Product, location: string, value: number): Product {
  if (!Number.isFinite(value) || value < 0) throw new Error('Stok tidak cukup untuk ' + product.name);
  if (location !== 'gudang' && !location.startsWith('outlet-')) throw new Error('Lokasi stok tidak valid.');
  const outletStocks = { ...(product.outletStocks || { 'outlet-main': product.stockToko || 0 }) };
  if (location !== 'gudang') outletStocks[location] = value;
  return { ...product, outletStocks, stockGudang: location === 'gudang' ? value : product.stockGudang || 0, stockToko: Object.values(outletStocks).reduce((a, b) => a + b, 0), updatedAt: new Date().toISOString() };
}
export function saleQuantities(tx?: SaleTransaction): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of tx?.items || []) {
    const id = item.productId || item.product?.id;
    const qty = Number(item.quantity);
    if (!id || !Number.isFinite(qty) || qty <= 0) throw new Error('Produk atau jumlah penjualan tidak valid.');
    result.set(id, (result.get(id) || 0) + qty);
  }
  return result;
}
export function applySale(product: Product, next: SaleTransaction, previous?: SaleTransaction): Product {
  let result = product;
  const oldQty = saleQuantities(previous).get(product.id) || 0;
  const newQty = saleQuantities(next).get(product.id) || 0;
  const oldLoc = previous?.stockDeductedOutletId || previous?.outletId || 'outlet-main';
  const newLoc = next.stockDeductedOutletId || next.outletId || 'outlet-main';
  if (oldQty) result = setStock(result, oldLoc, stockAt(result, oldLoc) + oldQty);
  if (newQty) result = setStock(result, newLoc, stockAt(result, newLoc) - newQty);
  return result;
}
export function applyMovement(product: Product, kind: 'transfers' | 'adjustments' | 'restocks', record: StockTransfer | StockAdjustment | StockRestock, updateHpp = false): Product {
  if (kind === 'transfers') {
    const move = record as StockTransfer;
    const from = move.fromLocationId || move.fromLocation;
    const to = move.toLocationId || move.toLocation;
    if (from === to || !Number.isFinite(move.quantity) || move.quantity <= 0) throw new Error('Lokasi dan jumlah mutasi tidak valid.');
    const deducted = setStock(product, from, stockAt(product, from) - move.quantity);
    return setStock(deducted, to, stockAt(deducted, to) + move.quantity);
  }
  if (kind === 'adjustments') {
    const adjustment = record as StockAdjustment;
    const loc = adjustment.locationId || adjustment.location;
    if (stockAt(product, loc) !== adjustment.previousStock) throw new Error('Stok berubah sejak opname dibuka. Muat ulang dan periksa kembali.');
    const result = setStock(product, loc, Number(adjustment.actualStock ?? adjustment.newStock));
    return { ...result, initialStock: result.stockToko, incomingStock: 0, lastOpnameAt: adjustment.date || new Date().toISOString() };
  }
  const restock = record as StockRestock;
  if (!Number.isFinite(restock.quantity) || restock.quantity <= 0) throw new Error('Jumlah stok masuk harus lebih dari nol.');
  const loc = restock.locationId || restock.location;
  const result = setStock(product, loc, stockAt(product, loc) + restock.quantity);
  const cost = restock.purchasePrice ?? restock.unitCost;
  if (updateHpp && (cost === undefined || !Number.isFinite(cost) || cost < 0)) throw new Error('Harga beli tidak valid.');
  return { ...result, initialStock: product.initialStock ?? product.stockToko, incomingStock: (product.incomingStock || 0) + restock.quantity, hpp: updateHpp ? cost! : product.hpp };
}

export function revertMovement(product: Product, kind: 'transfers' | 'adjustments' | 'restocks', record: StockTransfer | StockAdjustment | StockRestock): Product {
  if (kind === 'transfers') {
    const move = record as StockTransfer;
    const from = move.fromLocationId || move.fromLocation;
    const to = move.toLocationId || move.toLocation;
    if (from === to || !Number.isFinite(move.quantity) || move.quantity <= 0) throw new Error('Catatan mutasi tidak valid.');
    const removeFromDestination = setStock(product, to, stockAt(product, to) - move.quantity);
    return setStock(removeFromDestination, from, stockAt(removeFromDestination, from) + move.quantity);
  }
  if (kind === 'adjustments') {
    const adjustment = record as StockAdjustment;
    const loc = adjustment.locationId || adjustment.location;
    const recordedStock = Number(adjustment.actualStock ?? adjustment.newStock);
    if (stockAt(product, loc) !== recordedStock) throw new Error('Opname tidak dapat dibatalkan karena stok lokasi sudah berubah setelah pencatatan.');
    const result = setStock(product, loc, adjustment.previousStock);
    return {
      ...result,
      initialStock: adjustment.previousInitialStock ?? product.initialStock,
      incomingStock: adjustment.previousIncomingStock ?? product.incomingStock,
      lastOpnameAt: adjustment.previousLastOpnameAt,
    };
  }
  const restock = record as StockRestock;
  const loc = restock.locationId || restock.location;
  if (!Number.isFinite(restock.quantity) || restock.quantity <= 0) throw new Error('Catatan barang masuk tidak valid.');
  const result = setStock(product, loc, stockAt(product, loc) - restock.quantity);
  return {
    ...result,
    incomingStock: Math.max(0, (product.incomingStock || 0) - restock.quantity),
    hpp: restock.updateProductHpp && restock.previousHpp !== undefined ? restock.previousHpp : product.hpp,
  };
}
