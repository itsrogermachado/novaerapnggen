import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Resultado {
  id: string;
  image_url: string;
  uploaded_at: string;
  expires_at: string;
  caption: string | null;
  author: string | null;
}

/** Um dia movimentado não pode virar uma resposta de milhares de linhas no 4G. */
const MAX_RESULTADOS = 200;

/** Períodos do filtro de data da aba. */
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

/**
 * Resultados que o bot publica, lidos direto da tabela.
 *
 * Antes isto passava por GET /api/discord-images, que usava a service role key
 * para servir uma consulta que a RLS já permite a qualquer autenticado — e que
 * nunca chegou a existir: o gerador de rotas não reconhece aquele arquivo, então
 * o endpoint respondia 404 e a aba ficava permanentemente vazia. Lendo pelo
 * cliente, a aba funciona sem endpoint nenhum.
 *
 * A janela de datas vai na consulta, não em filtro no cliente: assim "30 dias"
 * não obriga a baixar tudo para descartar depois.
 */
export function useResultados(periodo: Periodo = "tudo") {
  return useQuery({
    queryKey: ["resultados", periodo],
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async (): Promise<Resultado[]> => {
      const { de, ate } = intervaloDe(periodo);

      let q = supabase
        .from("discord_images")
        .select("id, image_url, uploaded_at, expires_at, caption, author")
        .order("uploaded_at", { ascending: false })
        .limit(MAX_RESULTADOS);

      if (de) q = q.gte("uploaded_at", de.toISOString());
      if (ate) q = q.lt("uploaded_at", ate.toISOString());

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Resultado[];
    },
  });
}

/** Só a contagem do dia, para o badge da aba. */
export function useContagemHoje() {
  const { data } = useResultados("hoje");
  return data?.length ?? 0;
}
