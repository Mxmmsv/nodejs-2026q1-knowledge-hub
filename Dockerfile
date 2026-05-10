FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-alpine AS production

ENV NODE_ENV=production
WORKDIR /home/node/app

RUN apk add --no-cache curl \
    && mkdir -p /home/node/app \
    && chown node:node /home/node/app

USER node

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"${SEED_DATABASE:-true}\" = \"true\" ]; then node dist/prisma/run-seed.js; fi && node dist/main.js"]
