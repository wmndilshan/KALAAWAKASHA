# KalaAwakasha – Organizer Quick Reference

## Logging In

1. Go to web app or mobile app
2. Enter email and password (same as Supabase Auth)
3. Click "Sign In"

If login fails:
- Verify your organizer account exists in the system
- Contact admin to add you to `organizers` table

---

## Adding Tickets

### Single Ticket (Web or Mobile)

1. **Add Ticket** screen
2. Enter **Student ID** (e.g., `E/20/455`)
3. Enter **Ticket Number** (e.g., `1001`)
4. (Optional) Upload a photo of the student
5. Click **Issue Ticket**
6. View:
   - Generated **4-digit code** (e.g., `1234`)
   - **QR code** (can print or share)

### Multiple Tickets (Web only)

1. **Import** screen
2. Prepare CSV file with columns: `student_id_full`, `ticket_no`
3. Upload CSV
4. Review import results (success/failure)

---

## Checking In Tickets

### Via QR Code (Recommended – Mobile or Web)

1. **Check Ticket** screen
2. Allow camera access
3. Point camera at QR code
4. System instantly shows:
   - ✅ **VALID** (green) – student photo, ID, ticket #
   - ❌ **INVALID** (red) – error message
   - ⚠️ **DUPLICATE** (orange) – already checked in
5. If valid, click **Confirm Check-in**
6. Done! Ticket marked as checked in

### Via Manual Entry (Fallback)

1. **Check Ticket** screen
2. Tab to **Manual Fallback**
3. Enter:
   - Student ID (e.g., `E/20/455`)
   - Ticket Number (e.g., `1001`)
   - 4-digit Code (printed on ticket)
4. Click **Verify**
5. If valid, click **Confirm Check-in**

---

## Viewing Tickets

### Search

1. **Search** screen
2. Filter by:
   - Student ID (partial match OK)
   - Ticket Number
   - Status (Issued, Checked In, Cancelled)
3. Tap a result to see full details

### Recent Activity

1. **History** screen
2. See timeline of all actions:
   - Tickets checked in
   - Rejections (invalid code, not found, etc.)
   - Duplicates
   - Manual lookups

---

## Common Scenarios

### Student Arrives with Physical Ticket

1. Ask for student ID (e.g., `E/20/455`)
2. Look at ticket for **Ticket Number** (e.g., `1001`)
3. Open **Check Ticket** → **Manual Fallback**
4. Enter student ID + ticket number + 4-digit code from ticket
5. Verify
6. Confirm check-in

### Student's QR Code Isn't Working

1. Ask for paper ticket
2. Use manual fallback (above)

### Already Checked In?

1. App shows **DUPLICATE** warning in red
2. Cannot check in again (system blocks double-entry)
3. Refer to history to see when they checked in

### Ticket Not Found

1. Verify student ID format (e.g., `E/20/455` not `e20455`)
2. Verify ticket number matches
3. Contact admin if issue persists

---

## Dashboard Insights

- **Total** – All tickets in system
- **Checked In** – Students who've checked in
- **Remaining** – Still to arrive

Update automatically as check-ins happen.

---

## Tips & Tricks

✅ **Pre-load tickets** – Import all students' tickets at start of event
✅ **Print QR codes** – Print tickets with embedded QR codes for fast scanning
✅ **Backup manual entry** – Camera not working? Fall back to manual code entry
✅ **Monitor duplicates** – Check History for any repeat check-in attempts (indicates potential fraud or system issue)
✅ **Export data** – Use Supabase dashboard to export all tickets and logs for reporting

---

## Troubleshooting

### Can't Login

- Check email and password
- Password is case-sensitive
- Ensure account is active (contact admin)

### QR Scanner Not Working

- Allow camera permissions
- Ensure good lighting
- Try manual entry instead
- Restart app if persistent

### Wrong 4-Digit Code

- Each student has a unique code
- Code is deterministic (same every time)
- Double-check you're reading it correctly
- Use manual entry if unsure

### Student ID Format Wrong

Valid formats:
- Single-letter faculty: `E/20/455`
- Two-letter faculty: `MG/21/123`, `AH/23/099`

Invalid:
- `e/20/455` (lowercase)
- `E20455` (no slashes)
- `E/2024/455` (4-digit batch)

---

## Getting Help

1. Check **History** for recent activity
2. Search for the ticket
3. Try manual entry as workaround
4. Contact system admin with screenshot of error

---

## Sign Out

- Web: Click **Sign Out** in navigation
- Mobile: Tap **Home** → **Sign Out** button
