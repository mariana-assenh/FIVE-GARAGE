// @ts-nocheck
// Modal grande de cadastro/edição de anúncio: campos maiores, descrição
// redimensionável (arraste pelas duas barrinhas no canto inferior direito
// da caixa de texto — é o redimensionamento nativo do navegador, sem
// nenhuma biblioteca extra), até 20 fotos com upload resumível, e uma
// prévia de como o anúncio vai ficar antes de publicar. Serve tanto para
// criar um anúncio novo quanto para editar um já existente (props
// `vehicle` presente = edição).
import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Eye, Pencil } from "lucide-react";
import { createVehicle, updateVehicle } from "@/lib/vehicles";
import { listVehiclePhotos, insertVehiclePhotoRows } from "@/lib/vehiclePhotos";
import VehiclePhotoManager from "@/components/VehiclePhotoManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { useToast } from "@/components/ui/use-toast";

const LIMITS = { title: 120, description: 5000, observacoes: 2000 };

const emptyForm = {
  title: "",
  brand: "",
  model: "",
  year: "",
  price: "",
  vehicle_type: "carro",
  mileage: "",
  description: "",
  observacoes: "",
};

export default function VehicleFormModal({ vehicle = null, open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const isEdit = !!vehicle;

  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("editar"); // "editar" | "previa"
  const [draftId] = useState(() => crypto.randomUUID());

  const folder = isEdit ? vehicle.id : draftId;

  useEffect(() => {
    if (!open) return;
    setTab("editar");

    if (isEdit) {
      setForm({
        title: vehicle.title || "",
        brand: vehicle.brand || "",
        model: vehicle.model || "",
        year: vehicle.year ?? "",
        price: vehicle.price ?? "",
        vehicle_type: vehicle.vehicle_type || "carro",
        mileage: vehicle.mileage ?? "",
        description: vehicle.description || "",
        observacoes: vehicle.observacoes || "",
      });
      setLoadingPhotos(true);
      listVehiclePhotos(vehicle.id)
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
        .catch(() => toast({ title: "Não foi possível carregar as fotos do anúncio", variant: "destructive" }))
        .finally(() => setLoadingPhotos(false));
    } else {
      setForm(emptyForm);
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const isUploadingPhotos = photos.some((p) => p.status === "uploading");
  const donePhotos = useMemo(() => photos.filter((p) => p.status === "done"), [photos]);
  const coverPhoto = donePhotos.find((p) => p.is_cover) || donePhotos[0] || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brand || !form.model || !form.year || !form.price || !form.title) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (form.title.length > LIMITS.title) {
      toast({ title: `Título deve ter até ${LIMITS.title} caracteres`, variant: "destructive" });
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
        title: form.title,
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        price: Number(form.price),
        vehicle_type: form.vehicle_type,
        mileage: form.mileage ? Number(form.mileage) : null,
        description: form.description || null,
        observacoes: form.observacoes || null,
      };

      let saved;
      if (isEdit) {
        // Se houver uma capa entre as fotos, mantém vehicles.image_url em
        // sincronia mesmo antes do próximo evento no vehicle_photos (o
        // trigger sync_vehicle_cover_photo também cuida disso, isso aqui é
        // só para a UI não ficar mostrando a foto antiga por um instante).
        saved = await updateVehicle(vehicle.id, payload);
      } else {
        const created = await createVehicle({ ...payload, likes: 0, status: "disponivel" });
        if (donePhotos.length) {
          await insertVehiclePhotoRows(
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

      toast({ title: isEdit ? "Anúncio atualizado com sucesso!" : "Anúncio publicado com sucesso!" });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      toast({ title: isEdit ? "Erro ao salvar as alterações" : "Erro ao publicar anúncio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        // O modal pode ser aberto a partir de um card que é um <Link> (ver
        // botão "Editar" em VehicleCard) — sem isso, qualquer clique aqui
        // dentro (inclusive no fundo, pra fechar) faria a navegação do
        // link acontecer por baixo do modal.
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
              {isEdit ? "Editar anúncio" : "Anunciar veículo"}
            </h2>
            <p className="text-sm text-zinc-400">Preencha os dados do veículo e as fotos.</p>
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
                  <Label className="text-zinc-300">Tipo *</Label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => set("vehicle_type", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2.5 text-white text-sm"
                  >
                    <option value="carro">Carro</option>
                    <option value="moto">Moto</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-300">Título *</Label>
                    <span className="text-[11px] text-zinc-500">
                      {form.title.length}/{LIMITS.title}
                    </span>
                  </div>
                  <Input
                    value={form.title}
                    maxLength={LIMITS.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Ex: Honda Civic EXL"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Marca *</Label>
                  <Input
                    value={form.brand}
                    onChange={(e) => set("brand", e.target.value)}
                    placeholder="Ex: Honda"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Modelo *</Label>
                  <Input
                    value={form.model}
                    onChange={(e) => set("model", e.target.value)}
                    placeholder="Ex: Civic EXL"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Ano *</Label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={(e) => set("year", e.target.value)}
                    placeholder="2020"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Preço (R$) *</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="85000"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">KM</Label>
                  <Input
                    type="number"
                    value={form.mileage}
                    onChange={(e) => set("mileage", e.target.value)}
                    placeholder="45000"
                    className="bg-zinc-900 border-zinc-700 text-white py-2.5"
                  />
                </div>
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
                  placeholder="Detalhes do veículo, opcionais, estado de conservação..."
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
                <Label className="text-zinc-300">Fotos do veículo</Label>
                {loadingPhotos ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
                    <Loader2 size={16} className="animate-spin" /> Carregando fotos...
                  </div>
                ) : (
                  <VehiclePhotoManager
                    mode={isEdit ? "persisted" : "draft"}
                    vehicleId={isEdit ? vehicle.id : null}
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
                  "Publicar anúncio"
                )}
              </Button>
            </form>
          ) : (
            <div className="max-w-3xl mx-auto">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                {coverPhoto ? (
                  <Image src={coverPhoto.previewUrl || coverPhoto.public_url} alt={form.title} fittingType="cover" className="w-full h-full" />
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

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-6">
                {form.brand || "Marca"} {form.model || "Modelo"}
              </h1>
              <p className="text-zinc-400 mt-1">{form.title || "Título do anúncio"}</p>

              <div className="mt-4">
                <span className="block text-xs uppercase tracking-widest text-zinc-500">Preço</span>
                <span className="text-3xl font-extrabold text-white">
                  R$ {form.price ? Number(form.price).toLocaleString("pt-BR") : "0"}
                </span>
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
