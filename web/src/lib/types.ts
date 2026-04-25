export type TicketStatus = "issued" | "checked_in" | "cancelled";

export type Ticket = {
  id: string;
  student_id_full: string;
  faculty_code: string;
  batch: string;
  student_serial: string;
  ticket_no: number;
  verify_code: string;
  qr_payload: string | null;
  photo_path: string | null;
  status: TicketStatus;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckinLog = {
  id: string;
  ticket_id: string;
  action: "checked_in" | "rejected" | "duplicate" | "manual_lookup";
  message: string | null;
  performed_by: string | null;
  created_at: string;
};
