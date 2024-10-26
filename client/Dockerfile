# client/Dockerfile

# Use the official Node.js 18 image
FROM node:18

ARG PORT

ENV PORT=$PORT

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
