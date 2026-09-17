import { useEffect, useState } from "react";
import { Download, Loader2, X, Package, CalendarDays, ImageDown, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PERIODOS_DE_DOWNLOAD, useContagensDeDownload, type Periodo } from "@/hooks/useResultados";
import {
  MAX_POR_ZIP,
  type EntregaNaGaleria,
  type ProgressoDownload,
} from "@/hooks/useBaixarResultados";
import { aparelhoSalvaNaGaleria } from "@/lib/baixar";

/**
 * true quando este aparelho salva imagem direto na galeria.
 *
 * A resposta só existe no navegador, então começa em `false` e é corrigida
 * depois de montar — se fosse lida na renderização, o servidor e o cliente
 * escreveriam textos diferentes e a hidratação reclamaria.
 */
function useSalvaNaGaleria(): boolean {
  const [sim, setSim] = useState(false);
  useEffect(() => setSim(aparelhoSalvaNaGaleria()), []);
  return sim;
}

/**
 * Menu "Baixar tudo": o dia, a semana e o mês.
 *
 * Os números ao lado de cada opção só são consultados quando o menu abre — são
 * três consultas de contagem, e deixá-las junto da lista (que recarrega a cada
 * 30s) seria pagar por elas o tempo todo.
 */
export function MenuBaixarPeriodo({
  aoEscolher,
  ocupado,
}: {
  aoEscolher: (periodo: Periodo, rotulo: string) => void;
  ocupado: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const contagens = useContagensDeDownload(aberto);
  const naGaleria = useSalvaNaGaleria();

  return (
    <DropdownMenu open={aberto} onOpenChange={setAberto} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={ocupado}
          data-testid="menu-baixar"
          className="h-10 gap-1.5 rounded-sm border-primary/40 bg-primary/5 font-bold text-primary hover:bg-primary/10 hover:text-primary"
        >
          {ocupado ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Baixar tudo
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 rounded-sm">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Baixar resultados
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {PERIODOS_DE_DOWNLOAD.map((p) => {
          const quantos = contagens[p.valor];
          return (
            <DropdownMenuItem
              key={p.valor}
              // O rótulo do menu vira parte do nome do arquivo, então usa o
              // detalhe ("Últimos 7 dias"), que se explica sozinho na pasta de
              // downloads.
              onSelect={() => aoEscolher(p.valor, p.detalhe)}
              className="min-h-[44px] cursor-pointer gap-2 rounded-sm"
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold">{p.rotulo}</span>
                <span className="text-[11px] text-muted-foreground">{p.detalhe}</span>
              </span>
              <span className="ml-auto text-xs font-bold tabular-nums text-muted-foreground">
                {quantos === undefined ? "—" : quantos}
              </span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
          {naGaleria
            ? "As imagens vão direto para a galeria do celular."
            : `Mais de um resultado vem num arquivo .zip. Acima de ${MAX_POR_ZIP}, em partes.`}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const TEXTO_DA_FASE: Record<ProgressoDownload["fase"], string> = {
  procurando: "Procurando resultados",
  baixando: "Baixando imagens",
  compactando: "Montando o .zip",
  salvando: "Salvando no aparelho",
};

/**
 * Barra de progresso do download em lote.
 *
 * Fica acima da barra de abas do celular — sem o `bottom` calculado, a barra de
 * navegação cobriria justamente o botão de cancelar.
 */
export function ProgressoDoDownload({
  progresso,
  aoCancelar,
}: {
  progresso: ProgressoDownload;
  aoCancelar: () => void;
}) {
  const { fase, prontos, total, rotulo, parte, partes } = progresso;
  const pct = total > 0 ? Math.min(100, Math.round((prontos / total) * 100)) : 0;
  const indeterminado = fase === "procurando" || total === 0;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="progresso-download"
      className="animate-fade-in fixed inset-x-0 z-[60] px-4"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div className="mx-auto max-w-lg rounded-sm border border-primary/30 bg-card/95 p-3 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">
              {TEXTO_DA_FASE[fase]}
              {partes > 1 && fase !== "procurando" && (
                <span className="text-muted-foreground">
                  {" "}
                  — parte {parte} de {partes}
                </span>
              )}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {rotulo}
              {!indeterminado && (
                <span className="tabular-nums">
                  {" "}
                  · {prontos} de {total}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={aoCancelar}
            className="h-9 shrink-0 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </Button>
        </div>

        {/* Sem total ainda (fase "procurando") a barra fica num toco pulsando:
            barra parada em zero passa a impressão de travado. */}
        <Progress
          value={indeterminado ? 8 : pct}
          className={`mt-2 h-1.5 rounded-sm ${indeterminado ? "animate-pulse" : ""}`}
        />
      </div>
    </div>
  );
}

/**
 * Painel "Salvar na galeria".
 *
 * Existe por uma regra do navegador, não por gosto: `navigator.share` só abre
 * com um toque recente, e o toque original já morreu enquanto as imagens
 * baixavam. Aqui as imagens já estão em mãos, então o toque neste botão abre o
 * menu na hora — e é de lá que sai "Salvar imagem" na galeria.
 *
 * Também é o que resolve lote grande: o menu não aguenta dezenas de arquivos de
 * uma vez, então vai em levas, uma por toque.
 */
export function PainelGaleria({
  entrega,
  aoSalvar,
  aoBaixarZip,
  aoFechar,
}: {
  entrega: EntregaNaGaleria;
  aoSalvar: () => void;
  aoBaixarZip: () => void;
  aoFechar: () => void;
}) {
  const { lotes, enviados, salvas, total, precisouDeOutroToque } = entrega;
  const restam = lotes.length - enviados;
  const proximo = lotes[enviados]?.length ?? 0;
  const emLevas = lotes.length > 1;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="painel-galeria"
      className="animate-fade-in fixed inset-x-0 z-[60] px-4"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div className="mx-auto max-w-lg rounded-sm border border-primary/40 bg-card/95 p-3 shadow-2xl backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <ImageDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold">
              {salvas > 0
                ? `${salvas} de ${total} ${total === 1 ? "imagem salva" : "imagens salvas"}`
                : `${total} ${total === 1 ? "imagem pronta" : "imagens prontas"}`}
            </p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {precisouDeOutroToque
                ? "Toque abaixo para abrir o menu e escolher Salvar imagem."
                : emLevas
                  ? `O celular salva algumas por vez — faltam ${restam} ${restam === 1 ? "leva" : "levas"}.`
                  : "Toque para salvar na galeria."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={aoFechar}
            aria-label="Fechar"
            className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          onClick={aoSalvar}
          data-testid="salvar-na-galeria"
          className="mt-2.5 h-12 w-full rounded-sm bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <ImageDown className="mr-2 h-4 w-4" />
          Salvar na galeria
          {emLevas && (
            <span className="ml-1.5 font-normal opacity-80">
              ({enviados + 1} de {lotes.length} · {proximo} {proximo === 1 ? "imagem" : "imagens"})
            </span>
          )}
        </Button>

        <button
          type="button"
          onClick={aoBaixarZip}
          className="mt-2 flex w-full items-center justify-center gap-1.5 py-1 text-[11px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          <FileArchive className="h-3 w-3" />
          {salvas > 0 ? "Baixar o restante em .zip" : "Baixar em .zip"}
        </button>
      </div>
    </div>
  );
}
