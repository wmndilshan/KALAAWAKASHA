-- KalaAwakasha ticket management baseline schema
create extension if not exists pgcrypto;

create table if not exists public.organizers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'organizer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  student_id_full text not null,
  faculty_code text not null check (faculty_code in ('E', 'M', 'MG', 'AG', 'AR', 'V', 'D', 'AH', 'S')),
  batch text not null,
  student_serial text not null,
  ticket_no integer not null check (ticket_no between 1 and 3500),
  verify_code text not null check (verify_code ~ '^[0-9]{4}$'),
  qr_payload text,
  photo_path text,
  status text not null default 'issued' check (status in ('issued', 'checked_in', 'cancelled')),
  checked_in_at timestamptz,
  checked_in_by uuid references public.organizers (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_student_ticket_unique unique (student_id_full, ticket_no)
);

create table if not exists public.checkin_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  action text not null check (action in ('checked_in', 'rejected', 'duplicate', 'manual_lookup')),
  message text,
  performed_by uuid references public.organizers (id),
  created_at timestamptz not null default now()
);

create index if not exists idx_tickets_student_id_full on public.tickets (student_id_full);
create index if not exists idx_tickets_ticket_no on public.tickets (ticket_no);
create index if not exists idx_tickets_status on public.tickets (status);
create index if not exists idx_tickets_created_at on public.tickets (created_at desc);
create index if not exists idx_checkin_logs_ticket_created on public.checkin_logs (ticket_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tickets_set_updated_at on public.tickets;
create trigger trg_tickets_set_updated_at
before update on public.tickets
for each row
execute function public.set_updated_at();

create or replace function public.is_active_organizer(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organizers o
    where o.id = uid and o.is_active = true
  );
$$;

alter table public.organizers enable row level security;
alter table public.tickets enable row level security;
alter table public.checkin_logs enable row level security;

-- Organizers can read only their own organizer record.
drop policy if exists organizers_select_self on public.organizers;
create policy organizers_select_self
on public.organizers
for select
using (id = auth.uid());

-- Admins can manage organizers.
drop policy if exists organizers_admin_all on public.organizers;
create policy organizers_admin_all
on public.organizers
for all
using (
  exists (
    select 1 from public.organizers o
    where o.id = auth.uid() and o.role = 'admin' and o.is_active = true
  )
)
with check (
  exists (
    select 1 from public.organizers o
    where o.id = auth.uid() and o.role = 'admin' and o.is_active = true
  )
);

-- Active organizers can view tickets.
drop policy if exists tickets_select_active_organizers on public.tickets;
create policy tickets_select_active_organizers
on public.tickets
for select
using (public.is_active_organizer(auth.uid()));

-- Active organizers can insert tickets.
drop policy if exists tickets_insert_active_organizers on public.tickets;
create policy tickets_insert_active_organizers
on public.tickets
for insert
with check (public.is_active_organizer(auth.uid()));

-- Active organizers can update tickets.
drop policy if exists tickets_update_active_organizers on public.tickets;
create policy tickets_update_active_organizers
on public.tickets
for update
using (public.is_active_organizer(auth.uid()))
with check (public.is_active_organizer(auth.uid()));

-- Logs are visible to active organizers.
drop policy if exists checkin_logs_select_active_organizers on public.checkin_logs;
create policy checkin_logs_select_active_organizers
on public.checkin_logs
for select
using (public.is_active_organizer(auth.uid()));

-- Active organizers can insert logs.
drop policy if exists checkin_logs_insert_active_organizers on public.checkin_logs;
create policy checkin_logs_insert_active_organizers
on public.checkin_logs
for insert
with check (public.is_active_organizer(auth.uid()));

-- Storage bucket and policies for private ticket photos.
insert into storage.buckets (id, name, public)
values ('ticket-photos', 'ticket-photos', false)
on conflict (id) do nothing;

-- Organizers can read ticket photos.
drop policy if exists ticket_photos_read_organizers on storage.objects;
create policy ticket_photos_read_organizers
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ticket-photos'
  and public.is_active_organizer(auth.uid())
);

-- Organizers can upload/update ticket photos.
drop policy if exists ticket_photos_write_organizers on storage.objects;
create policy ticket_photos_write_organizers
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ticket-photos'
  and public.is_active_organizer(auth.uid())
);

drop policy if exists ticket_photos_update_organizers on storage.objects;
create policy ticket_photos_update_organizers
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ticket-photos'
  and public.is_active_organizer(auth.uid())
)
with check (
  bucket_id = 'ticket-photos'
  and public.is_active_organizer(auth.uid())
);

-- RPC to atomically check in tickets and block duplicates.
create or replace function public.check_in_ticket_atomic(p_ticket_id uuid, p_actor uuid)
returns public.tickets
language plpgsql
security invoker
as $$
declare
  updated_ticket public.tickets;
begin
  update public.tickets
  set status = 'checked_in',
      checked_in_at = now(),
      checked_in_by = p_actor
  where id = p_ticket_id and status = 'issued'
  returning * into updated_ticket;

  if updated_ticket.id is null then
    return null;
  end if;

  insert into public.checkin_logs(ticket_id, action, message, performed_by)
  values (updated_ticket.id, 'checked_in', 'Ticket checked in', p_actor);

  return updated_ticket;
end;
$$;
