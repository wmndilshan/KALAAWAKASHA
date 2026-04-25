import { supabase } from "./supabase";

export async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error(`${name} returned no data`);
  }
  return data;
}
