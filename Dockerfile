FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS production

ENV NODE_ENV=production
WORKDIR /home/node/app

RUN mkdir -p /home/node/app && chown node:node /home/node/app

USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/main.js"]
