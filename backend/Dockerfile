FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=5000
ENV FRONTEND_URL=http://grepmind.sritechhub.com
ENV BACKEND_URL=http://grepmind.sritechhub.com/api

# Database (service name inside k8s namespace)
ENV DATABASE_URL=postgresql://postgres:postgres@grepmind-db:5432/grepmind?schema=public

# JWT Secrets
ENV ACCESS_TOKEN_SECRET=19dda38922b5878e42c3ca6ec333d0f0a36c07b59758920f1d321b258a6a8f3effdca844009bfb345b1b9c95fc5ce306321706b02364da7413e9c16450e39be6
ENV REFRESH_TOKEN_SECRET=16462dc1d431d2a2bbd7bdf520e3febefd8ed88311a5214e184dcfe1cd8776b4de7236df735868a74262fc168cdc71a756e22e65fd5fbc06ca0975d9f6149969
ENV JWT_SECRET=19dda38922b5878e42c3ca6ec333d0f0a36c07b59758920f1d321b258a6a8f3effdca844009bfb345b1b9c95fc5ce306321706b02364da7413e9c16450e39be6
ENV JWT_REFRESH_SECRET=16462dc1d431d2a2bbd7bdf520e3febefd8ed88311a5214e184dcfe1cd8776b4de7236df735868a74262fc168cdc71a756e22e65fd5fbc06ca0975d9f6149969

# Token Expiration
ENV ACCESS_TOKEN_EXPIRES_IN=1d
ENV REFRESH_TOKEN_EXPIRES_IN=90
ENV K8S_SERVICE_ACCOUNT=grepmind-sa


ENV DB_HOST=grepmind-db
ENV DB_USER=postgres
ENV DB_PASSWORD=postgres
ENV DB_NAME=grepmind
ENV PORT=5000
ENV NODE_ENV=development
ENV DB_PORT=5432

# Install required packages, including OpenSSL 1.1
RUN apt-get update && apt-get install -y \
    curl wget \
    bash \
    ca-certificates \
    gnupg openssl libssl3\
    && rm -rf /var/lib/apt/lists/*

# Install kubectl (latest stable)
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl

# Install Helm (latest stable)
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

WORKDIR /app

COPY package*.json ./
RUN npm install yaml js-yaml node-fetch axios

COPY . .

RUN npx prisma generate

EXPOSE 5000
CMD ["npm", "start"]
