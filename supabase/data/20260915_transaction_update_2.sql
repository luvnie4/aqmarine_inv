begin;

insert into aqmarine_current.transactions (
  invoice_number, transacted_at, sales_channel, location, product_categories,
  hijab_items, mukena_items, product_details, customer_name, customer_phone,
  cashier, payment_method, subtotal, discount, total,
  estimated_gross_profit, raw_csv
)
values (
  'INV-260914-2976',
  '2026-09-14T03:00:00.000Z'::timestamptz,
  'Bazaar & Event',
  'Bazaar Ultah RSHS',
  'Hijab, Mukena',
  15,
  2,
  $txt$Hijab Motif premium Standart (4 pcs); Hijab Arabian voal standart (3 pcs); Hijab Paris viena (5 pcs); Hijab Motif medium (2 pcs); Hijab Arabian voal syar'i (1 pcs); Mukena travel polos (1 pcs); Mukena travel motif (1 pcs)$txt$,
  'Pelanggan Umum',
  null,
  'Irma Suryani',
  'qris',
  2180000,
  10000,
  2170000,
  1051000,
  $json$ {
    "No Transaksi": "INV-260914-2976",
    "Tanggal": "2026-09-14T03:00:00.000Z",
    "Saluran Penjualan": "Bazaar & Event",
    "Detail Outlet / Event": "Bazaar Ultah RSHS",
    "Kategori Produk": "Hijab, Mukena",
    "Item Hijab (pcs)": "15",
    "Item Mukena (pcs)": "2",
    "Rincian Produk": "Hijab Motif premium Standart (4 pcs); Hijab Arabian voal standart (3 pcs); Hijab Paris viena (5 pcs); Hijab Motif medium (2 pcs); Hijab Arabian voal syar'i (1 pcs); Mukena travel polos (1 pcs); Mukena travel motif (1 pcs)",
    "Pelanggan": "Pelanggan Umum",
    "No WA": "-",
    "Kasir": "Irma Suryani",
    "Metode Bayar": "qris",
    "Subtotal": "2180000",
    "Diskon": "10000",
    "Total Akhir": "2170000",
    "Estimasi Laba Kotor": "1051000"
  } $json$::jsonb
)
on conflict (invoice_number) do update set
  transacted_at = excluded.transacted_at,
  sales_channel = excluded.sales_channel,
  location = excluded.location,
  product_categories = excluded.product_categories,
  hijab_items = excluded.hijab_items,
  mukena_items = excluded.mukena_items,
  product_details = excluded.product_details,
  customer_name = excluded.customer_name,
  customer_phone = excluded.customer_phone,
  cashier = excluded.cashier,
  payment_method = excluded.payment_method,
  subtotal = excluded.subtotal,
  discount = excluded.discount,
  total = excluded.total,
  estimated_gross_profit = excluded.estimated_gross_profit,
  raw_csv = excluded.raw_csv;

insert into public.app_documents (collection_name, id, data, updated_at)
values (
  'transactions',
  'csv-transaction-2af5168a23f1ae8afd2e7338fe2fd357',
  $json$ {
    "id": "csv-transaction-2af5168a23f1ae8afd2e7338fe2fd357",
    "date": "2026-09-14T03:00:00.000Z",
    "items": [],
    "total": 2170000,
    "cashier": "Irma Suryani",
    "discount": 10000,
    "operator": "Irma Suryani",
    "subtotal": 2180000,
    "grandTotal": 2170000,
    "outletName": "Bazaar Ultah RSHS",
    "outletId": "outlet-main",
    "stockDeductedOutletId": "outlet-main",
    "stockDeductedLocationName": "Toko Utama AQMARINE",
    "bazaarName": "Bazaar Ultah RSHS",
    "totalItems": 17,
    "channelName": "Bazaar & Event",
    "customerName": "Pelanggan Umum",
    "discountTotal": 10000,
    "paymentMethod": "qris",
    "productDetails": "Hijab Motif premium Standart (4 pcs); Hijab Arabian voal standart (3 pcs); Hijab Paris viena (5 pcs); Hijab Motif medium (2 pcs); Hijab Arabian voal syar'i (1 pcs); Mukena travel polos (1 pcs); Mukena travel motif (1 pcs)",
    "migrationSource": "transactions_csv_2026-09-update-2",
    "salesChannelName": "Bazaar & Event",
    "transactionNumber": "INV-260914-2976",
    "estimatedGrossProfit": 1051000
  } $json$::jsonb,
  now()
)
on conflict (collection_name, id) do update set
  data = excluded.data || jsonb_build_object(
    'items', coalesce(public.app_documents.data->'items', excluded.data->'items'),
    'stockAppliedAt', public.app_documents.data->'stockAppliedAt'
  ),
  updated_at = now();

-- The inventory snapshot already included the first 24 transactions (61 pcs).
-- Apply only the 17 pcs from this newly appended transaction, exactly once.
do $$
declare affected integer;
begin
  if not exists (
    select 1 from public.app_documents
    where collection_name='transactions'
      and id='csv-transaction-2af5168a23f1ae8afd2e7338fe2fd357'
      and data->>'stockAppliedAt' is not null
  ) then
    if exists (
      select 1
      from public.app_documents product
      join (values
        ('prod-1787993467611',4), ('prod-1787992932925',3),
        ('prod-1787992653311',5), ('prod-1787993334527',2),
        ('prod-1787993041668',1), ('prod-1787992384303',1),
        ('prod-1787992145034',1)
      ) as delta(id,qty) on delta.id=product.id
      where product.collection_name='products'
        and coalesce((product.data->'outletStocks'->>'outlet-main')::integer,(product.data->>'stockToko')::integer,0) < delta.qty
    ) then
      raise exception 'Stok tidak cukup untuk menerapkan transaksi INV-260914-2976';
    end if;

    update public.app_documents product
    set data=jsonb_set(
      jsonb_set(product.data,'{stockToko}',to_jsonb((product.data->>'stockToko')::integer-delta.qty),true),
      '{outletStocks,outlet-main}',
      to_jsonb(coalesce((product.data->'outletStocks'->>'outlet-main')::integer,(product.data->>'stockToko')::integer)-delta.qty),
      true
    ), updated_at=now()
    from (values
      ('prod-1787993467611',4), ('prod-1787992932925',3),
      ('prod-1787992653311',5), ('prod-1787993334527',2),
      ('prod-1787993041668',1), ('prod-1787992384303',1),
      ('prod-1787992145034',1)
    ) as delta(id,qty)
    where product.collection_name='products' and product.id=delta.id;

    get diagnostics affected=row_count;
    if affected<>7 then raise exception 'Katalog transaksi tidak lengkap: % dari 7 produk ditemukan',affected; end if;

    update public.app_documents
    set data=jsonb_set(data,'{stockAppliedAt}',to_jsonb(now()::text),true),updated_at=now()
    where collection_name='transactions' and id='csv-transaction-2af5168a23f1ae8afd2e7338fe2fd357';
  end if;
end $$;

commit;
