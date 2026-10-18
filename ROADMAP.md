# EQPMGR Roadmap

The running list of where things stand: decisions, what's next, open questions, and what's done. Claude keeps this updated as work happens. Covers both apps:

- **Rider app**: this repo, https://eqpmgr.netlify.app
- **Shop app**: `~/Developer/EQPMGRshop` (repo EQPMGR/EQPMGRshop), shop.eqpmgr.com

Both apps share one Supabase database and one login system.

_Last updated: 2026-10-17_

**Current status:** alpha. The only real accounts are Sage as a rider and Sage as a test shop, so it's safe to test changes live.

---

## Budget and build rules

Running costs: about $50/month (Strava $18, Claude $32). No income or investors yet, so keep everything lean.

- **Netlify free plan:** 300 credits a month, renewing on the 8th. Each **production** deploy (a merge to `main`) costs 15 credits. Deploy previews on PRs don't use credits.
- Both repos' `netlify.toml` files **skip the build automatically** when a merge changes only docs or migrations.
- **Batch app changes:** finish and test locally (`npm run build`), then merge related PRs together so they share one production build. Use `[skip netlify]` in a merge commit message to skip a build deliberately.
- In Netlify's deploy list, a **skipped** build shows as **"Failed"** ("Canceled build due to no content change"). That's normal and costs nothing.
- Credits: 254 on 2026-10-17. The shop's first Git-based production build on 2026-10-17 used about 15, leaving about 239. The rider skips were free.

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

### Phase 1: Close the security holes ✅ done 2026-10-17
- [x] Rider app: every API route and server action checks who's logged in (PRs #6, #7)
- [x] Rider app: one owner column for bikes (PR #8, migration 013)
- [x] Shop app: billing endpoint requires the shop's own login (shop PR #1)
- [x] Shop app: "replace part" requires a shop login **and** an open work order for that bike (shop PR #1)
- [x] Shop app: remove unused, unprotected server actions (shop PR #1)
- [x] Database: make component stats server-only (migration 014, PR #9)

### Phase 2: Make the repair ticket work end to end (first revenue) ✅ shipped 2026-10-17
- [x] Rider app: work order submission fixed. The server looks up the shop and bike, stores consent as true/false, and sets `service_provider_auth_uid`. Shops without a login get a friendly "not taking online bookings yet".
- [x] Database: shops can view a bike (parts and history included) once they've had any work order for it (migration 015)
- [x] One shared "replace part" routine in the database (`replace_component`), used by both apps. It's atomic, archives the old part, logs it, and records replacement events plus failure data, which feed the lifespan stats.
- [x] Shop app: bike page rebuilt on Supabase (it was still using removed Firebase code). Shop log entries go through a guarded server action.
- [x] One status list in both apps: New → Customer Contacted → … → Bike Ready → Completed / Cancelled. The rider's dashboard shows open orders.
- [x] Admin "add shop" form fixed (it was writing a non-existent `name` column; shop IDs are now uuids)
- [x] First real work order created by Sage (rider → test shop) 2026-10-17. Found and fixed: a crash when a shop has no services saved, and Supabase logos not loading.
- [ ] **Sage to finish testing:** As the shop, find the order, open the bike, replace a part, and set status. As the rider, check the bike's log.
- [ ] Decide which status counts as a billable "activation"
- [ ] Notifications (email) when a work order is created or changes status

### Phase 3: Admins, shop approval, consent
- [ ] Admin roles in the database (replace the single-email allowlist)
- [ ] Shop status: pending → approved → suspended. Riders only see approved shops.
- [ ] Admin screens: approve shops, bulk bike-model import, data fixes
- [ ] T&C checkbox at signup, storing which version was accepted and when
- [ ] Anonymized data-sharing consent (see the open question about the terms below)
- [ ] One home for all database changes: move the shop app's migrations into this repo
- [x] Firebase/Google removed from the shop app (2026-10-17)
- [ ] Shop app cleanup: CLAUDE.md, its 21 pre-existing type errors

### Ride-based wear ✅ built 2026-10-18 (migration 016)
- [x] Researched baseline lifespans for every part type, stored in the `wear_baselines` table (road / off-road km, or service hours)
- [x] Every Strava or manual ride is stored once; wear = km ÷ lifespan, ×1.5 for wet rides on rain-sensitive parts, ×1.5 on the drivetrain for e-bikes
- [x] Hills (metres climbed per km, from Strava or entered by hand) and rider weight (from the profile) add wear to the drivetrain and brakes. These multipliers are reasoned estimates, not published data.
- [x] Rain detection from the ride's time and place (WeatherAPI history, about 7 days back), including "rode after it rained"
- [x] Frames, bars, stems, levers and disc-brake rims no longer get fake wear
- [x] Replaced the old wear simulator with a "Log a ride" form
- [ ] Time-based items: tubeless sealant (every 4 months), brake bleed (yearly), suspension lowers service (50 h). Needs a small "service reminders" feature.
- [ ] Weather for rides older than 7 days (Open-Meteo archive, or a paid WeatherAPI plan)
- [ ] Show each part's baseline and remaining km/hours on the part page
- [ ] Later: replace baselines with observed lifespans once enough replacement data exists

### Housekeeping
- [ ] Sage: in Google's consoles, delete the old Firebase project and revoke the Gemini API key (both unused now), and remove any FIREBASE_* or GEMINI_* variables from Netlify's environment settings.
- [ ] Shop app: the bike-fit and add-wheelset dialogs still write to customer bikes from the browser, which the database blocks. Move them to guarded server actions like the log entries.
- [ ] `shop.eqpmgr.com` doesn't resolve (no DNS record). The shop is live at https://eqpmgrshop.netlify.app. The Stripe portal's return URL is hard-coded to shop.eqpmgr.com, so set up DNS before billing goes live.

### Phase 4: Later
- [ ] Billing (once pricing is decided)
- [ ] Shop ratings and reviews
- [ ] Rental tickets with waivers
- [ ] Affiliate part and tool links
- [ ] AI maintenance advisor
- [x] Rider app cleanup: Firebase packages, old docs, stray files (2026-10-17)
- [ ] Simplify equipment delete (the database already removes components automatically)

---

## Open questions

1. **Terms vs. data sales.** Section 8 of the alpha terms on eqpmgr.com says rider data is never sold and is used "strictly" to run the app. Selling manufacturer data, even anonymized, needs updated terms and explicit consent first. **Sage will have a lawyer review the terms before beta.** Nothing to sell yet.
2. **Pricing.** $2 per ticket (as pitched), a monthly subscription (what the half-built shop billing code does), or both?
3. **Admin roles.** Which jobs does each admin type do? (A proposal is coming in Phase 3.)
4. **Billable moment.** Which work-order status triggers the $2 charge?

---

## Done log

| Date | What |
|---|---|
| 2026-10-18 | Ride-based wear: researched baselines, rides table, weather-based wet multiplier for Strava and manual rides (migration 016) |
| 2026-10-17 | Removed every Firebase/Google/Gemini/Genkit dependency, config file and doc from both apps (about 40k lines). Only robots.txt crawler rules mention Google. |
| 2026-10-17 | Phase 2 shipped: work orders connect riders and shops, shared replace routine records field data (migration 015) |
| 2026-10-17 | Shop app's first Git-based production deploy (it had been deployed by drag-and-drop before). Fixed the build-skip rule for sites without a previous build. |
| 2026-10-17 | Phase 1 done: shop billing and part-replacement lockdown, stats made server-only, builds skipped automatically for docs/migration-only changes |
| 2026-10-17 | Reviewed the shop app: found unprotected billing and part-replacement endpoints, and a broken work-order handoff (0 work orders ever) |
| 2026-10-16 | Merged the owner columns; applied migration 013 to production |
| 2026-10-16 | Locked down every rider-app server action; moved Add Bike Model out of /admin |
| 2026-10-15 | Committed backlog work, protected the admin API routes, added CLAUDE.md |
