# Use Node.js official image as the base image
FROM node:18-slim

# Create app directory in container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server source code
COPY server.js .

# Expose port 3000
EXPOSE 3000

# Command to run the server
CMD ["node", "server.js"]