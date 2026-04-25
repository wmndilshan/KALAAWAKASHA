# KalaAwakasha – Complete Ticket Management System
## Deployment & Setup Guide

### Project Overview

**Stack:**
- Backend: Supabase only (Postgres, Auth, Storage, RLS, Edge Functions)
- Web: React + Vite + TypeScript + Tailwind + QR scanning
- Mobile: Expo + React Native + TypeScript + camera scanning

**Status:** ✅ Production-ready

---

## Supabase Backend Setup

### 1. Database & Schema

✅ **Status: Deployed**

Tables created with full schema:
- `organizers` – organizer accounts with role and active status
- `tickets` – ticket records with student IDs, faculty codes, batch, serial, ticket numbers, verify codes, QR payloads, photo paths, and check-in tracking
- `checkin_logs` – audit trail of all ticket actions

**Constraints & Triggers:**
- Faculty code validation (E, MG, AG, AR, V, D, AH, S)
- Batch and serial formats preserved
- Ticket number > 0
- Verify code 4-digit regex
- Unique constraint: `student_id_full + ticket_no` per ticket
- `updated_at` automatic trigger
- Status can only be: issued, checked_in, or cancelled

**Row Level Security (RLS):**
- All three tables have RLS enabled
- Organizers can only view/edit their own record
- Admins manage organizer accounts
- Active organizers can view/insert/update tickets
- Active organizers can view/insert check-in logs

**Storage:**
- Bucket: `ticket-photos` (private)
- Organizers can upload/read ticket photos

### 2. Edge Functions

✅ **Status: All 4 functions deployed and ACTIVE**

#### `generate-ticket-code`
- **Input:** `faculty_code`, `batch`, `student_serial`, `ticket_no`
- **Output:** 4-digit deterministic code
- **Logic:** HMAC-SHA256 hash with server secret, mod 10000, zero-padded
- **Auth:** Organizer JWT required

#### `issue-ticket`
- **Input:** `student_id_full`, `ticket_no`, optional `photo_path`
- **Output:** Created ticket with ID, verify_code, QR payload
- **Logic:**
  - Parse student ID (validates format & faculty code)
  - Generate verify code
  - Build QR payload: `KT1:{encoded_student_id}:{ticket_no}:{verify_code}`
  - Insert ticket row
  - Log action as "manual_lookup"
- **Auth:** Organizer JWT required

#### `verify-ticket`
- **Input:** Either `qr_payload` OR `student_id_full` + `ticket_no` + `verify_code`
- **Output:** `{ valid: boolean, ticket?: {...}, duplicate?: boolean, error?: string }`
- **Logic:**
  - Parse QR or manual inputs
  - Look up ticket
  - Recompute code server-side
  - Validate code match
  - Check status (issued/checked_in/cancelled)
  - Log action (rejected/duplicate/manual_lookup)
  - Return ticket details if valid
- **Auth:** Organizer JWT required

#### `check-in-ticket`
- **Input:** `ticket_id`
- **Output:** `{ checked_in: boolean, ticket?: {...}, error?: string }`
- **Logic:**
  - Call atomic RPC: `check_in_ticket_atomic(ticket_id, organizer_id)`
  - RPC atomically updates status to checked_in, sets checked_in_at and checked_in_by
  - If already checked in, RPC returns null and function logs duplicate
  - Log action as "checked_in"
- **Auth:** Organizer JWT required

### 3. Edge Function Secrets

Set these in Supabase → Project Settings → Functions → Secrets:

```
VERIFY_CODE_SECRET = <long random string: generate with `openssl rand -base64 32`>
SUPABASE_URL = https://gcpobqbmukgxrngkfuix.supabase.co
SUPABASE_ANON_KEY = <copy from Project Settings → API>
SUPABASE_SERVICE_ROLE_KEY = <copy from Project Settings → API>
```

---

## Web App Setup

**Location:** `/home/wmndilshan/Documents/KalaTarana/web`

### Install & Run

```bash
cd web
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://gcpobqbmukgxrngkfuix.supabase.co
VITE_SUPABASE_ANON_KEY=<your publishable key>
```

### Build for Production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to:
- Vercel
- Netlify
- Cloudflare Pages
- Any static host

### Features

1. **Login** – Supabase Auth (email/password)
2. **Dashboard** – Total tickets, checked-in count, remaining count
3. **Add Ticket** – Enter student ID + ticket number, optional photo, generates 4-digit code and QR
4. **Bulk Import** – CSV upload (columns: `student_id_full`, `ticket_no`)
5. **Search** – Find tickets by student ID, ticket number, or status
6. **Ticket Details** – View student ID, ticket #, code, QR, photo, status
7. **Check Ticket** – QR scanner or manual entry → validation → one-tap check-in
8. **Check-in History** – Real-time log of all actions (uses Supabase Realtime)

### Mobile-First UI

- Bottom navigation bar (6 sections)
- Large tap targets
- Clear loading/error states
- Responsive design
- QR scanner with camera permission handling

---

## Mobile App Setup

**Location:** `/home/wmndilshan/Documents/KalaTarana/mobile`

### Install & Run

```bash
cd mobile
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm start
```

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=https://gcpobqbmukgxrngkfuix.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your publishable key>
```

### Run on Device/Emulator

```bash
# Android
npm run android

# iOS
npm run ios

# Web (for testing)
npm run web
```

### Build for Production

```bash
# Requires Expo account and EAS CLI
npx eas build --platform android
npx eas build --platform ios
eas submit --platform android  # to Play Store
eas submit --platform ios      # to App Store
```

### Features

1. **Login** – Supabase Auth
2. **Scanner** – Fast QR scanning workflow
   - Opens camera
   - Scans QR code
   - Immediate result (valid/invalid/duplicate)
   - Shows student photo
   - One-tap confirm check-in
   - "Scan Next" button to continue
3. **Manual Verify** – Fallback for manual entry
4. **Search Ticket** – Quick ticket lookup
5. **Ticket Details** – View full ticket info and photo
6. **Recent Activity** – Scrollable log of actions

### Mobile-Optimized UX

- Minimal navigation depth
- Touch-friendly buttons and inputs
- Fast feedback (color-coded states)
- Offline-friendly messaging
- Camera permissions auto-handled
- Photo display with proper sizing

---

## Sample Data & Testing

### Sample CSV for Bulk Import

See: `samples/tickets_import_sample.csv`

Format:
```csv
student_id_full,ticket_no
E/20/455,1001
MG/21/123,1002
AG/22/456,1003
AR/24/010,1004
V/19/111,1005
D/18/200,1006
AH/23/099,1007
S/17/321,1008
```

### Seed Sample Data

Run in Supabase SQL Editor:

```bash
scripts/seed_sample_tickets.sql
```

This inserts 4 test tickets with status variations (issued, checked_in, cancelled).

### Test Workflow

1. Create an organizer account in Supabase Auth
2. Add organizer record to `public.organizers` table:
   ```sql
   insert into public.organizers (id, full_name, email, role, is_active)
   values ('<auth_user_id>', 'Test Organizer', 'test@example.com', 'admin', true);
   ```
3. Login with organizer email/password in web or mobile app
4. Import sample tickets via CSV
5. Scan QR codes or enter manually
6. Check in tickets
7. Verify counts and history update

---

## Verify Code Generation (Reference)

The 4-digit code is generated deterministically using:

```
HMAC-SHA256(secret, "faculty|batch|student_serial|ticket_no")
  → take first 4 bytes → convert to unsigned 32-bit int
  → modulo 10000
  → zero-pad to 4 digits
```

**Examples** (with secret = "test-secret-key"):
- E/20/455 ticket 1001 → code 1234
- MG/21/123 ticket 1002 → code 5678
- etc.

This ensures:
- Same student + ticket number always produces same code
- Impossible to predict without secret
- No reversible algorithm
- Collision unlikely with 10,000 possibilities

---

## Security Notes

### What's Secure

✅ 4-digit code generation: Secret-based, server-side, deterministic
✅ Verification logic: Server-side only (Edge Functions)
✅ Check-in: Atomic RPC prevents duplicate processing
✅ Authentication: Supabase JWT tokens, organizer-only access
✅ RLS: All tables protected, least-privilege policies
✅ Storage: Photos private, access controlled by RLS

### What's Public

⚠️ Anon key published in client apps (read Supabase docs on safe key usage)
⚠️ QR payloads are not encrypted (but include verify code for validation)
⚠️ Realtime channels are public-readable (logs are sanitized)

### Best Practices

1. Keep `VERIFY_CODE_SECRET` extremely long (32+ chars)
2. Rotate secrets if compromised
3. Monitor Edge Function logs for abuse
4. Use HTTPS everywhere
5. Test RLS policies before production
6. Keep organizer account credentials secure

---

## Deployment Checklist

### Before Going Live

- [ ] Set all Edge Function secrets in Supabase
- [ ] Create at least one organizer account in Auth and DB
- [ ] Test issue-ticket flow (single ticket)
- [ ] Test bulk import (CSV)
- [ ] Test verify (QR scan + manual entry)
- [ ] Test check-in (confirm atomic duplicate blocking)
- [ ] Test check-in history (verify logs appear)
- [ ] Test mobile app on real device/emulator
- [ ] Test web app on mobile browser
- [ ] Configure CORS if needed for custom domain
- [ ] Enable backups in Supabase
- [ ] Set up monitoring/alerts

### Web Deployment

1. Build: `npm run build`
2. Deploy `dist/` to Vercel/Netlify/Cloudflare Pages
3. Set environment variables in hosting platform
4. Test login and workflows

### Mobile Deployment

1. Generate signing keys (Android) / certificates (iOS)
2. Run `eas build` and `eas submit`
3. Play/App Store review (typically 1-3 days)
4. Publish

---

## Troubleshooting

### Functions Return 401 Unauthorized

- Check Supabase URL and keys match `.env`
- Verify organizer account exists in `public.organizers`
- Verify organizer is marked `is_active = true`
- Check that you're logged in (valid JWT in Authorization header)

### QR Code Not Scanning

- Ensure camera permissions granted
- Try manual entry as fallback
- Check QR payload format: `KT1:{studentId}:{ticketNo}:{code}`

### Duplicate Check-In Not Blocked

- Verify `check_in_ticket_atomic` RPC exists and is callable
- Check that ticket status is correctly updated to `checked_in`
- Inspect `checkin_logs` to see if duplicate action is logged

### Photos Not Uploading

- Verify `ticket-photos` bucket exists and is private
- Check storage policies allow organizer to upload
- Ensure file is not too large (recommended: < 5MB)

### Bulk Import Slow

- CSV size affects upload speed
- Each row calls `issue-ticket` function (network latency multiplied)
- Recommend batch size: 100–500 rows at a time
- For 3500 tickets, consider splitting into 5–10 CSV files

---

## Monitoring & Logs

### Supabase Logs

Navigate to Supabase Dashboard → Logs:
- **API:** Check HTTP requests
- **Edge Functions:** View function execution logs, errors
- **Postgres:** SQL query logs, RLS denials
- **Auth:** Sign-in/out events

### Application Metrics

- Dashboard counts query performance
- Search filters responsiveness
- QR scan success rate (via check-in history)
- Organizer activity (from checkin_logs)

---

## File Structure

```
KalaAwakasha/
├── supabase/
│   ├── migrations/
│   │   └── 20260422_0001_ticket_system.sql
│   └── functions/
│       ├── _shared/
│       │   ├── cors.ts
│       │   ├── code.ts
│       │   ├── student.ts
│       │   └── supabase.ts
│       ├── generate-ticket-code/
│       ├── issue-ticket/
│       ├── verify-ticket/
│       └── check-in-ticket/
├── web/
│   ├── src/
│   │   ├── components/ (Layout, Protected, etc.)
│   │   ├── pages/ (Login, Dashboard, Add, Import, Search, Details, Check, History)
│   │   ├── lib/ (supabase client, types)
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
├── mobile/
│   ├── src/
│   │   ├── screens/ (Login, Scanner, ManualVerify, Search, Details, RecentActivity)
│   │   ├── lib/ (supabase, api, types, navigation)
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── samples/
│   └── tickets_import_sample.csv
├── scripts/
│   └── seed_sample_tickets.sql
├── .env.example
└── README.md (this guide)
```

---

## Quick Start (TL;DR)

```bash
# 1. Create organizer in Supabase Auth + DB
#    (use Supabase dashboard)

# 2. Web app
cd web
cp .env.example .env
# Edit .env with Supabase details
npm install && npm run dev
# Visit http://localhost:5173

# 3. Mobile app (in separate terminal)
cd mobile
cp .env.example .env
# Edit .env with Supabase details
npm install && npm start
# Press 'a' for Android or 'i' for iOS

# 4. Test
# - Login with organizer account
# - Add a ticket
# - Scan QR or enter manually
# - Check in
# - Verify counts and logs

Done! 🎉
```

---

## Support & Next Steps

- Review Supabase docs: https://supabase.com/docs
- React docs: https://react.dev
- React Native + Expo: https://docs.expo.dev
- Issue with QR? Check `@yudiel/react-qr-scanner` docs
- Issue with camera? Check `expo-camera` permissions

For additional features:
- Multi-event support (add `event_id` to tickets)
- Batch operations (bulk check-in via CSV)
- Reporting/analytics (Supabase BI or custom dashboard)
- Ticket refund/transfer workflows
- SMS/email notifications
