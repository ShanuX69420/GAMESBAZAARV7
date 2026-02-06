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
- Added `Admin Users v1`:
  - Admin dashboard hub (`/admin`) with user/moderation stats
  - Module cards: users, listings, orders
  - Admin-only route guard (`/admin`, `/admin/users`)
  - User search by ID/name/email
  - Block/unblock users
  - Change display name
  - Remove profile picture
  - Deactivate/reactivate user (soft delete)
  - Moderation audit logs with reasons/history
  - Session invalidation on moderation changes (force re-login)
  - Script to promote user to admin: `npm run make-admin -- <user-email>`
  - Placeholder routes for next modules:
    - `/admin/listings`
    - `/admin/orders`
- Added `Profile v1`:
  - User profile page (`/profile`)
  - Update display name
  - Add/remove profile picture URL
  - Profile API endpoint (`/api/profile`)
  - Profile links in header and dashboard
  - Better login error messages for restricted accounts:
    - Deactivated account message
    - Blocked account message

## Current routes
- `/` home
- `/login` login
- `/register` register
- `/dashboard` protected page
- `/profile` user profile
- `/admin` admin dashboard
- `/admin/users` admin users management
- `/admin/listings` admin listings placeholder
- `/admin/orders` admin orders placeholder
- `/api/auth/[...nextauth]` auth endpoints
- `/api/register` register endpoint
- `/api/profile` user profile update
- `/api/admin/users/[userId]` admin moderation actions

## Next suggested increment
- Listings module:
  - listing schema
  - listing create page
  - listing grid with basic filters
