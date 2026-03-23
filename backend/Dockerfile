FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma.config.ts ./
COPY src/prisma/schema.prisma ./src/prisma/schema.prisma

ARG DATABASE_URL="postgresql://build_placeholder:build_placeholder@localhost:5432/build_placeholder"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate

COPY . .
RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/src/generated ./src/generated

COPY --from=builder /app/src/prisma ./src/prisma
COPY prisma.config.ts ./

COPY entrypoint.sh ./entrypoint.sh

RUN sed -i 's/\r//' ./entrypoint.sh && chmod +x ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]