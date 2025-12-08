FROM node:18-alpine

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-dejavu

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install root dependencies
RUN npm install --production

# Copy application code
COPY . .

# Install admin panel dependencies
WORKDIR /app/admin-panel
RUN npm install --production

# Go back to root
WORKDIR /app

# Create config directory if needed
RUN mkdir -p config

# Set Puppeteer to use system chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Expose ports
EXPOSE 3000 3001

# Start application
CMD ["node", "start-all.js"]
