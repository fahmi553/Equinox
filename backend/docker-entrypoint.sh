#!/bin/sh
set -e

npx prisma migrate deploy --schema backend/prisma/schema.prisma
npm run start --workspace backend
