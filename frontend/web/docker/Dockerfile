# Use Alpine-based Node.js image as the build stage
FROM node:14-alpine AS build

# Update and upgrade the package lists and add required dependencies
RUN apk update && apk upgrade
RUN apk add --no-cache git>2.30.0

# Define working directory
ARG WORK_DIR
WORKDIR /app

# Set memory limits for Node.js processes
ENV NODE_OPTIONS "--max-old-space-size=8168"

# Copy the application files
COPY ${WORK_DIR} .

# List the contents of the directory for debugging
RUN ls -lah

# Clean up yarn cache and node_modules to avoid old dependencies being used
RUN yarn cache clean && rm -rf node_modules

# Install dependencies and build
RUN cd web/ \
    && ./install-deps.sh \
    && yarn install \
    && yarn build:webpack

# Use Nginx to serve the static files
FROM nginx:mainline-alpine

# Set the working directory for Nginx
ENV WORK_DIR=/var/web/digit-studio

# Create the target directory for the web build
RUN mkdir -p ${WORK_DIR}

# Copy the build output and Nginx configuration from the build stage
COPY --from=build /app/web/build ${WORK_DIR}/
COPY --from=build /app/web/docker/nginx.conf /etc/nginx/conf.d/default.conf
