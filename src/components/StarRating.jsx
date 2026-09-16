import React from "react";
import { Star } from "lucide-react";

// Estrelinhas reaproveitadas tanto pra exibir uma nota (readOnly) quanto
// pra deixar o visitante escolher a nota no formulário de avaliação.
export default function StarRating({ value = 0, onChange, size = 18, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
        >
          <Star size={size} className={n <= value ? "fill-yellow-400 text-yellow-400" : "text-zinc-600"} />
        </button>
      ))}
    </div>
  );
}
