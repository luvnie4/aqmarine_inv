import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Trash2, 
  Star, 
  Check, 
  Link as LinkIcon, 
  RefreshCw,
  Camera
} from 'lucide-react';
import { Product } from '../types';
import { 
  BOUTIQUE_PHOTO_PRESETS, 
  compressImageFile, 
  getProductImages, 
  isRedBagPhoto,
  getProductMainImage
} from '../data/productPhotoPresets';

interface QuickChangePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaveProductPhotos: (product: Product, newImages: string[]) => void;
}

export const QuickChangePhotoModal: React.FC<QuickChangePhotoModalProps> = ({
  isOpen,
  onClose,
  product,
  onSaveProductPhotos,
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceSlotRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      // Clean any red bag images automatically
      const currentImages = getProductImages(product).filter(img => !isRedBagPhoto(img));
      if (currentImages.length > 0) {
        setImages(currentImages);
      } else {
        // Aesthetic category fallback
        setImages([getProductMainImage(product)]);
      }
      setErrorMessage(null);
      setSuccessMessage(null);
      setUrlInput('');
      replaceSlotRef.current = null;
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const file = files[0];
      const compressed = await compressImageFile(file, 400, 0.65);

      if (replaceSlotRef.current !== null && replaceSlotRef.current < images.length) {
        // Direct replacement of specific slot
        const targetIdx = replaceSlotRef.current;
        setImages(prev => {
          const updated = [...prev];
          updated[targetIdx] = compressed;
          return updated;
        });
        setSuccessMessage(`Foto #${targetIdx + 1} berhasil diganti.`);
      } else {
        // If existing is just 1 fallback photo or empty, replace it as main photo
        if (images.length <= 1) {
          setImages([compressed]);
          setSuccessMessage('Foto utama produk berhasil diperbarui.');
        } else if (images.length < 4) {
          setImages(prev => [compressed, ...prev].slice(0, 4));
          setSuccessMessage('Foto baru ditambahkan sebagai foto utama.');
        } else {
          // Replace cover
          setImages(prev => [compressed, prev[1], prev[2], prev[3]]);
          setSuccessMessage('Foto utama (cover) berhasil diganti.');
        }
      }
    } catch {
      setErrorMessage('Gagal memproses file foto. Pastikan format JPG, PNG, atau WEBP.');
    } finally {
      setIsProcessing(false);
      replaceSlotRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerSlotReplace = (slotIdx: number) => {
    replaceSlotRef.current = slotIdx;
    fileInputRef.current?.click();
  };

  const handleSelectPreset = (presetUrl: string) => {
    if (images.includes(presetUrl)) {
      setErrorMessage('Foto ini sudah terpasang.');
      return;
    }

    if (replaceSlotRef.current !== null && replaceSlotRef.current < images.length) {
      const targetIdx = replaceSlotRef.current;
      setImages(prev => {
        const updated = [...prev];
        updated[targetIdx] = presetUrl;
        return updated;
      });
      replaceSlotRef.current = null;
      setSuccessMessage(`Foto #${targetIdx + 1} diganti dari katalog butik.`);
    } else {
      if (images.length <= 1) {
        setImages([presetUrl]);
      } else if (images.length < 4) {
        setImages(prev => [presetUrl, ...prev]);
      } else {
        setImages(prev => [presetUrl, prev[1], prev[2], prev[3]]);
      }
      setSuccessMessage('Foto dari katalog butik berhasil diterapkan.');
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:')) {
      setErrorMessage('URL foto harus diawali dengan http:// atau https://');
      return;
    }

    if (replaceSlotRef.current !== null && replaceSlotRef.current < images.length) {
      const targetIdx = replaceSlotRef.current;
      setImages(prev => {
        const updated = [...prev];
        updated[targetIdx] = trimmed;
        return updated;
      });
      replaceSlotRef.current = null;
    } else {
      if (images.length <= 1) {
        setImages([trimmed]);
      } else {
        setImages(prev => [trimmed, ...prev].slice(0, 4));
      }
    }

    setUrlInput('');
    setSuccessMessage('URL foto berhasil diterapkan.');
  };

  const handleRemovePhoto = (idxToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== idxToRemove));
    setSuccessMessage('Foto dihapus.');
  };

  const handleSetMain = (idxToMain: number) => {
    if (idxToMain === 0) return;
    setImages(prev => {
      const target = prev[idxToMain];
      const rest = prev.filter((_, idx) => idx !== idxToMain);
      return [target, ...rest];
    });
    setSuccessMessage('Foto utama (cover) berhasil diubah.');
  };

  const handleSave = () => {
    const validImages = images.filter(img => Boolean(img) && !isRedBagPhoto(img));
    const finalImages = validImages.length > 0 
      ? validImages 
      : [getProductMainImage(product)];

    onSaveProductPhotos(product, finalImages);
    onClose();
  };

  // Filter presets relevant for this category
  const relevantPresets = BOUTIQUE_PHOTO_PRESETS.filter(
    p => p.category === product.category
  );
  const otherPresets = BOUTIQUE_PHOTO_PRESETS.filter(
    p => p.category !== product.category
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#9E6B70] shrink-0 shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-800 truncate">
                Update Foto: {product.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="font-mono bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-700">
                  {product.sku}
                </span>
                <span>•</span>
                <span className="font-medium text-[#9E6B70]">{product.category}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {successMessage}
            </span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Active Product Photos Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Foto Produk Aktif ({images.length}/4)
              </label>
              <span className="text-[11px] text-slate-400">
                Foto pertama adalah cover katalog
              </span>
            </div>

            {images.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum ada foto produk</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Silakan upload foto atau pilih dari galeri butik di bawah.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((imgUrl, idx) => (
                  <div 
                    key={idx} 
                    className="relative bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs flex flex-col justify-between overflow-hidden group hover:border-[#9E6B70] transition-colors"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />

                      {/* Main / Cover Badge */}
                      {idx === 0 ? (
                        <span className="absolute top-1.5 left-1.5 bg-[#9E6B70] text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Cover Utama</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetMain(idx)}
                          className="absolute top-1.5 left-1.5 bg-black/65 hover:bg-[#9E6B70] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors shadow-xs"
                          title="Jadikan Foto Utama"
                        >
                          Set Cover
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs"
                        title="Hapus Foto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Quick Replace Button */}
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">
                        Foto #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => triggerSlotReplace(idx)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-[#9E6B70] text-slate-600 text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                        title="Ganti foto di slot ini"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Ganti</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Slot Tambah Foto Baru */}
                {images.length < 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      replaceSlotRef.current = null;
                      fileInputRef.current?.click();
                    }}
                    className="aspect-square border-2 border-dashed border-rose-300 hover:border-[#9E6B70] hover:bg-rose-50/40 rounded-2xl flex flex-col items-center justify-center p-3 text-center transition-all group cursor-pointer"
                  >
                    <Upload className="w-5 h-5 text-rose-400 group-hover:text-[#9E6B70] group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-xs font-bold text-[#9E6B70]">
                      + Upload Foto
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      (Slot {images.length + 1})
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Input Method Tabs */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex border-b border-slate-200 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'upload'
                    ? 'border-[#9E6B70] text-[#9E6B70]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>1. Upload dari HP / Laptop</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'presets'
                    ? 'border-[#9E6B70] text-[#9E6B70]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>2. Galeri Butik ({product.category})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'url'
                    ? 'border-[#9E6B70] text-[#9E6B70]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>3. Link URL Foto</span>
              </button>
            </div>

            {/* TAB 1: UPLOAD */}
            {activeTab === 'upload' && (
              <div 
                onClick={() => {
                  replaceSlotRef.current = null;
                  fileInputRef.current?.click();
                }}
                className="border-2 border-dashed border-slate-300 hover:border-[#9E6B70] hover:bg-rose-50/20 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#9E6B70] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {isProcessing ? 'Mengompresi dan memproses foto...' : 'Klik untuk memilih foto dari galeri HP atau komputer'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Format didukung: JPG, PNG, WEBP. Foto otomatis dikompresi agar loading kilat dan hemat penyimpanan.
                </p>
              </div>
            )}

            {/* TAB 2: BUTIK PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Pilih foto profesional siap pakai yang sesuai dengan produk Anda:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {[...relevantPresets, ...otherPresets].map((preset) => {
                    const isSelected = images.includes(preset.url);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        className={`group relative rounded-xl overflow-hidden border-2 text-left transition-all p-1 bg-white hover:border-[#9E6B70] ${
                          isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                          <img
                            src={preset.thumbUrl || preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="mt-1 px-0.5">
                          <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">
                            {preset.name}
                          </p>
                          <p className="text-[9px] text-[#9E6B70] font-semibold mt-0.5">
                            {preset.colorName}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: URL INPUT */}
            {activeTab === 'url' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Masukkan tautan gambar langsung (misal: Unsplash, Cloudinary, atau web Anda):
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#9E6B70] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrl}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
                  >
                    Terapkan URL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#9E6B70] hover:bg-[#85555A] shadow-md shadow-rose-900/10 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Perubahan Foto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
