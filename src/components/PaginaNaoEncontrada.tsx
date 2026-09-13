import { Link } from "@tanstack/react-router";
import { Layers, ArrowLeft, Radio, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Página para endereço que não existe.
 *
 * Duas decisões que valem registro:
 *
 * 1. O endereço tentado NÃO é exibido. Mostrar ajudaria em erro de digitação,
 *    mas transforma a página num espelho de texto arbitrário: bastaria mandar
 *    um link tipo /sua-conta-foi-bloqueada-ligue-para-0800 para a vítima ver a
 *    frase renderizada dentro do site de vocês. O ganho não paga o risco.
 *
 * 2. Os caminhos oferecidos dependem de estar logado ou não. A 404 anterior
 *    mandava todo mundo para a landing, o que tirava um membro logado de dentro
 *    do app sem motivo.
 *
 * O status HTTP já era 404 de verdade (não uma 200 disfarçada) e continua.
 */
export function PaginaNaoEncontrada() {
  const { user, loading } = useAuth();

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="grain-texture pointer-events-none fixed inset-0 z-[1]" />
      <div className="absolute left-0 top-0 z-50 h-[2px] w-full bg-gradient-to-r from-primary via-accent to-primary" />

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
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Erro 404
          </p>

          <h1 className="mb-4 text-4xl font-black leading-[0.95] tracking-tighter sm:text-5xl">
            Esta página
            <br />
            não existe.
          </h1>

          <p className="mb-8 border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
            O endereço que você abriu não corresponde a nada aqui dentro. Pode ser um link antigo,
            um erro de digitação, ou uma página que mudou de lugar.
          </p>

          {/* Enquanto a sessão carrega, nenhum dos dois conjuntos de botões está
              certo — melhor um espaço reservado do que um pisca-pisca. */}
          {loading ? (
            <div className="h-[112px] animate-shimmer rounded-sm border border-border/40 bg-muted/30" />
          ) : user ? (
            <div className="flex flex-col gap-3">
              <Link
                to="/app"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-sm bg-primary px-5 font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao estúdio
              </Link>
              <Link
                to="/resultados"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-sm border border-border px-5 font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Radio className="h-4 w-4" />
                Ver resultados
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                to="/auth"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-sm bg-primary px-5 font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:translate-y-[-1px] hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" />
                Entrar na plataforma
              </Link>
              <Link
                to="/"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-sm border border-border px-5 font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Página inicial
              </Link>
            </div>
          )}
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
