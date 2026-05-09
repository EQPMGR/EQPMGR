# Local Supabase Development Environment Setup

## Overview

This project now uses **Supabase** as its backend (Firebase has been removed). For local development, everything runs in Docker with:

- **PostgreSQL** database for data persistence
- **PostgREST** for REST API (auto-generated from your database schema)
- **Realtime** service for WebSockets/subscriptions
- **Kong** API Gateway to route requests
- **Redis** for caching
- **Next.js** development server on `localhost:3006`

## Quick Start

### 1. Copy Environment File

```bash
cp .env.docker .env
```

### 2. Start Everything

```bash
docker-compose -f docker-compose.supabase.yml up -d
```

This starts all services. Wait 10-15 seconds for everything to initialize.

### 3. View Logs

```bash
# View all logs
docker-compose -f docker-compose.supabase.yml logs -f

# View specific service
docker-compose -f docker-compose.supabase.yml logs -f app
```

### 4. Access Your App

Visit **http://localhost:3006** and you should see the app with:
- ✅ Mock auth enabled (auto-logged in as `sage@printshop.local`)
- ✅ Database connection to local PostgreSQL
- ✅ All data saved locally in Docker

## Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| Next.js App | 3006 | Main application |
| Kong Gateway | 8000 | API entry point |
| PostgREST | 3001 | REST API |
| Realtime | 4000 | WebSocket subscriptions |
| PostgreSQL | 5433 | Database |
| Redis | 6380 | Caching |

## Database URL

```
postgresql://postgres:postgres@postgres:5432/postgres
```

Access within Docker: Use `postgres:5432`
Access from host: Use `localhost:5433`

## Common Tasks

### Check if services are healthy

```bash
docker-compose -f docker-compose.supabase.yml ps
```

### Stop everything

```bash
docker-compose -f docker-compose.supabase.yml down
```

### Stop and delete all data (fresh start)

```bash
docker-compose -f docker-compose.supabase.yml down -v
docker-compose -f docker-compose.supabase.yml up -d
```

### View database directly

```bash
psql postgresql://postgres:postgres@localhost:5433/postgres
```

### Rebuild after code changes

```bash
docker-compose -f docker-compose.supabase.yml build app
docker-compose -f docker-compose.supabase.yml up -d app
```

## What Changed from Firebase

### Removed:
- ✅ All Firebase authentication code
- ✅ Firebase storage code  
- ✅ Firebase library dependencies
- ✅ Firebase config files

### Kept:
- ✅ Strava integration
- ✅ MapMyRide integration  
- ✅ AI references (placeholder for later implementation)
- ✅ All UI components and business logic

### Added:
- ✅ Local Supabase stack
- ✅ Mock auth (dev convenience)
- ✅ Kong API gateway
- ✅ PostgREST API
- ✅ Realtime WebSocket support

## Database Schema

The database schema is defined in the Supabase migrations. When the services start, they initialize with the schema from:

```
supabase/migrations/001_initial_schema.sql
```

To apply migrations manually:

```bash
# Connect to database
psql postgresql://postgres:postgres@localhost:5433/postgres

# Run migration file
\i supabase/migrations/001_initial_schema.sql
```

## Troubleshooting

### Kong not connecting to services

Wait 10-15 seconds after startup. Kong needs time to discover PostgREST and Realtime.

### PostgreSQL won't start

```bash
docker-compose -f docker-compose.supabase.yml down -v
docker-compose -f docker-compose.supabase.yml up -d postgres
```

### Port already in use

Change ports in `docker-compose.supabase.yml`:
- App: Change `3006:3000` to `3007:3000`
- Kong: Change `8000:8000` to `8001:8000`
- etc.

### Can't connect to database

Verify PostgreSQL is healthy:

```bash
docker-compose -f docker-compose.supabase.yml logs postgres
```

### App not updating after code changes

Restart the app service:

```bash
docker-compose -f docker-compose.supabase.yml restart app
```

## Going to Production

When ready to deploy:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Update `.env` variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
3. No code changes needed—it works identically!
4. Run database migrations on Supabase (via dashboard or CLI)
5. Deploy to Netlify/Vercel

## Next Steps

- [ ] Test data persistence (enter profile info, refresh app)
- [ ] Review Supabase migrations: `supabase/migrations/`
- [ ] Implement AI features with placeholders
- [ ] Add any missing features from original Firebase version
- [ ] Plan migration to cloud Supabase

---

For questions or issues, check the main README.md or SUPABASE_SETUP.md
