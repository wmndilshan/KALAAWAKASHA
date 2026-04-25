import { FormEvent, useMemo, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  buildStudentIdFull,
  formatStudentIdFull,
  formatStudentSerial,
  generateCodeClient,
  parseStudentId,
} from "../lib/code";
import { callFunction, supabase } from "../lib/supabase";
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

type VerifyResponse = {
  valid: boolean;
  duplicate?: boolean;
  error?: string;
  ticket?: Ticket;
};

export function CheckTicketPage() {
  const [facultyCode, setFacultyCode] = useState("M");
  const [batch, setBatch] = useState("");
  const [subDepartment, setSubDepartment] = useState("");
  const [studentSerial, setStudentSerial] = useState("");
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualTicketNo, setManualTicketNo] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [checkInMsg, setCheckInMsg] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const statusTone = useMemo(() => {
    if (!result) return "text-ink";
    if (result.valid) return "text-pine";
    if (result.duplicate) return "text-ember";
    return "text-ember";
  }, [result]);

  const onScan = async (payloadText: string) => {
    const verify = await callFunction<VerifyResponse>("verify-ticket-v2", { qr_payload: payloadText });
    setResult(verify);
    setCheckInMsg(null);

    if (verify.ticket?.photo_path) {
      const { data } = await supabase.storage.from("ticket-photos").createSignedUrl(verify.ticket.photo_path, 300);
      setPhotoUrl(data?.signedUrl ?? null);
    } else {
      setPhotoUrl(null);
    }
  };

  const onManual = async (event: FormEvent) => {
    event.preventDefault();
    const studentIdRaw = buildStudentIdFull({
      facultyCode,
      batch: batch.trim(),
      subDepartment,
      studentSerial,
    });
    const parsedStudent = parseStudentId(studentIdRaw);
    const ticketNoNumber = Number(manualTicketNo);
    const verifyCode = await generateCodeClient(
      parsedStudent.facultyCode,
      parsedStudent.batch,
      parsedStudent.studentKey,
      ticketNoNumber,
    );
    const studentIdFull = parsedStudent.studentIdFull;

    const verify = await callFunction<VerifyResponse>("verify-ticket-v2", {
      student_id_full: studentIdFull,
      ticket_no: ticketNoNumber,
      verify_code: verifyCode,
    });
    setResult(verify);
    setCheckInMsg(null);
    setManualStudentId(formatStudentIdFull(studentIdFull));

    if (verify.ticket?.photo_path) {
      const { data } = await supabase.storage.from("ticket-photos").createSignedUrl(verify.ticket.photo_path, 300);
      setPhotoUrl(data?.signedUrl ?? null);
    } else {
      setPhotoUrl(null);
    }
  };

  const onCheckIn = async () => {
    if (!result?.ticket?.id) return;
    const out = await callFunction<{ checked_in: boolean; error?: string }>("check-in-ticket-open", {
      ticket_id: result.ticket.id,
    });
    setCheckInMsg(out.checked_in ? "Checked in successfully" : out.error ?? "Check-in failed");
  };

  return (
    <section className="space-y-3">
      <h2 className="font-['Sora'] text-xl">Check Ticket</h2>

      <article className="rounded-xxl bg-white p-3 shadow-panel">
        <p className="mb-2 text-sm font-semibold">QR Scan</p>
        {!scannerEnabled ? (
          <button
            type="button"
            onClick={() => {
              setScannerError(null);
              setScannerEnabled(true);
            }}
            className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white"
          >
            Start QR Scanner
          </button>
        ) : (
          <>
            <Scanner
              constraints={{ facingMode: "environment" }}
              onError={(error) => {
                setScannerError((error as Error).message);
                setScannerEnabled(false);
              }}
              onScan={(codes) => {
                const raw = codes[0]?.rawValue;
                if (raw) {
                  void onScan(raw);
                }
              }}
            />
            <button
              type="button"
              onClick={() => setScannerEnabled(false)}
              className="mt-2 w-full rounded-xl border border-ink/20 px-4 py-2 text-sm font-semibold text-ink"
            >
              Stop Scanner
            </button>
          </>
        )}
        {scannerError ? <p className="mt-2 text-sm text-ember">Scanner error: {scannerError}. Use manual fallback below.</p> : null}
      </article>

      <form onSubmit={onManual} className="space-y-2 rounded-xxl bg-white p-4 shadow-panel">
        <p className="text-sm font-semibold">Manual fallback</p>
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
          list="check-batch-options"
          placeholder="Batch"
          required
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <datalist id="check-batch-options">
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
          placeholder={facultyCode === "AH" ? "Student number (optional)" : "Student number"}
          required={facultyCode !== "AH"}
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <input
          value={manualStudentId}
          onChange={(e) => setManualStudentId(e.target.value.toUpperCase())}
          placeholder="Student ID preview"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
          readOnly
        />
        <input
          value={manualTicketNo}
          onChange={(e) => setManualTicketNo(e.target.value)}
          placeholder="Ticket no"
          type="number"
          required
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <button className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white">Verify</button>
      </form>

      {result ? (
        <article className="rounded-xxl bg-white p-4 shadow-panel">
          <p className={`text-lg font-extrabold ${statusTone}`}>
            {result.valid ? "Valid ticket" : result.duplicate ? "Duplicate" : "Invalid"}
          </p>
          {result.error ? <p className="text-sm">{result.error}</p> : null}
          {result.ticket ? (
            <div className="mt-2 space-y-1 text-sm">
              <p>{formatStudentIdFull(result.ticket.student_id_full)}</p>
              <p>Student number: {formatStudentSerial(result.ticket.student_serial)}</p>
              <p>Ticket #{result.ticket.ticket_no}</p>
              <p>Status: {result.ticket.status}</p>
              {photoUrl ? <img src={photoUrl} alt="Student" className="h-40 w-full rounded-xl object-cover" /> : null}
            </div>
          ) : null}
          {result.valid && result.ticket?.status === "issued" ? (
            <button onClick={onCheckIn} className="mt-3 w-full rounded-xl bg-pine px-4 py-3 font-semibold text-white">
              Confirm Check-in
            </button>
          ) : null}
          {checkInMsg ? <p className="mt-2 text-sm">{checkInMsg}</p> : null}
        </article>
      ) : null}
    </section>
  );
}
