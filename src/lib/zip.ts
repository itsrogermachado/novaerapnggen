/**
 * Escritor de .zip, em TypeScript puro e sem dependência nova.
 *
 * Por que existe: para baixar vários resultados de uma vez. Disparar N downloads
 * seguidos faz o navegador perguntar "permitir vários downloads?" e, no celular,
 * quase sempre só o primeiro chega. Um arquivo só resolve nos dois lugares.
 *
 * Por que sem compressão (método "store", 0): o que vai dentro já é PNG/WebP, ou
 * seja, já está comprimido. Passar deflate por cima gasta CPU do celular para
 * economizar quase nada — e sem deflate não precisamos de biblioteca externa.
 *
 * Só lógica pura: nada de React nem de DOM. `Blob` existe no Node desde a v18,
 * então isto roda nos testes (tests/zip.test.mjs) sem navegador.
 */

/** Tabela do CRC-32 (polinômio 0xEDB88320), montada uma vez. */
const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/**
 * CRC-32 dos bytes. `anterior` encadeia pedaços: passe o resultado da chamada
 * anterior para somar o arquivo aos poucos, sem carregá-lo inteiro na memória.
 */
export function crc32(bytes: Uint8Array, anterior = 0): number {
  let c = (anterior ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    c = (TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface EntradaZip {
  /** Nome do arquivo dentro do .zip. Já deve vir limpo e sem repetir. */
  nome: string;
  dados: Blob;
  /** Data que aparece no arquivo. Sem isto, a de agora. */
  data?: Date;
}

/** O zip clássico só endereça 4 GB e 65.535 arquivos; acima disso precisaria de ZIP64. */
export class ZipGrandeDemaisError extends Error {}

const MAX_ARQUIVOS = 0xffff;
const MAX_BYTES = 0xffffffff;
/** Lido em pedaços para o CRC não exigir o arquivo inteiro de uma vez. */
const PEDACO_CRC = 4 * 1024 * 1024;

/** Data e hora no formato do MS-DOS, que é o que o zip guarda. */
function carimboDos(d: Date): { dia: number; hora: number } {
  const valida = !Number.isNaN(d.getTime());
  const data = valida ? d : new Date();
  // O formato começa em 1980 e não tem como representar nada antes disso.
  const ano = Math.min(2107, Math.max(1980, data.getFullYear()));
  return {
    dia: ((ano - 1980) << 9) | ((data.getMonth() + 1) << 5) | data.getDate(),
    hora: (data.getHours() << 11) | (data.getMinutes() << 5) | Math.floor(data.getSeconds() / 2),
  };
}

async function somaDoBlob(blob: Blob): Promise<number> {
  let soma = 0;
  for (let i = 0; i < blob.size; i += PEDACO_CRC) {
    const fatia = await blob.slice(i, Math.min(i + PEDACO_CRC, blob.size)).arrayBuffer();
    soma = crc32(new Uint8Array(fatia), soma);
  }
  return soma;
}

interface Campos {
  nome: Uint8Array;
  soma: number;
  tamanho: number;
  dia: number;
  hora: number;
}

// Bit 11 ligado avisa que o nome está em UTF-8 — sem ele, acento vira lixo no
// Windows.
const SINALIZADOR_UTF8 = 0x0800;

function cabecalhoLocal({ nome, soma, tamanho, dia, hora }: Campos): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(30 + nome.length);
  const v = new DataView(buf.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 20, true); // versão necessária
  v.setUint16(6, SINALIZADOR_UTF8, true);
  v.setUint16(8, 0, true); // método: store
  v.setUint16(10, hora, true);
  v.setUint16(12, dia, true);
  v.setUint32(14, soma, true);
  v.setUint32(18, tamanho, true); // comprimido
  v.setUint32(22, tamanho, true); // original
  v.setUint16(26, nome.length, true);
  v.setUint16(28, 0, true); // sem campo extra
  buf.set(nome, 30);
  return buf;
}

function cabecalhoCentral(campos: Campos, deslocamento: number): Uint8Array<ArrayBuffer> {
  const { nome, soma, tamanho, dia, hora } = campos;
  const buf = new Uint8Array(46 + nome.length);
  const v = new DataView(buf.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 20, true); // versão de quem escreveu
  v.setUint16(6, 20, true); // versão necessária
  v.setUint16(8, SINALIZADOR_UTF8, true);
  v.setUint16(10, 0, true); // método: store
  v.setUint16(12, hora, true);
  v.setUint16(14, dia, true);
  v.setUint32(16, soma, true);
  v.setUint32(20, tamanho, true);
  v.setUint32(24, tamanho, true);
  v.setUint16(28, nome.length, true);
  v.setUint16(30, 0, true); // extra
  v.setUint16(32, 0, true); // comentário
  v.setUint16(34, 0, true); // disco
  v.setUint16(36, 0, true); // atributos internos
  v.setUint32(38, 0, true); // atributos externos
  v.setUint32(42, deslocamento, true);
  buf.set(nome, 46);
  return buf;
}

function fim(
  quantos: number,
  tamanhoCentral: number,
  inicioCentral: number,
): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(22);
  const v = new DataView(buf.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(4, 0, true);
  v.setUint16(6, 0, true);
  v.setUint16(8, quantos, true);
  v.setUint16(10, quantos, true);
  v.setUint32(12, tamanhoCentral, true);
  v.setUint32(16, inicioCentral, true);
  v.setUint16(20, 0, true); // sem comentário
  return buf;
}

/**
 * Monta o .zip. As partes entram como Blob, não como bytes: assim o navegador
 * guarda o conteúdo fora do heap do JavaScript (e no disco, se precisar), o que
 * é a diferença entre baixar 30 dias de resultados e travar o celular.
 */
export async function criarZip(entradas: EntradaZip[]): Promise<Blob> {
  if (entradas.length > MAX_ARQUIVOS) {
    throw new ZipGrandeDemaisError(`Um .zip só cabe ${MAX_ARQUIVOS} arquivos.`);
  }

  const codificador = new TextEncoder();
  const partes: BlobPart[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let deslocamento = 0;
  let tamanhoCentral = 0;

  for (const entrada of entradas) {
    // Barra invertida vira barra: no zip só a barra normal separa pastas, e o
    // Windows recusaria o arquivo com o nome torto.
    const nome = codificador.encode(entrada.nome.replace(/\\/g, "/"));
    const tamanho = entrada.dados.size;
    const campos = {
      nome,
      tamanho,
      soma: await somaDoBlob(entrada.dados),
      ...carimboDos(entrada.data ?? new Date()),
    };

    const local = cabecalhoLocal(campos);
    if (deslocamento + local.length + tamanho > MAX_BYTES) {
      throw new ZipGrandeDemaisError("Passou de 4 GB — baixe em partes menores.");
    }

    partes.push(local, entrada.dados);
    const entradaCentral = cabecalhoCentral(campos, deslocamento);
    central.push(entradaCentral);
    deslocamento += local.length + tamanho;
    tamanhoCentral += entradaCentral.length;
  }

  const inicioCentral = deslocamento;
  partes.push(...central, fim(entradas.length, tamanhoCentral, inicioCentral));

  return new Blob(partes, { type: "application/zip" });
}
