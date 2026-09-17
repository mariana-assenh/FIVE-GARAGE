// @ts-nocheck
// Fotos de um anúncio parceiro: mesmo comportamento de
// src/lib/vehiclePhotos.js (upload resumível via TUS, listagem, exclusão,
// reordenação e escolha de capa), só que apontando pro bucket/tabela dos
// parceiros. Os limites reais (20 fotos / 10MB por foto / 200MB no total /
// formatos aceitos) são reforçados pelo Supabase — ver supabase/schema.sql
// (bucket partner-photos + triggers check_partner_photo_limits /
// enforce_single_partner_cover_photo).

import * as tus from "tus-js-client";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "partner-photos";
const TABLE = "partner_listing_photos";

const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

export const PHOTO_LIMITS = {
  maxPhotos: 20,
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxTotalSizeBytes: 200 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

export async function listPartnerListingPhotos(partnerListingId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("partner_listing_id", partnerListingId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data;
}

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

export async function uploadPartnerListingPhoto(file, { folder, onProgress } = {}) {
  if (!folder) throw new Error("uploadPartnerListingPhoto: 'folder' é obrigatório.");

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

export async function insertPartnerListingPhotoRows(partnerListingId, uploadedPhotos, { startOrdem = 0 } = {}) {
  if (!uploadedPhotos.length) return [];

  const hasCover = uploadedPhotos.some((p) => p.is_cover);

  const rows = uploadedPhotos.map((p, idx) => ({
    partner_listing_id: partnerListingId,
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

export async function deletePartnerListingPhoto(photo) {
  const { error } = await supabase.from(TABLE).delete().eq("id", photo.id);
  if (error) throw error;

  if (photo.storage_path) {
    supabase.storage.from(BUCKET).remove([photo.storage_path]).catch(() => {});
  }
}

export async function setPartnerCoverPhoto(photoId) {
  // O trigger enforce_single_partner_cover_photo cuida de desmarcar a capa antiga.
  const { error } = await supabase.from(TABLE).update({ is_cover: true }).eq("id", photoId);
  if (error) throw error;
}

export async function reorderPartnerListingPhotos(orderedIds) {
  const results = await Promise.all(
    orderedIds.map((id, idx) => supabase.from(TABLE).update({ ordem: idx }).eq("id", id))
  );
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

export async function deleteAllPartnerListingPhotoFiles(photos) {
  const paths = (photos || []).map((p) => p.storage_path).filter(Boolean);
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths).catch(() => {});
}

export async function deletePartnerListingPhotoFile(storagePath) {
  if (!storagePath) return;
  await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
}
