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

export async function getVehicle(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
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

// Apaga o anúncio (a policy de DELETE no Supabase só deixa administradores
// fazerem isso — ver supabase/schema.sql). Aceita o id ou o objeto do
// veículo; se vier o objeto, também tenta apagar a foto associada no
// Storage — isso é best-effort: se falhar (por exemplo, a policy de DELETE
// do bucket ainda não foi criada), o anúncio já foi removido mesmo assim.
export async function deleteVehicle(vehicle) {
  const id = typeof vehicle === "string" ? vehicle : vehicle.id;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;

  const imageUrl = vehicle && typeof vehicle === "object" ? vehicle.image_url : null;
  if (imageUrl) {
    const marker = `/${PHOTOS_BUCKET}/`;
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      const path = imageUrl.slice(idx + marker.length);
      supabase.storage.from(PHOTOS_BUCKET).remove([path]).catch(() => {});
    }
  }
}

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