// @ts-nocheck
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-center"
      toastOptions={{
        style: {
          background: "#18181b",
          color: "#fff",
          border: "1px solid #3f3f46",
        },
      }}
    />
  );
}
