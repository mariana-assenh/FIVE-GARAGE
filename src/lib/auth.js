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

// Thin wrappers around Supabase Auth, kept small and named after what each
// page actually does, so the page components stay easy to read.

export async function loginWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function registerWithEmail(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

// Requires the "Confirm signup" email template in the Supabase dashboard to
// include {{ .Token }} (the 6-digit code) — see README.md.
export async function verifySignupOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });
  if (error) throw error;
  return data;
}

export async function resendSignupOtp(email) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
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
