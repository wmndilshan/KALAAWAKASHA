import { FormEvent, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import {
  buildQrPayload,
  buildStudentIdFull,
  formatStudentIdFull,
  formatStudentSerial,
  generateCodeClient,
  parseStudentId,
} from "../lib/code";
import { Ticket } from "../lib/types";

const FACULTIES = [
  { code: "V", name: "Veterinary Medicine" },
  { code: "M", name: "Medicine" },
  { code: "MG", name: "Management" },
  { code: "AG", name: "Agriculture" },
  { code: "A", name: "Arts" },
  { code: "D", name: "Dental Sciences" },
  { code: "AH", name: "Allied Health Sciences" },
  { code: "S", name: "Science" },
];

const BATCH_SUGGESTIONS = ["19", "20", "21", "22", "23", "24", "25"];

const SUB_DEPARTMENTS: Record<string, string[]> = {
  A: ["LLB", "SW", "GIS", "AI"],
  AH: ["PHY", "PCY", "NUR", "RAD", "MLS"],
  AG: ["ASF", "FST"],
};

export function AddTicketPage() {
  const [facultyCode, setFacultyCode] = useState("M");
  const [batch, setBatch] = useState("");
  const [subDepartment, setSubDepartment] = useState("");
  const [studentSerial, setStudentSerial] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Ticket | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setCreated(null);

    try {
      let photoPath: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        const key = `tickets/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("ticket-photos").upload(key, photoFile, {
          contentType: photoFile.type,
          upsert: false,
        });

        if (uploadError) {
          throw uploadError;
        }

        photoPath = key;
      }

      const studentIdRaw = buildStudentIdFull({
        facultyCode,
        batch: batch.trim(),
        subDepartment,
        studentSerial,
      });
      const parsedStudent = parseStudentId(studentIdRaw);
      const studentIdFull = parsedStudent.studentIdFull;
      const ticketNoNumber = Number(ticketNo);

      const { data: duplicateStudent, error: studentCheckError } = await supabase
        .from("tickets")
        .select("id, ticket_no, status")
        .eq("student_id_full", studentIdFull)
        .maybeSingle();

      if (studentCheckError) {
        throw studentCheckError;
      }

      if (duplicateStudent) {
        if (duplicateStudent.status !== "cancelled") {
          throw new Error(`${formatStudentIdFull(studentIdFull)} already has ticket #${duplicateStudent.ticket_no}.`);
        }

        const { data: ticketConflict, error: ticketConflictError } = await supabase
          .from("tickets")
          .select("id, student_id_full, status")
          .eq("ticket_no", ticketNoNumber)
          .neq("id", duplicateStudent.id)
          .neq("status", "cancelled")
          .maybeSingle();

        if (ticketConflictError) {
          throw ticketConflictError;
        }

        if (ticketConflict) {
          throw new Error(`Ticket #${ticketNoNumber} is already issued to ${formatStudentIdFull(ticketConflict.student_id_full)}.`);
        }

        const verifyCode = await generateCodeClient(
          parsedStudent.facultyCode,
          parsedStudent.batch,
          parsedStudent.studentKey,
          ticketNoNumber,
        );
        const qrPayload = photoPath ? null : buildQrPayload(studentIdFull, ticketNoNumber, verifyCode);

        const { data: revived, error: reviveError } = await supabase
          .from("tickets")
          .update({
            faculty_code: parsedStudent.facultyCode,
            batch: parsedStudent.batch,
            student_serial: parsedStudent.studentSerial,
            ticket_no: ticketNoNumber,
            verify_code: verifyCode,
            qr_payload: qrPayload,
            photo_path: photoPath,
            status: "issued",
            checked_in_at: null,
            checked_in_by: null,
          })
          .eq("id", duplicateStudent.id)
          .select("*")
          .single();

        if (reviveError || !revived) {
          throw new Error(reviveError?.message ?? "Ticket was not re-issued");
        }

        setCreated(revived as Ticket);
        setBatch("");
        setSubDepartment("");
        setStudentSerial("");
        setTicketNo("");
        setPhotoFile(null);
        return;
      }

      const { data: duplicateTicket, error: ticketCheckError } = await supabase
        .from("tickets")
        .select("id, student_id_full")
        .eq("ticket_no", ticketNoNumber)
        .maybeSingle();

      if (ticketCheckError) {
        throw ticketCheckError;
      }

      if (duplicateTicket) {
        throw new Error(`Ticket #${ticketNoNumber} is already issued to ${formatStudentIdFull(duplicateTicket.student_id_full)}.`);
      }

      const verifyCode = await generateCodeClient(
        parsedStudent.facultyCode,
        parsedStudent.batch,
        parsedStudent.studentKey,
        ticketNoNumber,
      );
      const qrPayload = photoPath ? null : buildQrPayload(studentIdFull, ticketNoNumber, verifyCode);

      const { data, error: insertError } = await supabase
        .from("tickets")
        .insert({
          student_id_full: studentIdFull,
          faculty_code: parsedStudent.facultyCode,
          batch: parsedStudent.batch,
          student_serial: parsedStudent.studentSerial,
          ticket_no: ticketNoNumber,
          verify_code: verifyCode,
          qr_payload: qrPayload,
          photo_path: photoPath,
        })
        .select("*")
        .single();

      if (insertError || !data) {
        throw new Error(insertError?.message ?? "Ticket was not created");
      }

      setCreated(data as Ticket);
      setBatch("");
      setSubDepartment("");
      setStudentSerial("");
      setTicketNo("");
      setPhotoFile(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 className="font-['Sora'] text-xl">Add Ticket</h2>
      <form className="mt-3 space-y-3 rounded-xxl bg-white p-4 shadow-panel" onSubmit={onSubmit}>
        <select
          value={facultyCode}
          onChange={(e) => {
            setFacultyCode(e.target.value);
            setSubDepartment("");
            setStudentSerial("");
          }}
          required
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        >
          {FACULTIES.map((faculty) => (
            <option key={faculty.code} value={faculty.code}>
              {faculty.name}
            </option>
          ))}
        </select>
        <input
          value={batch}
          onChange={(e) => setBatch(e.target.value.replace(/\D/g, "").slice(0, 2))}
          inputMode="numeric"
          pattern="[0-9]{1,2}"
          list="batch-options"
          required
          placeholder="Batch"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <datalist id="batch-options">
          {BATCH_SUGGESTIONS.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        {facultyCode === "A" || facultyCode === "AH" || facultyCode === "AG" ? (
          <select
            value={subDepartment}
            onChange={(e) => setSubDepartment(e.target.value.toUpperCase())}
            required={facultyCode === "AH"}
            className="w-full rounded-xl border border-ink/15 px-4 py-3"
          >
            <option value="">{facultyCode === "AH" ? "Select department" : "No sub department (default)"}</option>
            {(SUB_DEPARTMENTS[facultyCode] ?? []).map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>
        ) : null}
        <input
          value={studentSerial}
          onChange={(e) => setStudentSerial(e.target.value.replace(/\D/g, "").slice(0, 3))}
          inputMode="numeric"
          pattern="[0-9]{1,3}"
          required={facultyCode !== "AH"}
          placeholder={facultyCode === "AH" ? "Student number (optional)" : "Student number"}
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <input
          value={ticketNo}
          onChange={(e) => setTicketNo(e.target.value.replace(/\D/g, "").slice(0, 4))}
          type="number"
          min={1}
          max={3500}
          required
          placeholder="Ticket number (1-3500)"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <label className="block rounded-xl border border-ink/15 px-4 py-3 text-sm text-ink/70">
          Ticket photo optional
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-ink"
          />
        </label>
        <button className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white" disabled={loading}>
          {loading ? "Issuing..." : "Issue Ticket"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-ember">{error}</p> : null}

      {created ? (
        <article className="mt-4 rounded-xxl bg-white p-4 shadow-panel">
          <h3 className="font-['Sora'] text-lg">Ticket Created</h3>
          <p className="mt-1">Student: {formatStudentIdFull(created.student_id_full)}</p>
          <p>Student number: {formatStudentSerial(created.student_serial)}</p>
          <p>Ticket #: {created.ticket_no}</p>
          <p className="font-bold text-pine">4-digit code: {created.verify_code}</p>
          {created.qr_payload ? (
            <div className="mt-3 rounded-xl border border-ink/10 bg-mist p-3 inline-block">
              <QRCodeSVG value={created.qr_payload} size={180} />
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
