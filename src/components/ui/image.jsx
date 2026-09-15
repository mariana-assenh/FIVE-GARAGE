// @ts-nocheck
import * as React from "react";
import { cn } from "@/lib/utils";

const FIT_CLASSES = {
  fill: "object-cover",
  cover: "object-cover",
  contain: "object-contain",
};

// Small wrapper so callers can pass a semantic fittingType instead of
// remembering Tailwind's object-fit class names.
const Image = React.forwardRef(({ className, fittingType = "cover", ...props }, ref) => {
  return (
    <img
      ref={ref}
      loading="lazy"
      className={cn(FIT_CLASSES[fittingType] || "object-cover", className)}
      {...props}
    />
  );
});
Image.displayName = "Image";

export { Image };
