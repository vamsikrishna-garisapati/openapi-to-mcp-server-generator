FROM apify/actor-node:20

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src

RUN pnpm run build && pnpm prune --prod

CMD ["node", "dist/actor/main.js"]
