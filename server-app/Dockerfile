FROM node:25-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY server.js ./

# Expose port 3001
EXPOSE 3001

# Increase max HTTP header size to 1MB to allow very long URLs
CMD ["node", "--max-http-header-size=1048576", "server.js"]
