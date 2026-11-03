-- Go-live rules for shops (ROADMAP decisions 2026-10-17 and 2026-10-25):
--   * new shops must be approved by an admin before riders can see them;
--   * a shop accepts the billing terms (C$2 per Service Ticket) when it adds a card;
--   * riders only see, and can only send work orders to, shops that are
--     approved and have a working card (billing status active or past_due).
-- Like the rest of shop_billing, these columns are written only by the service role.

alter table shop_billing
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

-- Shops that existed before approvals were introduced are approved.
insert into shop_billing (shop_id) select id from service_providers on conflict do nothing;
update shop_billing set approved_at = now() where approved_at is null;

-- Can riders send this shop work orders right now?
create or replace function public.shop_accepts_work_orders(p_shop_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from shop_billing
    where shop_id = p_shop_id and approved_at is not null and status in ('active', 'past_due')
  );
$$;
revoke all on function public.shop_accepts_work_orders(text) from public, anon, authenticated;

-- Every new work order is a Service Ticket for its shop. Shops that aren't
-- approved, have no card, or are paused can't receive work orders.
create or replace function public.work_order_billing_ticket()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_shop text := coalesce(new.service_provider_id::text, new.service_provider_auth_uid::text);
  v_billing shop_billing%rowtype;
  v_free boolean := false;
begin
  if v_shop is null or not exists (select 1 from service_providers where id = v_shop) then
    return new;
  end if;

  insert into shop_billing (shop_id) values (v_shop) on conflict do nothing;
  select * into v_billing from shop_billing where shop_id = v_shop for update;

  if v_billing.status = 'paused' then
    raise exception 'SHOP_PAUSED' using hint = 'This shop is not taking new work orders right now.';
  end if;
  if v_billing.approved_at is null or v_billing.status not in ('active', 'past_due') then
    raise exception 'SHOP_NOT_ACCEPTING' using hint = 'This shop is not taking online requests yet.';
  end if;

  if v_billing.free_tickets_remaining > 0 then
    update shop_billing set free_tickets_remaining = free_tickets_remaining - 1, updated_at = now()
    where shop_id = v_shop;
    v_free := true;
  end if;

  insert into billing_tickets (work_order_id, shop_id, kind, free)
  values (new.id, v_shop, 'service', v_free);
  return new;
end;
$$;
revoke all on function public.work_order_billing_ticket() from public, anon, authenticated;
