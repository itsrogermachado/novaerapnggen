import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Resultado {
  id: string;
  image_url: string;
  uploaded_at: string;
  expires_at: string;
  caption: string | null;
  author: string | null;
}

/**
 * Quantos resultados por página.
 *
 * Em dia cheio passa fácil de 60 prints, e a retenção é de 30 dias — ou seja, o
 * total pode chegar à casa dos milhares. Por isso a lista pagina em vez de ter
 * um teto: um limite fixo esconderia resultado sem o usuário perceber.
 */
export const POR_PAGINA = 30;

export type Periodo = "hoje" | "ontem" | "7d" | "30d" | "tudo";

export const PERIODOS: { valor: Periodo; rotulo: string }[] = [
  { valor: "hoje", rotulo: "Hoje" },
  { valor: "ontem", rotulo: "Ontem" },
  { valor: "7d", rotulo: "7 dias" },
  { valor: "30d", rotulo: "30 dias" },
  { valor: "tudo", rotulo: "Tudo" },
];

/** Início e fim do período, no fuso do próprio aparelho. */
export function intervaloDe(periodo: Periodo): { de: Date | null; ate: Date | null } {
  const inicioDeHoje = new Date();
  inicioDeHoje.setHours(0, 0, 0, 0);

  switch (periodo) {
    case "hoje":
      return { de: inicioDeHoje, ate: null };
    case "ontem": {
      const ontem = new Date(inicioDeHoje);
      ontem.setDate(ontem.getDate() - 1);
      return { de: ontem, ate: inicioDeHoje };
    }
    case "7d": {
      const d = new Date(inicioDeHoje);
      d.setDate(d.getDate() - 6); // hoje incluso
      return { de: d, ate: null };
    }
    case "30d": {
      const d = new Date(inicioDeHoje);
      d.setDate(d.getDate() - 29);
      return { de: d, ate: null };
    }
    case "tudo":
    default:
      return { de: null, ate: null };
  }
}

const CAMPOS = "id, image_url, uploaded_at, expires_at, caption, author";

/**
 * Resultados que o bot publica, lidos direto da tabela e paginados.
 *
 * Antes isto passava por GET /api/discord-images, que usava a service role key
 * para servir uma consulta que a RLS já permite a qualquer autenticado — e que
 * nunca chegou a existir: o gerador de rotas não reconhece aquele arquivo, então
 * o endpoint respondia 404 e a aba ficava permanentemente vazia.
 *
 * A janela de datas vai na consulta, não em filtro no cliente, para "30 dias"
 * não obrigar a baixar tudo e descartar depois.
 */
export function useResultados(periodo: Periodo = "hoje") {
  const query = useInfiniteQuery({
    queryKey: ["resultados", periodo],
    initialPageParam: 0,
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async ({ pageParam }): Promise<Resultado[]> => {
      const { de, ate } = intervaloDe(periodo);
      const inicio = (pageParam as number) * POR_PAGINA;

      let q = supabase
        .from("discord_images")
        .select(CAMPOS)
        // A limpeza roda de hora em hora, então existe uma janela em que a linha
        // já venceu mas ainda está no banco. Não faz sentido mostrar algo que
        // está para ser apagado.
        .gt("expires_at", new Date().toISOString())
        // id desempata o que foi publicado no mesmo instante — comum quando o
        // bot manda um lote de prints de uma vez.
        .order("uploaded_at", { ascending: false })
        .order("id", { ascending: false })
        .range(inicio, inicio + POR_PAGINA - 1);

      if (de) q = q.gte("uploaded_at", de.toISOString());
      if (ate) q = q.lt("uploaded_at", ate.toISOString());

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Resultado[];
    },
    // Página cheia significa que provavelmente há mais; página curta é o fim.
    getNextPageParam: (ultima, todas) => (ultima.length === POR_PAGINA ? todas.length : undefined),
  });

  return {
    ...query,
    /** Todas as páginas já carregadas, achatadas. */
    resultados: query.data?.pages.flat() ?? [],
  };
}

/**
 * Quantos resultados existem no período, sem trazer nenhuma linha.
 *
 * `head: true` faz o Postgres responder só com o total no cabeçalho — é o que
 * deixa o badge da aba e os números do menu de baixar saírem de graça.
 */
export async function contarDoPeriodo(periodo: Periodo): Promise<number> {
  const { de, ate } = intervaloDe(periodo);
  let q = supabase
    .from("discord_images")
    .select("id", { count: "exact", head: true })
    .gt("expires_at", new Date().toISOString());

  if (de) q = q.gte("uploaded_at", de.toISOString());
  if (ate) q = q.lt("uploaded_at", ate.toISOString());

  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Só a contagem do dia, para o badge da aba. */
export function useContagemHoje() {
  const { data } = useQuery({
    queryKey: ["resultados-contagem", "hoje"],
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: () => contarDoPeriodo("hoje"),
  });
  return data ?? 0;
}

/** Períodos oferecidos no menu de baixar em lote: o dia, a semana e o mês. */
export const PERIODOS_DE_DOWNLOAD: { valor: Periodo; rotulo: string; detalhe: string }[] = [
  { valor: "hoje", rotulo: "Do dia", detalhe: "Hoje" },
  { valor: "7d", rotulo: "Da semana", detalhe: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Do mês", detalhe: "Últimos 30 dias" },
];

/**
 * Contagem dos três períodos do menu de baixar.
 *
 * Só consulta quando `ativo` — ou seja, quando o menu abre. Três consultas de
 * cabeçalho a cada abertura é barato; deixá-las rodando junto com a lista, que
 * recarrega a cada 30s, não seria.
 */
export function useContagensDeDownload(ativo: boolean) {
  const { data } = useQuery({
    queryKey: ["resultados-contagem", "download"],
    enabled: ativo,
    staleTime: 60_000,
    queryFn: async (): Promise<Partial<Record<Periodo, number>>> => {
      const pares = await Promise.all(
        PERIODOS_DE_DOWNLOAD.map(async (p) => [p.valor, await contarDoPeriodo(p.valor)] as const),
      );
      return Object.fromEntries(pares);
    },
  });
  return data ?? {};
}

/**
 * Páginas maiores para exportar: menos idas ao servidor quando o alvo é o mês
 * inteiro. A lista da tela continua em páginas de 30 — lá o que importa é a
 * primeira tela aparecer rápido.
 */
export const POR_PAGINA_EXPORT = 200;

/**
 * Todos os resultados do período, não só os que já estão na tela.
 *
 * "Baixar o mês" precisa do mês inteiro, e a lista carrega de 30 em 30 conforme
 * a pessoa rola — então ler `resultados` da tela baixaria só o começo.
 */
export async function buscarTodosDoPeriodo(
  periodo: Periodo,
  { signal, aoAvancar }: { signal?: AbortSignal; aoAvancar?: (quantos: number) => void } = {},
): Promise<Resultado[]> {
  const { de, ate } = intervaloDe(periodo);
  // Um só corte de tempo para todas as páginas: com `new Date()` a cada volta,
  // uma linha que vence no meio do caminho entraria em duas páginas ou sumiria.
  const agora = new Date().toISOString();
  const tudo: Resultado[] = [];

  for (let pagina = 0; ; pagina++) {
    if (signal?.aborted) break;
    const inicio = pagina * POR_PAGINA_EXPORT;

    let q = supabase
      .from("discord_images")
      .select(CAMPOS)
      .gt("expires_at", agora)
      .order("uploaded_at", { ascending: false })
      .order("id", { ascending: false })
      .range(inicio, inicio + POR_PAGINA_EXPORT - 1);

    if (de) q = q.gte("uploaded_at", de.toISOString());
    if (ate) q = q.lt("uploaded_at", ate.toISOString());
    if (signal) q = q.abortSignal(signal);

    const { data, error } = await q;
    if (error) throw error;

    const linhas = (data ?? []) as Resultado[];
    tudo.push(...linhas);
    aoAvancar?.(tudo.length);

    if (linhas.length < POR_PAGINA_EXPORT) break;
  }

  return tudo;
}
