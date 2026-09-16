import React, { useEffect, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import StarRating from "@/components/StarRating";
import { listAllReviews, approveReview, rejectReview } from "@/lib/reviews";
import { useToast } from "@/components/ui/use-toast";

// Painel de moderação, visível só para administradores (a policy de SELECT
// no Supabase já garante que só admin recebe as avaliações pendentes — ver
// supabase/schema.sql). Aprovar publica no site; rejeitar exclui.
export default function PendingReviews() {
  const { toast } = useToast();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await listAllReviews();
      setPending(all.filter((r) => !r.approved));
    } catch (e) {
      setPending([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      await approveReview(id);
      setPending((p) => p.filter((r) => r.id !== id));
      toast({ title: "Avaliação publicada" });
    } catch (e) {
      toast({ title: "Não foi possível aprovar", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    const ok = window.confirm("Rejeitar e excluir esta avaliação?");
    if (!ok) return;
    setBusyId(id);
    try {
      await rejectReview(id);
      setPending((p) => p.filter((r) => r.id !== id));
      toast({ title: "Avaliação rejeitada" });
    } catch (e) {
      toast({ title: "Não foi possível rejeitar", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  if (loading || pending.length === 0) return null;

  return (
    <div className="mb-8 p-5 rounded-2xl bg-amber-950/30 border border-amber-700/40 text-left">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">
        Avaliações pendentes de aprovação ({pending.length})
      </h3>
      <div className="space-y-3">
        {pending.map((r) => (
          <div
            key={r.id}
            className="flex items-start justify-between gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800"
          >
            <div className="min-w-0">
              <StarRating value={r.rating} readOnly size={14} />
              <p className="text-sm text-zinc-300 mt-2">"{r.comment}"</p>
              <p className="text-xs text-zinc-500 mt-1">{r.author_name || "Anônimo"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleApprove(r.id)}
                disabled={busyId === r.id}
                aria-label="Aprovar avaliação"
                className="w-8 h-8 rounded-full bg-green-950/60 hover:bg-green-950 border border-green-800/60 text-green-400 flex items-center justify-center transition-colors disabled:opacity-60"
              >
                {busyId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button
                onClick={() => handleReject(r.id)}
                disabled={busyId === r.id}
                aria-label="Rejeitar avaliação"
                className="w-8 h-8 rounded-full bg-red-950/60 hover:bg-red-950 border border-red-900/60 text-red-400 flex items-center justify-center transition-colors disabled:opacity-60"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
