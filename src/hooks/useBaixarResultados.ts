import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { criarZip, ZipGrandeDemaisError } from "@/lib/zip";
import {
  baixarArquivo,
  buscarImagem,
  criarNomeador,
  ehAparelhoDeToque,
  entregar,
  extensaoDe,
  nomeDoResultado,
  nomeDoZip,
  tentarCompartilhar,
  type ArquivoPronto,
} from "@/lib/baixar";
import { buscarTodosDoPeriodo, type Periodo, type Resultado } from "@/hooks/useResultados";
import { safeLogError } from "@/lib/log";

/**
 * Quantos resultados cabem em um .zip antes de começar a segunda parte.
 *
 * O limite é a memória do celular, não o formato: um mês cheio passa de mil
 * prints, e montar isso em um arquivo só derruba a aba. Em partes, o pico fica
 * no tamanho de uma parte — e cada parte já chega inteira no aparelho, em vez de
 * tudo falhar no fim.
 */
export const MAX_POR_ZIP = 100;

/**
 * Até este tanto, no celular, vale abrir o menu de compartilhar com as imagens
 * soltas: de lá sai "Salvar imagens" direto na galeria. Acima disso o menu fica
 * impraticável (e o iOS recusa), então vira .zip.
 */
export const MAX_COMPARTILHAR = 10;

/** Quantas imagens buscar ao mesmo tempo. */
const PARALELAS = 5;

export type FaseDoDownload = "procurando" | "baixando" | "compactando" | "salvando";

export interface ProgressoDownload {
  fase: FaseDoDownload;
  prontos: number;
  total: number;
  rotulo: string;
  /** Em quantas partes o lote sai. 1 quando é um arquivo só. */
  partes: number;
  parte: number;
}

interface Coleta {
  itens: ArquivoPronto[];
  falhas: number;
}

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Traz resultados da aba para o aparelho: um, vários escolhidos, ou um período
 * inteiro.
 *
 * Só um download por vez — um segundo clique enquanto o primeiro roda ganha um
 * aviso em vez de disputar rede e memória com ele.
 */
export function useBaixarResultados() {
  const [progresso, setProgresso] = useState<ProgressoDownload | null>(null);
  const abortarRef = useRef<AbortController | null>(null);
  // O estado não serve para decidir se já tem download rodando: dois cliques no
  // mesmo instante leem o mesmo `null` antes de o React re-renderizar.
  const ocupadoRef = useRef(false);
  const vivoRef = useRef(true);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      abortarRef.current?.abort();
    };
  }, []);

  const cancelar = useCallback(() => abortarRef.current?.abort(), []);

  const avancar = useCallback((mudanca: Partial<ProgressoDownload>) => {
    if (!vivoRef.current) return;
    setProgresso((p) => (p ? { ...p, ...mudanca } : p));
  }, []);

  /** Busca as imagens, algumas ao mesmo tempo, avisando o progresso a cada uma. */
  const coletar = useCallback(
    async (
      resultados: Resultado[],
      nomear: (nome: string) => string,
      signal: AbortSignal,
      aoBaixarUma: () => void,
    ): Promise<Coleta> => {
      const itens: (ArquivoPronto | null)[] = new Array(resultados.length).fill(null);
      let falhas = 0;
      let proximo = 0;

      const trabalhador = async () => {
        for (;;) {
          const i = proximo++;
          if (i >= resultados.length || signal.aborted) return;
          const r = resultados[i];
          try {
            const blob = await buscarImagem(r.image_url, signal);
            itens[i] = { nome: nomeDoResultado(r, extensaoDe(r.image_url, blob.type)), blob };
          } catch (err) {
            if (signal.aborted) return;
            // Um resultado apagado no meio do caminho não pode derrubar o lote:
            // conta como falha e o resto segue.
            safeLogError("Resultado não pôde ser baixado:", err);
            falhas++;
          }
          aoBaixarUma();
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(PARALELAS, resultados.length) }, trabalhador),
      );

      // Os nomes só saem aqui, e na ordem da lista, para a numeração dos
      // repetidos não depender de qual imagem chegou primeiro da rede.
      return {
        itens: itens
          .filter((x): x is ArquivoPronto => x !== null)
          .map((x) => ({ ...x, nome: nomear(x.nome) })),
        falhas,
      };
    },
    [],
  );

  /** O trabalho em si: busca, empacota quando precisa e entrega ao aparelho. */
  const entregarLote = useCallback(
    async (resultados: Resultado[], rotulo: string, signal: AbortSignal) => {
      const total = resultados.length;
      const partes = Math.ceil(total / MAX_POR_ZIP);
      const nomear = criarNomeador();
      let prontos = 0;
      let falhas = 0;

      setProgresso({ fase: "baixando", prontos: 0, total, rotulo, partes, parte: 1 });
      const contarUma = (parte: number) => () => avancar({ prontos: ++prontos, parte });

      const avisarFalhas = () => {
        if (falhas === 0 || signal.aborted) return;
        toast.warning(
          falhas === 1
            ? "1 resultado não estava mais disponível."
            : `${falhas} resultados não estavam mais disponíveis.`,
        );
      };

      // --- um só: vai direto, sem zip ---
      if (total === 1) {
        const { itens } = await coletar(resultados, nomear, signal, contarUma(1));
        if (signal.aborted) return;
        if (itens.length === 0) {
          toast.error("Essa imagem não está mais disponível.");
          return;
        }
        avancar({ fase: "salvando" });
        const fim = await entregar(itens, { titulo: "Resultado Nova Era" });
        if (fim !== "cancelado") {
          toast.success(fim === "compartilhado" ? "Imagem enviada" : "Imagem baixada");
        }
        return;
      }

      // --- poucos, no celular: menu de compartilhar com as imagens soltas ---
      if (total <= MAX_COMPARTILHAR && ehAparelhoDeToque()) {
        const coleta = await coletar(resultados, nomear, signal, contarUma(1));
        if (signal.aborted) return;
        falhas = coleta.falhas;
        if (coleta.itens.length === 0) {
          toast.error("Nenhuma dessas imagens está mais disponível.");
          return;
        }

        avancar({ fase: "salvando" });
        const fim = await tentarCompartilhar(coleta.itens, `Resultados — ${rotulo}`);
        if (fim === "cancelado") return;
        if (fim === "compartilhado") {
          toast.success(`${coleta.itens.length} imagens enviadas`);
          avisarFalhas();
          return;
        }

        // Recusado pelo aparelho: cai no .zip com o que já veio da rede.
        avancar({ fase: "compactando" });
        const zip = await criarZip(coleta.itens.map((i) => ({ nome: i.nome, dados: i.blob })));
        if (signal.aborted) return;
        baixarArquivo({ blob: zip, nome: nomeDoZip(rotulo) });
        toast.success(`${coleta.itens.length} resultados baixados em .zip`);
        avisarFalhas();
        return;
      }

      // --- lote: um .zip, ou vários quando é muita coisa ---
      for (let p = 0; p < partes; p++) {
        if (signal.aborted) return;
        const fatia = resultados.slice(p * MAX_POR_ZIP, (p + 1) * MAX_POR_ZIP);
        avancar({ fase: "baixando", parte: p + 1 });

        const coleta = await coletar(fatia, nomear, signal, contarUma(p + 1));
        if (signal.aborted) return;
        falhas += coleta.falhas;
        if (coleta.itens.length === 0) continue;

        avancar({ fase: "compactando", parte: p + 1 });
        const zip = await criarZip(coleta.itens.map((i) => ({ nome: i.nome, dados: i.blob })));
        if (signal.aborted) return;

        baixarArquivo({ blob: zip, nome: nomeDoZip(rotulo, p + 1, partes) });
        // Um respiro entre as partes: disparadas juntas, o navegador descarta
        // as últimas.
        if (p < partes - 1) await esperar(900);
      }

      const salvos = total - falhas;
      if (salvos === 0) {
        toast.error("Nenhuma imagem pôde ser baixada.");
        return;
      }
      toast.success(
        partes > 1
          ? `${salvos} resultados baixados em ${partes} arquivos .zip`
          : `${salvos} resultados baixados em um .zip`,
      );
      avisarFalhas();
    },
    [avancar, coletar],
  );

  /** Envolve a tarefa com o controle de "um por vez", cancelamento e erro. */
  const rodar = useCallback(async (tarefa: (signal: AbortSignal) => Promise<void>) => {
    if (ocupadoRef.current) {
      toast.info("Já tem um download em andamento.");
      return;
    }

    const controle = new AbortController();
    abortarRef.current = controle;
    ocupadoRef.current = true;

    try {
      await tarefa(controle.signal);
      if (controle.signal.aborted) toast.info("Download cancelado.");
    } catch (err) {
      if (controle.signal.aborted) {
        toast.info("Download cancelado.");
        return;
      }
      safeLogError("Falha ao baixar resultados:", err);
      toast.error(
        err instanceof ZipGrandeDemaisError
          ? "Esse lote é grande demais. Baixe por um período menor."
          : "Não foi possível baixar. Tente de novo.",
      );
    } finally {
      ocupadoRef.current = false;
      abortarRef.current = null;
      if (vivoRef.current) setProgresso(null);
    }
  }, []);

  /** Baixa resultados que já estão na tela: um, ou os selecionados. */
  const baixarResultados = useCallback(
    (resultados: Resultado[], rotulo = "selecionados") => {
      if (resultados.length === 0) {
        toast.info("Nenhum resultado selecionado.");
        return Promise.resolve();
      }
      return rodar((signal) => entregarLote(resultados, rotulo, signal));
    },
    [entregarLote, rodar],
  );

  /** Baixa o período inteiro — inclusive o que a lista ainda não carregou. */
  const baixarPeriodo = useCallback(
    (periodo: Periodo, rotulo: string) =>
      rodar(async (signal) => {
        setProgresso({ fase: "procurando", prontos: 0, total: 0, rotulo, partes: 1, parte: 1 });

        const lista = await buscarTodosDoPeriodo(periodo, {
          signal,
          aoAvancar: (quantos) => avancar({ prontos: quantos, total: quantos }),
        });
        if (signal.aborted) return;

        if (lista.length === 0) {
          toast.info(`Nenhum resultado em "${rotulo}".`);
          return;
        }
        await entregarLote(lista, rotulo, signal);
      }),
    [avancar, entregarLote, rodar],
  );

  return {
    progresso,
    ocupado: progresso !== null,
    cancelar,
    baixarResultados,
    baixarPeriodo,
  };
}
