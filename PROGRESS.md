# GamesBazaar Progress

## Done in this increment
- Created Next.js + TypeScript + Tailwind project in `gamesbazaar/`.
- Added SQLite database via Prisma.
- Added `User` model with role support (`USER`, `ADMIN`).
- Implemented Auth.js credentials authentication:
  - Register API (`/api/register`)
  - Login via NextAuth credentials provider
  - Logout button
  - Protected dashboard route (`/dashboard`)
- Replaced default landing page with GamesBazaar home page.

## Current routes
- `/` home
- `/login` login
- `/register` register
- `/dashboard` protected page
- `/api/auth/[...nextauth]` auth endpoints
- `/api/register` register endpoint

## Next suggested increment
- Listings module:
  - listing schema
  - listing create page
  - listing grid with basic filters
