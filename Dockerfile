FROM node:latest AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --silent --frozen-lockfile

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY .env ./

RUN yarn build

FROM builder AS production

EXPOSE 3000
ENTRYPOINT yarn start:migrate
