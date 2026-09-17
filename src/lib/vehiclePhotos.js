// @ts-nocheck
// Fotos de um anúncio: upload (resumível via TUS), listagem, exclusão,
// reordenação e escolha de capa. Os dados textuais (caminho, url pública,
// tamanho, tipo) ficam na tabela public.vehicle_photos — o arquivo em si
// (binário) fica só no Storage, nunca em base64 dentro do banco.
//
// Os limites abaixo (20 fotos, 10MB por foto, 200MB no total, formatos
// aceitos) são só a validação "de aviso rápido" do frontend. A validação
// que realmente vale está no Supabase: file_size_limit/allowed_mime_types
// do bucket "vehicle-photos" e os triggers check_vehicle_photo_limits /
// enforce_single_cover_photo na tabela vehicle_photos (veja supabase/schema.sql)
// — mesmo que alguém contorne esta validação daqui, o Supabase rejeita.

import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "vehicle-photos";
const TABLE = "vehicle_photos";

// Tamanho de chunk exigido pelo endpoint resumível do Supabase Storage —
// não é uma escolha nossa, é fixo pelo protocolo TUS deles.
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export const PHOTO_LIMITS = {
  maxPhotos: 20,
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB por foto
  maxTotalSizeBytes: 200 * 1024 * 1024, // 200 MB por anúncio
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

// ── Leitura ────────────────────────────────────────────────────────────

export async function listVehiclePhotos(vehicleId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data;
}

// ── Validação rápida no cliente (aviso, não é a proteção real) ─────────
// Retorna { errors, validFiles }: errors são mensagens prontas pra mostrar
// na tela; validFiles são os arquivos que passaram nessa checagem inicial.
// currentPhotos = fotos já existentes (do anúncio ou já enviadas no
// formulário) usadas para calcular quanto ainda cabe.

export function validateNewFiles(currentPhotos, newFiles) {
  const errors = [];
  const currentCount = currentPhotos.length;
  const currentTotal = currentPhotos.reduce((sum, p) => sum + (p.file_size || 0), 0);

  if (currentCount + newFiles.length > PHOTO_LIMITS.maxPhotos) {
    errors.push(
      `Limite de ${PHOTO_LIMITS.maxPhotos} fotos por anúncio: você já tem ${currentCount} e está tentando adicionar mais ${newFiles.length}.`
    );
  }

  let runningTotal = currentTotal;
  const validFiles = [];

  for (const file of newFiles) {
    if (!PHOTO_LIMITS.allowedMimeTypes.includes(file.type)) {
      errors.push(`"${file.name}": formato não permitido (use JPG, PNG ou WebP).`);
      continue;
    }
    if (file.size > PHOTO_LIMITS.maxFileSizeBytes) {
      errors.push(
        `"${file.name}": ${(file.size / 1024 / 1024).toFixed(1)}MB excede o limite de 10MB por foto.`
      );
      continue;
    }
    runningTotal += file.size;
    if (runningTotal > PHOTO_LIMITS.maxTotalSizeBytes) {
      errors.push(`"${file.name}" faria o anúncio ultrapassar o limite de 200MB no total.`);
      continue;
    }
    validFiles.push(file);
  }

  return { errors, validFiles };
}

// ── Upload ─────────────────────────────────────────────────────────────
// `folder` agrupa as fotos de um mesmo anúncio dentro do bucket: o id real
// do veículo (anúncio já existente) ou um id temporário de rascunho
// (anúncio novo, ainda não salvo — as linhas em vehicle_photos só são
// criadas depois que o anúncio existe, via insertVehiclePhotoRows).
// onProgress(0..1) é chamado durante o envio, pra mostrar barra de progresso.
//
// Sempre usa upload resumível (TUS): reenvia só os pedaços que faltarem se
// a conexão cair no meio de uma foto grande, em vez de perder o progresso.

export async function uploadVehiclePhoto(file, { folder, onProgress } = {}) {
  if (!folder) throw new Error("uploadVehiclePhoto: 'folder' é obrigatório.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Sessão expirada. Faça login novamente para enviar fotos.");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const objectName = `${folder}/${crypto.randomUUID()}.${ext}`;

  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      chunkSize: TUS_CHUNK_SIZE,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      metadata: {
        bucketName: BUCKET,
        objectName,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError: (err) => reject(err),
      onProgress: (bytesUploaded, bytesTotal) => {
        if (onProgress) onProgress(bytesTotal ? bytesUploaded / bytesTotal : 0);
      },
      onSuccess: () => resolve(),
    });

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch(reject);
  });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectName);

  return {
    storage_path: objectName,
    public_url: data.publicUrl,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || "application/octet-stream",
  };
}

// Insere de uma vez as linhas em vehicle_photos depois que os arquivos já
// foram enviados ao Storage (uploadVehiclePhoto acima) — usado tanto para
// um anúncio novo (as fotos ficam "seguras" no Storage, num rascunho,
// esperando o anúncio ser criado) quanto para adicionar fotos a um anúncio
// existente. Cada item de uploadedPhotos pode já vir com `ordem` e
// `is_cover` definidos (por exemplo, a pessoa escolheu a capa antes mesmo
// de publicar o anúncio) — se nenhum vier marcado como capa, a primeira
// foto da lista vira capa automaticamente.
export async function insertVehiclePhotoRows(vehicleId, uploadedPhotos, { startOrdem = 0 } = {}) {
  if (!uploadedPhotos.length) return [];

  const hasCover = uploadedPhotos.some((p) => p.is_cover);

  const rows = uploadedPhotos.map((p, idx) => ({
    vehicle_id: vehicleId,
    storage_path: p.storage_path,
    public_url: p.public_url,
    file_name: p.file_name,
    file_size: p.file_size,
    mime_type: p.mime_type,
    ordem: p.ordem ?? startOrdem + idx,
    is_cover: p.is_cover ?? (!hasCover && idx === 0),
  }));

  const { data, error } = await supabase.from(TABLE).insert(rows).select();
  if (error) throw error;
  return data;
}

// ── Edição ─────────────────────────────────────────────────────────────

export async function deleteVehiclePhoto(photo) {
  const { error } = await supabase.from(TABLE).delete().eq("id", photo.id);
  if (error) throw error;

  if (photo.storage_path) {
    supabase.storage.from(BUCKET).remove([photo.storage_path]).catch(() => {});
  }
}

export async function setCoverPhoto(photoId) {
  // O trigger enforce_single_cover_photo cuida de desmarcar a capa antiga.
  const { error } = await supabase.from(TABLE).update({ is_cover: true }).eq("id", photoId);
  if (error) throw error;
}

// orderedIds = ids das fotos na ordem final desejada (posição 0 = primeira).
export async function reorderVehiclePhotos(orderedIds) {
  const results = await Promise.all(
    orderedIds.map((id, idx) => supabase.from(TABLE).update({ ordem: idx }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

// Remove do Storage todas as fotos de um anúncio (usado ao apagar o
// anúncio inteiro — a exclusão das linhas em vehicle_photos já acontece
// sozinha via "on delete cascade" na foreign key, então aqui só limpamos
// os arquivos correspondentes no bucket).
export async function deleteAllVehiclePhotoFiles(photos) {
  const paths = (photos || []).map((p) => p.storage_path).filter(Boolean);
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths).catch(() => {});
}

// Remove um único arquivo do Storage sem mexer em nenhuma linha do banco —
// usado quando a foto ainda não tem linha em vehicle_photos (anúncio novo,
// ainda não publicado: a pessoa enviou a foto, o arquivo já está no
// Storage, mas cancelou/removeu ela antes de publicar o anúncio).
export async function deleteVehiclePhotoFile(storagePath) {
  if (!storagePath) return;
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
}
