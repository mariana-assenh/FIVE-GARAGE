// @ts-nocheck
// Compressão de imagem no navegador via <canvas>, sem depender de nenhuma
// biblioteca nova. Só reduz a RESOLUÇÃO quando a foto é maior do que o
// necessário para qualquer tela/zoom do anúncio — nunca converte o formato
// (uma foto enviada como PNG continua PNG, WebP continua WebP) e nunca
// aumenta uma foto pequena. Se o resultado comprimido não ficar menor que
// o original, o original é devolvido sem alteração — evita prejudicar
// texto de placas/detalhes em fotos que já estavam num tamanho razoável.

const MAX_DIMENSION = 2560; // px no maior lado
const JPEG_QUALITY = 0.88;
const WEBP_QUALITY = 0.88;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024; // arquivos já pequenos não valem recompressão

export async function compressImage(file) {
  if (!file.type || !file.type.startsWith("image/")) return file;
  if (file.size <= SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    if (scale >= 1) {
      bitmap.close?.();
      return file; // já está dentro do tamanho-alvo, não mexe
    }

    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close?.();

    const quality =
      file.type === "image/webp" ? WEBP_QUALITY : file.type === "image/png" ? undefined : JPEG_QUALITY;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, quality));

    if (!blob || blob.size >= file.size) return file; // comprimir não ajudou, mantém o original

    return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
  } catch {
    // Se o navegador não suportar createImageBitmap/canvas por algum motivo,
    // segue com o arquivo original em vez de travar o envio.
    return file;
  }
}

export async function compressImages(files, onEach) {
  const results = [];
  for (const file of files) {
    const compressed = await compressImage(file);
    results.push(compressed);
    if (onEach) onEach(compressed, file);
  }
  return results;
}
