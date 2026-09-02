import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Building2, 
  Store, 
  Check, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Product, StockTransfer, LocationType, StoreOutlet } from '../types';
import { generateTransferCode } from '../utils/formatters';
import { getOutlets } from '../utils/outletStorage';

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string;
  operatorName?: string;
  onConfirmTransfer: (transfer: StockTransfer) => void;
}

export const TransferStockModal: React.FC<TransferStockModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProductId,
  operatorName,
  onConfirmTransfer,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [fromLocationType, setFromLocationType] = useState<string>(''); // outlet.id
  const [toLocationType, setToLocationType] = useState<string>(''); // outlet.id
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [notes, setNotes] = useState('');
  const [operator, setOperator] = useState(operatorName || 'Staff Operasional');

  useEffect(() => {
    const loadedOutlets = getOutlets();
    setOutlets(loadedOutlets);
    if (loadedOutlets.length > 0) {
      setFromLocationType(loadedOutlets[0].id);
      if (loadedOutlets.length > 1) {
        setToLocationType(loadedOutlets[1].id);
      } else {
        setToLocationType(loadedOutlets[0].id);
      }
    }
  }, []);

  useEffect(() => {
    if (operatorName) {
      setOperator(operatorName);
    }
  }, [operatorName]);

  useEffect(() => {
    if (isOpen) {
      const loadedOutlets = getOutlets();
      setOutlets(loadedOutlets);
      if (loadedOutlets.length > 0) {
        if (!fromLocationType || !loadedOutlets.some(o => o.id === fromLocationType)) {
          setFromLocationType(loadedOutlets[0].id);
        }
        if (!toLocationType || !loadedOutlets.some(o => o.id === toLocationType)) {
          setToLocationType(loadedOutlets.length > 1 ? loadedOutlets[1].id : loadedOutlets[0].id);
        }
      }
      if (initialProductId && products.some(p => p.id === initialProductId)) {
        setSelectedProductId(initialProductId);
      } else if (products.length > 0) {
        setSelectedProductId(products[0].id);
      }
      setQuantity(1);
      setNotes('');
    }
  }, [isOpen, initialProductId, products]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId);

  const getStockAtLocation = (loc: string): number => {
    if (!currentProduct) return 0;
    if (currentProduct.outletStocks && currentProduct.outletStocks[loc] !== undefined) {
      return currentProduct.outletStocks[loc];
    }
    const outlet = outlets.find(o => o.id === loc);
    if (outlet?.isDefault) return currentProduct.stockToko || 0;
    return 0;
  };

  const getLocationLabel = (loc: string): string => {
    const outlet = outlets.find(o => o.id === loc);
    return outlet ? `${outlet.name} (${outlet.code})` : 'Toko';
  };

  const sourceStock = getStockAtLocation(fromLocationType);
  const targetStock = getStockAtLocation(toLocationType);

  const numQty = typeof quantity === 'number' ? quantity : 0;
  const isSameLocation = fromLocationType === toLocationType;
  const isInvalidQty = numQty <= 0 || numQty > sourceStock || isSameLocation;

  const resultingSourceStock = Math.max(0, sourceStock - numQty);
  const resultingTargetStock = targetStock + numQty;

  const handleSwapDirections = () => {
    const prevFrom = fromLocationType;
    setFromLocationType(toLocationType);
    setToLocationType(prevFrom);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || isInvalidQty) return;

    const fromName = getLocationLabel(fromLocationType);
    const toName = getLocationLabel(toLocationType);

    const transfer: StockTransfer = {
      id: `trf-${Date.now()}`,
      transferNumber: generateTransferCode(),
      date: new Date().toISOString(),
      productId: currentProduct.id,
      productName: currentProduct.name,
      sku: currentProduct.sku,
      fromLocation: fromLocationType,
      toLocation: toLocationType,
      fromLocationName: fromName,
      toLocationName: toName,
      quantity: numQty,
      notes: notes.trim() || undefined,
      operator: operator.trim() || 'Staff',
    };

    onConfirmTransfer(transfer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Mutasi Stok Antar Toko / Outlet
              </h3>
              <p className="text-xs text-slate-500">
                Pindahkan stok antar toko atau cabang butik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Product Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Pilih Produk Hijab / Mukena:
            </label>
            <select
              id="transfer-product-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.name} (Total Stok: {p.stockToko} pcs)
                </option>
              ))}
            </select>
          </div>

          {/* Direction Selector */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Pilih Toko Asal & Tujuan:</span>
              <button
                type="button"
                onClick={handleSwapDirections}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-100/70 px-2 py-1 rounded-lg"
              >
                <ArrowLeftRight className="w-3 h-3" /> Tukar Arah
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Dari (Asal) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dari (Toko Asal)</span>
                <select
                  value={fromLocationType}
                  onChange={(e) => setFromLocationType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {outlets.map((o) => (
                    <option key={`from-${o.id}`} value={o.id}>
                      🏬 {o.name} ({o.code})
                    </option>
                  ))}
                </select>
                <span className="text-xs font-black text-slate-800 mt-2 block">
                  Stok Tersedia: <strong className="text-amber-800">{sourceStock} pcs</strong>
                </span>
              </div>

              {/* Ke (Tujuan) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Ke (Toko Tujuan)</span>
                <select
                  value={toLocationType}
                  onChange={(e) => setToLocationType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {outlets.map((o) => (
                    <option key={`to-${o.id}`} value={o.id}>
                      🏬 {o.name} ({o.code})
                    </option>
                  ))}
                </select>
                <span className="text-xs font-black text-slate-800 mt-2 block">
                  Stok Saat ini: <strong className="text-emerald-800">{targetStock} pcs</strong>
                </span>
              </div>
            </div>

            {isSameLocation && (
              <p className="text-xs text-red-600 font-medium">
                Toko asal dan tujuan tidak boleh sama. Silakan tambah toko lain jika butuh cabang.
              </p>
            )}
          </div>

          {/* Quantity Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Jumlah Mutasi (pcs):
              </label>
              {sourceStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(sourceStock)}
                  className="text-xs font-semibold text-amber-700 hover:underline"
                >
                  Pindahkan Semua ({sourceStock} pcs)
                </button>
              )}
            </div>
            
            <input
              id="transfer-quantity-input"
              type="number"
              min={1}
              max={sourceStock}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              placeholder="Masukkan jumlah..."
            />

            {isInvalidQty && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Jumlah harus antara 1 dan {sourceStock} pcs.
              </p>
            )}
          </div>

          {/* Real-time Calculation Preview */}
          {!isInvalidQty && numQty > 0 && (
            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-xs space-y-1">
              <span className="font-bold text-amber-900 block">Kalkulasi Stok Setelah Mutasi:</span>
              <div className="flex items-center justify-between text-amber-800">
                <span>{getLocationLabel(fromLocationType)}:</span>
                <span className="font-mono font-bold">{sourceStock} ➔ <strong className="text-amber-950">{resultingSourceStock} pcs</strong> (-{numQty})</span>
              </div>
              <div className="flex items-center justify-between text-amber-800">
                <span>{getLocationLabel(toLocationType)}:</span>
                <span className="font-mono font-bold">{targetStock} ➔ <strong className="text-emerald-700">{resultingTargetStock} pcs</strong> (+{numQty})</span>
              </div>
            </div>
          )}

          {/* Notes & Operator */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Nama Petugas:</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Catatan / Alasan:</label>
              <input
                type="text"
                placeholder="Contoh: Display butik"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              id="confirm-transfer-btn"
              type="submit"
              disabled={isInvalidQty || !currentProduct}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 transition-all ${
                isInvalidQty || !currentProduct
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-amber-200'
              }`}
            >
              <Check className="w-4 h-4" />
              Proses Mutasi Stok
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

