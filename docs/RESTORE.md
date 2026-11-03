# Restoring the database from a nightly backup

Backups are made every night by `.github/workflows/db-backup.yml` and kept for 30 days
(GitHub → EQPMGR repo → Actions → "Nightly database backup" → a run → Artifacts).
Each is encrypted with the `BACKUP_PASSPHRASE` secret: without that passphrase, a backup can't be opened.

1. Download the artifact (a zip containing `eqpmgr-db-YYYY-MM-DD.tar.gz.gpg`) and unzip it.
2. Decrypt and unpack:

   ```bash
   gpg --decrypt eqpmgr-db-YYYY-MM-DD.tar.gz.gpg > backup.tar.gz && tar -xzf backup.tar.gz
   ```

   This gives `roles.sql`, `schema.sql` and `data.sql`.
3. Restore into a **new, empty** Supabase project (never on top of the live one), using its
   session pooler connection string:

   ```bash
   psql "$NEW_DB_URL" --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql
   ```

4. Point both apps' `NEXT_PUBLIC_SUPABASE_URL`, anon and service-role keys (Netlify and `.env.local`)
   at the new project, redeploy, and check sign-in and a bike page.

This follows Supabase's guide "Backup and restore using the CLI". Practise once on a scratch project
before you ever need it for real.
