# client/Dockerfile

# Use the official Node.js 18 image
FROM node:18

ARG PORT
ARG BASIC_AUTH_USERNAME
ARG BASIC_AUTH_PASSWORD

ENV PORT=$PORT
ENV BASIC_AUTH_USERNAME=$BASIC_AUTH_USERNAME
ENV BASIC_AUTH_PASSWORD=$BASIC_AUTH_PASSWORD

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
RUN npm install -g http-server@14.1.1

# Expose the client port (adjust if different)
EXPOSE $PORT

# Serve the built app
CMD ["npm", "run", "serve"]
