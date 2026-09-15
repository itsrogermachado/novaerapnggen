import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Layers, RotateCw, ArrowLeft } from "lucide-react";
import { safeLogError } from "@/lib/log";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Tela para quando uma rota quebra em tempo de execução.
 *
 * Irmã da 404, e com a mesma regra: a mensagem técnica do erro NÃO vai para a
 * tela. Ela costuma carregar nome de tabela, coluna e detalhe de schema do
 * Postgres, que não ajudam em nada quem está olhando e ajudam demais quem está
 * bisbilhotando. Em desenvolvimento o erro vai para o console.
 */
// Recebe o erro no formato que o roteador entrega (a versão nova do roteador pode
// mandar qualquer coisa como "erro", não só um objeto Error).
export function PaginaDeErro({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  safeLogError("Erro de rota:", error);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="grain-texture pointer-events-none fixed inset-0 z-[1]" />
      <div className="absolute left-0 top-0 z-50 h-[2px] w-full bg-gradient-to-r from-destructive via-primary to-destructive" />

      <header className="relative z-10 border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary">
              <Layers className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-black tracking-tight">Nova Era</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-destructive">
            Algo quebrou
          </p>

          <h1 className="mb-4 text-4xl font-black leading-[0.95] tracking-tighter sm:text-5xl">
            Esta página
            <br />
            não carregou.
          </h1>

          <p className="mb-8 border-l-2 border-destructive pl-4 text-sm leading-relaxed text-muted-foreground">
            O problema é do nosso lado, não do seu. Tentar de novo costuma resolver — nada do que
            você fez foi perdido.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-sm bg-primary px-5 font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] hover:bg-primary/90"
            >
              <RotateCw className="h-4 w-4" />
              Tentar novamente
            </button>
            <Link
              to="/app"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-sm border border-border px-5 font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao estúdio
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/40 px-4 py-6">
        <p className="mx-auto max-w-7xl text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Nova Era · Estúdio de Resultados
        </p>
      </footer>
    </div>
  );
}
