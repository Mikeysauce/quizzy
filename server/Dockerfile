# server/Dockerfile

# Use the official Node.js 18 image
FROM node:18

ARG PORT
ENV PORT=$PORT

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the server code
COPY . .

RUN mkdir -p /app/uploads

# Expose the server port (adjust if different)
EXPOSE 3000

# Start the Express server
CMD ["npm", "run", "dev"]
