import React, { useEffect, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { createTeamMember, updateTeamMember, uploadTeamPhoto } from "@/lib/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const EMPTY = { name: "", role: "", bio: "", photo_url: "" };

// Formulário (só admin acessa esse componente) para adicionar ou editar um
// integrante da equipe: foto quadrada, nome, cargo e um texto curto.
export default function TeamMemberForm({ editing, onClose, onSaved }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    setForm(
      editing
        ? {
            name: editing.name || "",
            role: editing.role || "",
            bio: editing.bio || "",
            photo_url: editing.photo_url || "",
          }
        : EMPTY
    );
  }, [editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTeamPhoto(file);
      set("photo_url", url);
    } catch (err) {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Preencha o nome", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await updateTeamMember(editing.id, form);
        toast({ title: "Atualizado" });
      } else {
        await createTeamMember(form);
        toast({ title: "Adicionado à equipe" });
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast({ title: "Não foi possível salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">
          {editing ? "Editar integrante" : "Adicionar à equipe"}
        </h2>
        <p className="text-sm text-zinc-400 mb-5">Foto, nome e um texto curto sobre a pessoa.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Foto</Label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 hover:bg-zinc-800">
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploading ? "Enviando..." : "Enviar foto"}
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
              {form.photo_url && <span className="text-xs text-green-500">Foto carregada ✓</span>}
            </div>
            {form.photo_url && (
              <img
                src={form.photo_url}
                alt="preview"
                className="mt-2 w-24 h-24 object-cover rounded-2xl border border-zinc-800"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex: Mariana Najla"
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Cargo</Label>
            <Input
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              placeholder="Ex: Vendas"
              className="bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Sobre a pessoa</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={3}
              placeholder="Um texto curto sobre a pessoa..."
              className="bg-zinc-900 border-zinc-700 text-white resize-none"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3">
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
