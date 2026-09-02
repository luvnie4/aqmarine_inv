import React, { useState, useEffect } from 'react';
import { 
  X, 
  PlusCircle, 
  Building2, 
  Store, 
  Check, 
  Truck,
  DollarSign
} from 'lucide-react';
import { Product, StockRestock, LocationType, StoreOutlet } from '../types';
import { formatRupiah } from '../utils/formatters';
import { getOutlets } from '../utils/outletStorage';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: string;
  onConfirmRestock: (restock: StockRestock, updateHpp: boolean) => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProductId,
  onConfirmRestock,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [locationType, setLocationType] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>(50);
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('Konveksi Hijab Bandung');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [updateProductHpp, setUpdateProductHpp] = useState(true);

  useEffect(() => {
    const loadedOutlets = getOutlets();
    setOutlets(loadedOutlets);
    if (loadedOutlets.length > 0) {
      setLocationType(loadedOutlets[0].id);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const loadedOutlets = getOutlets();
      setOutlets(loadedOutlets);
      if (loadedOutlets.length > 0 && (!locationType || !loadedOutlets.some(o => o.id === locationType))) {
        setLocationType(loadedOutlets[0].id);
      }
      if (initialProductId && products.some(p => p.id === initialProductId)) {
        setSelectedProductId(initialProductId);
        const p = products.find(prod => prod.id === initialProductId);
        if (p) setUnitCost(p.hpp);
      } else if (products.length > 0) {
        setSelectedProductId(products[0].id);
        setUnitCost(products[0].hpp);
      }
      setQuantity(50);
      setInvoiceNumber(`SJ-${Math.floor(10000 + Math.random() * 90000)}`);
    }
  }, [isOpen, initialProductId, products]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setUnitCost(prod.hpp);
    }
  };

  const getLocationLabel = (loc: string): string => {
    const outlet = outlets.find(o => o.id === loc);
    return outlet ? `${outlet.name} (${outlet.code})` : 'Toko';
  };

  const numQty = typeof quantity === 'number' ? quantity : 0;
  const numCost = typeof unitCost === 'number' ? unitCost : 0;
  const totalPurchaseValue = numQty * numCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || numQty <= 0) return;

    const restock: StockRestock = {
      id: `rst-${Date.now()}`,
      date: new Date().toISOString(),
      productId: currentProduct.id,
      productName: currentProduct.name,
      sku: currentProduct.sku,
      location: locationType,
      locationName: getLocationLabel(locationType),
      quantity: numQty,
      supplier: supplier.trim() || 'Konveksi Rekanan',
      unitCost: numCost,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onConfirmRestock(restock, updateProductHpp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Penerimaan Barang Masuk (Restock)
              </h3>
              <p className="text-xs text-slate-500">
                Catat barang masuk dari konveksi atau supplier
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
          
          {/* Product Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Pilih Produk Hijab / Mukena:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.name} (HPP: {formatRupiah(p.hpp)})
                </option>
              ))}
            </select>
          </div>

          {/* Location selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Tujuan Masuk Stok:
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  🏬 {o.name} ({o.code})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Jumlah Masuk (pcs):
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800"
                placeholder="50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                HPP / Modal Beli Satuan:
              </label>
              <input
                type="number"
                min={0}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800"
                placeholder="28000"
              />
            </div>
          </div>

          {/* Total Value Indicator */}
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-semibold">Total Nilai Pembelian:</span>
            <span className="text-sm font-black text-emerald-950">{formatRupiah(totalPurchaseValue)}</span>
          </div>

          {/* Supplier & Invoice */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Nama Konveksi / Supplier:</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">No Surat Jalan / Faktur:</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Checkbox for updating HPP */}
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={updateProductHpp}
              onChange={(e) => setUpdateProductHpp(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Perbarui HPP (Harga Modal) produk ini dengan harga beli di atas</span>
          </label>

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
              disabled={numQty <= 0 || !currentProduct}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 active:scale-95 transition-all flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Simpan Barang Masuk
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

