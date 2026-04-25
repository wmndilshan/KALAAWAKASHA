import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export function createClients(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  return { userClient, adminClient };
}

export async function requireAuthenticatedUser(req: Request) {
  const { userClient, adminClient } = createClients(req);
  const { data: authData, error: authError } = await userClient.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("Unauthorized");
  }

  return {
    user: authData.user,
    adminClient,
  };
}
