/**
 * Levar resultado da tela para o aparelho do usuário — computador e celular.
 *
 * Os dois têm caminhos diferentes:
 * - No computador, `<a download>` com um blob resolve tudo.
 * - No celular, o mesmo `<a download>` joga o arquivo na pasta de downloads, onde
 *   ninguém acha. O menu de compartilhar do próprio sistema (Web Share) é o que
 *   oferece "Salvar imagem" direto na galeria, que é o que a pessoa quer fazer com
 *   um print. Por isso, no toque, tentamos compartilhar primeiro e caímos no
 *   download se o aparelho não deixar.
 *
 * A parte de nome de arquivo é pura de propósito: é ela que quebra na prática
 * (dois resultados do mesmo minuto, legenda com emoji, ":" que o Windows recusa)
 * e é ela que os testes cobrem em tests/baixar.test.mjs.
 */

export interface ResultadoBaixavel {
  id: string;
  image_url: string;
  uploaded_at: string;
  caption?: string | null;
}

const POR_TIPO: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "application/zip": "zip",
};

const EXTENSOES_CONHECIDAS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "avif", "bmp"]);

/** Extensão do arquivo, pelo endereço quando dá e pelo tipo do blob quando não dá. */
export function extensaoDe(url: string, tipo?: string | null): string {
  if (!url.startsWith("data:") && !url.startsWith("blob:")) {
    const semQuery = url.split("?")[0].split("#")[0];
    const achado = /\.([a-z0-9]{2,5})$/i.exec(semQuery);
    const ext = achado?.[1].toLowerCase();
    if (ext && EXTENSOES_CONHECIDAS.has(ext)) return ext === "jpeg" ? "jpg" : ext;
  }
  const base = (tipo ?? "").split(";")[0].trim().toLowerCase();
  return POR_TIPO[base] ?? "png";
}

/**
 * Tira do nome tudo que algum sistema recusa: `\ / : * ? " < > |`, caracteres de
 * controle, e ponto ou espaço no fim (o Windows apaga em silêncio e o nome muda).
 */
export function sanitizarNome(nome: string, maximo = 120): string {
  const limpo = nome
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const ponto = limpo.lastIndexOf(".");
  // Extensão de verdade: ponto seguido de 1 a 5 letras ou números. Sem esta
  // exigência, "resultado..." trataria o último ponto como extensão e o nome
  // saía como "resultado.".
  const temExtensao = ponto > 0 && /^\.[a-z0-9]{1,5}$/i.test(limpo.slice(ponto));
  const ext = temExtensao ? limpo.slice(ponto) : "";
  const base = (temExtensao ? limpo.slice(0, ponto) : limpo)
    .slice(0, Math.max(1, maximo - ext.length))
    .replace(/[. ]+$/, "");

  return (base || "arquivo") + ext;
}

/**
 * Distribuidor de nomes que nunca repete.
 *
 * Nome repetido não dá erro no zip, mas ao descompactar um arquivo apaga o
 * outro — e resultado perdido é justamente o que se está tentando evitar.
 * Compara sem diferenciar maiúsculas porque no Windows e no macOS `A.png` e
 * `a.png` são o mesmo arquivo.
 *
 * É um distribuidor, e não uma função sobre a lista toda, porque o lote em
 * partes precisa da mesma contagem valendo entre um .zip e o seguinte.
 */
export function criarNomeador(): (nome: string) => string {
  const usados = new Set<string>();
  return (nome) => {
    const ponto = nome.lastIndexOf(".");
    const temExtensao = ponto > 0;
    const base = temExtensao ? nome.slice(0, ponto) : nome;
    const ext = temExtensao ? nome.slice(ponto) : "";

    let tentativa = nome;
    let n = 1;
    while (usados.has(tentativa.toLowerCase())) {
      n++;
      tentativa = `${base}-${n}${ext}`;
    }
    usados.add(tentativa.toLowerCase());
    return tentativa;
  };
}

/** `criarNomeador` aplicado de uma vez a uma lista pronta. */
export function nomesUnicos(nomes: string[]): string[] {
  const nomear = criarNomeador();
  return nomes.map(nomear);
}

/** Pedaço de texto seguro para nome de arquivo: sem acento, sem símbolo, sem emoji. */
export function apelido(texto: string | null | undefined, maximo = 40): string {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, maximo)
    .replace(/^-+|-+$/g, "");
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** `2026-09-17` no fuso do próprio aparelho. */
export function dataCurta(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/**
 * Nome de um resultado: data, hora e um pedaço da legenda.
 *
 * A hora entra porque num dia cheio saem dezenas de prints, e "resultado-3.png"
 * não diz nada a quem for procurar depois na galeria.
 */
export function nomeDoResultado(r: ResultadoBaixavel, extensao = "png"): string {
  const d = new Date(r.uploaded_at);
  const quando = Number.isNaN(d.getTime())
    ? "sem-data"
    : `${dataCurta(d)}_${doisDigitos(d.getHours())}h${doisDigitos(d.getMinutes())}`;
  const legenda = apelido(r.caption);
  return sanitizarNome(`nova-era_${quando}${legenda ? `_${legenda}` : ""}.${extensao}`);
}

/** Nome do .zip do lote. `total > 1` numera as partes. */
export function nomeDoZip(rotulo: string, parte = 1, total = 1): string {
  const base = `nova-era_${apelido(rotulo) || "resultados"}_${dataCurta(new Date())}`;
  return sanitizarNome(total > 1 ? `${base}_parte-${parte}-de-${total}.zip` : `${base}.zip`);
}

// --- daqui para baixo depende do navegador ---

export interface ArquivoPronto {
  nome: string;
  blob: Blob;
}

/** true quando `<a download>` funciona (todo navegador atual; Safari antigo não). */
export function podeBaixarDireto(): boolean {
  return typeof document !== "undefined" && "download" in document.createElement("a");
}

/** true em tela de toque — onde o menu de compartilhar vale mais que a pasta de downloads. */
export function ehAparelhoDeToque(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

type NavegadorQueCompartilha = Navigator & {
  canShare?: (dados: ShareData) => boolean;
  share?: (dados: ShareData) => Promise<void>;
};

function comoArquivos(itens: ArquivoPronto[]): File[] | null {
  if (typeof File !== "function") return null;
  try {
    return itens.map(
      (i) => new File([i.blob], i.nome, { type: i.blob.type || "application/octet-stream" }),
    );
  } catch {
    return null;
  }
}

/**
 * true quando dá para salvar imagem direto na galeria deste aparelho.
 *
 * Responde antes de qualquer imagem ser baixada — é isto que deixa escolher o
 * caminho (galeria ou .zip) já no toque, em vez de descobrir no fim que não
 * dava e despejar um .zip na cara de quem só queria a foto no rolo da câmera.
 *
 * A pergunta é feita com um arquivo de mentira porque `canShare` precisa ver um
 * File de verdade para responder sobre arquivos.
 */
export function aparelhoSalvaNaGaleria(): boolean {
  if (!ehAparelhoDeToque() || typeof navigator === "undefined") return false;
  const nav = navigator as NavegadorQueCompartilha;
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  try {
    const teste = new File([new Uint8Array(1)], "teste.png", { type: "image/png" });
    return nav.canShare({ files: [teste] });
  } catch {
    return false;
  }
}

/**
 * Teto de arquivos por envio.
 *
 * Não é limite de norma nenhuma — é prudência: entregar mil imagens de uma vez
 * ao sistema trava o menu de compartilhar. Abaixo disso, quem decide é o
 * aparelho (veja `maiorEnvioPossivel`).
 */
export const TETO_POR_ENVIO = 100;

/**
 * Quantos arquivos este aparelho topa mandar de uma vez.
 *
 * Nenhum navegador publica esse número, então em vez de chutar baixo — o que
 * transformaria um mês de resultados em dezenas de toques — a gente pergunta:
 * tenta o lote inteiro e vai pela metade até o aparelho aceitar. Um toque
 * resolve o dia; dois ou três resolvem o mês.
 *
 * `aceita` é injetável para o teste poder simular aparelhos com limites
 * diferentes sem navegador.
 */
export function maiorEnvioPossivel(
  itens: ArquivoPronto[],
  {
    teto = TETO_POR_ENVIO,
    maxBytes = 150 * 1024 * 1024,
    aceita = podeCompartilhar,
  }: {
    teto?: number;
    maxBytes?: number;
    aceita?: (itens: ArquivoPronto[]) => boolean;
  } = {},
): number {
  if (itens.length === 0) return 1;

  // Teto por peso: o aparelho pode aceitar a contagem e engasgar no tamanho.
  let alto = Math.min(teto, itens.length);
  let bytes = 0;
  for (let i = 0; i < alto; i++) {
    bytes += itens[i].blob.size;
    if (bytes > maxBytes) {
      alto = Math.max(1, i);
      break;
    }
  }

  if (aceita(itens.slice(0, alto))) return alto;

  // Busca binária pelo maior que ainda passa. Ir só cortando pela metade daria
  // 11 num aparelho que aceita 20 — e cada envio a menos é um toque a mais para
  // quem está salvando o mês inteiro.
  let baixo = 1;
  while (alto - baixo > 1) {
    const meio = Math.floor((baixo + alto) / 2);
    if (aceita(itens.slice(0, meio))) baixo = meio;
    else alto = meio;
  }
  return baixo;
}

/**
 * Quebra a lista em envios do tamanho que o menu de compartilhar aguenta.
 *
 * Cada envio pede um toque — e é bom que peça: toque novo é gesto novo, que é
 * justamente o que o `navigator.share` exige.
 */
export function dividirParaCompartilhar(
  itens: ArquivoPronto[],
  {
    maxArquivos = TETO_POR_ENVIO,
    maxBytes = 150 * 1024 * 1024,
  }: { maxArquivos?: number; maxBytes?: number } = {},
): ArquivoPronto[][] {
  const lotes: ArquivoPronto[][] = [];
  let atual: ArquivoPronto[] = [];
  let bytes = 0;

  for (const item of itens) {
    // Uma imagem sozinha maior que o teto ainda vai: sozinha, no lote dela.
    if (atual.length > 0 && (atual.length >= maxArquivos || bytes + item.blob.size > maxBytes)) {
      lotes.push(atual);
      atual = [];
      bytes = 0;
    }
    atual.push(item);
    bytes += item.blob.size;
  }
  if (atual.length > 0) lotes.push(atual);
  return lotes;
}

/** true quando este aparelho aceita mandar estes arquivos para o menu de compartilhar. */
export function podeCompartilhar(itens: ArquivoPronto[]): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavegadorQueCompartilha;
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") return false;
  const arquivos = comoArquivos(itens);
  if (!arquivos) return false;
  try {
    return nav.canShare({ files: arquivos });
  } catch {
    return false;
  }
}

/** Salva um arquivo na pasta de downloads. */
export function baixarArquivo({ blob, nome }: ArquivoPronto): void {
  const endereco = URL.createObjectURL(blob);

  if (!podeBaixarDireto()) {
    // Safari antigo ignora o atributo `download`: abrir em outra aba ao menos
    // deixa a pessoa segurar a imagem e salvar na mão.
    window.open(endereco, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(endereco), 60_000);
    return;
  }

  const a = document.createElement("a");
  a.href = endereco;
  a.download = nome;
  a.rel = "noopener";
  a.style.display = "none";
  // O Firefox só dispara o clique se o elemento estiver no documento.
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revogar na linha seguinte ao clique cancela o download em alguns
  // navegadores, que ainda nem começaram a gravar.
  setTimeout(() => URL.revokeObjectURL(endereco), 60_000);
}

export type FimDoCompartilhar = "compartilhado" | "cancelado" | "recusado";

/**
 * Abre o menu de compartilhar do aparelho com estes arquivos.
 *
 * "recusado" quer dizer que não deu para abrir — aparelho sem Web Share, ou o
 * gesto do usuário expirou enquanto as imagens baixavam (o iOS é rigoroso com
 * isso). Quem chamou decide o que fazer no lugar; "cancelado" é a pessoa
 * fechando o menu, e aí não se faz nada por baixo.
 */
export async function tentarCompartilhar(
  itens: ArquivoPronto[],
  titulo?: string,
): Promise<FimDoCompartilhar> {
  if (itens.length === 0 || !podeCompartilhar(itens)) return "recusado";
  const arquivos = comoArquivos(itens);
  if (!arquivos) return "recusado";

  try {
    await (navigator as NavegadorQueCompartilha).share!({ files: arquivos, title: titulo });
    return "compartilhado";
  } catch (err) {
    return err instanceof Error && err.name === "AbortError" ? "cancelado" : "recusado";
  }
}

export type FimDoSalvamento = FimDoCompartilhar | "baixado";

/**
 * Entrega os arquivos ao aparelho: menu de compartilhar quando faz sentido,
 * download quando não.
 */
export async function entregar(
  itens: ArquivoPronto[],
  {
    titulo,
    compartilharPrimeiro = ehAparelhoDeToque(),
  }: { titulo?: string; compartilharPrimeiro?: boolean } = {},
): Promise<FimDoSalvamento> {
  if (itens.length === 0) return "baixado";

  if (compartilharPrimeiro) {
    const fim = await tentarCompartilhar(itens, titulo);
    if (fim !== "recusado") return fim;
  }

  for (const [i, item] of itens.entries()) {
    baixarArquivo(item);
    // Vários downloads no mesmo instante fazem o navegador descartar os últimos.
    if (i < itens.length - 1) await new Promise((r) => setTimeout(r, 350));
  }
  return "baixado";
}

export class ImagemIndisponivelError extends Error {}

/** Baixa a imagem do resultado. Erro claro quando ela já saiu do ar. */
export async function buscarImagem(url: string, signal?: AbortSignal): Promise<Blob> {
  const resposta = await fetch(url, { signal, mode: "cors", credentials: "omit" });
  if (!resposta.ok) {
    throw new ImagemIndisponivelError(`A imagem respondeu ${resposta.status}`);
  }
  return resposta.blob();
}
