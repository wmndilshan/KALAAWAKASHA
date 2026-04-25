# KalaAwakasha Ticket Management System

Supabase-only architecture for ticket issuing, verification, and attendance check-in.

## Stack

- Backend: Supabase Postgres, Auth, Storage, RLS, Edge Functions
- Web: React + Vite + TypeScript + Tailwind
- Mobile: Expo + React Native + TypeScript

## Folder Structure

```text
supabase/
  migrations/
  functions/
web/
mobile/
samples/
scripts/
```

## Implemented Deliverables

1. SQL migrations and schema for organizers, tickets, checkin_logs
2. Constraints, indexes, updated_at trigger, and uniqueness rules
3. RLS and Storage policies for least-privilege organizer access
4. Edge Functions:
   - generate-ticket-code
   - issue-ticket
   - verify-ticket
   - check-in-ticket
5. Mobile-first web organizer app
6. Expo organizer mobile app
7. Environment examples for root/web/mobile/functions
8. Sample CSV for import
9. Seed SQL script for sample data

## Security Notes

- 4-digit code is generated with HMAC-SHA256 using server secret:
  `faculty|batch|student_serial|ticket_no`
- Event number is not used.
- Secret never exposed to clients.
- Verification/check-in handled server-side by Edge Functions.

## Local Run

### 1) Supabase backend

- Apply migration from `supabase/migrations`.
- Deploy functions in `supabase/functions`.
- Set function secrets (`VERIFY_CODE_SECRET`, `SUPABASE_*`).

### 2) Web app

```bash
cd web
npm install
npm run dev
```

### 3) Mobile app

```bash
cd mobile
npm install
npm start
```

## Deployment Notes

- Web: deploy `web` build output to Vercel/Netlify/Cloudflare Pages.
- Mobile: use Expo EAS Build and submit to Play/App Store.
- Keep Supabase secrets in project/function secret manager only.

## Sample CSV

See `samples/tickets_import_sample.csv`.

## Seeding

Run `scripts/seed_sample_tickets.sql` in Supabase SQL editor after creating at least one organizer account.
