import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Package, 
  Check, 
  Building2, 
  Store, 
  Image as ImageIcon,
  Plus,
  Sparkles,
  Link as LinkIcon,
  Trash2,
  Star,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Product, ProductCategory, StoreOutlet } from '../types';
import { 
  BOUTIQUE_PHOTO_PRESETS, 
  getProductImages,
  compressImageFile
} from '../data/productPhotoPresets';
import { getOutlets } from '../utils/outletStorage';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSaveProduct: (product: Product) => void;
  onOpenManageOutlets?: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaveProduct,
  onOpenManageOutlets,
}) => {
  const [category, setCategory] = useState<ProductCategory>('Hijab');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  
  // Product Photos State (Min 1, Max 4)
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isPresetDrawerOpen, setIsPresetDrawerOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pricing & Stocks
  const [hpp, setHpp] = useState<number | ''>('');
  const [priceRetail, setPriceRetail] = useState<number | ''>('');
  const [priceGrosir, setPriceGrosir] = useState<number | ''>('');
  const [outlets, setOutlets] = useState<StoreOutlet[]>([]);
  const [outletStocks, setOutletStocks] = useState<Record<string, number | ''>>({});
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(5);
  const [unit, setUnit] = useState('Pcs');
  const [notes, setNotes] = useState('');

  const generateAutoCodes = (cat: ProductCategory) => {
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const prefix = cat === 'Hijab' ? 'HJB' : 'MKN';
    setSku(`AQM-${prefix}-${randCode}`);
    setBarcode(`899100${randCode}`);
  };

  useEffect(() => {
    if (isOpen) {
      const activeOutlets = getOutlets();
      setOutlets(activeOutlets);

      setImageError(null);
      setIsPresetDrawerOpen(false);
      setIsAddingUrl(false);
      setUrlInput('');

      if (productToEdit) {
        setCategory(productToEdit.category);
        setName(productToEdit.name);
        setSku(productToEdit.sku);
        setBarcode(productToEdit.barcode);
        setImages(getProductImages(productToEdit));
        setHpp(productToEdit.hpp);
        setPriceRetail(productToEdit.priceRetail);
        setPriceGrosir(productToEdit.priceGrosir);

        // Load per-outlet stocks
        const initialOutletStocks: Record<string, number | ''> = {};
        activeOutlets.forEach((o) => {
          if (productToEdit.outletStocks && productToEdit.outletStocks[o.id] !== undefined) {
            initialOutletStocks[o.id] = productToEdit.outletStocks[o.id];
          } else if (o.isDefault) {
            initialOutletStocks[o.id] = productToEdit.stockToko || 0;
          } else {
            initialOutletStocks[o.id] = 0;
          }
        });
        setOutletStocks(initialOutletStocks);

        setMinStockAlert(productToEdit.minStockAlert);
        setUnit(productToEdit.unit || (productToEdit.category === 'Hijab' ? 'Pcs' : 'Set'));
        setNotes(productToEdit.notes || '');
      } else {
        setCategory('Hijab');
        setName('');
        const randCode = Math.floor(1000 + Math.random() * 9000);
        setSku(`AQM-HJB-${randCode}`);
        setBarcode(`899100${randCode}`);
        // Default 1 aesthetic photo from preset
        const defaultPhoto = BOUTIQUE_PHOTO_PRESETS.find(p => p.category === 'Hijab')?.url || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80';
        setImages([defaultPhoto]);
        setHpp(28000);
        setPriceRetail(55000);
        setPriceGrosir(45000);

        // Set default stock for each active outlet
        const initialOutletStocks: Record<string, number | ''> = {};
        activeOutlets.forEach((o) => {
          initialOutletStocks[o.id] = o.isDefault ? 10 : 0;
        });
        setOutletStocks(initialOutletStocks);

        setMinStockAlert(5);
        setUnit('Pcs');
        setNotes('');
      }
    }
  }, [isOpen, productToEdit]);

  const handleOutletStockChange = (outletId: string, value: string) => {
    setOutletStocks((prev) => ({
      ...prev,
      [outletId]: value === '' ? '' : Number(value),
    }));
  };

  // Calculate total stock in all stores
  const calculatedTotalStockToko = Object.values(outletStocks).reduce<number>((sum, val) => {
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);

  const handleCategoryChange = (newCat: ProductCategory) => {
    setCategory(newCat);
    setUnit(newCat === 'Hijab' ? 'Pcs' : 'Set');
    if (!productToEdit) {
      generateAutoCodes(newCat);
      const matchingPreset = BOUTIQUE_PHOTO_PRESETS.find(p => p.category === newCat);
      if (matchingPreset && images.length <= 1) {
        setImages([matchingPreset.url]);
      }
    }
  };

  // Photo Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImageError(null);
    setIsUploading(true);

    try {
      const remainingSlots = 4 - images.length;
      if (remainingSlots <= 0) {
        setImageError('Maksimal 4 foto per produk. Hapus salah satu foto jika ingin mengganti.');
        setIsUploading(false);
        return;
      }

      const filesToProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);
      const compressedUrls: string[] = [];

      for (const file of filesToProcess) {
        const compressed = await compressImageFile(file, 800, 0.82);
        compressedUrls.push(compressed);
      }

      setImages((prev) => [...prev, ...compressedUrls].slice(0, 4));
    } catch {
      setImageError('Gagal memproses gambar. Pastikan format file berupa JPG/PNG/WEBP.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddPhotoUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (images.length >= 4) {
      setImageError('Maksimal 4 foto per produk.');
      return;
    }

    setImages((prev) => [...prev, trimmed].slice(0, 4));
    setUrlInput('');
    setIsAddingUrl(false);
    setImageError(null);
  };

  const handleSelectPresetPhoto = (photoUrl: string) => {
    if (images.length >= 4) {
      setImageError('Maksimal 4 foto per produk. Hapus salah satu foto terlebih dahulu.');
      return;
    }
    if (images.includes(photoUrl)) {
      setImageError('Foto ini sudah terpasang.');
      return;
    }
    setImages((prev) => [...prev, photoUrl].slice(0, 4));
    setImageError(null);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    if (images.length <= 1) {
      setImageError('Wajib melampirkan minimal 1 foto produk (tidak boleh kosong).');
      return;
    }
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImageError(null);
  };

  const handleSetMainPhoto = (indexToMain: number) => {
    if (indexToMain === 0) return;
    setImages((prev) => {
      const selected = prev[indexToMain];
      const rest = prev.filter((_, idx) => idx !== indexToMain);
      return [selected, ...rest];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    // Validate images constraint: min 1, max 4
    if (images.length === 0) {
      setImageError('Wajib melampirkan minimal 1 foto produk (maksimal 4 foto).');
      return;
    }

    const finalImages = images.slice(0, 4);

    // Prepare numeric outlet stocks
    const finalOutletStocks: Record<string, number> = {};
    outlets.forEach((o) => {
      finalOutletStocks[o.id] = Number(outletStocks[o.id]) || 0;
    });

    const product: Product = {
      id: productToEdit ? productToEdit.id : `prod-${Date.now()}`,
      sku: sku.trim() || `AQM-${Date.now()}`,
      barcode: barcode.trim() || `${Date.now()}`,
      name: name.trim(),
      category,
      images: finalImages,
      image: finalImages[0],
      hpp: Number(hpp) || 0,
      priceRetail: Number(priceRetail) || 0,
      priceGrosir: Number(priceGrosir) || 0,
      stockToko: calculatedTotalStockToko,
      initialStock: productToEdit?.initialStock !== undefined 
        ? productToEdit.initialStock 
        : calculatedTotalStockToko,
      incomingStock: productToEdit?.incomingStock || 0,
      lastOpnameAt: productToEdit?.lastOpnameAt,
      outletStocks: finalOutletStocks,
      minStockAlert: Number(minStockAlert) || 5,
      unit: unit.trim() || (category === 'Hijab' ? 'Pcs' : 'Set'),
      notes: notes.trim() || undefined,
      createdAt: productToEdit ? productToEdit.createdAt : new Date().toISOString(),
    };

    onSaveProduct(product);
    onClose();
  };

  if (!isOpen) return null;

  const isEditing = Boolean(productToEdit);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-[#9D6C72]/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#9D6C72] text-white">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {isEditing ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Input data produk sederhana: nama barang, harga, foto, dan alokasi stok.
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* 1. Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Kategori Produk:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCategoryChange('Hijab')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  category === 'Hijab'
                    ? 'bg-[#9D6C72] text-white border-[#9D6C72] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Hijab / Jilbab</span>
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange('Mukena')}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  category === 'Mukena'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Mukena / Prayer Set</span>
              </button>
            </div>
          </div>

          {/* 2. Product Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nama Produk: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pashmina Ceruty Babydoll, Mukena Silk Sutra, Voal Paris Ultrafine..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9D6C72]/20"
            />
          </div>

          {/* 3. SKU, Barcode, Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Kode SKU:</label>
                <button
                  type="button"
                  onClick={() => generateAutoCodes(category)}
                  className="text-[10px] font-semibold text-[#9D6C72] hover:underline flex items-center gap-0.5"
                  title="Generate SKU & Barcode Otomatis"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Auto
                </button>
              </div>
              <input
                type="text"
                placeholder="AQM-HJB-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Barcode / EAN:</label>
              <input
                type="text"
                placeholder="89910010001"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Satuan:</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Pcs">Pcs (Lembar/Potong)</option>
                <option value="Set">Set (Paket/Mukena)</option>
                <option value="Box">Box / Dus</option>
                <option value="Kodi">Kodi (20 pcs)</option>
              </select>
            </div>
          </div>

          {/* 4. PHOTO MANAGEMENT */}
          <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-100/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#9D6C72]" />
                <label className="text-xs font-bold text-slate-800">
                  Foto Produk <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[#9D6C72]/15 text-[#9D6C72]">
                  {images.length}/4 Foto
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPresetDrawerOpen(!isPresetDrawerOpen)}
                  className="text-[11px] font-bold text-[#9D6C72] hover:text-[#7f4a50] flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 shadow-2xs transition-colors"
                  title="Pilih dari koleksi foto butik"
                >
                  <Sparkles className="w-3 h-3 text-[#9D6C72]" />
                  <span>Galeri Foto Butik</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingUrl(!isAddingUrl)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors flex items-center gap-1"
                  title="Input link foto"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Link URL</span>
                </button>
              </div>
            </div>

            {/* Error Warning if photo requirement not met */}
            {imageError && (
              <div className="p-2.5 bg-rose-100/90 border border-rose-300 text-rose-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{imageError}</span>
              </div>
            )}

            {/* URL Input Form */}
            {isAddingUrl && (
              <div className="flex gap-2 p-2 bg-white rounded-xl border border-slate-200 animate-in fade-in">
                <input
                  type="url"
                  placeholder="https://... URL foto produk"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9D6C72]"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  disabled={!urlInput.trim() || images.length >= 4}
                  className="px-3 py-1.5 bg-[#9D6C72] text-white text-xs font-bold rounded-lg hover:bg-[#855359] disabled:opacity-50"
                >
                  Tambahkan
                </button>
              </div>
            )}

            {/* Preset Gallery Drawer */}
            {isPresetDrawerOpen && (
              <div className="p-3 bg-white rounded-2xl border border-rose-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Pilih foto untuk melampirkan ke produk ({category}):
                  </span>
                  <span className="text-[11px] text-slate-400">Sisa slot: {4 - images.length}</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                  {BOUTIQUE_PHOTO_PRESETS.filter(p => p.category === category).map((preset) => {
                    const isSelected = images.includes(preset.url);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={isSelected || images.length >= 4}
                        onClick={() => handleSelectPresetPhoto(preset.url)}
                        className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                          isSelected
                            ? 'border-emerald-500 opacity-50 cursor-not-allowed'
                            : images.length >= 4
                            ? 'opacity-40 cursor-not-allowed border-slate-200'
                            : 'border-slate-200 hover:border-[#9D6C72] hover:scale-105 shadow-2xs'
                        }`}
                        title={`${preset.name} - ${preset.description}`}
                      >
                        <img
                          src={preset.thumbUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                          + Pilih
                        </div>
                        {isSelected && (
                          <span className="absolute bottom-1 right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Photos List Grid (1 to 4) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {images.map((imgUrl, idx) => (
                <div 
                  key={idx} 
                  className="relative group bg-white rounded-2xl border-2 border-slate-200 p-1.5 shadow-xs flex flex-col justify-between overflow-hidden"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={imgUrl}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Main Photo Badge on #1 */}
                    {idx === 0 ? (
                      <span className="absolute top-1 left-1 bg-[#9D6C72] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>Utama</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetMainPhoto(idx)}
                        className="absolute top-1 left-1 bg-black/60 hover:bg-[#9D6C72] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        title="Jadikan Foto Utama / Cover"
                      >
                        Set Utama
                      </button>
                    )}

                    {/* Delete Photo Button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md"
                      title={images.length <= 1 ? "Min 1 foto diperlukan" : "Hapus Foto"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="mt-1 text-center text-[10px] font-bold text-slate-500">
                    Foto {idx + 1} {idx === 0 && '(Cover)'}
                  </div>
                </div>
              ))}

              {/* Upload Slot Button if < 4 */}
              {images.length < 4 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-rose-300 hover:border-[#9D6C72] hover:bg-rose-50/50 rounded-2xl flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-8 h-8 rounded-full bg-white text-[#9D6C72] group-hover:bg-[#9D6C72] group-hover:text-white flex items-center justify-center shadow-xs transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#9D6C72] mt-2 block">
                    {isUploading ? 'Memproses...' : '+ Upload Foto'}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    (Sisa {4 - images.length})
                  </span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 pt-0.5">
              Foto pertama otomatis menjadi <strong>Cover Utama</strong> di Kasir & Inventori.
            </div>
          </div>

          {/* 5. Pricing Row: HPP, Retail, Grosir */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Harga Modal / HPP (Rp):
              </label>
              <input
                type="number"
                min={0}
                placeholder="28000"
                value={hpp}
                onChange={(e) => setHpp(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>

            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
              <label className="text-xs font-bold text-rose-900 block mb-1">
                Harga Jual Toko (Rp): <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                placeholder="55000"
                value={priceRetail}
                onChange={(e) => setPriceRetail(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-xl text-xs font-black text-rose-900"
              />
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
              <label className="text-xs font-bold text-amber-900 block mb-1">
                Harga Grosir / Reseller (Rp):
              </label>
              <input
                type="number"
                min={0}
                placeholder="45000"
                value={priceGrosir}
                onChange={(e) => setPriceGrosir(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-black text-amber-900"
              />
            </div>
          </div>

          {/* 6. Stock for Active Stores & Minimum Alert */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" />
                {isEditing ? 'Penyesuaian Stok Toko & Batas Peringatan:' : 'Stok Awal Toko & Batas Peringatan:'}
              </span>
              {onOpenManageOutlets && (
                <button
                  type="button"
                  onClick={onOpenManageOutlets}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  + Kelola Cabang Toko
                </button>
              )}
            </div>

            {/* Minimum Alert & Total Stock Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    Peringatan Minimum (Alert):
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Batas Tipis</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-base font-black text-slate-800 focus:ring-2 focus:ring-slate-400/20"
                  />
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    {unit}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-emerald-700" />
                    Total Keseluruhan Stok:
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-md">
                    {outlets.length} Toko
                  </span>
                </div>
                <div className="text-xl font-black text-emerald-950 flex items-baseline gap-1">
                  <span>{calculatedTotalStockToko}</span>
                  <span className="text-xs font-semibold text-emerald-700">{unit}</span>
                </div>
              </div>
            </div>

            {/* Outlets Grid */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                Alokasi Stok di Toko / Cabang:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {outlets.map((outlet) => {
                  const val = outletStocks[outlet.id] ?? '';
                  return (
                    <div 
                      key={outlet.id} 
                      className="p-2.5 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200/90 shadow-2xs transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <Store className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate" title={outlet.name}>
                            {outlet.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                            {outlet.code}
                          </span>
                          {outlet.isDefault && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded border border-amber-200">
                              Utama
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={val}
                          onChange={(e) => handleOutletStockChange(outlet.id, e.target.value)}
                          className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <span className="text-xs font-semibold text-slate-500 shrink-0">
                          {unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7. Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional):</label>
            <textarea
              rows={2}
              placeholder="Keterangan bahan, packaging, dsb..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
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
              id="save-product-submit-btn"
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-[#9D6C72] hover:bg-[#8B5B61] rounded-xl shadow-md shadow-[#9D6C72]/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isEditing ? 'Simpan Perubahan' : 'Simpan Produk Baru'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
