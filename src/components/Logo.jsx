import React from "react";

const SOURCES = {
  // Emblema (carro + moto), sem texto — usado pequeno, ao lado do nome
  // "FIVE GARAGE" em texto (navbar e rodapé).
  mark: "/logo-mark.jpg",
  // Emblema + "FIVE GARAGE" por extenso — usado grande, como peça central
  // (seção hero).
  lockup: "/logo-lockup.jpg",
};

export default function Logo({ className = "h-12 w-auto", variant = "mark", alt = "Five Garage" }) {
  return (
    <img
      src={SOURCES[variant] || SOURCES.mark}
      alt={alt}
      className={`object-contain ${className}`}
    />
  );
}
