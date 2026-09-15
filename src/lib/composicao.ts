// Regras de salvar e reabrir o que está na tela do Estúdio.
//
// Aqui só tem regra pura: nada de React, navegador ou banco. Assim dá para testar
// tudo direto no Node (tests/composicao.test.mjs). Duas formas de guardar a tela:
// - Rascunho: a tela inteira, guardada sozinha no navegador para "voltar de onde parou".
// - Modelo: só o layout (formato, fundo, logo e os LUGARES dos destaques), guardado na
//   conta para reabrir em qualquer aparelho e só colocar os prints do dia.

type Formato = "feed" | "story";

/** Posição e tamanho de algo no canvas. x e y vão de 0 a 1 (fração da tela). */
export type Posicao = { x: number; y: number; size: number };

/** Lugar reservado para um destaque num modelo. proporcao = altura ÷ largura da imagem. */
export type Lugar = Posicao & { proporcao: number };

export type LogoSalva = Posicao & { url: string };

/** Imagem disponível na aba Destaques: veio do computador (arquivo) ou de um endereço. */
export type ItemBiblioteca = { id: string; origem: "arquivo" | "url"; url?: string };

/** O que está na tela agora, no formato que estas regras entendem. */
export type TelaAtual = {
  formato: Formato;
  fundo: string | null;
  logo: LogoSalva | null;
  biblioteca: ItemBiblioteca[];
  destaques: (Posicao & { id: string; proporcao: number })[];
  lugares: Lugar[] | null;
  modeloNome: string | null;
};

export type Rascunho = {
  versao: 1;
  formato: Formato;
  fundo: string | null;
  logo: LogoSalva | null;
  biblioteca: ItemBiblioteca[];
  destaques: (Posicao & { id: string })[];
  lugares: Lugar[] | null;
  modeloNome: string | null;
};

export type Modelo = {
  versao: 1;
  formato: Formato;
  fundo: string | null;
  logo: LogoSalva | null;
  lugares: Lugar[];
};

// Limites do rascunho no navegador: cada imagem do computador ocupa espaço de verdade.
export const LIMITE_IMAGENS_RASCUNHO = 20;
export const LIMITE_BYTES_RASCUNHO = 50 * 1024 * 1024;
// Um modelo guarda no máximo 20 lugares (o banco também limita o tamanho).
export const MAX_LUGARES = 20;

/** Copia só posição e tamanho, sem os outros campos. */
const soPosicao = ({ x, y, size }: Posicao): Posicao => ({ x, y, size });

/** Monta o rascunho da tela atual (as imagens do computador vão à parte, como arquivos). */
export function montarRascunho(tela: TelaAtual): Rascunho {
  return {
    versao: 1,
    formato: tela.formato,
    fundo: tela.fundo,
    logo: tela.logo ? { url: tela.logo.url, ...soPosicao(tela.logo) } : null,
    biblioteca: tela.biblioteca,
    destaques: tela.destaques.map((d) => ({ id: d.id, ...soPosicao(d) })),
    lugares: tela.lugares,
    modeloNome: tela.modeloNome,
  };
}

/**
 * Monta o modelo da tela atual. Os lugares vêm dos destaques que estão na tela; se um
 * modelo já estava aberto com lugares ainda vazios, esses lugares continuam no modelo.
 */
export function montarModelo(tela: TelaAtual): Modelo {
  const ocupados: Lugar[] = tela.destaques.map((d) => ({
    ...soPosicao(d),
    proporcao: d.proporcao,
  }));
  const vazios = (tela.lugares ?? []).slice(ocupados.length);
  return {
    versao: 1,
    formato: tela.formato,
    fundo: tela.fundo,
    logo: tela.logo ? { url: tela.logo.url, ...soPosicao(tela.logo) } : null,
    lugares: [...ocupados, ...vazios].slice(0, MAX_LUGARES),
  };
}

// ---------------------------------------------------------------------------------
// Leitura: tudo o que volta do navegador ou do banco é conferido antes de ir à tela.
// Campo com tipo errado derruba o dado inteiro (null); número fora do limite é preso
// ao limite; endereço de imagem fora do armazenamento do projeto é descartado.
// ---------------------------------------------------------------------------------

/** Sinal interno de "este dado não serve". */
class DadoInvalido extends Error {}

function numero(v: unknown, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new DadoInvalido();
  return Math.min(max, Math.max(min, v));
}

function objeto(v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new DadoInvalido();
  return v as Record<string, unknown>;
}

function lista(v: unknown): unknown[] {
  if (!Array.isArray(v)) throw new DadoInvalido();
  return v;
}

function lerPosicao(v: unknown): Posicao {
  const o = objeto(v);
  return { x: numero(o.x, 0, 1), y: numero(o.y, 0, 1), size: numero(o.size, 0.02, 1) };
}

function lerLugares(v: unknown): Lugar[] {
  return lista(v)
    .slice(0, MAX_LUGARES)
    .map((l) => ({ ...lerPosicao(l), proporcao: numero(objeto(l).proporcao, 0.1, 10) }));
}

/** Aceita só endereço do armazenamento público do próprio projeto. */
function enderecoConfiavel(v: unknown, baseStorage: string): string | null {
  return typeof v === "string" && v.startsWith(baseStorage) ? v : null;
}

function lerFormato(v: unknown): Formato {
  if (v !== "feed" && v !== "story") throw new DadoInvalido();
  return v;
}

function lerLogo(v: unknown, baseStorage: string): LogoSalva | null {
  if (v === null || v === undefined) return null;
  const url = enderecoConfiavel(objeto(v).url, baseStorage);
  return url ? { url, ...lerPosicao(v) } : null;
}

/** Roda uma leitura e devolve null se algum campo não servir. */
function tentar<T>(ler: () => T): T | null {
  try {
    return ler();
  } catch (e) {
    if (e instanceof DadoInvalido) return null;
    throw e;
  }
}

/** Confere um rascunho vindo do navegador. */
export function lerRascunho(bruto: unknown, baseStorage: string): Rascunho | null {
  return tentar(() => {
    const o = objeto(bruto);
    if (o.versao !== 1) throw new DadoInvalido();

    // Biblioteca: fica só o que é arquivo do computador ou endereço confiável.
    const biblioteca: ItemBiblioteca[] = [];
    for (const item of lista(o.biblioteca)) {
      const i = objeto(item);
      if (typeof i.id !== "string") throw new DadoInvalido();
      if (i.origem === "arquivo") biblioteca.push({ id: i.id, origem: "arquivo" });
      else {
        const url = enderecoConfiavel(i.url, baseStorage);
        if (url) biblioteca.push({ id: i.id, origem: "url", url });
      }
    }

    // Destaque na tela só vale se a imagem dele estiver na biblioteca.
    const ids = new Set(biblioteca.map((i) => i.id));
    const destaques = lista(o.destaques).map((d) => {
      const id = objeto(d).id;
      if (typeof id !== "string") throw new DadoInvalido();
      return { id, ...lerPosicao(d) };
    });

    const nome = o.modeloNome;
    return {
      versao: 1,
      formato: lerFormato(o.formato),
      fundo: enderecoConfiavel(o.fundo, baseStorage),
      logo: lerLogo(o.logo, baseStorage),
      biblioteca,
      destaques: destaques.filter((d) => ids.has(d.id)),
      lugares: o.lugares === null || o.lugares === undefined ? null : lerLugares(o.lugares),
      modeloNome: typeof nome === "string" && nome.trim() ? nome.slice(0, 60) : null,
    };
  });
}

/** Confere um modelo vindo do banco. */
export function lerModelo(bruto: unknown, baseStorage: string): Modelo | null {
  return tentar(() => {
    const o = objeto(bruto);
    if (o.versao !== 1) throw new DadoInvalido();
    return {
      versao: 1,
      formato: lerFormato(o.formato),
      fundo: enderecoConfiavel(o.fundo, baseStorage),
      logo: lerLogo(o.logo, baseStorage),
      lugares: lerLugares(o.lugares),
    };
  });
}

/**
 * Decide onde ficam os destaques quando um modelo está aberto.
 * - Sem modelo: organização automática de sempre.
 * - Até o número de lugares: cada destaque ocupa o próximo lugar, em ordem.
 * - Mais destaques que lugares: volta para a automática e avisa (reorganizou = true).
 */
export function posicoesDosDestaques(
  quantidade: number,
  lugares: Lugar[] | null,
  automaticas: Posicao[],
): { coords: Posicao[]; reorganizou: boolean } {
  if (!lugares || lugares.length === 0) return { coords: automaticas, reorganizou: false };
  if (quantidade > lugares.length) return { coords: automaticas, reorganizou: true };
  return { coords: lugares.slice(0, quantidade).map(soPosicao), reorganizou: false };
}

/**
 * Escolhe quais imagens do computador cabem no rascunho (20 imagens e 50 MB), na ordem
 * recebida. Uma imagem grande que não cabe é pulada e as menores seguintes ainda entram.
 */
export function cabeNoLimite(arquivos: { id: string; tamanho: number }[]): string[] {
  const cabem: string[] = [];
  let total = 0;
  for (const a of arquivos) {
    if (cabem.length >= LIMITE_IMAGENS_RASCUNHO) break;
    if (total + a.tamanho > LIMITE_BYTES_RASCUNHO) continue;
    cabem.push(a.id);
    total += a.tamanho;
  }
  return cabem;
}
