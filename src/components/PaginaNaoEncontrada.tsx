import { Link } from "@tanstack/react-router";
import { Layers, ArrowLeft, Radio, LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { ThemeToggle } from "@/components/ThemeToggle";

// Aparência dos botões: 52px de altura (toque confortável no celular) e um anel
// laranja bem visível quando a pessoa navega pelo teclado.
const BOTAO =
  "flex min-h-[52px] items-center justify-center gap-2 rounded-sm px-5 text-sm font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const BOTAO_CHEIO = `${BOTAO} bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90`;
const BOTAO_VAZADO = `${BOTAO} border border-border text-foreground hover:border-primary/60 hover:text-primary`;

/**
 * O "canvas vazio": a mesma tela de composição do Estúdio, no formato de feed
 * (1080 × 1350), sem nenhuma camada. O 404 aparece vazado no meio, como marca
 * d'água. É só enfeite, por isso fica escondido dos leitores de tela (o título
 * da página já diz o que aconteceu). O visual vem das classes canvas-404 e
 * numero-404, em styles.css.
 */
function CanvasVazio() {
  return (
    <div
      aria-hidden="true"
      className="canvas-404 relative aspect-[4/5] w-[min(62vw,220px)] sm:w-[280px] lg:w-[340px]"
    >
      <span className="absolute right-3 top-3 font-mono text-[10px] tracking-wider text-muted-foreground tabular-nums">
        1080 × 1350
      </span>
      <span className="numero-404">404</span>
      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
        <Layers className="h-3 w-3" />0 camadas
      </span>
    </div>
  );
}

/**
 * Página para endereço que não existe.
 *
 * Três decisões que valem registro:
 *
 * 1. O endereço tentado NÃO é exibido. Mostrar ajudaria em erro de digitação,
 *    mas transformaria a página num espelho de texto arbitrário: bastaria mandar
 *    um link tipo /sua-conta-foi-bloqueada-ligue-para-0800 para a vítima ver a
 *    frase renderizada dentro do site.
 *
 * 2. Os caminhos oferecidos dependem de quem está olhando: logado vai para o
 *    Estúdio e os Resultados (e o painel, se for admin); sem login, para Entrar
 *    e a página inicial.
 *
 * 3. O status HTTP é 404 de verdade (não uma 200 disfarçada).
 */
export function PaginaNaoEncontrada() {
  const { user, loading } = useAuth();
  const { isAdmin } = useProfile();

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="grain-texture pointer-events-none fixed inset-0 z-[1]" />
      <div className="absolute left-0 top-0 z-50 h-[2px] w-full bg-gradient-to-r from-primary via-accent to-primary" />

      <header className="relative z-10 border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary">
              <Layers className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-black tracking-tight">Nova Era</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        {/* No celular o canvas vem primeiro e pequeno; no computador fica à direita do texto. */}
        <div className="grid w-full max-w-4xl items-center gap-9 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="flex justify-center lg:order-2">
            <CanvasVazio />
          </div>

          <div className="mx-auto w-full max-w-md lg:order-1 lg:mx-0">
            <h1 className="mb-4 text-balance text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
              <span className="sr-only">Erro 404: </span>
              Esta página não existe.
            </h1>

            <p className="mb-8 max-w-[46ch] text-base leading-relaxed text-muted-foreground">
              Nada foi composto neste endereço. Pode ser um link antigo, um erro de digitação ou uma
              página que mudou de lugar.
            </p>

            {/* Enquanto a sessão carrega, nenhum dos dois conjuntos de botões está
                certo — melhor um espaço reservado do que um pisca-pisca. */}
            {loading ? (
              <div className="h-[116px] animate-shimmer rounded-sm border border-border/40 bg-muted/30" />
            ) : user ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to="/app" className={`${BOTAO_CHEIO} sm:flex-1`}>
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao estúdio
                  </Link>
                  <Link to="/resultados" className={`${BOTAO_VAZADO} sm:flex-1`}>
                    <Radio className="h-4 w-4" />
                    Ver resultados
                  </Link>
                </div>
                {/* Admin ganha um atalho discreto para o painel, sem virar um terceiro botão grande. */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-sm text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Ir para o painel admin
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/auth" className={`${BOTAO_CHEIO} sm:flex-1`}>
                  <LogIn className="h-4 w-4" />
                  Entrar na plataforma
                </Link>
                <Link to="/" className={`${BOTAO_VAZADO} sm:flex-1`}>
                  <ArrowLeft className="h-4 w-4" />
                  Página inicial
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/40 px-4 py-6">
        <p className="mx-auto max-w-7xl text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Nova Era · Estúdio de Resultados
        </p>
      </footer>
    </div>
  );
}
