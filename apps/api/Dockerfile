FROM node:22-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages packages
RUN pnpm --filter @portal/api build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/packages/database/migrations ./packages/database/migrations

USER node
EXPOSE 3001
CMD ["node","apps/api/dist/main.js"]
