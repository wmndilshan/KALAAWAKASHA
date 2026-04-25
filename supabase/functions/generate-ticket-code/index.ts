import { corsHeaders } from "../_shared/cors.ts";
import { generateDeterministicCode } from "../_shared/code.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAuthenticatedUser(req);

    const secret = Deno.env.get("VERIFY_CODE_SECRET");
    if (!secret) {
      throw new Error("Missing VERIFY_CODE_SECRET");
    }

    const body = await req.json();
    const facultyCode = String(body.faculty_code ?? "").trim().toUpperCase();
    const batch = String(body.batch ?? "").trim();
    const studentKey = String(body.student_key ?? body.student_serial ?? "").trim().toUpperCase();
    const ticketNo = Number(body.ticket_no);

    if (!facultyCode || !batch || !studentKey || !Number.isInteger(ticketNo) || ticketNo < 1 || ticketNo > 3500) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyCode = await generateDeterministicCode(secret, facultyCode, batch, studentKey, ticketNo);

    return new Response(JSON.stringify({ verify_code: verifyCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
