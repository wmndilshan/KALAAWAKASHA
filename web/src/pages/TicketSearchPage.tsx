import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatStudentIdFull, formatStudentSerial } from "../lib/code";
import { supabase } from "../lib/supabase";
import { Ticket, TicketStatus } from "../lib/types";

const PAGE_SIZE = 50;

export function TicketSearchPage() {
  const [studentId, setStudentId] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [facultyCode, setFacultyCode] = useState("all");
  const [batch, setBatch] = useState("");
  const [serial, setSerial] = useState("");
  const [hasPhoto, setHasPhoto] = useState<"all" | "with" | "without">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [rows, setRows] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRows(1);
  }, []);

  const fetchRows = async (nextPage: number) => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("tickets")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((nextPage - 1) * PAGE_SIZE, nextPage * PAGE_SIZE - 1);

    if (studentId.trim()) {
      query = query.ilike("student_id_full", `%${studentId.trim().toUpperCase()}%`);
    }

    if (ticketNo.trim()) {
      query = query.eq("ticket_no", Number(ticketNo));
    }

    if (facultyCode !== "all") {
      if (facultyCode === "A") {
        query = query.in("faculty_code", ["A", "AR"]);
      } else {
        query = query.eq("faculty_code", facultyCode);
      }
    }

    if (batch.trim()) {
      query = query.eq("batch", batch.trim());
    }

    if (serial.trim()) {
      query = query.eq("student_serial", serial.trim());
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (hasPhoto === "with") {
      query = query.not("photo_path", "is", null);
    }

    if (hasPhoto === "without") {
      query = query.is("photo_path", null);
    }

    if (fromDate) {
      query = query.gte("created_at", `${fromDate}T00:00:00.000Z`);
    }

    if (toDate) {
      query = query.lte("created_at", `${toDate}T23:59:59.999Z`);
    }

    const { data, count, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setRows(data ?? []);
    setTotalCount(count ?? 0);
    setPage(nextPage);
    setLoading(false);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    void fetchRows(1);
  };

  const clearFilters = () => {
    setStudentId("");
    setTicketNo("");
    setFacultyCode("all");
    setBatch("");
    setSerial("");
    setStatus("all");
    setHasPhoto("all");
    setFromDate("");
    setToDate("");
    setTimeout(() => {
      void fetchRows(1);
    }, 0);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <section>
      <h2 className="font-['Sora'] text-xl">Tickets Database</h2>
      <p className="mt-1 text-sm text-ink/70">Filter and browse all ticket records.</p>

      <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-2 rounded-xxl bg-white p-4 shadow-panel sm:grid-cols-2">
        <input
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Student ID"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <input
          value={ticketNo}
          onChange={(e) => setTicketNo(e.target.value)}
          placeholder="Ticket number"
          type="number"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <select
          value={facultyCode}
          onChange={(e) => setFacultyCode(e.target.value)}
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        >
          <option value="all">All faculties</option>
          <option value="M">M</option>
          <option value="MG">MG</option>
          <option value="AG">AG</option>
          <option value="A">A</option>
          <option value="V">V</option>
          <option value="D">D</option>
          <option value="AH">AH</option>
          <option value="S">S</option>
        </select>
        <input
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="Batch"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <input
          value={serial}
          onChange={(e) => setSerial(e.target.value.replace(/\D/g, "").slice(0, 3))}
          placeholder="Student number"
          inputMode="numeric"
          maxLength={3}
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus | "all")}
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        >
          <option value="all">All statuses</option>
          <option value="issued">Issued</option>
          <option value="checked_in">Checked In</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={hasPhoto}
          onChange={(e) => setHasPhoto(e.target.value as "all" | "with" | "without")}
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        >
          <option value="all">All photos</option>
          <option value="with">With photo</option>
          <option value="without">Without photo</option>
        </select>
        <input
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          type="date"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <input
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          type="date"
          className="w-full rounded-xl border border-ink/15 px-4 py-3"
        />
        <button className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-white" disabled={loading}>
          {loading ? "Filtering..." : "Apply Filters"}
        </button>
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded-xl border border-ink/20 px-4 py-3 font-semibold text-ink"
        >
          Reset
        </button>
      </form>

      <div className="mt-3 rounded-xxl bg-white p-4 shadow-panel">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <p className="font-semibold text-ink">Total records: {totalCount}</p>
          <p className="text-ink/70">
            Page {page} of {totalPages}
          </p>
        </div>

        {error ? <p className="mb-3 text-sm text-ember">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/70">
                <th className="px-2 py-2">Student ID</th>
                <th className="px-2 py-2">Ticket</th>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink/5">
                  <td className="px-2 py-2 font-semibold">{formatStudentIdFull(row.student_id_full)}</td>
                  <td className="px-2 py-2">{row.ticket_no}</td>
                  <td className="px-2 py-2">{row.verify_code}</td>
                  <td className="px-2 py-2">{row.status}</td>
                  <td className="px-2 py-2">
                    <Link to={`/tickets/${row.id}`} className="font-semibold text-pine underline-offset-2 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!rows.length && !loading ? <p className="mt-3 text-sm text-ink/70">No tickets found for the selected filters.</p> : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void fetchRows(page - 1)}
            className="rounded-xl border border-ink/20 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => void fetchRows(page + 1)}
            className="rounded-xl border border-ink/20 px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
