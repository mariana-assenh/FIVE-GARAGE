// @ts-nocheck
import { supabase } from "@/lib/supabaseClient";

const TABLE = "vehicles";
const PHOTOS_BUCKET = "vehicle-photos";

export async function listVehicles({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createVehicle(payload) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ ...payload, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Uses a security-definer RPC (see supabase/schema.sql) so a visitor can
// bump the like counter without getting a blanket UPDATE policy on the table.
export async function likeVehicle(vehicleId) {
  const { data, error } = await supabase.rpc("increment_vehicle_likes", {
    vehicle_id: vehicleId,
  });
  if (error) throw error;
  return data;
}

export async function uploadVehicleImage(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
