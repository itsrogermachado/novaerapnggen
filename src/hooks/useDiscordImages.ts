import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isLive } from "@/lib/time";

export interface DiscordImage {
  id: string;
  image_url: string;
  uploaded_at: string;
  expires_at: string;
  caption: string | null;
  author: string | null;
}

/**
 * Teto de segurança: a tabela só guarda 24h de sinais, mas um dia movimentado
 * (ou um bot em laço) não pode virar uma resposta de milhares de linhas no 4G.
 */
const MAX_SIGNAIS = 60;

/**
 * Sinais vivos, lidos direto da tabela.
 *
 * Antes isto passava por GET /api/discord-images, que usava a service role key
 * para servir uma consulta que a RLS já permite a qualquer usuário autenticado —
 * e que, além do mais, nunca chegou a existir: o arquivo da rota não é
 * reconhecido pelo gerador, então o endpoint respondia 404 e a aba ficava
 * permanentemente vazia. Lendo pelo cliente, a aba funciona sem depender de
 * endpoint nenhum, e o POST do bot continua sendo a única coisa que precisa de
 * API (Fase 4).
 */
export function useDiscordImages() {
  return useQuery({
    queryKey: ["discord-images"],
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async (): Promise<DiscordImage[]> => {
      const { data, error } = await supabase
        .from("discord_images")
        .select("id, image_url, uploaded_at, expires_at, caption, author")
        .gt("expires_at", new Date().toISOString())
        .order("uploaded_at", { ascending: false })
        .limit(MAX_SIGNAIS);

      if (error) throw error;
      return (data ?? []) as DiscordImage[];
    },
    // O filtro do servidor vale no instante da consulta; este aqui derruba os
    // que vencem enquanto a aba fica aberta, sem precisar de nova ida à rede.
    select: (images) => images.filter((img) => isLive(img.expires_at)),
  });
}
