# Builder: compile TypeScript and copy templates (needs devDependencies)
FROM apify/actor-node:20 AS builder

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src

RUN pnpm run build

# Runtime: production dependencies and compiled output only
FROM apify/actor-node:20

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/actor/main.js"]
