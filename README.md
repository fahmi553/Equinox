# Equinox

Equinox is a private home-server app for notes, reminders, family accounts, file uploads, and activity logs.

## Stack

- Frontend: Vue 3 + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT with username/password
- Storage: local `storage/uploads` folder first
- Deployment: Docker Compose
- Remote access later: Tailscale

## Local Setup

1. Copy environment variables:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

3. Start the full Docker stack:

   ```powershell
   docker compose up -d --build
   ```

4. For local non-Docker development, start development servers:

   ```powershell
   npm run dev
   ```

Frontend: http://localhost:5173

Backend API: http://localhost:3000

Docker frontend: http://localhost:8080

## Tool Checklist

- Git: installed
- Node.js/npm: installed
- Docker Desktop: install before running PostgreSQL with Docker Compose
- VS Code: install for editing
- Postman or Insomnia: optional API testing
- Tailscale: install later for private remote access
