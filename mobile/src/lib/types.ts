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

export type VerifyResponse = {
  valid: boolean;
  duplicate?: boolean;
  error?: string;
  ticket?: Ticket;
};
