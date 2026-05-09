# Local Development with Docker

Get your entire development environment running in Docker with one command!

## Prerequisites

- Docker installed ([download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (usually comes with Docker Desktop)

## Quick Start

### Step 1: Set Up Environment

```bash
# Copy the Docker environment file to .env
cp .env.docker .env
```

### Step 2: Start Everything

```bash
# Start the database, app, and services
docker-compose -f docker-compose.local.yml up -d

# Watch the logs in real-time (optional)
docker-compose -f docker-compose.local.yml logs -f app
```

That's it! Docker will:
- ✅ Create a PostgreSQL database
- ✅ Start your Next.js app in development mode with hot reload
- ✅ Set up all networking automatically
- ✅ Mount your code for live updates

### Step 3: Open Your App

Visit **http://localhost:3000** and you're ready to sign up!

### Step 4: Create a Test Account

1. Click "Create Account" tab
2. Enter any email: `test@example.com`
3. Set a password: `Password123`
4. Sign up!

You should see a success message. Your account is stored in the local Postgres database inside Docker.

### Step 5: Sign In

Use the credentials you just created to sign in.

---

## Common Commands

```bash
# Start all services
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f

# View app logs specifically
docker-compose -f docker-compose.local.yml logs -f app

# Stop everything
docker-compose -f docker-compose.local.yml down

# Stop and clear data (fresh start)
docker-compose -f docker-compose.local.yml down -v

# Rebuild after code changes
docker-compose -f docker-compose.local.yml build
```

---

## Troubleshooting

### "Port 3000 already in use"
Change the port in `docker-compose.local.yml`:
```yaml
ports:
  - "3001:3000"  # Use 3001 instead
```

### "Cannot connect to Docker daemon"
Make sure Docker Desktop is running on your Mac.

### "Database connection refused"
Wait a few seconds after starting—the database takes time to initialize. Watch the logs:
```bash
docker-compose -f docker-compose.local.yml logs db
```

### Sign in not working
Make sure you:
1. Created an account first (sign up on the same page)
2. Used the same email to sign in
3. Check logs for any errors: `docker-compose -f docker-compose.local.yml logs app`

---

## Reset Everything (Fresh Start)

```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

This removes the database and creates a fresh one.

---

## Next Steps

Once sign-in works:
- Explore the app features
- Check the logs to understand how things work
- Read [README.md](./README.md) for feature overview
- Check [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) to understand the code

Enjoy! 🚀
