# EQPMGR Roadmap

The running list of where things stand: decisions, what's next, open questions, and what's done. Claude keeps this updated as work happens. Covers both apps:

- **Rider app**: this repo, https://eqpmgr.netlify.app
- **Shop app**: `~/Developer/EQPMGRshop` (repo EQPMGR/EQPMGRshop), shop.eqpmgr.com

Both apps share one Supabase database and one login system.

_Last updated: 2026-10-17_

---

## How the business works (from the pitch)

| Who | What they get | What EQPMGR earns |
|---|---|---|
| Riders | Free digital twin of their bike, wear alerts from Strava, service history | Nothing directly. The user base is the asset. |
| Repair shops | Digital work orders ("tickets"), customers who care about maintenance | $2 per repair ticket activation |
| Rental shops | Paperless fleet tracking, rental tickets with waivers | $2 per rental ticket activation |
| Manufacturers | Real-world failure and modification data | $15 per bike (5-year subscription) |
| Affiliates | Parts and tools sales recommended by the app | Commission |

**In the code:** a ticket is a row in `work_orders`. Manufacturer data comes from `component_replacement_events`, `component_failures` and the stats views.

---

## Decisions

| Date | Decision |
|---|---|
| 2026-10-17 | Once a rider has used a shop, the shop can **view** that bike permanently, but can **change parts only while a work order is open**. |
| 2026-10-17 | New shops must be **manually approved**. We need an **admin team** (more than one admin) who can approve shops, bulk-add bike models, and fix data. |
| 2026-10-17 | Billing was never really set up. **Don't build billing until the pricing model is chosen.** |
| 2026-10-17 | Riders must **accept the Terms & Conditions at signup** (a checkbox). |
| 2026-10-16 | `equipment.user_id` is the only owner column (`app_user_id` removed). |
| 2026-10-16 | Add Bike Model is for all riders, not just admins. |

---

## Phases

### Phase 1: Close the security holes ⏳ in progress
- [x] Rider app: every API route and server action checks who's logged in (PRs #6, #7)
- [x] Rider app: one owner column for bikes (PR #8, migration 013)
- [ ] Shop app: billing endpoint requires the shop's own login
- [ ] Shop app: "replace part" requires a shop login **and** an open work order for that bike
- [ ] Shop app: remove unused, unprotected server actions
- [ ] Database: make component stats server-only (migration 014)

### Phase 2: Make the repair ticket work end to end (first revenue)
- [ ] Rider app: fix work order submission (consent stored as true/false, set `service_provider_auth_uid`, consistent shop IDs)
- [ ] Database: shops can view bikes of customers they've had a work order with (permanent read access)
- [ ] Shop app: rebuild "replace part" on the rider app's logic, so every replacement records an event and a reason (failure, upgrade or modification)
- [ ] Ticket lifecycle that both sides see: New → … → Completed
- [ ] Decide which status counts as a billable "activation"

### Phase 3: Admins, shop approval, consent
- [ ] Admin roles in the database (replace the single-email allowlist)
- [ ] Shop status: pending → approved → suspended. Riders only see approved shops.
- [ ] Admin screens: approve shops, bulk bike-model import, data fixes
- [ ] T&C checkbox at signup, storing which version was accepted and when
- [ ] Anonymized data-sharing consent (see the open question about the terms below)
- [ ] One home for all database changes: move the shop app's migrations into this repo
- [ ] Shop app cleanup: CLAUDE.md, Firebase leftovers, its 42 pre-existing type errors

### Phase 4: Later
- [ ] Billing (once pricing is decided)
- [ ] Shop ratings and reviews
- [ ] Rental tickets with waivers
- [ ] Affiliate part and tool links
- [ ] AI maintenance advisor
- [ ] Rider app cleanup: Firebase packages, old docs, stray files
- [ ] Simplify equipment delete (the database already removes components automatically)

---

## Open questions

1. **Terms vs. data sales.** Section 8 of the alpha terms on eqpmgr.com says rider data is never sold and is used "strictly" to run the app. Selling manufacturer data, even anonymized, needs updated terms and explicit consent first. Talk to a lawyer (BC / PIPEDA) before Phase 3's consent work ships.
2. **Pricing.** $2 per ticket (as pitched), a monthly subscription (what the half-built shop billing code does), or both?
3. **Admin roles.** Which jobs does each admin type do? (A proposal is coming in Phase 3.)
4. **Billable moment.** Which work-order status triggers the $2 charge?

---

## Done log

| Date | What |
|---|---|
| 2026-10-17 | Reviewed the shop app: found unprotected billing and part-replacement endpoints, and a broken work-order handoff (0 work orders ever) |
| 2026-10-16 | Merged the owner columns; applied migration 013 to production |
| 2026-10-16 | Locked down every rider-app server action; moved Add Bike Model out of /admin |
| 2026-10-15 | Committed backlog work, protected the admin API routes, added CLAUDE.md |
