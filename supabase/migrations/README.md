# Supabase Migrations — EQPMGR

This folder contains idempotent SQL migrations for the EQPMGR project. The first migration (`001_create_core_tables.sql`) creates core domain tables used by the app and sensible default RLS policies.

What this migration does
- Enables useful extensions: `pgcrypto` and `pgvector` (if available).
- Creates user-scoped tables: `equipment`, `components`, `work_orders`.
- Creates catalog/public tables: `master_components`, `bike_models`, `service_providers`.
- Adds helper tables: `counters`, `ignored_duplicates`, `_health_check`.
- Adds indexes, grants for the `authenticated` role, `updated_at` trigger, and RLS policies that scope rows to `auth.uid()`.

Important notes and decisions
- Column naming uses snake_case to match the Supabase/PostgREST convention and the adapter's key transformation.
- `master_components.embedding` is created as `real[]` (flexible). If you'd rather use `pgvector`, update the column type to `vector(<dim>)` and create an ivfflat or hnsw index for faster similarity search.

Note: The migration attempts to create the `pgvector` extension but will not fail if the extension binaries are not installed on your Postgres server. If `pgvector` is unavailable, the migration will continue and `embedding` will remain `real[]`. To enable `pgvector` later, install the extension on the DB host (or request Supabase support) and then ALTER the column to `vector(<dim>)` and create an index.
- RLS policies assume `service_provider_auth_uid` is populated in `work_orders` when a service provider is the recipient of a work order; policies allow service providers to modify equipment/components while a matching work order is in status `pending`, `accepted`, or `in-progress`.
- The migration is idempotent (uses `IF NOT EXISTS` and guards), safe to re-run against the same DB.

How to apply

1) Locally with the Supabase CLI (recommended for local development):

```bash
# From the repo root
supabase db remote set <YOUR_REMOTE_DB_URL>   # optional: set remote if not using local
supabase db push -f supabase/migrations/001_create_core_tables.sql
```

2) Via Supabase SQL Editor (Dashboard):
- Open your Supabase project → SQL → New query.
- Paste the contents of `001_create_core_tables.sql` and run it. Review statements before running.

3) If you prefer a migration runner (git-based migrations), copy the SQL into your preferred migration system and apply.

After applying
- Verify `equipment`, `components`, and `master_components` exist with the expected columns.
- If you use `pgvector` and want to convert the `embedding` column, run an ALTER TABLE to change the type and create a vector index.

If you want me to run this migration now against your local dev Postgres (per `supabase/config.toml`) I can do so — confirm whether to run them locally, or provide the remote DB URL/credentials for applying to a remote project. I will not apply to a remote/production DB without explicit confirmation.
