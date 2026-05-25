FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN cd apps/api && npx prisma generate && pnpm run build || true

EXPOSE 4000

CMD ["sh", "-c", "cd apps/api && pnpm run dev"]
