import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { logout, isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

// Bolinha com a inicial do e-mail, no canto do header — só aparece depois do
// login (visitante deslogado não vê nada). Clicando, abre um menu pequeno
// com o e-mail da conta e o botão de sair. Serve como "identificador de
// sessão": deixa claro, de relance, que você está logado e com qual conta.
export default function UserBadge() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setEmail(data.user?.email ?? null);
      setAdmin(data.user ? await isAdmin() : false);
    };
    check();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (!email) return null;

  const initial = email.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Sessão logada"
        title={email}
        className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center text-sm transition-colors ring-2 ring-black/40"
      >
        {initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 z-50 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Sessão</p>
              <p className="text-sm text-white truncate">{email}</p>
              {admin && (
                <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wide text-red-400 bg-red-600/10 border border-red-600/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={11} /> Administrador
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
