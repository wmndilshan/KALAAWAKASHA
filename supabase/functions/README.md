# Supabase Edge Functions

Functions:
- `generate-ticket-code`
- `issue-ticket`
- `verify-ticket`
- `check-in-ticket`

## Required Secrets

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERIFY_CODE_SECRET`

## Deploy

Use Supabase MCP deployment or Supabase CLI.

## Notes

- Organizer authentication is required for all function calls.
- Verification and check-in rely on server-side deterministic HMAC validation.
- Duplicate check-ins are blocked using atomic SQL update logic.
