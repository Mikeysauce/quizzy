# client/Dockerfile

# Use the official Node.js 18 image
FROM node:18

ARG PORT
ARG WEBSOCKET_PORT
ARG WEBSOCKET_HOST

ENV PORT=$PORT
ENV WEBSOCKET_PORT=$WEBSOCKET_PORT
ENV WEBSOCKET_HOST=$WEBSOCKET_HOST

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the client code
COPY . .

# Build the Vite app
RUN npm run build

# Install a lightweight HTTP server for serving the static files
RUN npm install -g serve

# Expose the client port (adjust if different)
EXPOSE $PORT

# Serve the built app
CMD ["npm", "run", "serve"]
