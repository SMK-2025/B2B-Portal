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
RUN apk add --no-cache openjdk17-jre ghostscript ca-certificates \
    && mkdir -p /opt/b2b \
    && wget -q 'https://github.com/ZUGFeRD/mustangproject/releases/download/core-2.26.0/Mustang-CLI-2.26.0.jar' -O /opt/b2b/mustang.jar \
    && echo '42d7868cb68264874a7b8cab4c3587b03b23ccc7cd72373da917f66758bb9736  /opt/b2b/mustang.jar' | sha256sum -c - \
    && find /usr/share -iname 'srgb.icc' -exec cp '{}' /opt/b2b/srgb.icc \; \
    && test -s /opt/b2b/srgb.icc

ENV NODE_ENV=production
WORKDIR /workspace

COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/assets ./apps/api/assets
COPY --from=build /workspace/packages/database/migrations ./packages/database/migrations

USER node
EXPOSE 3001
CMD ["node","apps/api/dist/main.js"]
