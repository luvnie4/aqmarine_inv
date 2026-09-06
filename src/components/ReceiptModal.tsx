import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  ShoppingBag,
  Share2,
  Store,
  Tent,
  MessageCircle,
  Tag
} from 'lucide-react';
import { SaleTransaction } from '../types';
import { formatRupiah, formatDateTime } from '../utils/formatters';
import { BrandLogo } from './BrandLogo';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: SaleTransaction | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const itemsText = transaction.items
      .map((i, idx) => {
        const name = i.productName || (i as any).product?.name || (i as any).name || 'Produk';
        const unitPrice = i.price ?? (i as any).unitPrice ?? (i as any).product?.priceRetail ?? 0;
        return `${idx + 1}. *${name}*\n   ${i.quantity} pcs x ${formatRupiah(unitPrice)} = ${formatRupiah(i.subtotal)}`;
      })
      .join('\n');

    const channelText = transaction.bazaarName 
      ? `🎪 Bazaar / Event: ${transaction.bazaarName}`
      : transaction.outletName
      ? `🏪 Toko: ${transaction.outletName}`
      : `🛍️ Saluran: ${transaction.salesChannelName || 'AQMARINE Online'}`;

    const text = `*STRUK PEMBELIAN AQMARINE HIJAB & MUKENA*\n${channelText}\n\n*No. Transaksi:* ${transaction.transactionNumber}\n*Tanggal:* ${formatDateTime(transaction.date)}\n*Pelanggan:* ${transaction.customerName}\n\n*Daftar Belanja:*\n${itemsText}\n\n------------------------------\n*Subtotal:* ${formatRupiah(transaction.subtotal)}\n${transaction.discount > 0 ? `*Diskon:* -${formatRupiah(transaction.discount)}\n` : ''}*TOTAL:* *${formatRupiah(transaction.total)}*\n*Metode Bayar:* ${transaction.paymentMethod.toUpperCase()}\n------------------------------\n\nTerima kasih telah berbelanja di AQMARINE! ❤️`;

    const encoded = encodeURIComponent(text);
    const phone = transaction.customerPhone ? transaction.customerPhone.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/${phone.startsWith('0') ? '62' + phone.slice(1) : phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Transaksi Sukses</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Struk Body */}
        <div id="printable-receipt" className="p-6 bg-white space-y-4 text-slate-800 text-xs font-mono">
          
          {/* Boutique Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300 font-sans">
            <div className="flex justify-center mb-1">
              <BrandLogo size="sm" variant="icon-only" />
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-[0.18em] uppercase font-sans">
              AQMARINE
            </h2>
            <p className="text-[11px] text-[#9D6C72] font-bold tracking-wider uppercase">
              Hijab & Mukena Premium
            </p>
            <p className="text-[10px] text-slate-500 font-sans font-medium">
              {transaction.outletName || (transaction.bazaarName ? `Event: ${transaction.bazaarName}` : 'Boutique & Online Store')}
            </p>
          </div>

          {/* Meta Info */}
          <div className="space-y-1 text-[11px] text-slate-600 border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span>No. Transaksi:</span>
              <span className="font-bold text-slate-900">{transaction.transactionNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span>{formatDateTime(transaction.date)}</span>
            </div>
            
            {/* Sales Channel Attribute Badge */}
            <div className="flex justify-between items-center py-0.5">
              <span>Kategori Penjualan:</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                {transaction.salesChannelType === 'toko' && <Store className="w-3 h-3 text-emerald-600" />}
                {transaction.salesChannelType === 'bazaar' && <Tent className="w-3 h-3 text-amber-600" />}
                {transaction.salesChannelType === 'whatsapp' && <MessageCircle className="w-3 h-3 text-green-600" />}
                {transaction.salesChannelType === 'custom' && <Tag className="w-3 h-3 text-[#9D6C72]" />}
                {transaction.salesChannelName || 'Toko Offline'}
              </span>
            </div>

            {transaction.bazaarName && (
              <div className="flex justify-between">
                <span>Nama Bazaar:</span>
                <span className="font-bold text-amber-900">{transaction.bazaarName}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{transaction.cashier}</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span className="font-bold">{transaction.customerName}</span>
            </div>
            {transaction.customerPhone && (
              <div className="flex justify-between">
                <span>No HP / WA:</span>
                <span>{transaction.customerPhone}</span>
              </div>
            )}
            {transaction.notes && (
              <div className="flex justify-between">
                <span>Catatan:</span>
                <span className="italic">{transaction.notes}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2 py-1 border-b border-dashed border-slate-300">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-sans font-bold text-slate-800 text-[11px]">
                  {item.productName || (item as any).product?.name || (item as any).name || 'Produk'}
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>
                    {item.quantity} x {formatRupiah(item.price ?? (item as any).unitPrice ?? (item as any).product?.priceRetail ?? 0)}
                  </span>
                  <span className="font-bold text-slate-900">{formatRupiah(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total & Payment Details */}
          <div className="space-y-1.5 pt-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>

            {transaction.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Diskon:</span>
                <span>-{formatRupiah(transaction.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200 font-sans">
              <span>TOTAL:</span>
              <span className="text-rose-700">{formatRupiah(transaction.total)}</span>
            </div>

            <div className="flex justify-between text-slate-600 pt-1 border-t border-dashed border-slate-200">
              <span>Metode Bayar:</span>
              <span className="font-bold uppercase">{transaction.paymentMethod}</span>
            </div>

            {transaction.paymentMethod === 'cash' && transaction.cashReceived !== undefined && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Tunai Diterima:</span>
                  <span>{formatRupiah(transaction.cashReceived)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(transaction.cashChange || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Struk Footer */}
          <div className="text-center pt-3 border-t border-dashed border-slate-300 font-sans text-[10px] text-slate-400 space-y-0.5">
            <p className="font-bold text-slate-600">Terima kasih telah berbelanja di AQMARINE!</p>
            <p>Barang yang sudah dibeli dapat ditukar maksimal 2 hari beserta struk asli.</p>
            <p className="text-[9px] pt-1">*** SIMPAN STRUK INI SEBAGAI BUKTI PEMBAYARAN ***</p>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
          >
            Tutup
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
              title="Kirim Struk ke WhatsApp Pelanggan"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Kirim WA</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              Cetak Struk
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
