// @ts-nocheck
import { supabase } from "@/lib/supabaseClient";

// Whether the current session belongs to an administrator (the only role
// allowed to publish vehicles — see the RLS policies in supabase/schema.sql
// and the "profiles" table they read from). Returns false for a signed-out
// visitor and for a regular, non-admin account.
export async function isAdmin() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return false;
  return !!data?.is_admin;
}

export async function loginWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Confirmação por link (o padrão do Supabase, sem precisar mexer em nenhum
// modelo de e-mail): a pessoa cadastra e-mail/senha, recebe um e-mail com um
// link de confirmação, e ao clicar já cai de volta no site autenticada.
export async function registerWithEmail(email, password) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function resendSignupEmail(email) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

export async function loginWithGoogle(returnTo = "/") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${returnTo}` },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function logout() {
  await supabase.auth.signOut();
}