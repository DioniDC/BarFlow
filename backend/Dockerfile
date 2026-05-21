FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl bash

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/seed.js && node src/index.js"]
