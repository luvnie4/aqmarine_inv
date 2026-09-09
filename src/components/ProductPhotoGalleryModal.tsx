import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Sparkles, Tag, Camera } from 'lucide-react';
import { Product } from '../types';
import { getProductImages } from '../data/productPhotoPresets';
import { formatRupiah } from '../utils/formatters';

interface ProductPhotoGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialPhotoIndex?: number;
  onOpenChangePhoto?: (product: Product) => void;
}

export const ProductPhotoGalleryModal: React.FC<ProductPhotoGalleryModalProps> = ({
  isOpen,
  onClose,
  product,
  initialPhotoIndex = 0,
  onOpenChangePhoto,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialPhotoIndex);
    }
  }, [isOpen, initialPhotoIndex]);

  if (!isOpen || !product) return null;

  const images = getProductImages(product);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-800/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <span 
              className="w-4 h-4 rounded-full border border-slate-300 shadow-xs shrink-0" 
              style={{ backgroundColor: product.colorHex }}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate">
                {product.name}
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="font-mono bg-slate-200/70 px-1.5 py-0.2 rounded text-[10px] text-slate-700 font-bold">{product.sku}</span>
                <span>•</span>
                <span>{product.colorName}</span>
                <span>•</span>
                <span className="text-[#9E6B70] font-bold">{product.category} ({product.subCategory})</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {onOpenChangePhoto && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChangePhoto(product);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#9E6B70] border border-rose-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Ganti atau perbarui foto produk ini"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Ganti Foto</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Photo Viewer */}
        <div className="relative bg-slate-950 flex-1 flex items-center justify-center min-h-[300px] sm:min-h-[420px] max-h-[550px] overflow-hidden select-none">
          <img
            src={images[activeIndex]}
            alt={`${product.name} - Foto ${activeIndex + 1}`}
            className="max-h-[500px] w-auto max-w-full object-contain transition-all duration-300"
            referrerPolicy="no-referrer"
          />

          {/* Navigation Arrows if > 1 photo */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all shadow-lg active:scale-95"
                title="Foto Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all shadow-lg active:scale-95"
                title="Foto Selanjutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Badge Photo Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 shadow-md">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Foto {activeIndex + 1} dari {images.length}</span>
            {activeIndex === 0 && (
              <span className="ml-1 text-[10px] font-bold bg-[#9E6B70] px-1.5 py-0.2 rounded-md text-white">
                Foto Utama
              </span>
            )}
          </div>
        </div>

        {/* Bottom Thumbnail Strip & Details */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Thumbnails (1 to 4) */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  activeIndex === idx
                    ? 'border-[#9E6B70] ring-2 ring-[#9E6B70]/30 shadow-md scale-105'
                    : 'border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {idx === 0 && (
                  <span className="absolute top-0.5 left-0.5 bg-[#9E6B70] text-white text-[8px] font-bold px-1 rounded">
                    Utama
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Product Info */}
          <div className="flex items-center gap-4 text-xs text-right shrink-0">
            <div>
              <span className="text-slate-400 block text-[11px]">Harga Retail:</span>
              <span className="text-base font-black text-slate-900">{formatRupiah(product.priceRetail)}</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-slate-400 block text-[11px]">Total Stok:</span>
              <span className="font-bold text-emerald-700">{product.stockToko} pcs</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
