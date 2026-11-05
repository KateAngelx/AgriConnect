alter table product_reviews
  add column if not exists moderation_status text not null default 'published';

alter table product_reviews
  drop constraint if exists product_reviews_moderation_status_check;

alter table product_reviews
  add constraint product_reviews_moderation_status_check
  check (moderation_status in ('published', 'hidden', 'removed'));

create table if not exists product_review_moderation (
  review_id text primary key,
  moderation_history jsonb not null default '[]'::jsonb
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_reviews'
      and column_name = 'moderation_history'
  ) then
    execute $migration$
      insert into product_review_moderation (review_id, moderation_history)
      select id, coalesce(moderation_history, '[]'::jsonb)
      from product_reviews
      where case
        when jsonb_typeof(moderation_history) = 'array'
          then jsonb_array_length(moderation_history) > 0
        else false
      end
      on conflict (review_id) do update
      set moderation_history = excluded.moderation_history
    $migration$;
    alter table product_reviews drop column moderation_history;
  end if;
end
$$;

alter table product_review_moderation enable row level security;
revoke all on product_review_moderation from public, anon, authenticated;
grant select, insert, update, delete on product_review_moderation to service_role;

drop policy if exists "public read reviews for active products" on product_reviews;
create policy "public read reviews for active products" on product_reviews for select using (
  moderation_status = 'published'
  and exists (
    select 1
    from products
    join sellers on sellers.id = products.seller_id
    where products.id = product_reviews.product_id
      and products.status = 'active'
      and sellers.status = 'approved'
  )
);
