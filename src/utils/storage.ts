/**
 * Safe localStorage wrapper that handles QuotaExceededError and prevents app crashes
 * when storing large payloads such as product catalogs or transaction histories.
 */

export function safeLocalStorageSet(key: string, data: any): void {
  let serialized = '';
  try {
    serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (err: any) {
    const isQuotaError =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014);

    if (isQuotaError) {
      console.warn(`[SafeStorage] QuotaExceededError on "${key}". Attempting intelligent pruning...`);

      try {
        // Strategy 1: First prune transactions cache (the main cause of quota usage)
        const rawTx = localStorage.getItem('aqmarine_boutique_transactions_v1');
        if (rawTx) {
          try {
            const parsedTx = JSON.parse(rawTx);
            if (Array.isArray(parsedTx) && parsedTx.length > 30) {
              const pruned = parsedTx.slice(0, 30).map((t: any) => ({
                ...t,
                items: (t.items || []).map((it: any) => ({
                  ...it,
                  product: it.product ? {
                    id: it.product.id,
                    sku: it.product.sku,
                    name: it.product.name,
                    category: it.product.category,
                    priceRetail: it.product.priceRetail,
                    priceGrosir: it.product.priceGrosir,
                    unit: it.product.unit,
                  } : undefined
                }))
              }));
              localStorage.setItem('aqmarine_boutique_transactions_v1', JSON.stringify(pruned));
              // Retry original save
              localStorage.setItem(key, serialized);
              return;
            }
          } catch {
            localStorage.removeItem('aqmarine_boutique_transactions_v1');
          }
        }

        // Strategy 2: If key is transactions, save only most recent 30 lightweight items
        if (key.includes('transactions') && Array.isArray(data)) {
          const trimmedTx = data.slice(0, 30).map((t: any) => ({
            ...t,
            items: (t.items || []).map((item: any) => ({
              ...item,
              product: item.product
                ? {
                    id: item.product.id,
                    sku: item.product.sku,
                    barcode: item.product.barcode,
                    name: item.product.name,
                    category: item.product.category,
                    priceRetail: item.product.priceRetail,
                    priceGrosir: item.product.priceGrosir,
                    unit: item.product.unit,
                  }
                : undefined,
            })),
          }));
          localStorage.setItem(key, JSON.stringify(trimmedTx));
          console.info(`[SafeStorage] Successfully saved pruned transactions cache.`);
          return;
        }

        // Strategy 3: If key is products, keep only 1 primary image per product to save space without losing user photos
        if (key.includes('products') && Array.isArray(data)) {
          const compactProducts = data.map((p: any) => {
            const primaryImg = p.images?.[0] || p.image;
            return {
              ...p,
              images: primaryImg ? [primaryImg] : [],
              image: primaryImg,
            };
          });
          localStorage.setItem(key, JSON.stringify(compactProducts));
          console.info(`[SafeStorage] Saved compact products cache preserving primary photos.`);
          return;
        }

        // Strategy 4: Fallback
        localStorage.removeItem(key);
      } catch (fallbackErr) {
        console.warn(`[SafeStorage] Fallback storage failed for "${key}":`, fallbackErr);
      }
    } else {
      console.warn(`[SafeStorage] Could not write to localStorage for key "${key}":`, err);
    }
  }
}

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[SafeStorage] Could not parse localStorage key "${key}":`, err);
    return fallback;
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Could not remove localStorage key "${key}":`, err);
  }
}

/**
 * Automatically prunes bloated legacy localStorage items on startup
 * to instantly reclaim browser storage quota.
 */
export function sanitizeExistingStorage(): void {
  try {
    // 1. Check transactions storage size
    const rawTx = localStorage.getItem('aqmarine_boutique_transactions_v1');
    if (rawTx && rawTx.length > 400000) {
      try {
        const parsed = JSON.parse(rawTx);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((t: any) => ({
            ...t,
            items: (t.items || []).map((item: any) => ({
              ...item,
              product: item.product
                ? {
                    id: item.product.id,
                    sku: item.product.sku,
                    barcode: item.product.barcode,
                    name: item.product.name,
                    category: item.product.category,
                    priceRetail: item.product.priceRetail,
                    priceGrosir: item.product.priceGrosir,
                    unit: item.product.unit,
                  }
                : undefined,
            })),
          }));
          localStorage.setItem('aqmarine_boutique_transactions_v1', JSON.stringify(cleaned));
          console.info('[SafeStorage] Reclaimed quota from bloated transaction cache.');
        }
      } catch (err) {
        localStorage.removeItem('aqmarine_boutique_transactions_v1');
      }
    }

    // 2. Check products storage size - only compact if extremely large (>3.5MB)
    const rawProd = localStorage.getItem('aqmarine_boutique_products_v1');
    if (rawProd && rawProd.length > 3500000) {
      try {
        const parsed = JSON.parse(rawProd);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.map((p: any) => {
            const primary = p.images?.[0] || p.image;
            return {
              ...p,
              images: primary ? [primary] : [],
              image: primary,
            };
          });
          localStorage.setItem('aqmarine_boutique_products_v1', JSON.stringify(cleaned));
          console.info('[SafeStorage] Compacted product images cache.');
        }
      } catch (err) {
        // Keep intact
      }
    }
  } catch (e) {
    console.warn('[SafeStorage] Startup sanitization skipped:', e);
  }
}

// Run once on bundle load
sanitizeExistingStorage();

