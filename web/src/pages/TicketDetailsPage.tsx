import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { formatStudentIdFull, formatStudentSerial } from "../lib/code";
import { supabase } from "../lib/supabase";
import { Ticket } from "../lib/types";

export function TicketDetailsPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const { data } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
      if (!data) return;
      setTicket(data);

      if (data.photo_path) {
        const { data: signed } = await supabase.storage.from("ticket-photos").createSignedUrl(data.photo_path, 60 * 30);
        setPhotoUrl(signed?.signedUrl ?? null);
      }
    };

    void load();
  }, [id]);

  if (!ticket) {
    return <p>Ticket not found.</p>;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-['Sora'] text-xl">Ticket Details</h2>
        <Link to="/search" className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink">
          Back
        </Link>
      </div>
      <article className="rounded-xxl bg-white p-4 shadow-panel">
        <p className="font-semibold">{formatStudentIdFull(ticket.student_id_full)}</p>
        <p>Student number: {formatStudentSerial(ticket.student_serial)}</p>
        <p>Faculty: {ticket.faculty_code}</p>
        <p>Batch: {ticket.batch}</p>
        <p>Ticket #{ticket.ticket_no}</p>
        <p>Code: {ticket.verify_code}</p>
        <p>Status: {ticket.status}</p>
        <p>Photo: {ticket.photo_path ? "Yes" : "No"}</p>
        <p>Checked In At: {ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString() : "-"}</p>
        <p>Created: {new Date(ticket.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(ticket.updated_at).toLocaleString()}</p>
        {ticket.qr_payload ? (
          <div className="mt-3 inline-block rounded-xl border border-ink/10 bg-mist p-3">
            <QRCodeSVG value={ticket.qr_payload} size={180} />
          </div>
        ) : null}
        {photoUrl ? <img src={photoUrl} alt="Student" className="mt-3 h-44 w-full rounded-xl object-cover" /> : null}
      </article>
    </section>
  );
}
