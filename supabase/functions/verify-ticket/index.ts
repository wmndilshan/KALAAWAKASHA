import { corsHeaders } from "../_shared/cors.ts";
import { generateDeterministicCode, parseQrPayload } from "../_shared/code.ts";
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

    let studentIdFull = "";
    let ticketNo = 0;
    let inputCode = "";

    if (body.qr_payload) {
      const parsedQr = parseQrPayload(String(body.qr_payload));
      studentIdFull = parsedQr.studentIdFull;
      ticketNo = parsedQr.ticketNo;
      inputCode = parsedQr.verifyCode;
    } else {
      studentIdFull = String(body.student_id_full ?? "");
      ticketNo = Number(body.ticket_no);
      inputCode = String(body.verify_code ?? "");
    }

    if (!/^\d{4}$/.test(inputCode) || !Number.isInteger(ticketNo) || ticketNo < 1 || ticketNo > 3500) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid verification input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedStudent = parseStudentId(studentIdFull);

    const { data: ticket, error: ticketError } = await adminClient
      .from("tickets")
      .select("*")
      .eq("student_id_full", parsedStudent.studentIdFull)
      .eq("ticket_no", ticketNo)
      .maybeSingle();

    if (ticketError || !ticket) {
      await adminClient.from("checkin_logs").insert({
        action: "rejected",
        message: "Ticket not found",
        performed_by: user.id,
      });

      return new Response(JSON.stringify({ valid: false, error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expectedCode = await generateDeterministicCode(
      secret,
      parsedStudent.facultyCode,
      parsedStudent.batch,
      parsedStudent.studentKey,
      ticketNo,
    );

    const codeMatches = inputCode === expectedCode && ticket.verify_code === expectedCode;

    if (!codeMatches) {
      await adminClient.from("checkin_logs").insert({
        ticket_id: ticket.id,
        action: "rejected",
        message: "Verification code mismatch",
        performed_by: user.id,
      });

      return new Response(JSON.stringify({ valid: false, error: "Invalid verification code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ticket.status === "cancelled") {
      await adminClient.from("checkin_logs").insert({
        ticket_id: ticket.id,
        action: "rejected",
        message: "Ticket cancelled",
        performed_by: user.id,
      });

      return new Response(JSON.stringify({ valid: false, error: "Ticket cancelled", ticket }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ticket.status === "checked_in") {
      await adminClient.from("checkin_logs").insert({
        ticket_id: ticket.id,
        action: "duplicate",
        message: "Already checked in",
        performed_by: user.id,
      });

      return new Response(JSON.stringify({ valid: false, duplicate: true, error: "Already checked in", ticket }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient.from("checkin_logs").insert({
      ticket_id: ticket.id,
      action: body.qr_payload ? "checked_in" : "manual_lookup",
      message: "Ticket verification passed",
      performed_by: user.id,
    });

    return new Response(JSON.stringify({ valid: true, ticket }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ valid: false, error: (error as Error).message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
