# Stage 1: Build the Angular application
FROM node:lts-slim AS build

# Setup the working directory
WORKDIR /usr/src/app

# Install @angular/cli globally
RUN npm install -g @angular/cli@latest

# Copy only the package*.json
COPY package*.json ./

# npm ci to install packages exclusively from the package-lock.json file
RUN npm ci

# Copy everything to the working directory
COPY . ./

# Build Angular application in PROD mode
RUN ng build --configuration=production

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine AS final

# Remove the default nginx.conf
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Copy built Angular app files to Nginx HTML folder
COPY --from=build /usr/src/app/dist/frontend/browser /usr/share/nginx/html

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
