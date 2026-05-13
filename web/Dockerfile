FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_API_BASE_URL
ARG VITE_API_VERSION=v1
ARG VITE_ENABLE_DEBUG=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_VERSION=$VITE_API_VERSION \
    VITE_ENABLE_DEBUG=$VITE_ENABLE_DEBUG

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
