FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install --workspace backend

COPY backend backend
RUN npm run db:generate --workspace backend
RUN chmod +x backend/docker-entrypoint.sh

EXPOSE 3000
CMD ["./backend/docker-entrypoint.sh"]
