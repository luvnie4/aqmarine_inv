begin;

create or replace function public.commit_aqmarine_documents(p_writes jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; current_data jsonb; exists_now boolean; staff_role text; delete_item boolean;
begin
  staff_role:=public.current_staff_role();
  if staff_role is null then raise exception 'Akun tidak memiliki akses'; end if;
  if jsonb_typeof(p_writes)<>'array' or jsonb_array_length(p_writes)=0 then raise exception 'Daftar perubahan tidak valid'; end if;

  for item in select value from jsonb_array_elements(p_writes) order by value->>'collection',value->>'id' loop
    if not public.can_operate_collection(item->>'collection') then raise exception 'Peran tidak boleh mengubah koleksi %',item->>'collection'; end if;
    delete_item:=coalesce((item->>'delete')::boolean,false);
    if coalesce(item->>'id','')='' or (not delete_item and coalesce(jsonb_typeof(item->'data'),'null')='null') then raise exception 'Dokumen tidak valid'; end if;
    select data,true into current_data,exists_now from public.app_documents
      where collection_name=item->>'collection' and id=item->>'id' for update;
    exists_now:=coalesce(exists_now,false);
    if (item->'expected')='null'::jsonb and exists_now then raise exception 'Data telah dibuat perangkat lain. Muat ulang.'; end if;
    if (item->'expected')<>'null'::jsonb and (not exists_now or current_data is distinct from item->'expected') then
      raise exception 'Data berubah di perangkat lain. Muat ulang sebelum mencoba lagi.';
    end if;
    if delete_item and not exists_now then raise exception 'Data sudah dihapus perangkat lain. Muat ulang.'; end if;
    if not delete_item and staff_role in ('kasir','gudang') and item->>'collection'='products' and exists_now and
      (current_data-array['stockToko','stockGudang','outletStocks','initialStock','incomingStock','lastOpnameAt','hpp','updatedAt']) is distinct from
      ((item->'data')-array['stockToko','stockGudang','outletStocks','initialStock','incomingStock','lastOpnameAt','hpp','updatedAt'])
      then raise exception 'Peran operasional hanya boleh mengubah nilai stok'; end if;
  end loop;

  for item in select value from jsonb_array_elements(p_writes) loop
    if coalesce((item->>'delete')::boolean,false) then
      delete from public.app_documents where collection_name=item->>'collection' and id=item->>'id';
    else
      insert into public.app_documents(collection_name,id,data) values(item->>'collection',item->>'id',(item->'data')||jsonb_build_object('id',item->>'id'))
      on conflict(collection_name,id) do update set data=excluded.data,updated_at=now();
    end if;
  end loop;
end $$;

revoke all on function public.commit_aqmarine_documents(jsonb) from public,anon;
grant execute on function public.commit_aqmarine_documents(jsonb) to authenticated;

create or replace function public.delete_aqmarine_document(p_collection text,p_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if public.current_staff_role() not in ('owner','superadmin','admin') then raise exception 'Akses penghapusan ditolak'; end if;
  if p_collection='products' and (
    exists(select 1 from public.app_documents d where d.collection_name in ('transfers','adjustments','restocks') and d.data->>'productId'=p_id)
    or exists(select 1 from public.app_documents d cross join lateral jsonb_array_elements(coalesce(d.data->'items','[]'::jsonb)) item where d.collection_name='transactions' and coalesce(item->>'productId',item->'product'->>'id')=p_id)
  ) then raise exception 'Produk memiliki riwayat dan tidak dapat dihapus'; end if;
  if p_collection='outlets' and (
    exists(select 1 from public.app_documents d where d.collection_name='products' and coalesce((d.data->'outletStocks'->>p_id)::numeric,0)<>0)
    or exists(select 1 from public.app_documents d where d.collection_name in ('transactions','transfers','adjustments','restocks') and (d.data->>'outletId'=p_id or d.data->>'stockDeductedOutletId'=p_id or d.data->>'locationId'=p_id or d.data->>'location'=p_id or d.data->>'fromLocation'=p_id or d.data->>'toLocation'=p_id))
  ) then raise exception 'Outlet masih memiliki stok atau riwayat dan tidak dapat dihapus'; end if;
  delete from public.app_documents where collection_name=p_collection and id=p_id;
end $$;

revoke all on function public.delete_aqmarine_document(text,text) from public,anon;
grant execute on function public.delete_aqmarine_document(text,text) to authenticated;

commit;
