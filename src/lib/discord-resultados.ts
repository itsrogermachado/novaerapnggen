// Regras do bot que copia os prints do Discord para a aba Resultados.
// Aqui só existe lógica pura: nada acessa a internet nem o banco. Isso permite
// testar cada regra sozinha (tests/discord-resultados.test.mjs).

/** Tipos de imagem aceitos e a extensão usada no nome do arquivo salvo. */
const EXTENSOES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Maior print aceito: 10 MB, o mesmo teto de envio de uma conta comum do Discord. */
export const MAX_BYTES_IMAGEM = 10 * 1024 * 1024;

/** Quantos dias de prints antigos entram na primeira leitura de um canal. */
export const DIAS_IMPORTACAO = 7;

/** Quantos dias cada resultado fica no site (o mesmo padrão da tabela). */
export const DIAS_RETENCAO = 30;

/** De onde aceitamos baixar imagem de embed: só dos servidores do próprio Discord. */
const HOSTS_DISCORD = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

/** Instante (em milissegundos) em que o Discord começou a contar os IDs: 01/01/2015. */
const EPOCA_DISCORD = 1420070400000n;

/** Um dia em milissegundos. */
export const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** O pedaço de uma mensagem do Discord que o bot usa. O resto é ignorado. */
export interface MensagemDiscord {
  id: string;
  timestamp: string;
  attachments?: { id: string; content_type?: string; size?: number; url: string }[];
  embeds?: { image?: { url?: string } }[];
}

/**
 * Uma imagem achada numa mensagem.
 * `chave` identifica a imagem dentro da mensagem e nunca muda: é ela que deixa o
 * nome do arquivo fixo, e nome fixo é o que impede o mesmo print de entrar duas vezes.
 */
export interface ImagemEncontrada {
  chave: string;
  url: string;
}

// Transforma uma data num ID do Discord.
// O ID de cada mensagem carrega a data em que ela foi enviada. Por isso "me dê as
// mensagens depois deste ID" funciona igual a "me dê as mensagens depois desta data".
export function idDaData(ms: number): string {
  return ((BigInt(Math.floor(ms)) - EPOCA_DISCORD) << 22n).toString();
}

// Coloca as mensagens da mais antiga para a mais nova (o Discord manda ao contrário).
// Compara como número grande: comparando como texto, "99" viria depois de "100".
// Devolve uma lista nova, sem mexer na original.
export function ordenarDaMaisAntiga<T extends { id: string }>(mensagens: T[]): T[] {
  return [...mensagens].sort((a, b) => {
    const x = BigInt(a.id);
    const y = BigInt(b.id);
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

// Descobre a extensão do arquivo pelo tipo que o servidor informa ("image/png" vira "png").
// Qualquer tipo fora da lista aceita devolve null, e a imagem é descartada.
export function extensaoDoTipo(contentType: string | null): string | null {
  const tipo = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return EXTENSOES[tipo] ?? null;
}

// Diz se um endereço é https e pertence aos servidores de imagem do Discord.
// Endereço inválido conta como "não".
function ehImagemDoDiscord(url: string): boolean {
  try {
    const endereco = new URL(url);
    return endereco.protocol === "https:" && HOSTS_DISCORD.has(endereco.hostname);
  } catch {
    return false;
  }
}

// Acha as imagens de uma mensagem.
// - Anexo (arquivo enviado junto): entra se for png, jpeg ou webp e couber no limite.
// - Embed (o "cartão" que bots usam): entra só a imagem principal e só se estiver no
//   Discord. A miniatura fica de fora porque costuma ser o avatar de quem postou.
export function extrairImagens(msg: MensagemDiscord): ImagemEncontrada[] {
  const imagens: ImagemEncontrada[] = [];

  for (const anexo of msg.attachments ?? []) {
    if (!extensaoDoTipo(anexo.content_type ?? null)) continue;
    if ((anexo.size ?? 0) > MAX_BYTES_IMAGEM) continue;
    imagens.push({ chave: anexo.id, url: anexo.url });
  }

  (msg.embeds ?? []).forEach((embed, posicao) => {
    const url = embed.image?.url;
    if (url && ehImagemDoDiscord(url)) {
      imagens.push({ chave: `embed${posicao}`, url });
    }
  });

  return imagens;
}

// Monta o nome do arquivo no bucket. Sempre o mesmo para a mesma imagem da mesma
// mensagem: se o bot tentar salvar de novo, sobrescreve em vez de criar outro arquivo.
export function caminhoNoBucket(idMensagem: string, chave: string, extensao: string): string {
  return `bot/${idMensagem}/${chave}.${extensao}`;
}

// Calcula quando o resultado sai do site: 30 dias depois de ter sido postado no Discord.
export function expiraEm(timestampIso: string): string {
  return new Date(new Date(timestampIso).getTime() + DIAS_RETENCAO * UM_DIA_MS).toISOString();
}

// Confere a senha do agendador sem "vazar" pelo tempo de resposta:
// compara todos os caracteres sempre, em vez de parar no primeiro diferente.
export function segredoConfere(recebido: string | null, esperado: string): boolean {
  if (!recebido || !esperado || recebido.length !== esperado.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) {
    diferenca |= recebido.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diferenca === 0;
}
