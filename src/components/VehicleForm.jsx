// CTA de "publicar anúncio" mostrado na vitrine: convite pro WhatsApp para
// quem não é admin, botão "Publicar novo anúncio" para quem é. O
// formulário em si (campos grandes, fotos, prévia) mora em
// VehicleFormModal — este componente só decide quando abrir esse modal
// no modo de criação.
import React, { useEffect, useState } from "react";
import { Upload, MessageCircle } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import VehicleFormModal from "@/components/VehicleFormModal";

const WHATSAPP_NUMBER = "5541991369093";

export default function VehicleForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState("checking"); // checking | admin | public

  // Publicar é restrito a administradores (a policy de INSERT no Supabase
  // também exige isso — ver supabase/schema.sql). Quem não é admin, logado
  // ou não, vê o convite para falar pelo WhatsApp em vez de um formulário
  // que não teria como usar.
  useEffect(() => {
    let active = true;
    const check = () => isAdmin().then((ok) => active && setAccess(ok ? "admin" : "public"));
    check();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (access !== "admin") {
    const msg = "Olá! Quero anunciar meu veículo na Five Garage.";
    return (
      <div className="text-center">
        <p className="text-zinc-400 mb-4">
          Quer vender seu veículo? Fale com a gente pelo WhatsApp e cuidamos do anúncio pra você.
        </p>
        <Button
          asChild
          disabled={access === "checking"}
          className="bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-6 text-base font-bold rounded-xl"
        >
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-2" size={20} /> Falar no WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <Button
          onClick={() => setOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-base font-bold rounded-xl"
        >
          <Upload className="mr-2" size={20} /> Publicar novo anúncio
        </Button>
      </div>
      <VehicleFormModal vehicle={null} open={open} onOpenChange={setOpen} onSaved={onCreated} />
    </>
  );
}
