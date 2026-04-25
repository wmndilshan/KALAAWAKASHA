create unique index if not exists tickets_student_id_full_unique
on public.tickets (student_id_full);

create unique index if not exists tickets_ticket_no_unique
on public.tickets (ticket_no);
