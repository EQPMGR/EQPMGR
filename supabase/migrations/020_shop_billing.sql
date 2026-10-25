-- Shop billing (pricing decided 2026-10-25, see ROADMAP.md):
--   C$2 per Service Ticket, charged when a work order is created; billed monthly
--   by the shop app (Stripe). Promo codes give free tickets (FIRST10 = 10).
--   Failed payment: 5-day grace, then the shop is paused (no new work orders).
--
-- Billing state lives here, not on service_providers: shops can edit their own
-- service_providers row (RLS), so anything a shop must not change (status,
-- free tickets, Stripe customer) is in tables only the service role writes.

create table if not exists shop_billing (
  shop_id text primary key references service_providers(id) on delete cascade,
  status text not null default 'setup_needed'
    check (status in ('setup_needed', 'active', 'past_due', 'paused')),
  stripe_customer_id text unique,
  free_tickets_remaining int not null default 0 check (free_tickets_remaining >= 0),
  promo_code text,
  grace_until timestamptz,          -- past_due: new work orders pause after this
  open_invoice_url text,            -- Stripe page where the shop can pay a failed invoice
  updated_at timestamptz not null default now()
);

create table if not exists billing_tickets (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid unique references work_orders(id) on delete set null,
  shop_id text not null references service_providers(id) on delete cascade,
  kind text not null default 'service' check (kind in ('service', 'rental')),
  free boolean not null default false,       -- covered by a promo credit
  created_at timestamptz not null default now(),
  voided_at timestamptz,                     -- admin voided (junk ticket); never billed
  void_reason text,
  stripe_invoice_id text,                    -- set once billed ('free' when nothing was owed)
  billed_at timestamptz
);
create index if not exists billing_tickets_unbilled_idx on billing_tickets (shop_id, created_at)
  where stripe_invoice_id is null and voided_at is null;

create table if not exists promo_codes (
  code text primary key,            -- stored upper-case
  free_tickets int not null check (free_tickets > 0),
  active boolean not null default true,
  max_redemptions int,              -- null = unlimited
  redemptions int not null default 0,
  created_at timestamptz not null default now()
);
insert into promo_codes (code, free_tickets) values ('FIRST10', 10) on conflict do nothing;

-- Carry over Stripe customers created by the old billing code.
insert into shop_billing (shop_id, stripe_customer_id)
select id, stripe_customer_id from service_providers
where stripe_customer_id is not null
on conflict do nothing;

alter table shop_billing enable row level security;
alter table billing_tickets enable row level security;
alter table promo_codes enable row level security;
revoke all on shop_billing, billing_tickets, promo_codes from anon, authenticated;
grant select on shop_billing, billing_tickets to authenticated;

drop policy if exists shop_billing_select_own on shop_billing;
create policy shop_billing_select_own on shop_billing for select to authenticated
  using (shop_id = auth.uid()::text);
drop policy if exists billing_tickets_select_own on billing_tickets;
create policy billing_tickets_select_own on billing_tickets for select to authenticated
  using (shop_id = auth.uid()::text);

-- Every new work order is a Service Ticket for its shop. A paused shop can't
-- receive new work orders (the insert fails with SHOP_PAUSED).
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

drop trigger if exists work_orders_billing_ticket on work_orders;
create trigger work_orders_billing_ticket after insert on work_orders
  for each row execute function public.work_order_billing_ticket();

-- One promo code per shop. Returns the shop's free tickets after redeeming.
create or replace function public.redeem_promo_code(p_shop_id text, p_code text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_promo promo_codes%rowtype;
  v_left int;
begin
  insert into shop_billing (shop_id) values (p_shop_id) on conflict do nothing;
  if exists (select 1 from shop_billing where shop_id = p_shop_id and promo_code is not null) then
    raise exception 'PROMO_ALREADY_USED';
  end if;

  select * into v_promo from promo_codes where code = upper(trim(p_code)) for update;
  if not found or not v_promo.active
     or (v_promo.max_redemptions is not null and v_promo.redemptions >= v_promo.max_redemptions) then
    raise exception 'PROMO_INVALID';
  end if;

  update promo_codes set redemptions = redemptions + 1 where code = v_promo.code;
  update shop_billing
    set free_tickets_remaining = free_tickets_remaining + v_promo.free_tickets,
        promo_code = v_promo.code, updated_at = now()
    where shop_id = p_shop_id
    returning free_tickets_remaining into v_left;
  return v_left;
end;
$$;

-- Admin: void a junk ticket before it's billed. A free ticket gives its credit back.
create or replace function public.void_billing_ticket(p_ticket_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_ticket billing_tickets%rowtype;
begin
  select * into v_ticket from billing_tickets where id = p_ticket_id for update;
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;
  if v_ticket.stripe_invoice_id is not null then raise exception 'TICKET_ALREADY_BILLED'; end if;
  if v_ticket.voided_at is not null then return; end if;

  update billing_tickets set voided_at = now(), void_reason = p_reason where id = p_ticket_id;
  if v_ticket.free then
    update shop_billing set free_tickets_remaining = free_tickets_remaining + 1, updated_at = now()
    where shop_id = v_ticket.shop_id;
  end if;
end;
$$;

-- Billing periods are calendar months in Vancouver time; tickets before this
-- moment belong to past months and are ready to bill.
create or replace function public.billing_cutoff()
returns timestamptz language sql stable as $$
  select date_trunc('month', now() at time zone 'America/Vancouver') at time zone 'America/Vancouver';
$$;

revoke all on function public.redeem_promo_code(text, text) from public, anon, authenticated;
revoke all on function public.void_billing_ticket(uuid, text) from public, anon, authenticated;
revoke all on function public.work_order_billing_ticket() from public, anon, authenticated;
