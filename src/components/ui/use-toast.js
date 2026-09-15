// @ts-nocheck
import { toast as sonnerToast } from "sonner";

// Small shim so existing call sites (toast({ title, description, variant }))
// keep working on top of the "sonner" toast library.
export function toast({ title, description, variant } = {}) {
  const message = description ? [title, description].filter(Boolean).join(" — ") : title;
  if (variant === "destructive") {
    return sonnerToast.error(message);
  }
  return sonnerToast.success(message);
}

export function useToast() {
  return { toast };
}
