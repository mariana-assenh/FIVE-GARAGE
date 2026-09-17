import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Gauge, Calendar, Car, Bike, Share2, Trash2, Loader2, Pencil } from "lucide-react";
import { Image } from "@/components/ui/image";
import { likeVehicle, deleteVehicle } from "@/lib/vehicles";
import { useToast } from "@/components/ui/use-toast";
import VehicleFormModal from "@/components/VehicleFormModal";

const WHATSAPP_NUMBER = "5541991369093";

export default function VehicleCard({ vehicle, isAdmin = false, onDeleted, onUpdated }) {
  const { toast } = useToast();
  const [likes, setLikes] = useState(vehicle.likes || 0);
  const [liked, setLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const detailUrl = `/veiculo/${vehicle.id}`;

  const handleLike = async (e) => {
    e.preventDefault();
    if (liked) return;
    setLiked(true);
    setLikes((l) => l + 1);
    try {
      await likeVehicle(vehicle.id);
    } catch (e) {
      // silent fail - UI already updated
    }
  };

  const handleWhatsApp = (e) => {
    e.preventDefault();
    const msg = `Olá! Tenho interesse no veículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year} - R$ ${Number(vehicle.price).toLocaleString("pt-BR")}, anunciado na Five Garage.\n${window.location.origin}${detailUrl}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleShare = async (e) => {
    e.preventDefault();
    const url = `${window.location.origin}${detailUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Five Garage", url });
      } catch (err) {
        // usuário cancelou — sem problema
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!" });
    } catch (err) {
      toast({ title: "Não foi possível copiar o link", variant: "destructive" });
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    const ok = window.confirm(
      `Excluir o anúncio "${vehicle.brand} ${vehicle.model}"? Essa ação não pode ser desfeita.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteVehicle(vehicle);
      toast({ title: "Anúncio excluído" });
      onDeleted?.(vehicle.id);
    } catch (err) {
      toast({ title: "Não foi possível excluir o anúncio", variant: "destructive" });
      setDeleting(false);
    }
  };

  const isMoto = vehicle.vehicle_type === "moto";

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditOpen(true);
  };

  return (
    <>
    <Link
      to={detailUrl}
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 hover:border-red-600/60 transition-all duration-300 hover:shadow-2xl hover:shadow-red-900/20 block"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
        {vehicle.image_url ? (
          <Image
            src={vehicle.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            fittingType="fill"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            {isMoto ? <Bike size={64} /> : <Car size={64} />}
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isMoto ? "bg-zinc-200 text-black" : "bg-red-600 text-white"}`}>
            {isMoto ? "Moto" : "Carro"}
          </span>
          {vehicle.status === "vendido" && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-black/70 text-zinc-300 border border-zinc-600">
              Vendido
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleEdit}
              aria-label="Editar anúncio"
              className="flex items-center px-2.5 py-1.5 rounded-full backdrop-blur-md border bg-black/60 border-zinc-600 text-zinc-200 hover:bg-black/80 transition-all"
            >
              <Pencil size={14} />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Excluir anúncio"
              className="flex items-center px-2.5 py-1.5 rounded-full backdrop-blur-md border bg-black/60 border-red-900/60 text-red-400 hover:bg-red-950/80 hover:text-red-300 transition-all disabled:opacity-60"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
          <button
            onClick={handleShare}
            aria-label="Compartilhar anúncio"
            className="flex items-center px-2.5 py-1.5 rounded-full backdrop-blur-md border bg-black/60 border-zinc-600 text-zinc-200 hover:bg-black/80 transition-all"
          >
            <Share2 size={14} />
          </button>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all ${liked ? "bg-red-600/90 border-red-400 text-white" : "bg-black/60 border-zinc-600 text-zinc-200 hover:bg-black/80"}`}
          >
            <Heart size={14} className={liked ? "fill-current" : ""} />
            <span className="text-xs font-semibold">{likes}</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-white leading-tight truncate">{vehicle.brand} {vehicle.model}</h3>
          <p className="text-sm text-zinc-400 line-clamp-1">{vehicle.title}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Calendar size={13} /> {vehicle.year}
          </span>
          {vehicle.mileage != null && (
            <span className="flex items-center gap-1">
              <Gauge size={13} /> {Number(vehicle.mileage).toLocaleString("pt-BR")} km
            </span>
          )}
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-zinc-500">Preço</span>
            <span className="text-xl font-extrabold text-white">
              R$ {Number(vehicle.price).toLocaleString("pt-BR")}
            </span>
          </div>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-green-900/30"
            aria-label="Solicitar informações no WhatsApp"
          >
            <MessageCircle size={16} className="fill-current" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </div>
    </Link>
    {isAdmin && (
      <VehicleFormModal
        vehicle={vehicle}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => onUpdated?.()}
      />
    )}
    </>
  );
}