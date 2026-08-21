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

   Before real family use, replace `POSTGRES_PASSWORD` and `JWT_SECRET` with unique random values. Do not rely on Docker defaults for secrets.

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

## NAS Deployment Direction

Equinox is intended to run on a UGREEN NAS through Docker Compose. UGOS should remain the lower-level NAS layer for disks, volumes, networking, and device administration. Equinox should focus on app-level family workflows: accounts, private/shared visibility, notes, reminders, activity logs, and file organization inside the Equinox storage volume.

## HTTPS Deployment Notes

Put Equinox behind a real HTTPS reverse proxy before using it outside trusted local development. Caddy, Nginx Proxy Manager, Traefik, or a NAS/router TLS proxy are suitable choices.

For production-style deployment:

- Point the public hostname at the reverse proxy.
- Install or issue a valid TLS certificate through the proxy.
- Set `FRONTEND_URL` to the exact HTTPS origin.
- Set `TRUST_PROXY=true` after the proxy forwards `X-Forwarded-Proto` correctly.
- Set `ENFORCE_HTTPS=true` after confirming HTTPS works.
- Keep `.env` private and never commit it.
