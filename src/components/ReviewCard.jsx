import React, { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import StarRating from "@/components/StarRating";
import { deleteReview } from "@/lib/reviews";
import { useToast } from "@/components/ui/use-toast";

// Exibe uma avaliação já aprovada. Quem não é admin só recebe avaliações
// aprovadas do Supabase (a policy de SELECT filtra isso — ver
// supabase/schema.sql), então este componente não precisa checar nada pra
// exibir. O botão de excluir só aparece pra admin (a policy de DELETE
// também exige isso).
export default function ReviewCard({ review, isAdmin = false, onDeleted }) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    const ok = window.confirm("Excluir esta avaliação? Essa ação não pode ser desfeita.");
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteReview(review.id);
      toast({ title: "Avaliação excluída" });
      onDeleted?.(review.id);
    } catch (err) {
      toast({ title: "Não foi possível excluir a avaliação", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 relative">
      <div className="flex items-start justify-between gap-3">
        <StarRating value={review.rating} readOnly size={16} />
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Excluir avaliação"
            className="w-7 h-7 shrink-0 rounded-full bg-red-950/60 hover:bg-red-950 border border-red-900/60 text-red-400 flex items-center justify-center transition-colors disabled:opacity-60"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        )}
      </div>
      <p className="text-zinc-300 text-sm mt-3 leading-relaxed">"{review.comment}"</p>
      <p className="text-xs text-zinc-500 mt-3 uppercase tracking-widest">
        {review.author_name || "Cliente Five Garage"}
      </p>
    </div>
  );
}
