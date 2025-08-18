FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=5000
ENV FRONTEND_URL=http://grepmind.sritechhub.com
ENV BACKEND_URL=http://grepmind.sritechhub.com/api

# Database (service name inside k8s namespace)
ENV DATABASE_URL=postgresql://postgres:postgres@grepmind-db:5432/grepmind?schema=public

# JWT Secrets
ENV ACCESS_TOKEN_SECRET=d211f689bfda98fe5dd3146713e021f20cf380ca6581e05c93a3f6d68920033ed957bf22fc59799a9e40d17b15e994e3462868a6e1fb379dd5804a7079746189
ENV REFRESH_TOKEN_SECRET=3e3e147c55cac2bcdc2ede23f8715044fc34db60f0b4f8aa490128601780069c37514f5ddc11d4e7a3d2b9a736fc22814de10a9a97672c5caf5af5f662c7a2d0
ENV JWT_SECRET=d211f689bfda98fe5dd3146713e021f20cf380ca6581e05c93a3f6d68920033ed957bf22fc59799a9e40d17b15e994e3462868a6e1fb379dd5804a7079746189
ENV JWT_REFRESH_SECRET=3e3e147c55cac2bcdc2ede23f8715044fc34db60f0b4f8aa490128601780069c37514f5ddc11d4e7a3d2b9a736fc22814de10a9a97672c5caf5af5f662c7a2d0

# Token Expiration
ENV ACCESS_TOKEN_EXPIRES_IN=15m
ENV REFRESH_TOKEN_EXPIRES_IN=30
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
RUN npm install yaml js-yaml

COPY . .

RUN npx prisma generate

EXPOSE 5000
CMD ["npm", "start"]
