# Supabase Backend

This project uses Supabase as the only backend:
- Postgres
- Auth
- Storage
- Row Level Security
- Edge Functions

## Migrations

Primary migration:
- `migrations/20260422_0001_ticket_system.sql`

Applies:
- `organizers`, `tickets`, `checkin_logs`
- indexes and constraints
- `updated_at` trigger
- RLS policies
- storage bucket `ticket-photos`
- atomic check-in RPC `check_in_ticket_atomic`

## Edge Functions

- `generate-ticket-code`
- `issue-ticket`
- `verify-ticket`
- `check-in-ticket`

Shared helpers are in `functions/_shared`.

## Function Secrets

Set these in Supabase Function secrets:
- `VERIFY_CODE_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
