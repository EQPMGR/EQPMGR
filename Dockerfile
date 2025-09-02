
# 1. Builder Stage: Build the Next.js app
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Runner Stage: Create the final, lean image
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy the built app from the builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
