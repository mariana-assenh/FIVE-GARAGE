// @ts-nocheck
// Gerenciador de fotos de um anúncio: até 20 fotos, arrastar para
// reordenar, definir capa, excluir individualmente, barra de progresso por
// foto e mensagens de erro claras. Funciona tanto para um anúncio NOVO
// (rascunho — as fotos já são enviadas ao Storage assim que escolhidas,
// mas só viram linha em vehicle_photos quando o anúncio é criado, lá em
// VehicleFormModal) quanto para um anúncio já existente sendo editado
// (mode="persisted" — cada ação aqui já mexe direto no banco).
//
// Os limites reais (20 fotos / 10MB por foto / 200MB no total / formatos
// aceitos) são reforçados pelo Supabase (bucket + triggers, ver
// supabase/schema.sql) — as checagens aqui são só pra dar feedback rápido
// na tela, sem esperar a resposta do servidor.

import React, { useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { ImagePlus, X, Star, GripVertical, AlertCircle, Loader2 } from "lucide-react";
import {
  PHOTO_LIMITS,
  validateNewFiles,
  uploadVehiclePhoto,
  insertVehiclePhotoRows,
  deleteVehiclePhoto,
  deleteVehiclePhotoFile,
  setCoverPhoto,
  reorderVehiclePhotos,
} from "@/lib/vehiclePhotos";
import { compressImage } from "@/lib/imageCompression";
import { useToast } from "@/components/ui/use-toast";

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VehiclePhotoManager({
  mode, // "draft" | "persisted"
  vehicleId = null, // obrigatório quando mode === "persisted"
  folder, // prefixo usado no Storage (draftId ou vehicleId)
  photos,
  onPhotosChange,
  disabled = false,
}) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [fileErrors, setFileErrors] = useState([]);

  const donePhotos = photos.filter((p) => p.status === "done");
  const totalSize = donePhotos.reduce((sum, p) => sum + (p.file_size || 0), 0);
  const isUploading = photos.some((p) => p.status === "uploading");

  const updatePhoto = (key, patch) => {
    onPhotosChange((current) => current.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const removePhotoFromList = (key) => {
    onPhotosChange((current) => current.filter((p) => p.key !== key));
  };

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const { errors, validFiles } = validateNewFiles(donePhotos, files);
    setFileErrors(errors);
    if (!validFiles.length) return;

    const placeholders = validFiles.map((file) => ({
      key: crypto.randomUUID(),
      id: null,
      storage_path: null,
      public_url: null,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      ordem: photos.length,
      is_cover: false,
      status: "uploading",
      progress: 0,
      error: null,
      previewUrl: URL.createObjectURL(file),
    }));

    onPhotosChange((current) => [...current, ...placeholders]);

    for (let i = 0; i < validFiles.length; i++) {
      const placeholder = placeholders[i];
      const originalFile = validFiles[i];
      try {
        const compressed = await compressImage(originalFile);
        const uploaded = await uploadVehiclePhoto(compressed, {
          folder,
          onProgress: (fraction) => updatePhoto(placeholder.key, { progress: fraction }),
        });

        if (mode === "persisted") {
          const noCoverYet = !photos.some((p) => p.is_cover) && !placeholders.slice(0, i).some((p) => p.is_cover);
          const [inserted] = await insertVehiclePhotoRows(vehicleId, [
            { ...uploaded, ordem: photos.length + i, is_cover: noCoverYet },
          ]);
          updatePhoto(placeholder.key, {
            id: inserted.id,
            storage_path: inserted.storage_path,
            public_url: inserted.public_url,
            file_size: inserted.file_size,
            mime_type: inserted.mime_type,
            ordem: inserted.ordem,
            is_cover: inserted.is_cover,
            status: "done",
            progress: 1,
          });
        } else {
          const noCoverYet = !photos.some((p) => p.is_cover) && !placeholders.slice(0, i).some((p) => p.is_cover);
          updatePhoto(placeholder.key, {
            ...uploaded,
            is_cover: noCoverYet,
            status: "done",
            progress: 1,
          });
        }
      } catch (err) {
        updatePhoto(placeholder.key, {
          status: "error",
          error: err?.message || "Falha no envio",
        });
        toast({ title: `Erro ao enviar "${originalFile.name}"`, variant: "destructive" });
      }
    }
  };

  const handleInputChange = (e) => {
    handleFilesSelected(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled) return;
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleDelete = async (photo) => {
    if (photo.status === "uploading") return;
    try {
      if (photo.id) {
        await deleteVehiclePhoto(photo);
      } else if (photo.storage_path) {
        await deleteVehiclePhotoFile(photo.storage_path);
      }
      removePhotoFromList(photo.key);
    } catch (err) {
      toast({ title: "Não foi possível excluir a foto", variant: "destructive" });
    }
  };

  const handleSetCover = async (photo) => {
    if (photo.status !== "done") return;
    try {
      if (mode === "persisted" && photo.id) {
        await setCoverPhoto(photo.id);
      }
      onPhotosChange((current) => current.map((p) => ({ ...p, is_cover: p.key === photo.key })));
    } catch (err) {
      toast({ title: "Não foi possível definir a capa", variant: "destructive" });
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || disabled) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = Array.from(photos);
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const withOrdem = reordered.map((p, idx) => ({ ...p, ordem: idx }));
    onPhotosChange(() => withOrdem);

    if (mode === "persisted") {
      const ids = withOrdem.filter((p) => p.id).map((p) => p.id);
      try {
        await reorderVehiclePhotos(ids);
      } catch (err) {
        toast({ title: "Não foi possível salvar a nova ordem das fotos", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-zinc-400">
          Você pode adicionar até {PHOTO_LIMITS.maxPhotos} fotos, com até{" "}
          {Math.round(PHOTO_LIMITS.maxFileSizeBytes / (1024 * 1024))} MB por foto (formatos JPG, PNG ou WebP).
        </p>
        <p className="text-xs text-zinc-500">
          {donePhotos.length}/{PHOTO_LIMITS.maxPhotos} fotos · {formatSize(totalSize)} de{" "}
          {Math.round(PHOTO_LIMITS.maxTotalSizeBytes / (1024 * 1024))} MB
        </p>
      </div>

      {fileErrors.length > 0 && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 p-3 space-y-1">
          {fileErrors.map((err, i) => (
            <p key={i} className="text-xs text-red-300 flex items-start gap-1.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {err}
            </p>
          ))}
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border border-dashed border-zinc-700 rounded-xl p-4 text-center hover:border-red-600/60 transition-colors"
      >
        <label className={`inline-flex items-center gap-2 text-sm text-zinc-300 ${disabled ? "opacity-50" : "cursor-pointer hover:text-white"}`}>
          <ImagePlus size={18} />
          Arraste fotos aqui ou clique para escolher
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            disabled={disabled || donePhotos.length >= PHOTO_LIMITS.maxPhotos}
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      </div>

      {photos.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="vehicle-photos" direction="horizontal">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-wrap gap-3">
                {photos.map((photo, index) => (
                  <Draggable key={photo.key} draggableId={photo.key} index={index} isDragDisabled={disabled || photo.status !== "done"}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`relative w-28 h-28 rounded-lg overflow-hidden border-2 bg-zinc-900 ${
                          photo.is_cover ? "border-red-600" : "border-zinc-800"
                        } ${dragSnapshot.isDragging ? "ring-2 ring-red-500" : ""}`}
                      >
                        <img
                          src={photo.previewUrl || photo.public_url}
                          alt={photo.file_name}
                          className="w-full h-full object-cover"
                        />

                        {photo.status === "uploading" && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1 text-white text-[10px]">
                            <Loader2 size={16} className="animate-spin" />
                            {Math.round((photo.progress || 0) * 100)}%
                          </div>
                        )}

                        {photo.status === "error" && (
                          <div className="absolute inset-0 bg-red-950/85 flex flex-col items-center justify-center gap-1 text-red-200 text-[10px] p-1 text-center">
                            <AlertCircle size={16} />
                            {photo.error || "Erro"}
                          </div>
                        )}

                        {photo.status === "done" && (
                          <>
                            <div
                              {...dragProvided.dragHandleProps}
                              className="absolute top-1 left-1 p-1 rounded bg-black/60 text-zinc-300 cursor-grab"
                              aria-label="Arrastar para reordenar"
                            >
                              <GripVertical size={12} />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSetCover(photo)}
                              aria-label="Definir como capa"
                              className={`absolute top-1 right-1 p-1 rounded-full ${
                                photo.is_cover ? "bg-red-600 text-white" : "bg-black/60 text-zinc-300 hover:text-white"
                              }`}
                            >
                              <Star size={12} className={photo.is_cover ? "fill-current" : ""} />
                            </button>
                            {photo.is_cover && (
                              <span className="absolute bottom-1 left-1 text-[9px] font-bold uppercase tracking-wide bg-red-600 text-white px-1.5 py-0.5 rounded">
                                Capa
                              </span>
                            )}
                          </>
                        )}

                        {photo.status !== "uploading" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(photo)}
                            aria-label="Excluir foto"
                            className="absolute bottom-1 right-1 p-1 rounded-full bg-black/60 text-zinc-300 hover:bg-red-950/80 hover:text-red-300"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {isUploading && (
        <p className="text-xs text-zinc-500 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Enviando fotos, aguarde...
        </p>
      )}
    </div>
  );
}
