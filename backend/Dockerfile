FROM node:20-slim

# Install required packages, including OpenSSL 1.1
RUN apt-get update -y && \
    apt-get install -y wget curl gnupg openssl libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 5000
CMD ["npm", "start"]
