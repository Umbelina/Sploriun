import { supabase } from './supabaseClient';

export async function signUp(email: string, password: string) {
  const cleanedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({ email: cleanedEmail, password });
  if (error) throw error;

  const user = data.user;
  if (user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, role: "owner", display_name: user.email?.split('@')[0] || "Proprietário" });

    if (profileError) throw profileError;
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(userId?: string) {
  // If userId not provided, use current
  const uid = userId ?? (await getUser())?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/owner/reset-password`,
  });
  if (error) throw error;
  return data;
}
