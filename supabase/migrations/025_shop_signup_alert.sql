-- Migration 025: remember when EQPMGR was emailed about a new shop.
--
-- When a shop finishes signing up, the shop app emails an EQPMGR inbox so an
-- admin knows to approve it (Admin -> Shop approvals). This marker makes that
-- one email per shop, even if the signup page is submitted again.
-- shop_billing is written only by the service role; shops can read their own row.

alter table shop_billing add column if not exists signup_alert_sent_at timestamptz;

-- Shops that already exist were seen in Admin; don't alert about them.
update shop_billing set signup_alert_sent_at = now()
  where signup_alert_sent_at is null;
