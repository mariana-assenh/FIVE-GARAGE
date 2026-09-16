import React, { useState } from "react";
import StarRating from "@/components/StarRating";
import { submitReview } from "@/lib/reviews";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Formulário público (qualquer visitante, logado ou não, pode enviar). A
// avaliação sempre entra como pendente — só aparece no site depois que um
// administrador aprovar (a policy de INSERT no Supabase garante isso).
export default function ReviewForm() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast({ title: "Escreva um breve comentário", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await submitReview({ author_name: name.trim(), rating, comment: comment.trim() });
      setSent(true);
      setName("");
      setComment("");
      setRating(5);
    } catch (err) {
      toast({ title: "Não foi possível enviar sua avaliação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-zinc-300">
        Obrigado! Sua avaliação foi enviada e será publicada após aprovação.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-zinc-300">Sua nota</Label>
        <StarRating value={rating} onChange={setRating} size={24} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-zinc-300">Seu nome (opcional)</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como quer ser identificado"
          className="bg-zinc-950 border-zinc-700 text-white"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-zinc-300">Sua avaliação *</Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Conte como foi sua experiência..."
          className="bg-zinc-950 border-zinc-700 text-white resize-none"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3">
        {loading ? "Enviando..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}
