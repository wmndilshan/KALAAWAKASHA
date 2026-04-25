import { corsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireAuthenticatedUser(req);
    const body = await req.json();
    const ticketId = String(body.ticket_id ?? "");

    if (!ticketId) {
      return new Response(JSON.stringify({ error: "ticket_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: checkedInTicket, error: rpcError } = await adminClient.rpc("check_in_ticket_atomic", {
      p_ticket_id: ticketId,
      p_actor: user.id,
    });

    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!checkedInTicket) {
      const { data: current } = await adminClient
        .from("tickets")
        .select("id,status")
        .eq("id", ticketId)
        .maybeSingle();

      await adminClient.from("checkin_logs").insert({
        ticket_id: ticketId,
        action: "duplicate",
        message: "Duplicate check-in blocked",
        performed_by: user.id,
      });

      return new Response(JSON.stringify({
        checked_in: false,
        duplicate: true,
        status: current?.status ?? null,
        error: "Ticket already checked in or invalid state",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ checked_in: true, ticket: checkedInTicket }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
