FROM --platform=linux/amd64 node:21.6.1 AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY .env ./

RUN yarn build

FROM builder AS production

EXPOSE 3000
ENTRYPOINT yarn start:migrate
