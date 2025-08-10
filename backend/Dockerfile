# Use Node.js 20 Alpine for a smaller image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package*.json ./

# Install dependencies (including Prisma CLI)
RUN npm install

# Copy the entire backend source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose API port
EXPOSE 5000

# Start backend
CMD ["npm", "start"]
