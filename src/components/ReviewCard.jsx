import React from "react";
import StarRating from "@/components/StarRating";

// Exibe uma avaliação já aprovada. Quem não é admin só recebe avaliações
// aprovadas do Supabase (a policy de SELECT filtra isso — ver
// supabase/schema.sql), então este componente não precisa checar nada.
export default function ReviewCard({ review }) {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
      <StarRating value={review.rating} readOnly size={16} />
      <p className="text-zinc-300 text-sm mt-3 leading-relaxed">"{review.comment}"</p>
      <p className="text-xs text-zinc-500 mt-3 uppercase tracking-widest">
        {review.author_name || "Cliente Five Garage"}
      </p>
    </div>
  );
}
