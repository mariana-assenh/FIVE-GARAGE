// @ts-nocheck
import { supabase } from "@/lib/supabaseClient";

const TABLE = "team_members";
const PHOTOS_BUCKET = "team-photos";

export async function listTeamMembers() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// Só administradores conseguem criar/editar/remover (a policy no Supabase
// também exige isso — ver supabase/schema.sql).
export async function createTeamMember(payload) {
  const { data, error } = await supabase.from(TABLE).insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateTeamMember(id, patch) {
  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTeamMember(member) {
  const id = typeof member === "string" ? member : member.id;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;

  const photoUrl = member && typeof member === "object" ? member.photo_url : null;
  if (photoUrl) {
    const marker = `/${PHOTOS_BUCKET}/`;
    const idx = photoUrl.indexOf(marker);
    if (idx !== -1) {
      const path = photoUrl.slice(idx + marker.length);
      supabase.storage.from(PHOTOS_BUCKET).remove([path]).catch(() => {});
    }
  }
}

export async function uploadTeamPhoto(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
