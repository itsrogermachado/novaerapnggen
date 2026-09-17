import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { criarZip, ZipGrandeDemaisError } from "@/lib/zip";
import {
  aparelhoSalvaNaGaleria,
  baixarArquivo,
  buscarImagem,
  criarNomeador,
  dividirParaCompartilhar,
  ehAparelhoDeToque,
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
 * Acima disto, no celular, perguntamos antes se é para ir para a galeria ou vir
 * em .zip.
 *
 * A galeria pede um toque a cada envio; com muita imagem isso vira dezenas de
 * toques, e quem quer o mês inteiro talvez prefira um arquivo só. A pergunta vem
 * antes de baixar qualquer imagem para ninguém gastar 4G à toa.
 */
export const MUITAS_PARA_GALERIA = 40;

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

/**
 * Imagens já baixadas, esperando o toque que as manda para a galeria.
 *
 * Existe por causa de uma regra do navegador: `navigator.share` só abre com um
 * toque recente. Entre o toque em "Baixar" e as imagens chegarem da rede pode
 * passar tempo demais, e aí o aparelho recusa. Guardando as imagens prontas, o
 * toque em "Salvar na galeria" chama o compartilhamento na hora — gesto novo,
 * imagem em mãos, sem rede no meio.
 */
export interface EntregaNaGaleria {
  lotes: ArquivoPronto[][];
  /** Quantos lotes já foram para a galeria. */
  enviados: number;
  /** Quantas imagens já foram salvas. */
  salvas: number;
  total: number;
  rotulo: string;
  /** true quando o aparelho recusou o menu na primeira tentativa. */
  precisouDeOutroToque: boolean;
}

/** Pergunta pendente: muita imagem no celular, galeria ou .zip? */
export interface PerguntaDeFormato {
  resultados: Resultado[];
  rotulo: string;
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
 * No celular o destino é a galeria, que é onde a foto serve para alguma coisa;
 * o .zip existe para o computador e para quando o aparelho não sabe salvar na
 * galeria — e nesse caso o usuário é avisado, em vez de receber um .zip sem
 * entender por quê.
 */
export function useBaixarResultados() {
  const [progresso, setProgresso] = useState<ProgressoDownload | null>(null);
  const [galeria, setGaleria] = useState<EntregaNaGaleria | null>(null);
  const [pergunta, setPergunta] = useState<PerguntaDeFormato | null>(null);
  const abortarRef = useRef<AbortController | null>(null);
  // O estado não serve para decidir se já tem download rodando: dois cliques no
  // mesmo instante leem o mesmo `null` antes de o React re-renderizar.
  const ocupadoRef = useRef(false);
  const vivoRef = useRef(true);
  // Para o clique em "Salvar na galeria" não depender do estado da renderização
  // em que o botão foi montado.
  const galeriaRef = useRef<EntregaNaGaleria | null>(null);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
      abortarRef.current?.abort();
    };
  }, []);

  const guardarGaleria = useCallback((valor: EntregaNaGaleria | null) => {
    galeriaRef.current = valor;
    if (vivoRef.current) setGaleria(valor);
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

  const avisarFalhas = useCallback((falhas: number) => {
    if (falhas === 0) return;
    toast.warning(
      falhas === 1
        ? "1 resultado não estava mais disponível."
        : `${falhas} resultados não estavam mais disponíveis.`,
    );
  }, []);

  /** Empacota o que já está em mãos e manda para a pasta de downloads. */
  const baixarComoZip = useCallback(
    async (itens: ArquivoPronto[], rotulo: string, signal?: AbortSignal) => {
      const partes = Math.ceil(itens.length / MAX_POR_ZIP);
      for (let p = 0; p < partes; p++) {
        if (signal?.aborted) return;
        const fatia = itens.slice(p * MAX_POR_ZIP, (p + 1) * MAX_POR_ZIP);
        avancar({ fase: "compactando", parte: p + 1, partes });

        const zip = await criarZip(fatia.map((i) => ({ nome: i.nome, dados: i.blob })));
        if (signal?.aborted) return;
        baixarArquivo({ blob: zip, nome: nomeDoZip(rotulo, p + 1, partes) });
        // Um respiro entre as partes: disparadas juntas, o navegador descarta
        // as últimas.
        if (p < partes - 1) await esperar(900);
      }

      toast.success(
        partes > 1
          ? `${itens.length} resultados baixados em ${partes} arquivos .zip`
          : itens.length === 1
            ? "Imagem baixada"
            : `${itens.length} resultados baixados em um .zip`,
      );
    },
    [avancar],
  );

  /**
   * Manda um lote para a galeria. Chamado direto do clique, sem nenhum `await`
   * antes — é o que mantém o gesto do usuário válido para o `navigator.share`.
   */
  const salvarNaGaleria = useCallback(async () => {
    const atual = galeriaRef.current;
    if (!atual) return;
    const lote = atual.lotes[atual.enviados];
    if (!lote) return;

    const fim = await tentarCompartilhar(lote, `Resultados — ${atual.rotulo}`);
    if (fim === "cancelado") return; // o painel fica, dá para tentar de novo

    if (fim === "recusado") {
      toast.error("Este aparelho não abriu o menu para salvar na galeria.");
      guardarGaleria({ ...atual, precisouDeOutroToque: true });
      return;
    }

    const enviados = atual.enviados + 1;
    const salvas = atual.salvas + lote.length;

    if (enviados >= atual.lotes.length) {
      guardarGaleria(null);
      toast.success(
        salvas === 1
          ? "Imagem enviada para a galeria"
          : `${salvas} imagens enviadas para a galeria`,
      );
      return;
    }
    guardarGaleria({ ...atual, enviados, salvas });
  }, [guardarGaleria]);

  /** Desistiu da galeria: leva o que já foi baixado em .zip. */
  const baixarPendenteComoZip = useCallback(async () => {
    const atual = galeriaRef.current;
    if (!atual) return;
    guardarGaleria(null);
    // Só o que ainda não foi para a galeria, para não duplicar o que já salvou.
    const restantes = atual.lotes.slice(atual.enviados).flat();
    setProgresso({
      fase: "compactando",
      prontos: restantes.length,
      total: restantes.length,
      rotulo: atual.rotulo,
      partes: Math.ceil(restantes.length / MAX_POR_ZIP),
      parte: 1,
    });
    try {
      await baixarComoZip(restantes, atual.rotulo);
    } catch (err) {
      safeLogError("Falha ao empacotar o que sobrou:", err);
      toast.error("Não foi possível montar o .zip.");
    } finally {
      if (vivoRef.current) setProgresso(null);
    }
  }, [baixarComoZip, guardarGaleria]);

  const fecharGaleria = useCallback(() => guardarGaleria(null), [guardarGaleria]);
  const fecharPergunta = useCallback(() => setPergunta(null), []);

  /** O trabalho em si: busca as imagens e entrega pelo caminho certo. */
  const entregarLote = useCallback(
    async (
      resultados: Resultado[],
      rotulo: string,
      signal: AbortSignal,
      { forcarZip = false }: { forcarZip?: boolean } = {},
    ) => {
      const total = resultados.length;
      const nomear = criarNomeador();
      let prontos = 0;

      // O caminho é decidido ANTES de buscar imagem: é o que permite avisar na
      // hora certa quando a galeria não é possível.
      const paraGaleria = !forcarZip && aparelhoSalvaNaGaleria();

      setProgresso({
        fase: "baixando",
        prontos: 0,
        total,
        rotulo,
        partes: paraGaleria ? 1 : Math.ceil(total / MAX_POR_ZIP),
        parte: 1,
      });
      const contarUma = (parte: number) => () => avancar({ prontos: ++prontos, parte });

      // --- celular: direto para a galeria ---
      if (paraGaleria) {
        const coleta = await coletar(resultados, nomear, signal, contarUma(1));
        if (signal.aborted) return;
        if (coleta.itens.length === 0) {
          toast.error(
            total === 1
              ? "Essa imagem não está mais disponível."
              : "Nenhuma dessas imagens está mais disponível.",
          );
          return;
        }

        const lotes = dividirParaCompartilhar(coleta.itens);
        avancar({ fase: "salvando" });

        // Tenta já: quando a busca foi rápida, o toque original ainda vale e a
        // pessoa não precisa tocar de novo.
        const fim = await tentarCompartilhar(lotes[0], `Resultados — ${rotulo}`);

        if (fim === "compartilhado" && lotes.length === 1) {
          toast.success(
            coleta.itens.length === 1
              ? "Imagem enviada para a galeria"
              : `${coleta.itens.length} imagens enviadas para a galeria`,
          );
          avisarFalhas(coleta.falhas);
          return;
        }

        // Sobrou lote, ou o aparelho recusou (gesto expirado durante a busca),
        // ou a pessoa fechou o menu: o painel assume daqui.
        guardarGaleria({
          lotes,
          enviados: fim === "compartilhado" ? 1 : 0,
          salvas: fim === "compartilhado" ? lotes[0].length : 0,
          total: coleta.itens.length,
          rotulo,
          precisouDeOutroToque: fim !== "compartilhado",
        });
        avisarFalhas(coleta.falhas);
        return;
      }

      // --- computador, ou aparelho que não salva na galeria ---
      if (!forcarZip && ehAparelhoDeToque()) {
        toast.warning("Este navegador não salva direto na galeria — vai baixar em .zip.", {
          description: "Abra o arquivo em Arquivos/Downloads para descompactar.",
          duration: 8_000,
        });
      }

      // Em partes: busca um bloco, empacota, baixa e só então vai ao próximo.
      // Assim o pico de memória é o de uma parte, não o do mês inteiro.
      const partes = Math.ceil(total / MAX_POR_ZIP);
      let falhas = 0;
      let salvos = 0;

      for (let p = 0; p < partes; p++) {
        if (signal.aborted) return;
        const fatia = resultados.slice(p * MAX_POR_ZIP, (p + 1) * MAX_POR_ZIP);
        avancar({ fase: "baixando", parte: p + 1, partes });

        const coleta = await coletar(fatia, nomear, signal, contarUma(p + 1));
        if (signal.aborted) return;
        falhas += coleta.falhas;
        if (coleta.itens.length === 0) continue;

        avancar({ fase: "compactando", parte: p + 1, partes });
        const zip = await criarZip(coleta.itens.map((i) => ({ nome: i.nome, dados: i.blob })));
        if (signal.aborted) return;

        salvos += coleta.itens.length;
        // Uma imagem só não vira .zip: vai como imagem mesmo.
        if (partes === 1 && coleta.itens.length === 1) {
          baixarArquivo(coleta.itens[0]);
        } else {
          baixarArquivo({ blob: zip, nome: nomeDoZip(rotulo, p + 1, partes) });
        }
        if (p < partes - 1) await esperar(900);
      }

      if (salvos === 0) {
        toast.error("Nenhuma imagem pôde ser baixada.");
        return;
      }
      toast.success(
        salvos === 1
          ? "Imagem baixada"
          : partes > 1
            ? `${salvos} resultados baixados em ${partes} arquivos .zip`
            : `${salvos} resultados baixados em um .zip`,
      );
      avisarFalhas(falhas);
    },
    [avancar, avisarFalhas, coletar, guardarGaleria],
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

  /**
   * Começa a entrega. Com muita imagem no celular, pergunta o formato antes —
   * a pergunta vem antes de gastar rede, não depois.
   */
  const comecar = useCallback(
    (resultados: Resultado[], rotulo: string) => {
      if (resultados.length === 0) {
        toast.info("Nenhum resultado para baixar.");
        return Promise.resolve();
      }
      if (resultados.length > MUITAS_PARA_GALERIA && aparelhoSalvaNaGaleria()) {
        setPergunta({ resultados, rotulo });
        return Promise.resolve();
      }
      return rodar((signal) => entregarLote(resultados, rotulo, signal));
    },
    [entregarLote, rodar],
  );

  /** Resposta da pergunta de formato. */
  const responderPergunta = useCallback(
    (escolha: "galeria" | "zip") => {
      const atual = pergunta;
      setPergunta(null);
      if (!atual) return Promise.resolve();
      return rodar((signal) =>
        entregarLote(atual.resultados, atual.rotulo, signal, { forcarZip: escolha === "zip" }),
      );
    },
    [entregarLote, pergunta, rodar],
  );

  /** Baixa resultados que já estão na tela: um, ou os selecionados. */
  const baixarResultados = useCallback(
    (resultados: Resultado[], rotulo = "selecionados") => comecar(resultados, rotulo),
    [comecar],
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
        // A pergunta de formato não cabe aqui dentro (já estamos "ocupados"),
        // então a listagem termina e a entrega recomeça por `comecar`.
        if (lista.length > MUITAS_PARA_GALERIA && aparelhoSalvaNaGaleria()) {
          setPergunta({ resultados: lista, rotulo });
          return;
        }
        await entregarLote(lista, rotulo, signal);
      }),
    [avancar, entregarLote, rodar],
  );

  return {
    progresso,
    galeria,
    pergunta,
    ocupado: progresso !== null || galeria !== null,
    cancelar,
    baixarResultados,
    baixarPeriodo,
    salvarNaGaleria,
    baixarPendenteComoZip,
    fecharGaleria,
    responderPergunta,
    fecharPergunta,
  };
}
