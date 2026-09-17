import { useState } from "react";
import { Download, Loader2, X, Package, CalendarDays } from "lucide-react";
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
import { MAX_POR_ZIP, type ProgressoDownload } from "@/hooks/useBaixarResultados";

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
          Mais de um resultado vem num arquivo .zip. Acima de {MAX_POR_ZIP}, em partes.
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
