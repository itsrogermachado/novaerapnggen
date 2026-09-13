import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeLogError } from "@/lib/log";
import type { Foreground } from "@/types/canvas";

/** Carrega uma imagem pronta para ir ao canvas 2D. */
function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Sem isto o canvas fica "tainted" ao desenhar imagem de outra origem e o
    // toBlob do download lança SecurityError. O Storage do Supabase responde
    // com access-control-allow-origin: *, então a imagem chega limpa.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

interface Params {
  /** Lista de ids vinda de /app?resultados=id1,id2 */
  ids: string | undefined;
  setHighlightLibrary: React.Dispatch<
    React.SetStateAction<{ id: string; url: string; img: HTMLImageElement }[]>
  >;
  setForegrounds: React.Dispatch<React.SetStateAction<Foreground[]>>;
  saveToHistory: () => void;
  /** Chamado depois de importar, para limpar o parâmetro da URL. */
  aoConcluir: () => void;
}

/**
 * Traz resultados escolhidos em /resultados para dentro do estúdio.
 *
 * Eles entram pelo mesmo caminho de um upload manual — viram itens da
 * biblioteca de destaques e depois foregrounds — então arrastar, redimensionar,
 * randomizar, histórico e exportação funcionam sem nenhum código novo.
 */
export function useImportarResultados({
  ids,
  setHighlightLibrary,
  setForegrounds,
  saveToHistory,
  aoConcluir,
}: Params) {
  // Guarda o que já foi importado para o efeito não repetir o trabalho a cada
  // render nem reimportar quando o usuário volta para a aba.
  const jaImportados = useRef(new Set<string>());

  useEffect(() => {
    if (!ids) return;

    const pedidos = ids
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !jaImportados.current.has(s));

    if (pedidos.length === 0) {
      aoConcluir();
      return;
    }

    let cancelado = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("discord_images")
          .select("id, image_url")
          .in("id", pedidos);

        if (error) throw error;
        if (cancelado) return;

        const linhas = data ?? [];
        if (linhas.length === 0) {
          toast.error("Esses resultados não estão mais disponíveis.");
          aoConcluir();
          return;
        }

        const carregadas = await Promise.all(
          linhas.map(async (linha) => {
            try {
              const img = await carregarImagem(linha.image_url);
              return { id: linha.id, url: linha.image_url, img };
            } catch (err) {
              safeLogError("Não foi possível carregar o resultado:", err);
              return null;
            }
          }),
        );
        if (cancelado) return;

        const itens = carregadas.filter((x): x is NonNullable<typeof x> => x !== null);
        if (itens.length === 0) {
          toast.error("Não foi possível carregar as imagens.");
          aoConcluir();
          return;
        }

        saveToHistory();

        // Sem duplicar: se o mesmo resultado já estiver na biblioteca, reaproveita.
        setHighlightLibrary((prev) => {
          const existentes = new Set(prev.map((p) => p.id));
          return [...prev, ...itens.filter((i) => !existentes.has(i.id))];
        });

        setForegrounds((prev) => {
          const ativos = new Set(prev.map((f) => f.id));
          const novos = itens
            .filter((i) => !ativos.has(i.id))
            .map((i) => ({ id: i.id, url: i.url, img: i.img, x: 0.5, y: 0.5, size: 0.3 }));
          return [...prev, ...novos];
        });

        itens.forEach((i) => jaImportados.current.add(i.id));

        const n = itens.length;
        toast.success(
          n === 1 ? "Resultado adicionado ao canvas" : `${n} resultados adicionados ao canvas`,
        );

        const faltaram = pedidos.length - n;
        if (faltaram > 0) {
          toast.warning(
            faltaram === 1
              ? "1 resultado não pôde ser carregado."
              : `${faltaram} resultados não puderam ser carregados.`,
          );
        }
      } catch (err) {
        safeLogError("Falha ao importar resultados:", err);
        toast.error("Não foi possível trazer os resultados.");
      } finally {
        if (!cancelado) aoConcluir();
      }
    })();

    return () => {
      cancelado = true;
    };
    // aoConcluir e os setters são estáveis; o gatilho real é a lista de ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
}
