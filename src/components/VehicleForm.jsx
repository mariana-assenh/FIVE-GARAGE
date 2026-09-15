import React, { useEffect, useState } from "react";
import { Upload, X, Loader2, MessageCircle } from "lucide-react";
import { createVehicle, uploadVehicleImage } from "@/lib/vehicles";
import { isAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const WHATSAPP_NUMBER = "5541991369093";

export default function VehicleForm({ onCreated }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState("checking"); // checking | admin | public
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    brand: "",
    model: "",
    year: "",
    price: "",
    vehicle_type: "carro",
    mileage: "",
    description: "",
    image_url: "",
  });

  // Publicar é restrito a administradores (a policy de INSERT no Supabase
  // também exige isso — ver supabase/schema.sql). Quem não é admin, logado
  // ou não, vê o convite para falar pelo WhatsApp em vez de um formulário
  // que não teria como usar.
  useEffect(() => {
    let active = true;
    const check = () => isAdmin().then((ok) => active && setAccess(ok ? "admin" : "public"));
    check();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadVehicleImage(file);
      set("image_url", url);
    } catch (err) {
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brand || !form.model || !form.year || !form.price || !form.title) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        price: Number(form.price),
        mileage: form.mileage ? Number(form.mileage) : null,
        likes: 0,
        status: "disponivel",
      };
      const created = await createVehicle(payload);
      toast({ title: "Anúncio publicado com sucesso!" });
      setForm({ title: "", brand: "", model: "", year: "", price: "", vehicle_type: "carro", mileage: "", description: "", image_url: "" });
      setOpen(false);
      onCreated?.(created);
    } catch (err) {
      toast({ title: "Erro ao publicar anúncio", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    if (access !== "admin") {
      const msg = "Olá! Quero anunciar meu veículo na Five Garage.";
      return (
        <div className="text-center">
          <p className="text-zinc-400 mb-4">
            Quer vender seu veículo? Fale com a gente pelo WhatsApp e cuidamos do anúncio pra você.
          </p>
          <Button
            asChild
            disabled={access === "checking"}
            className="bg-[#25D366] hover:bg-[#1ebe5d] text-white px-8 py-6 text-base font-bold rounded-xl"
          >
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-2" size={20} /> Falar no WhatsApp
            </a>
          </Button>
        </div>
      );
    }
    return (
      <div className="text-center">
        <Button
          onClick={() => setOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-base font-bold rounded-xl"
        >
          <Upload className="mr-2" size={20} /> Publicar novo anúncio
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">Anunciar veículo</h2>
        <p className="text-sm text-zinc-400 mb-5">Preencha os dados do veículo.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Tipo *</Label>
              <select
                value={form.vehicle_type}
                onChange={(e) => set("vehicle_type", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm"
              >
                <option value="carro">Carro</option>
                <option value="moto">Moto</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Título *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Honda Civic EXL" className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Marca *</Label>
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex: Honda" className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Modelo *</Label>
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Ex: Civic EXL" className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Ano *</Label>
              <Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2020" className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Preço (R$) *</Label>
              <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="85000" className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">KM</Label>
              <Input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} placeholder="45000" className="bg-zinc-900 border-zinc-700 text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Descrição</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Detalhes do veículo..." className="bg-zinc-900 border-zinc-700 text-white resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Foto do veículo</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 hover:bg-zinc-800">
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploading ? "Enviando..." : "Enviar imagem"}
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
              {form.image_url && <span className="text-xs text-green-500">Imagem carregada ✓</span>}
            </div>
            {form.image_url && (
              <img src={form.image_url} alt="preview" className="mt-2 w-full h-32 object-cover rounded-md border border-zinc-800" />
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3">
            {loading ? "Publicando..." : "Publicar anúncio"}
          </Button>
        </form>
      </div>
    </div>
  );
}
