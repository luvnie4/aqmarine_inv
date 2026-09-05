import React, { useState, useEffect } from 'react';
import { 
  X, 
  ClipboardList, 
  Building2, 
  Store, 
  Check, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Product, StockAdjustment, AdjustmentReason, LocationType, StoreOutlet } from '../types';
import { getOutlets } from '../utils/outletStorage';

interface StockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string;
  operatorName?: string;
  onConfirmAdjustment: (adjustment: StockAdjustment) => void;
}

export const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProductId,
  operatorName,
  onConfirmAdjustment,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [locationType, setLocationType] = useState<string>(''); // outlet.id
  const [actualStock, setActualStock] = useState<number | ''>('');
  const [reason, setReason] = useState<AdjustmentReason>('koreksi_fisik');
  const [notes, setNotes] = useState('');
  const [operator, setOperator] = useState(operatorName || 'Staff Operasional');

  useEffect(() => {
    const loadedOutlets = getOutlets();
    setOutlets(loadedOutlets);
    if (loadedOutlets.length > 0) {
      setLocationType(loadedOutlets[0].id);
    }
  }, []);

  useEffect(() => {
    if (operatorName) {
      setOperator(operatorName);
    }
  }, [operatorName]);

  const currentProduct = products.find((p) => p.id === selectedProductId);

  const getStockAtLocation = (prod: Product | undefined, loc: string): number => {
    if (!prod) return 0;
    if (prod.outletStocks && prod.outletStocks[loc] !== undefined) {
      return prod.outletStocks[loc];
    }
    const outlet = outlets.find(o => o.id === loc);
    if (outlet?.isDefault) return prod.stockToko || 0;
    return 0;
  };

  const getLocationLabel = (loc: string): string => {
    const outlet = outlets.find(o => o.id === loc);
    return outlet ? `${outlet.name} (${outlet.code})` : 'Toko';
  };

  useEffect(() => {
    if (isOpen) {
      const loadedOutlets = getOutlets();
      setOutlets(loadedOutlets);
      const initialLoc = (loadedOutlets.length > 0 && (!locationType || !loadedOutlets.some(o => o.id === locationType)))
        ? loadedOutlets[0].id
        : locationType;
      if (initialLoc !== locationType) {
        setLocationType(initialLoc);
      }
      let targetProdId = '';
      if (initialProductId && products.some(p => p.id === initialProductId)) {
        targetProdId = initialProductId;
      } else if (products.length > 0) {
        targetProdId = products[0].id;
      }
      setSelectedProductId(targetProdId);
      const prod = products.find(p => p.id === targetProdId);
      if (prod) {
        setActualStock(getStockAtLocation(prod, initialLoc));
      }
      setNotes('');
    }
  }, [isOpen, initialProductId, products]);

  // When location changes, update actual stock default
  const handleLocationChange = (loc: string) => {
    setLocationType(loc);
    if (currentProduct) {
      setActualStock(getStockAtLocation(currentProduct, loc));
    }
  };

  if (!isOpen) return null;

  const currentSystemStock = getStockAtLocation(currentProduct, locationType);
  const numActual = typeof actualStock === 'number' ? actualStock : 0;
  const difference = numActual - currentSystemStock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || typeof actualStock !== 'number') return;

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      date: new Date().toISOString(),
      productId: currentProduct.id,
      productName: currentProduct.name,
      sku: currentProduct.sku,
      location: locationType,
      locationName: getLocationLabel(locationType),
      previousStock: currentSystemStock,
      newStock: numActual,
      difference,
      reason,
      notes: notes.trim() || undefined,
      operator: operator.trim() || 'Staff',
    };

    onConfirmAdjustment(adjustment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Stok Opname / Penyesuaian Fisik
              </h3>
              <p className="text-xs text-slate-500">
                Rekonsiliasi stok sistem dengan hitungan fisik lapangan
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Product Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Pilih Produk:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedProductId(newId);
                const p = products.find(prod => prod.id === newId);
                if (p) {
                  setActualStock(getStockAtLocation(p, locationType));
                }
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.name} (Total Stok: {p.stockToko} pcs)
                </option>
              ))}
            </select>
          </div>

          {/* Location Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Toko yang Di-Opname:
            </label>
            <select
              value={locationType}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  🏬 {o.name} ({o.code})
                </option>
              ))}
            </select>
          </div>

          {/* Current vs Actual Stock */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Stok Sistem ({getLocationLabel(locationType)})</span>
              <span className="text-xl font-black text-slate-800 mt-1 block">
                {currentSystemStock} <span className="text-xs font-normal text-slate-500">{currentProduct?.unit || 'pcs'}</span>
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Stok Fisik Aktual (pcs):
              </label>
              <input
                type="number"
                min={0}
                value={actualStock}
                onChange={(e) => setActualStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xl font-black text-indigo-950 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Difference Indicator */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            difference === 0 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : difference > 0 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <span className="font-bold">Selisih Stok Fisik:</span>
            <span className="text-sm font-black">
              {difference === 0 ? '0 (Sesuai / Pas)' : `${difference > 0 ? `+${difference}` : difference} pcs`}
            </span>
          </div>

          {/* Reset Info Note */}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <span className="text-sm shrink-0">🔄</span>
            <div>
              <span className="font-bold block">Reset Stok Awal Otomatis:</span>
              <span>
                Menyimpan hasil Stok Opname ini akan otomatis memperbarui <strong>Stok Awal</strong> produk ke angka aktual fisik ({typeof actualStock === 'number' ? actualStock : 0} pcs) sebagai titik awal audit periode baru.
              </span>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Alasan / Kategori Penyesuaian:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AdjustmentReason)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="koreksi_fisik">Koreksi Fisik (Salah Hitung / Selisih Rutin)</option>
              <option value="rusak">Barang Rusak / Cacat Bahan / Noda</option>
              <option value="hilang">Barang Hilang / Selisih Tak Ditemukan</option>
              <option value="sample_display">Dijadikan Sample Pajangan / Manekin</option>
              <option value="retur">Retur Konsumen / Kembali ke Stok</option>
            </select>
          </div>

          {/* Notes & Operator */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Petugas Opname:</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Keterangan:</label>
              <input
                type="text"
                placeholder="Catatan detail..."
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={typeof actualStock !== 'number' || !currentProduct}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Simpan Opname Stok
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

