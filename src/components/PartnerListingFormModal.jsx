// @ts-nocheck
// Modal de cadastro/edição de anúncio parceiro — mesmo padrão do
// VehicleFormModal (campos grandes, descrição redimensionável, até 20
// fotos com upload resumível, prévia antes de publicar), só que com os
// dados de uma empresa parceira em vez de um veículo: nome da empresa,
// telefone e endereço (opcional) no lugar de marca/modelo/ano/preço/km.
// Descrição, observações e fotos funcionam exatamente como nos anúncios
// de veículos (mesmos limites, mesmo componente de fotos).
import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Eye, Pencil, Building2, Phone, MapPin } from "lucide-react";
import { createPartnerListing, updatePartnerListing } from "@/lib/partnerListings";
import { listPartnerListingPhotos, insertPartnerListingPhotoRows } from "@/lib/partnerListingPhotos";
import PartnerPhotoManager from "@/components/PartnerPhotoManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";

const LIMITS = { company_name: 120, description: 5000, observacoes: 2000 };

const emptyForm = {
  company_name: "",
  phone: "",
  address: "",
  description: "",
  observacoes: "",
};

export default function PartnerListingFormModal({ listing = null, open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!listing;

  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("editar"); // "editar" | "previa"
  const [draftId] = useState(() => crypto.randomUUID());

  const folder = isEdit ? listing.id : draftId;

  useEffect(() => {
    if (!open) return;
    setTab("editar");

    if (isEdit) {
      setForm({
        company_name: listing.company_name || "",
        phone: listing.phone || "",
        address: listing.address || "",
        description: listing.description || "",
        observacoes: listing.observacoes || "",
      });
      setLoadingPhotos(true);
      listPartnerListingPhotos(listing.id)
        .then((rows) =>
          setPhotos(
            rows.map((r) => ({
              key: r.id,
              id: r.id,
              storage_path: r.storage_path,
              public_url: r.public_url,
              file_name: r.file_name,
              file_size: r.file_size,
              mime_type: r.mime_type,
              ordem: r.ordem,
              is_cover: r.is_cover,
              status: "done",
              progress: 1,
              error: null,
              previewUrl: r.public_url,
            }))
          )
        )
        .catch(() => toast({ title: "Não foi possível carregar as fotos do parceiro", variant: "destructive" }))
        .finally(() => setLoadingPhotos(false));
    } else {
      setForm(emptyForm);
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listing?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isUploadingPhotos = photos.some((p) => p.status === "uploading");
  const donePhotos = useMemo(() => photos.filter((p) => p.status === "done"), [photos]);
  const coverPhoto = donePhotos.find((p) => p.is_cover) || donePhotos[0] || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.phone) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (form.company_name.length > LIMITS.company_name) {
      toast({ title: `Nome da empresa deve ter até ${LIMITS.company_name} caracteres`, variant: "destructive" });
      return;
    }
    if (form.description.length > LIMITS.description) {
      toast({ title: `Descrição deve ter até ${LIMITS.description} caracteres`, variant: "destructive" });
      return;
    }
    if (form.observacoes.length > LIMITS.observacoes) {
      toast({ title: `Observações devem ter até ${LIMITS.observacoes} caracteres`, variant: "destructive" });
      return;
    }
    if (isUploadingPhotos) {
      toast({ title: "Aguarde o envio das fotos terminar", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_name: form.company_name,
        phone: form.phone,
        address: form.address || null,
        description: form.description || null,
        observacoes: form.observacoes || null,
      };

      let saved;
      if (isEdit) {
        saved = await updatePartnerListing(listing.id, payload);
      } else {
        const created = await createPartnerListing(payload);
        if (donePhotos.length) {
          await insertPartnerListingPhotoRows(
            created.id,
            donePhotos.map((p, idx) => ({
              storage_path: p.storage_path,
              public_url: p.public_url,
              file_name: p.file_name,
              file_size: p.file_size,
              mime_type: p.mime_type,
              ordem: idx,
              is_cover: p.is_cover,
            }))
          );
        }
        saved = created;
      }

      toast({ title: isEdit ? "Parceiro atualizado com sucesso!" : "Parceiro adicionado com sucesso!" });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      toast({ title: isEdit ? "Erro ao salvar as alterações" : "Erro ao adicionar parceiro", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        // O modal pode ser aberto a partir de um card que é um <Link> — sem
        // isso, um clique aqui dentro faria a navegação do link acontecer
        // por baixo do modal (mesmo cuidado do VehicleFormModal).
        e.stopPropagation();
        if (!saving) onOpenChange(false);
      }}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full h-full sm:w-[95vw] sm:h-[92vh] max-w-6xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {isEdit ? "Editar parceiro" : "Adicionar anúncio parceiro"}
            </h2>
            <p className="text-sm text-zinc-400">Preencha os dados da empresa e as fotos.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setTab("editar")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === "editar" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                type="button"
                onClick={() => setTab("previa")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === "previa" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Eye size={14} /> Prévia
              </button>
            </div>
            <button onClick={() => !saving && onOpenChange(false)} className="text-zinc-400 hover:text-white p-1">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {tab === "editar" ? (
            <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-300">Nome da empresa *</Label>
                    <span className="text-[11px] text-zinc-500">
                      {form.company_name.length}/{LIMITS.company_name}
                    </span>
                  </div>
                  <Input
                    value={form.company_name}
                    maxLength={LIMITS.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                    placeholder="Ex: Auto Peças Curitiba"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Telefone *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="Ex: (41) 99999-9999"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">Endereço</Label>
                <Input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Opcional — Ex: Rua Exemplo, 123 - Curitiba, PR"
                  className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Descrição</Label>
                  <span className="text-[11px] text-zinc-500">
                    {form.description.length}/{LIMITS.description}
                  </span>
                </div>
                <Textarea
                  value={form.description}
                  maxLength={LIMITS.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={10}
                  placeholder="Detalhes sobre a empresa parceira, serviços oferecidos..."
                  className="bg-zinc-900 border-zinc-700 text-white resize-y min-h-[220px]"
                />
                <p className="text-[11px] text-zinc-600">
                  Arraste pelo canto inferior direito da caixa para deixá-la maior.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Observações</Label>
                  <span className="text-[11px] text-zinc-500">
                    {form.observacoes.length}/{LIMITS.observacoes}
                  </span>
                </div>
                <Textarea
                  value={form.observacoes}
                  maxLength={LIMITS.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  rows={4}
                  placeholder="Observações internas ou detalhes adicionais (opcional)..."
                  className="bg-zinc-900 border-zinc-700 text-white resize-y min-h-[110px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-300">Fotos</Label>
                {loadingPhotos ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
                    <Loader2 size={16} className="animate-spin" /> Carregando fotos...
                  </div>
                ) : (
                  <PartnerPhotoManager
                    mode={isEdit ? "persisted" : "draft"}
                    listingId={isEdit ? listing.id : null}
                    folder={folder}
                    photos={photos}
                    onPhotosChange={setPhotos}
                    disabled={saving}
                  />
                )}
              </div>

              <Button
                type="submit"
                disabled={saving || isUploadingPhotos}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Salvando...
                  </span>
                ) : isEdit ? (
                  "Salvar alterações"
                ) : (
                  "Adicionar parceiro"
                )}
              </Button>
            </form>
          ) : (
            <div className="max-w-3xl mx-auto">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                {coverPhoto ? (
                  <Image src={coverPhoto.previewUrl || coverPhoto.public_url} alt={form.company_name} fittingType="cover" className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700 text-sm">
                    Nenhuma foto adicionada ainda
                  </div>
                )}
              </div>

              {donePhotos.length > 1 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {donePhotos.map((p) => (
                    <div key={p.key} className="w-16 h-16 rounded-md overflow-hidden border border-zinc-800">
                      <Image src={p.previewUrl || p.public_url} alt="" fittingType="cover" className="w-full h-full" />
                    </div>
                  ))}
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-6 flex items-center gap-2">
                <Building2 size={24} className="text-red-500" /> {form.company_name || "Nome da empresa"}
              </h1>

              <div className="flex flex-col gap-1.5 mt-3 text-zinc-400 text-sm">
                {form.phone && (
                  <span className="flex items-center gap-2">
                    <Phone size={14} className="text-red-500" /> {form.phone}
                  </span>
                )}
                {form.address && (
                  <span className="flex items-center gap-2">
                    <MapPin size={14} className="text-red-500" /> {form.address}
                  </span>
                )}
              </div>

              {form.description && (
                <p className="text-zinc-300 mt-6 leading-relaxed whitespace-pre-line">{form.description}</p>
              )}

              {form.observacoes && (
                <div className="mt-6 border-t border-zinc-800 pt-4">
                  <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-1">Observações</span>
                  <p className="text-zinc-400 leading-relaxed whitespace-pre-line">{form.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
