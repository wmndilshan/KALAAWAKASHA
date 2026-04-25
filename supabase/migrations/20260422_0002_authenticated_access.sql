-- Relax organizer-only checks to authenticated-user access.

-- Repoint actor foreign keys to auth.users to avoid requiring organizers rows.
alter table public.tickets drop constraint if exists tickets_checked_in_by_fkey;
alter table public.tickets
  add constraint tickets_checked_in_by_fkey
  foreign key (checked_in_by) references auth.users(id);

alter table public.checkin_logs drop constraint if exists checkin_logs_performed_by_fkey;
alter table public.checkin_logs
  add constraint checkin_logs_performed_by_fkey
  foreign key (performed_by) references auth.users(id);

-- Tickets policies: authenticated users can read/insert/update.
drop policy if exists tickets_select_active_organizers on public.tickets;
drop policy if exists tickets_insert_active_organizers on public.tickets;
drop policy if exists tickets_update_active_organizers on public.tickets;

create policy tickets_select_authenticated
on public.tickets
for select
to authenticated
using (true);

create policy tickets_insert_authenticated
on public.tickets
for insert
to authenticated
with check (true);

create policy tickets_update_authenticated
on public.tickets
for update
to authenticated
using (true)
with check (true);

-- Checkin logs policies: authenticated users can read/insert.
drop policy if exists checkin_logs_select_active_organizers on public.checkin_logs;
drop policy if exists checkin_logs_insert_active_organizers on public.checkin_logs;

create policy checkin_logs_select_authenticated
on public.checkin_logs
for select
to authenticated
using (true);

create policy checkin_logs_insert_authenticated
on public.checkin_logs
for insert
to authenticated
with check (true);

-- Storage policies: authenticated users can access ticket photos.
drop policy if exists ticket_photos_read_organizers on storage.objects;
drop policy if exists ticket_photos_write_organizers on storage.objects;
drop policy if exists ticket_photos_update_organizers on storage.objects;

create policy ticket_photos_read_authenticated
on storage.objects
for select
to authenticated
using (bucket_id = 'ticket-photos');

create policy ticket_photos_write_authenticated
on storage.objects
for insert
to authenticated
with check (bucket_id = 'ticket-photos');

create policy ticket_photos_update_authenticated
on storage.objects
for update
to authenticated
using (bucket_id = 'ticket-photos')
with check (bucket_id = 'ticket-photos');
