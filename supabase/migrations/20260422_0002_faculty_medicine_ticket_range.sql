alter table public.tickets
  drop constraint if exists tickets_faculty_code_check;

alter table public.tickets
  add constraint tickets_faculty_code_check
  check (faculty_code in ('E', 'M', 'MG', 'AG', 'AR', 'V', 'D', 'AH', 'S'));

alter table public.tickets
  drop constraint if exists tickets_ticket_no_check;

alter table public.tickets
  add constraint tickets_ticket_no_check
  check (ticket_no between 1 and 3500);
