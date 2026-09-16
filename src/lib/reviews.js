// @ts-nocheck
import { supabase } from "@/lib/supabaseClient";

const TABLE = "reviews";

// Só as avaliações já aprovadas (a policy de SELECT no Supabase também só
// devolve essas pra quem não é admin — ver supabase/schema.sql).
export async function listApprovedReviews({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// Todas as avaliações, incluindo as pendentes — só administradores
// conseguem ver as pendentes (a policy de SELECT exige is_admin() pra isso).
export async function listAllReviews() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Qualquer visitante pode enviar (logado ou não). Sempre entra como
// pendente — a policy de INSERT no Supabase bloqueia se vier approved=true.
export async function submitReview({ author_name, rating, comment }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ author_name: author_name || null, rating, comment, approved: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveReview(id) {
  const { error } = await supabase.from(TABLE).update({ approved: true }).eq("id", id);
  if (error) throw error;
}

export async function rejectReview(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
