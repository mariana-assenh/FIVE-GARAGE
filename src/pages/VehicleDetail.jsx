// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bike, Calendar, Car, Copy, Gauge, MessageCircle, Share2, Trash2, Loader2 } from "lucide-react";
import { getVehicle, deleteVehicle } from "@/lib/vehicles";
import { isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";
import Logo from "@/components/Logo";

const WHATSAPP_NUMBER = "5541991369093";

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState(null);
  const [status, setStatus] = useState("loading");
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    const check = () => isAdmin().then((ok) => active && setIsAdminUser(ok));
    check();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    getVehicle(id)
      .then((data) => {
        if (!active) return;
        if (data) {
          setVehicle(data);
          setStatus("found");
        } else {
          setStatus("not-found");
        }
      })
      .catch(() => active && setStatus("not-found"));
    return () => {
      active = false;
    };
  }, [id]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copiado!" });
    } catch (e) {
      toast({ title: "Não foi possível copiar o link", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Five Garage", url: shareUrl });
      } catch (e) {
        // usuário cancelou o compartilhamento — sem problema
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsApp = () => {
    if (!vehicle) return;
    const msg = `Olá! Tenho interesse no veículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year} - R$ ${Number(vehicle.price).toLocaleString("pt-BR")}, anunciado na Five Garage.\n${shareUrl}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleDelete = async () => {
    if (!vehicle || deleting) return;
    const ok = window.confirm(
      `Excluir o anúncio "${vehicle.brand} ${vehicle.model}"? Essa ação não pode ser desfeita.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteVehicle(vehicle);
      toast({ title: "Anúncio excluído" });
      navigate("/");
    } catch (err) {
      toast({ title: "Não foi possível excluir o anúncio", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${isAdminUser ? "text-zinc-900" : "text-white"}`}
      style={
        isAdminUser
          ? { backgroundColor: "#ffffff", backgroundAttachment: "fixed" }
          : {
              backgroundColor: "#000000",
              backgroundImage: "radial-gradient(circle at 15% 10%, rgba(239,68,68,0.06), transparent 45%)",
              backgroundAttachment: "fixed",
            }
      }
    >
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <div className="leading-none">
              <span className="block font-bold tracking-wider text-white">FIVE GARAGE</span>
              <span className="block text-[10px] text-red-500 tracking-[0.2em] uppercase">Carros & Motos</span>
            </div>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Voltar aos anúncios
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        {status === "loading" && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-[4/3] rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 rounded bg-zinc-900 animate-pulse" />
              <div className="h-6 w-1/3 rounded bg-zinc-900 animate-pulse" />
              <div className="h-24 rounded bg-zinc-900 animate-pulse" />
            </div>
          </div>
        )}

        {status === "not-found" && (
          <div className="text-center py-20 text-zinc-500">
            <Car size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg">Não encontramos esse anúncio.</p>
            <p className="text-sm mb-6">Ele pode ter sido vendido ou removido.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold transition-colors">
              Ver todos os anúncios
            </Link>
          </div>
        )}

        {status === "found" && vehicle && (
          <div className="grid md:grid-cols-2 gap-8 md:gap-10">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
              {vehicle.image_url ? (
                <Image src={vehicle.image_url} alt={`${vehicle.brand} ${vehicle.model}`} fittingType="cover" className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  {vehicle.vehicle_type === "moto" ? <Bike size={80} /> : <Car size={80} />}
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${vehicle.vehicle_type === "moto" ? "bg-zinc-200 text-black" : "bg-red-600 text-white"}`}>
                  {vehicle.vehicle_type === "moto" ? "Moto" : "Carro"}
                </span>
                {vehicle.status === "vendido" && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-black/70 text-zinc-300 border border-zinc-600">
                    Vendido
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <h1 className="text-3xl font-extrabold leading-tight">{vehicle.brand} {vehicle.model}</h1>
              <p className="text-zinc-400 mt-1">{vehicle.title}</p>

              <div className="flex items-center gap-5 text-sm text-zinc-400 mt-4">
                <span className="flex items-center gap-1.5"><Calendar size={15} /> {vehicle.year}</span>
                {vehicle.mileage != null && (
                  <span className="flex items-center gap-1.5"><Gauge size={15} /> {Number(vehicle.mileage).toLocaleString("pt-BR")} km</span>
                )}
              </div>

              <div className="mt-6">
                <span className="block text-xs uppercase tracking-widest text-zinc-500">Preço</span>
                <span className="text-4xl font-extrabold">R$ {Number(vehicle.price).toLocaleString("pt-BR")}</span>
              </div>

              {vehicle.description && (
                <p className="text-zinc-300 mt-6 leading-relaxed whitespace-pre-line">{vehicle.description}</p>
              )}

              <div className="flex flex-wrap gap-3 mt-8">
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-5 py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-green-900/30"
                >
                  <MessageCircle size={18} className="fill-current" /> Falar no WhatsApp
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Share2 size={18} /> Compartilhar
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Copy size={16} /> Copiar link
                </button>
                {isAdminUser && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 bg-red-950/60 hover:bg-red-950 border border-red-900/60 text-red-400 hover:text-red-300 px-5 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {deleting ? "Excluindo..." : "Excluir anúncio"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}