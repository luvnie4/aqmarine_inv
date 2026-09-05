import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Layers, 
  RefreshCw, 
  ArrowRight,
  Info
} from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { formatRupiah, formatNumber } from '../utils/formatters';
import { getProductMainImage } from '../data/productPhotoPresets';
import { getOutlets } from '../utils/outletStorage';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedProducts: Product[], replaceAll: boolean) => void;
  existingCount: number;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [replaceAll, setReplaceAll] = useState<boolean>(true); // Default to clean replace as requested
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const csvContent = [
      'SKU,Barcode,Nama Produk,Kategori,Sub Kategori,Stok Toko,Batas Min Alert,HPP Modal,Harga Jual Retail,Harga Grosir,Satuan,Catatan',
      'AQM-HJB-001,89910010001,Voal Paris Ultrafine Lasercut,Hijab,Voal Premium,25,5,28000,55000,45000,Pcs,Bahan tegak di dahi dan lembut',
      'AQM-HJB-002,89910010002,Pashmina Silk Shimmer Cradenza,Hijab,Silk Shimmer,15,5,38000,75000,65000,Pcs,Kilau mewah untuk acara pesta',
      'AQM-MKN-001,89910010003,Mukena Silk Sutra Premium 2-in-1,Mukena,Mukena Silk Sutra Premium,10,3,165000,285000,245000,Set,Termasuk tas pouch cantik'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Template_Import_Produk_AQMARINE_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVText = (text: string) => {
    try {
      const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        setErrorMessage('File CSV tidak memiliki baris data produk.');
        setParsedProducts([]);
        return;
      }

      // Detect separator: comma or semicolon or tab
      const firstLine = lines[0];
      let separator = ',';
      if (firstLine.includes(';') && !firstLine.includes(',')) separator = ';';
      else if (firstLine.includes('\t')) separator = '\t';

      // Parse headers
      const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      
      const outlets = getOutlets();
      const defaultOutletId = outlets.find(o => o.isDefault)?.id || outlets[0]?.id || 'outlet-utama';

      const results: Product[] = [];
      const timestamp = new Date().toISOString();

      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (!rawLine) continue;

        // Split with handling for quoted commas if needed
        const cols = rawLine.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 3) continue;

        const getVal = (possibleNames: string[]): string => {
          for (const name of possibleNames) {
            const idx = headers.findIndex(h => h.includes(name));
            if (idx !== -1 && cols[idx] !== undefined) {
              return cols[idx];
            }
          }
          return '';
        };

        const name = getVal(['nama', 'name', 'produk', 'product']) || `Produk Baru ${i}`;
        const sku = getVal(['sku', 'kode', 'code']) || `AQM-PRD-${Date.now().toString().slice(-4)}${i}`;
        const barcode = getVal(['barcode']) || `${Date.now().toString().slice(-8)}${i}`;
        
        let categoryRaw = getVal(['kategori', 'category']).toLowerCase();
        let category: ProductCategory = 'Hijab';
        if (categoryRaw.includes('mukena')) {
          category = 'Mukena';
        }

        const subCategory = getVal(['sub', 'tipe', 'model']) || undefined;
        const stockToko = Math.max(0, parseInt(getVal(['stok', 'stock', 'qty', 'jumlah']), 10) || 0);
        const minAlert = Math.max(1, parseInt(getVal(['min', 'alert', 'batas']), 10) || 5);
        const hpp = Math.max(0, parseFloat(getVal(['hpp', 'modal', 'cost', 'beli']).replace(/[^0-9.]/g, '')) || 0);
        const priceRetail = Math.max(0, parseFloat(getVal(['jual', 'retail', 'harga jual', 'price']).replace(/[^0-9.]/g, '')) || (hpp > 0 ? hpp * 1.5 : 50000));
        const priceGrosir = Math.max(0, parseFloat(getVal(['grosir', 'reseller', 'wholesale']).replace(/[^0-9.]/g, '')) || (priceRetail * 0.85));
        const unit = getVal(['satuan', 'unit']) || (category === 'Mukena' ? 'Set' : 'Pcs');
        const notes = getVal(['catatan', 'note', 'keterangan']) || undefined;

        // Auto-assign image
        const mainImg = getProductMainImage({ name, category, subCategory } as any);

        const newProd: Product = {
          id: `prod-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
          sku,
          barcode,
          name,
          category,
          subCategory,
          hpp,
          priceRetail,
          priceGrosir,
          stockToko,
          initialStock: stockToko,
          incomingStock: 0,
          outletStocks: { [defaultOutletId]: stockToko },
          minStockAlert: minAlert,
          unit,
          notes,
          images: [mainImg],
          createdAt: timestamp,
        };

        results.push(newProd);
      }

      if (results.length === 0) {
        setErrorMessage('Tidak ada baris produk yang valid ditemukan dalam file.');
        setParsedProducts([]);
      } else {
        setParsedProducts(results);
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error('CSV Parsing error', err);
      setErrorMessage(`Gagal membaca file: ${err?.message || 'Format tidak dikenali'}`);
      setParsedProducts([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    processFile(selected);
  };

  const processFile = (fileToRead: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (fileToRead.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setParsedProducts(parsed);
          } else if (parsed && Array.isArray(parsed.products)) {
            setParsedProducts(parsed.products);
          } else {
            setErrorMessage('Format JSON tidak sesuai. Harus berupa array produk.');
          }
        } catch (err) {
          setErrorMessage('File JSON rusak atau tidak valid.');
        }
      } else {
        parseCSVText(content);
      }
      setIsProcessing(false);
    };

    reader.onerror = () => {
      setErrorMessage('Terjadi kesalahan saat membaca file dari perangkat.');
      setIsProcessing(false);
    };

    reader.readAsText(fileToRead);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const handleConfirmImport = () => {
    if (parsedProducts.length === 0) return;
    onImport(parsedProducts, replaceAll);
    onClose();
  };

  const totalStockParsed = parsedProducts.reduce((sum, p) => sum + p.stockToko, 0);
  const totalValuationParsed = parsedProducts.reduce((sum, p) => sum + (p.stockToko * p.hpp), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#9E6B70] via-[#8C5559] to-[#78464A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                Upload & Import Data Produk
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Upload file CSV atau Excel untuk memasukkan katalog produk dan stok secara instan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Download Template Banner */}
          <div className="p-3.5 bg-rose-50/70 border border-[#9E6B70]/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#9E6B70] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#8C5559]">
                  Belum punya format file yang sesuai?
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Unduh template Excel / CSV standar AQMARINE untuk mengisi data produk Anda.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white border border-[#9E6B70]/30 hover:bg-[#9E6B70]/10 text-[#8C5559] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Terjadi Kesalahan</p>
                <p className="text-rose-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#9E6B70] bg-rose-50/50'
                : file
                ? 'border-emerald-400 bg-emerald-50/20'
                : 'border-slate-300 hover:border-[#9E6B70] bg-slate-50 hover:bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div className={`p-3 rounded-2xl ${file ? 'bg-emerald-100 text-emerald-700' : 'bg-[#9E6B70]/10 text-[#8C5559]'}`}>
                {file ? <FileSpreadsheet className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
              </div>
              
              {file ? (
                <div>
                  <p className="text-xs font-bold text-slate-800">{file.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • Klik untuk ganti file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Tarik & Lepaskan File CSV/Excel di Sini, atau <span className="text-[#9E6B70] underline">Klik untuk Pilih File</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mendukung format .csv, .tsv, atau .json
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Import Mode Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Opsi Penanganan Data Lama:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setReplaceAll(true)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  replaceAll
                    ? 'bg-rose-50/90 border-[#9E6B70] ring-2 ring-[#9E6B70]/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[#8C5559] font-bold text-xs">
                  <RefreshCw className="w-4 h-4" />
                  <span>Ganti & Bersihkan Semua</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Hapus seluruh data lama dan ganti bersih dengan data produk dari file yang di-upload (Rekomendasi).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReplaceAll(false)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  !replaceAll
                    ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <Layers className="w-4 h-4" />
                  <span>Gabungkan & Update</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Tambahkan produk baru dan perbarui produk yang sudah ada tanpa menghapus data yang tersimpan.
                </p>
              </button>
            </div>
          </div>

          {/* Preview of Parsed Products */}
          {parsedProducts.length > 0 && (
            <div className="space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Pratinjau Data Ditemukan ({parsedProducts.length} Produk)
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Total Stok: {formatNumber(totalStockParsed)} pcs • {formatRupiah(totalValuationParsed)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                {parsedProducts.slice(0, 10).map((p, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        SKU: {p.sku} • Kat: {p.category} {p.subCategory ? `(${p.subCategory})` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900">{p.stockToko} {p.unit}</span>
                      <span className="block text-[10px] text-emerald-700 font-semibold">{formatRupiah(p.priceRetail)}</span>
                    </div>
                  </div>
                ))}
                {parsedProducts.length > 10 && (
                  <div className="p-2 text-center text-[11px] text-slate-400 bg-slate-50 font-medium">
                    ...dan {parsedProducts.length - 10} produk lainnya
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={parsedProducts.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="px-5 py-2.5 bg-gradient-to-r from-[#9E6B70] to-[#8C5559] hover:from-[#8C5559] hover:to-[#78464A] text-white text-xs font-bold rounded-xl shadow-md shadow-[#9E6B70]/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Terapkan Import ({parsedProducts.length} Produk)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
