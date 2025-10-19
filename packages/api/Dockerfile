FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/core/package*.json ./packages/core/
COPY packages/modules/*/package*.json ./packages/modules/*/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "dev"]
