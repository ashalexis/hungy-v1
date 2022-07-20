# syntax=docker/dockerfile:1

FROM node:16.13.2 as base

WORKDIR /app

COPY package.json package.json
COPY yarn.lock yarn.lock

FROM base as prod
RUN yarn ci --production
COPY . .
CMD [ "node", "server.js" ]