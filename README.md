# EQPMGR

A maintenance "digital twin" for performance bikes. Riders track bikes and components, wear is estimated from Strava rides, and riders can book service with shops that use the companion shop app.

- **Stack:** Next.js 15 (App Router), TypeScript, Supabase (Postgres, Auth, Storage), Tailwind and Radix UI, hosted on Netlify
- **Live:** https://eqpmgr.netlify.app
- **Shop app:** `EQPMGR/EQPMGRshop`, which shares the same Supabase database

## Local development

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3007
```

Copy `.env.example` to `.env.local` and fill in the Supabase and Strava values.

## Docs

- `ROADMAP.md`: decisions, phases, open questions and what's done
- `CLAUDE.md`: architecture notes and rules for working in this codebase
- `supabase/migrations/`: database schema and security rules (applies to both apps)
