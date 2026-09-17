import React, { useState } from "react";
import { Building2, MapPin, Phone, Pencil, Trash2, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { deletePartnerListing } from "@/lib/partnerListings";
import { useToast } from "@/components/ui/use-toast";
import PartnerListingFormModal from "@/components/PartnerListingFormModal";

// Card de um anúncio parceiro na sessão "Anúncios parceiros". Editar/
// excluir só aparece para administradores (a policy de UPDATE/DELETE no
// Supabase também exige isso — ver supabase/schema.sql).
export default function PartnerListingCard({ listing, isAdmin = false, onDeleted, onUpdated }) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    const ok = window.confirm(`Excluir o anúncio de "${listing.company_name}"? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    setDeleting(true);
    try {
      await deletePartnerListing(listing);
      toast({ title: "Anúncio parceiro excluído" });
      onDeleted?.(listing.id);
    } catch (err) {
      toast({ title: "Não foi possível excluir o anúncio", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900 to-black border border-zinc-800">
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
        {listing.image_url ? (
          <Image src={listing.image_url} alt={listing.company_name} fittingType="cover" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Building2 size={56} />
          </div>
        )}
        {isAdmin && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Editar anúncio parceiro"
              className="flex items-center px-2.5 py-1.5 rounded-full backdrop-blur-md border bg-black/60 border-zinc-600 text-zinc-200 hover:bg-black/80 transition-all"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Excluir anúncio parceiro"
              className="flex items-center px-2.5 py-1.5 rounded-full backdrop-blur-md border bg-black/60 border-red-900/60 text-red-400 hover:bg-red-950/80 hover:text-red-300 transition-all disabled:opacity-60"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-lg font-bold text-white leading-tight">{listing.company_name}</h3>

        <div className="space-y-1 text-sm text-zinc-400">
          {listing.phone && (
            <a href={`tel:${listing.phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone size={13} className="text-red-500 shrink-0" /> {listing.phone}
            </a>
          )}
          {listing.address && (
            <span className="flex items-center gap-2">
              <MapPin size={13} className="text-red-500 shrink-0" /> {listing.address}
            </span>
          )}
        </div>

        {listing.description && (
          <p className="text-sm text-zinc-400 line-clamp-3 pt-1">{listing.description}</p>
        )}
      </div>

      {isAdmin && (
        <PartnerListingFormModal
          listing={listing}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => onUpdated?.()}
        />
      )}
    </div>
  );
}
