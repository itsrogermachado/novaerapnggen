/**
 * Preparo de imagem antes do upload.
 *
 * O motivo é mobile: uma foto tirada na hora chega com 3–5MB e 4000px de lado,
 * para ser exibida num cartão de 120px ou como fundo de 1080px. Subir o
 * original gasta o 4G do usuário, o storage e o tempo de carregamento de todo
 * mundo que abrir a biblioteca depois.
 */

export const TIPOS_ACEITOS = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Teto do arquivo *original*, antes de comprimir. */
export const MAX_BYTES_ENTRADA = 25 * 1024 * 1024;

export interface OpcoesCompressao {
  /** Maior lado permitido, em px. Acima disso a imagem é reduzida. */
  maxLado?: number;
  /** 0..1 — qualidade do WebP. */
  qualidade?: number;
}

export class ImagemInvalidaError extends Error {}

function carregarBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap é bem mais rápido e não bloqueia a thread principal,
  // mas nem todo Safari antigo tem — daí o caminho alternativo.
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImagemInvalidaError("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

/**
 * Reduz e converte para WebP. Devolve um Blob pronto para o Storage.
 *
 * Se a compressão falhar por qualquer motivo, devolve o arquivo original: é
 * melhor subir pesado do que impedir o usuário de trabalhar.
 */
export async function comprimirImagem(
  file: File,
  { maxLado = 1920, qualidade = 0.85 }: OpcoesCompressao = {},
): Promise<Blob> {
  if (!TIPOS_ACEITOS.has(file.type)) {
    throw new ImagemInvalidaError("Formato não aceito. Use png, jpeg ou webp.");
  }
  if (file.size > MAX_BYTES_ENTRADA) {
    throw new ImagemInvalidaError(
      `Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). O limite é 25MB.`,
    );
  }

  try {
    const src = await carregarBitmap(file);
    const largura = "width" in src ? src.width : 0;
    const altura = "height" in src ? src.height : 0;
    if (!largura || !altura) throw new ImagemInvalidaError("Imagem sem dimensões");

    const escala = Math.min(1, maxLado / Math.max(largura, altura));
    const w = Math.round(largura * escala);
    const h = Math.round(altura * escala);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImagemInvalidaError("Canvas indisponível");

    ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
    if ("close" in src) src.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", qualidade),
    );

    // Converter pode aumentar o arquivo (PNG pequeno com poucas cores, por
    // exemplo). Nesse caso não vale a pena.
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch (err) {
    if (err instanceof ImagemInvalidaError) throw err;
    return file;
  }
}
