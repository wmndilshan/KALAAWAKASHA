insert into public.tickets (
  student_id_full,
  faculty_code,
  batch,
  student_serial,
  ticket_no,
  verify_code,
  qr_payload,
  status
)
values
  ('E/20/455', 'E', '20', '455', 1001, '0000', 'KT1:E%2F20%2F455:1001:0000', 'issued'),
  ('MG/21/123', 'MG', '21', '123', 1002, '0000', 'KT1:MG%2F21%2F123:1002:0000', 'issued'),
  ('AG/22/456', 'AG', '22', '456', 1003, '0000', 'KT1:AG%2F22%2F456:1003:0000', 'checked_in'),
  ('AR/24/010', 'AR', '24', '010', 1004, '0000', 'KT1:AR%2F24%2F010:1004:0000', 'cancelled')
on conflict (student_id_full, ticket_no) do nothing;
