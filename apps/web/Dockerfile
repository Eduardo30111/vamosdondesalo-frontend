FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared packages/shared
COPY apps/web apps/web

EXPOSE 3000

CMD ["sh", "-c", "cd apps/web && pnpm run dev"]
