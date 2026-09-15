begin;

create or replace function public.decode_firestore_value(value jsonb)
returns jsonb language plpgsql immutable as $$
declare result jsonb;
begin
  if value is null then return 'null'::jsonb; end if;
  if value ? 'nullValue' then return 'null'::jsonb; end if;
  if value ? 'stringValue' then return to_jsonb(value->>'stringValue'); end if;
  if value ? 'timestampValue' then return to_jsonb(value->>'timestampValue'); end if;
  if value ? 'integerValue' then return to_jsonb((value->>'integerValue')::numeric); end if;
  if value ? 'doubleValue' then return to_jsonb((value->>'doubleValue')::numeric); end if;
  if value ? 'booleanValue' then return to_jsonb((value->>'booleanValue')::boolean); end if;
  if value ? 'mapValue' then
    select coalesce(jsonb_object_agg(key, public.decode_firestore_value(val)), '{}'::jsonb)
      into result from jsonb_each(coalesce(value#>'{mapValue,fields}', '{}'::jsonb)) as fields(key,val);
    return result;
  end if;
  if value ? 'arrayValue' then
    select coalesce(jsonb_agg(public.decode_firestore_value(val) order by ord), '[]'::jsonb)
      into result from jsonb_array_elements(coalesce(value#>'{arrayValue,values}', '[]'::jsonb)) with ordinality as items(val,ord);
    return result;
  end if;
  return value;
end $$;

create table if not exists public.staff_profiles (
  id text primary key,
  email text not null unique check (email = lower(email)),
  username text not null,
  name text not null,
  role text not null check (role in ('owner','superadmin','admin','gudang','kasir')),
  role_label text,
  outlet_id text,
  outlet_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_documents (
  collection_name text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection_name,id),
  check (collection_name in ('products','transactions','transfers','adjustments','restocks','outlets','salesChannels','bazaars','subCategories'))
);
create index if not exists app_documents_collection_idx on public.app_documents(collection_name);

insert into public.app_documents(collection_name,id,data,created_at,updated_at)
select d.collection_path, d.document_id,
       public.decode_firestore_value(jsonb_build_object('mapValue',jsonb_build_object('fields',d.raw_document->'fields'))) || jsonb_build_object('id',d.document_id),
       coalesce((d.raw_document->>'createTime')::timestamptz,now()),
       coalesce((d.raw_document->>'updateTime')::timestamptz,now())
from aqmarine_backup.documents d
where d.collection_path in ('products','transactions','transfers','adjustments','restocks','outlets','salesChannels','bazaars','subCategories')
on conflict (collection_name,id) do update set data=excluded.data,updated_at=excluded.updated_at;

with decoded as (
  select d.document_id,
    public.decode_firestore_value(jsonb_build_object('mapValue',jsonb_build_object('fields',d.raw_document->'fields'))) as data
  from aqmarine_backup.documents d where d.collection_path='userAccounts'
), ranked as (
  select *, row_number() over (partition by lower(data->>'email') order by
    case data->>'role' when 'owner' then 1 when 'superadmin' then 2 when 'admin' then 3 when 'gudang' then 4 else 5 end,
    document_id) as rn
  from decoded where coalesce(data->>'email','') <> ''
)
insert into public.staff_profiles(id,email,username,name,role,role_label,outlet_id,outlet_name,active)
select document_id,lower(data->>'email'),coalesce(nullif(data->>'username',''),lower(data->>'email')),
       coalesce(nullif(data->>'name',''),lower(data->>'email')),
       case when data->>'role' in ('owner','superadmin','admin','gudang','kasir') then data->>'role' else 'kasir' end,
       coalesce(data->>'roleLabel',data->>'role'),data->>'outletId',data->>'outletName',coalesce((data->>'active')::boolean,true)
from ranked where rn=1
on conflict (email) do update set username=excluded.username,name=excluded.name,role=excluded.role,role_label=excluded.role_label,
  outlet_id=excluded.outlet_id,outlet_name=excluded.outlet_name,active=excluded.active,updated_at=now();

insert into public.app_documents(collection_name,id,data)
select 'products',coalesce(existing.id,'product-'||md5(p.sku)),
  jsonb_strip_nulls(coalesce(existing.data,'{}'::jsonb) || jsonb_build_object(
    'id',coalesce(existing.id,'product-'||md5(p.sku)),'sku',p.sku,'barcode',p.barcode,'name',p.name,'category',p.category,
    'initialStock',p.initial_stock,'incomingStock',p.incoming_stock,'stockToko',p.current_stock,'stockGudang',0,
    'outletStocks',jsonb_build_object('outlet-main',p.current_stock),'stockScope','all_outlets',
    'legacyOutletStocks',existing.data->'outletStocks','minStockAlert',p.min_stock,'hpp',p.hpp,
    'priceRetail',p.retail_price,'priceGrosir',p.wholesale_price,'unit',coalesce(existing.data->>'unit','Pcs'),
    'lastOpnameAt',p.last_stocktake,'updatedAt',now()::text,'migrationSource','inventory_csv_2026-09-14'))
from aqmarine_current.products p
left join lateral (select a.id,a.data from public.app_documents a where a.collection_name='products' and lower(a.data->>'sku')=lower(p.sku) limit 1) existing on true
on conflict (collection_name,id) do update set data=excluded.data,updated_at=now();

insert into public.app_documents(collection_name,id,data)
select 'transactions',coalesce(existing.id,'csv-transaction-'||md5(t.invoice_number)),
  jsonb_strip_nulls(coalesce(existing.data,'{}'::jsonb) || jsonb_build_object(
    'id',coalesce(existing.id,'csv-transaction-'||md5(t.invoice_number)),'transactionNumber',t.invoice_number,
    'date',to_char(t.transacted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items',coalesce(existing.data->'items','[]'::jsonb),'totalItems',t.hijab_items+t.mukena_items,
    'subtotal',t.subtotal,'discountTotal',t.discount,'discount',t.discount,'grandTotal',t.total,'total',t.total,
    'paymentMethod',lower(coalesce(t.payment_method,'other')),'customerName',t.customer_name,'customerPhone',t.customer_phone,
    'cashier',t.cashier,'operator',t.cashier,'salesChannelName',t.sales_channel,'channelName',t.sales_channel,
    'outletName',t.location,'productDetails',t.product_details,'estimatedGrossProfit',t.estimated_gross_profit,
    'migrationSource','transactions_csv_2026-09')))
from aqmarine_current.transactions t
left join lateral (select a.id,a.data from public.app_documents a where a.collection_name='transactions' and a.data->>'transactionNumber'=t.invoice_number limit 1) existing on true
on conflict (collection_name,id) do update set data=excluded.data,updated_at=now();

delete from public.app_documents where collection_name='restocks';
insert into public.app_documents(collection_name,id,data)
select 'restocks',r.id,jsonb_strip_nulls(jsonb_build_object(
  'id',r.id,'restockNumber',r.invoice_number,'date',to_char(r.restocked_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'productId',coalesce(p.id,''),'sku',r.sku,'productName',r.product_name,'quantity',r.quantity,
  'locationId','outlet-main','location','outlet-main','locationName',r.destination,'purchasePrice',r.unit_cost,
  'unitCost',r.unit_cost,'supplier',r.supplier,'invoiceNumber',r.invoice_number,'operator',r.operator,'notes',r.notes,
  'migrationSource','restocks_csv_2026-09-14'))
from aqmarine_current.restocks r
left join lateral (select a.id from public.app_documents a where a.collection_name='products' and lower(a.data->>'sku')=lower(r.sku) limit 1) p on true;

create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select role from public.staff_profiles where active and email=lower(coalesce(auth.jwt()->>'email','')) limit 1
$$;
create or replace function public.is_aqmarine_staff()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select public.current_staff_role() is not null
$$;
create or replace function public.can_operate_collection(collection_name text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select case public.current_staff_role()
    when 'owner' then true when 'superadmin' then true when 'admin' then true
    when 'gudang' then collection_name in ('products','transfers','adjustments','restocks')
    when 'kasir' then collection_name in ('products','transactions') else false end
$$;

alter table public.staff_profiles enable row level security;
alter table public.app_documents enable row level security;
drop policy if exists staff_profiles_read on public.staff_profiles;
create policy staff_profiles_read on public.staff_profiles for select to authenticated
using (email=lower(coalesce(auth.jwt()->>'email','')) or public.current_staff_role() in ('owner','superadmin'));
drop policy if exists staff_profiles_owner_insert on public.staff_profiles;
create policy staff_profiles_owner_insert on public.staff_profiles for insert to authenticated
with check (public.current_staff_role() in ('owner','superadmin'));
drop policy if exists staff_profiles_owner_update on public.staff_profiles;
create policy staff_profiles_owner_update on public.staff_profiles for update to authenticated
using (public.current_staff_role() in ('owner','superadmin') or email=lower(coalesce(auth.jwt()->>'email','')))
with check (public.current_staff_role() in ('owner','superadmin') or email=lower(coalesce(auth.jwt()->>'email','')));
drop policy if exists staff_profiles_owner_delete on public.staff_profiles;
create policy staff_profiles_owner_delete on public.staff_profiles for delete to authenticated
using (public.current_staff_role() in ('owner','superadmin') and email<>lower(coalesce(auth.jwt()->>'email','')));
drop policy if exists app_documents_read on public.app_documents;
create policy app_documents_read on public.app_documents for select to authenticated using (public.is_aqmarine_staff());

create or replace function public.save_aqmarine_document(p_collection text,p_id text,p_data jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_data jsonb; next_data jsonb; stock_key text;
begin
  if public.current_staff_role() not in ('owner','superadmin','admin') then raise exception 'Akses perubahan katalog ditolak'; end if;
  if p_collection not in ('products','outlets','salesChannels','bazaars','subCategories') then raise exception 'Koleksi tidak diizinkan'; end if;
  if coalesce(p_id,'')='' or p_data is null then raise exception 'Dokumen tidak valid'; end if;
  select data into old_data from public.app_documents where collection_name=p_collection and id=p_id for update;
  next_data:=coalesce(old_data,'{}'::jsonb)||p_data||jsonb_build_object('id',p_id);
  if p_collection='products' and old_data is not null then
    foreach stock_key in array array['stockToko','stockGudang','outletStocks','initialStock','incomingStock','lastOpnameAt'] loop
      if old_data ? stock_key then next_data:=jsonb_set(next_data,array[stock_key],old_data->stock_key,true); else next_data:=next_data-stock_key; end if;
    end loop;
  end if;
  insert into public.app_documents(collection_name,id,data) values(p_collection,p_id,next_data)
  on conflict(collection_name,id) do update set data=excluded.data,updated_at=now();
end $$;

create or replace function public.delete_aqmarine_document(p_collection text,p_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.current_staff_role() not in ('owner','superadmin','admin') then raise exception 'Akses penghapusan ditolak'; end if;
  delete from public.app_documents where collection_name=p_collection and id=p_id;
end $$;

create or replace function public.commit_aqmarine_documents(p_writes jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; current_data jsonb; exists_now boolean; staff_role text;
begin
  staff_role:=public.current_staff_role();
  if staff_role is null then raise exception 'Akun tidak memiliki akses'; end if;
  if jsonb_typeof(p_writes)<>'array' or jsonb_array_length(p_writes)=0 then raise exception 'Daftar perubahan tidak valid'; end if;
  for item in select value from jsonb_array_elements(p_writes) order by value->>'collection',value->>'id' loop
    if not public.can_operate_collection(item->>'collection') then raise exception 'Peran tidak boleh mengubah koleksi %',item->>'collection'; end if;
    if coalesce(item->>'id','')='' or item->'data' is null then raise exception 'Dokumen tidak valid'; end if;
    select data,true into current_data,exists_now from public.app_documents
      where collection_name=item->>'collection' and id=item->>'id' for update;
    exists_now:=coalesce(exists_now,false);
    if (item->'expected')='null'::jsonb and exists_now then raise exception 'Data telah dibuat perangkat lain. Muat ulang.'; end if;
    if (item->'expected')<>'null'::jsonb and (not exists_now or current_data is distinct from item->'expected') then
      raise exception 'Data berubah di perangkat lain. Muat ulang sebelum mencoba lagi.';
    end if;
    if staff_role in ('kasir','gudang') and item->>'collection'='products' and exists_now and
      (current_data-array['stockToko','stockGudang','outletStocks','initialStock','incomingStock','lastOpnameAt','hpp','updatedAt']) is distinct from
      ((item->'data')-array['stockToko','stockGudang','outletStocks','initialStock','incomingStock','lastOpnameAt','hpp','updatedAt'])
      then raise exception 'Peran operasional hanya boleh mengubah nilai stok'; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_writes) loop
    insert into public.app_documents(collection_name,id,data) values(item->>'collection',item->>'id',(item->'data')||jsonb_build_object('id',item->>'id'))
    on conflict(collection_name,id) do update set data=excluded.data,updated_at=now();
  end loop;
end $$;

revoke all on function public.decode_firestore_value(jsonb) from public,anon,authenticated;
revoke all on function public.current_staff_role() from public,anon;
revoke all on function public.is_aqmarine_staff() from public,anon;
revoke all on function public.can_operate_collection(text) from public,anon;
revoke all on function public.save_aqmarine_document(text,text,jsonb) from public,anon;
revoke all on function public.delete_aqmarine_document(text,text) from public,anon;
revoke all on function public.commit_aqmarine_documents(jsonb) from public,anon;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_aqmarine_staff() to authenticated;
grant execute on function public.can_operate_collection(text) to authenticated;
grant execute on function public.save_aqmarine_document(text,text,jsonb) to authenticated;
grant execute on function public.delete_aqmarine_document(text,text) to authenticated;
grant execute on function public.commit_aqmarine_documents(jsonb) to authenticated;
grant select on public.app_documents to authenticated;
grant select,insert,update,delete on public.staff_profiles to authenticated;
revoke all on public.app_documents from anon;
revoke all on public.staff_profiles from anon;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_documents') then
    alter publication supabase_realtime add table public.app_documents;
  end if;
end $$;

commit;

select collection_name,count(*) as documents from public.app_documents group by collection_name order by collection_name;
