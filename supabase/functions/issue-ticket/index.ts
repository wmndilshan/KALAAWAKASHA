import { corsHeaders } from "../_shared/cors.ts";
import { buildQrPayload, generateDeterministicCode } from "../_shared/code.ts";
import { parseStudentId } from "../_shared/student.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireAuthenticatedUser(req);
    const secret = Deno.env.get("VERIFY_CODE_SECRET");

    if (!secret) {
      throw new Error("Missing VERIFY_CODE_SECRET");
    }

    const body = await req.json();
    const studentIdFullRaw = String(body.student_id_full ?? "");
    const ticketNo = Number(body.ticket_no);
    const photoPath = body.photo_path ? String(body.photo_path) : null;

    if (!Number.isInteger(ticketNo) || ticketNo < 1 || ticketNo > 3500) {
      return new Response(JSON.stringify({ error: "Invalid ticket_no" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseStudentId(studentIdFullRaw);
    const verifyCode = await generateDeterministicCode(
      secret,
      parsed.facultyCode,
      parsed.batch,
      parsed.studentKey,
      ticketNo,
    );

    const qrPayload = photoPath ? null : buildQrPayload(parsed.studentIdFull, ticketNo, verifyCode);

    const { data: ticket, error: insertError } = await adminClient
      .from("tickets")
      .insert({
        student_id_full: parsed.studentIdFull,
        faculty_code: parsed.facultyCode,
        batch: parsed.batch,
        student_serial: parsed.studentSerial,
        ticket_no: ticketNo,
        verify_code: verifyCode,
        qr_payload: qrPayload,
        photo_path: photoPath,
      })
      .select("*")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("checkin_logs").insert({
      ticket_id: ticket.id,
      action: "manual_lookup",
      message: "Ticket issued",
      performed_by: user.id,
    });

    return new Response(JSON.stringify({ ticket }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
