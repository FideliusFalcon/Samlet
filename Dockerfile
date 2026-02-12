FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production=false

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache postgresql-client gzip

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/server/db/migrations ./server/db/migrations

RUN mkdir -p /app/uploads /app/backups

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
