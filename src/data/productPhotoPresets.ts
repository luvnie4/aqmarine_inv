import { ProductCategory, Product } from '../types';

export interface PhotoPreset {
  id: string;
  name: string;
  category: ProductCategory;
  subCategory?: string;
  colorName?: string;
  url: string;
  thumbUrl: string;
  description: string;
}

// Curated high quality boutique photos with real hijab & mukena aesthetic
export const BOUTIQUE_PHOTO_PRESETS: PhotoPreset[] = [
  // 1. Hijab Voal & Paris
  {
    id: 'preset-voal-sage-1',
    name: 'Voal Ultrafine Sage Green',
    category: 'Hijab',
    subCategory: 'Voal Premium',
    colorName: 'Sage Green',
    url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=200&q=80',
    description: 'Voal premium hijau sage tekstur halus'
  },
  {
    id: 'preset-voal-sage-2',
    name: 'Voal Lasercut Detail Sage',
    category: 'Hijab',
    subCategory: 'Voal Premium',
    colorName: 'Sage Green',
    url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=200&q=80',
    description: 'Detail pinggiran lasercut rapi'
  },
  {
    id: 'preset-voal-dusty-1',
    name: 'Voal Paris Dusty Pink',
    category: 'Hijab',
    subCategory: 'Voal Premium',
    colorName: 'Dusty Pink',
    url: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=200&q=80',
    description: 'Voal dusty rose lembut khas butik'
  },
  {
    id: 'preset-voal-dusty-2',
    name: 'Voal Square Dusty Rose Folded',
    category: 'Hijab',
    subCategory: 'Segi Empat (Square)',
    colorName: 'Dusty Pink',
    url: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=200&q=80',
    description: 'Lipatan hijab rapi siap kemas'
  },
  {
    id: 'preset-voal-broken-white',
    name: 'Voal Premium Broken White',
    category: 'Hijab',
    subCategory: 'Voal Premium',
    colorName: 'Broken White',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80',
    description: 'Warna broken white elegan dan bersih'
  },
  {
    id: 'preset-pashmina-mocca',
    name: 'Pashmina Silk Shimmer Mocca Nude',
    category: 'Hijab',
    subCategory: 'Silk Shimmer',
    colorName: 'Mocca Nude',
    url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=200&q=80',
    description: 'Kilau shimmer silk mewah warna mocca'
  },
  {
    id: 'preset-pashmina-gold',
    name: 'Pashmina Silk Shimmer Champagne',
    category: 'Hijab',
    subCategory: 'Silk Shimmer',
    colorName: 'Champagne Gold',
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&q=80',
    description: 'Pashmina silk elegan pesta & wisuda'
  },
  {
    id: 'preset-pashmina-terracotta',
    name: 'Pashmina Cradenza Terracotta',
    category: 'Hijab',
    subCategory: 'Pashmina',
    colorName: 'Terracotta',
    url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=200&q=80',
    description: 'Tekstur crinkle cradenza jatuh dan adem'
  },
  {
    id: 'preset-bergo-black',
    name: 'Bergo Daily Instant Jet Black',
    category: 'Hijab',
    subCategory: 'Bergo / Instan',
    colorName: 'Jet Black',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80',
    description: 'Bergo instan jersey adem praktis'
  },
  {
    id: 'preset-khimar-navy',
    name: 'Khimar Syar\'i Navy Blue',
    category: 'Hijab',
    subCategory: 'Khimar / Syar\'i',
    colorName: 'Navy Blue',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=200&q=80',
    description: 'Khimar syar\'i pet antem anggun'
  },

  // 2. Mukena & Prayer Sets
  {
    id: 'preset-mukena-sutra-sage',
    name: 'Mukena Silk Sutra Velvet Sage Green',
    category: 'Mukena',
    subCategory: 'Mukena Silk Sutra Premium',
    colorName: 'Sage Green',
    url: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=200&q=80',
    description: 'Mukena sutra lembut kilau doff mewah'
  },
  {
    id: 'preset-mukena-sutra-lace',
    name: 'Detail Renda Gipper Mukena Sutra',
    category: 'Mukena',
    subCategory: 'Mukena Silk Sutra Premium',
    colorName: 'Broken White',
    url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=200&q=80',
    description: 'Detail renda bordir gipper import eksklusif'
  },
  {
    id: 'preset-mukena-rayon-dusty',
    name: 'Mukena Rayon Renda Dusty Pink',
    category: 'Mukena',
    subCategory: 'Mukena Rayon Renda',
    colorName: 'Dusty Pink',
    url: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=200&q=80',
    description: 'Mukena rayon adem semriwing daily'
  },
  {
    id: 'preset-mukena-travel-mini',
    name: 'Mukena Traveling Mini Pouch Parasut',
    category: 'Mukena',
    subCategory: 'Mukena Traveling Mini (Parasut)',
    colorName: 'Denim Soft',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80',
    description: 'Mukena traveling ringkas masuk saku tas'
  },
  {
    id: 'preset-mukena-bordir-gold',
    name: 'Mukena Bordir Mewah Champagne Gold',
    category: 'Mukena',
    subCategory: 'Mukena Bordir Mewah',
    colorName: 'Champagne Gold',
    url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=200&q=80',
    description: 'Mukena mahar seserahan pengantin mewah'
  }
];

// Fallback images based on category
export const DEFAULT_CATEGORY_FALLBACKS: Record<ProductCategory, string> = {
  Hijab: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
  Mukena: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&q=80'
};

// Safe helper to get the primary or index-specific product photo
export function getProductMainImage(product: Partial<Product> | null | undefined): string {
  if (!product) return DEFAULT_CATEGORY_FALLBACKS.Hijab;
  if (product.images && product.images.length > 0 && product.images[0]) {
    return product.images[0];
  }
  if (product.image) {
    return product.image;
  }
  return DEFAULT_CATEGORY_FALLBACKS[product.category || 'Hijab'];
}

// Get all images array normalized (1 to 4 images)
export function getProductImages(product: Partial<Product> | null | undefined): string[] {
  if (!product) return [DEFAULT_CATEGORY_FALLBACKS.Hijab];
  if (product.images && product.images.length > 0) {
    return product.images.filter(Boolean).slice(0, 4);
  }
  if (product.image) {
    return [product.image];
  }
  return [DEFAULT_CATEGORY_FALLBACKS[product.category || 'Hijab']];
}

// Client-side image compression to prevent large base64 strings in localStorage
export async function compressImageFile(file: File, maxWidth = 800, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
