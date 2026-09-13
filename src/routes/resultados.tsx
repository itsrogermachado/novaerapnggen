import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useResultados, PERIODOS, type Periodo } from "@/hooks/useResultados";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Layers,
  ArrowLeft,
  Clock,
  ImageIcon,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  Wand2,
} from "lucide-react";
import { formatTimeAgo, formatCountdown } from "@/lib/time";
import { AppNavInline } from "@/components/AppNav";

export const Route = createFileRoute("/resultados")({
  component: ResultadosPage,
  head: () => ({
    meta: [{ title: "Nova Era — Resultados" }],
  }),
});

function ResultadosPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const {
    resultados: images,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useResultados(periodo);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Seleção para levar vários resultados de uma vez ao estúdio.
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const alternarSelecao = useCallback((id: string) => {
    setSelecionados((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }, []);

  const usarNoEstudio = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      navigate({ to: "/app", search: { resultados: ids.join(",") } });
    },
    [navigate],
  );
  const [, setTick] = useState(0);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(interval);
  }, []);

  // Lightbox keyboard navigation
  const handleLightboxNav = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null || !images) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight" && lightboxIndex < images.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      }
      if (e.key === "ArrowLeft" && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      }
    },
    [lightboxIndex, images],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleLightboxNav);
    return () => window.removeEventListener("keydown", handleLightboxNav);
  }, [handleLightboxNav]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      {/* Grain */}
      <div className="grain-texture fixed inset-0 pointer-events-none z-[1]" />

      {/* Header */}
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-sm sticky top-0 z-50 transition-all duration-200">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <div className="w-px h-5 bg-border/60" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight">Resultados</h1>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block uppercase tracking-wider">
                  Últimas 24 horas
                </p>
              </div>
            </div>
          </div>

          <AppNavInline />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-border hover:bg-muted cursor-pointer rounded-sm flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Filtro de data — fica sempre visível: com a lista vazia é justamente
            quando o usuário precisa trocar de período. Rola na horizontal no
            celular em vez de quebrar em duas linhas. */}
        <div
          role="group"
          aria-label="Filtrar por data"
          className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-thin"
        >
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              aria-pressed={periodo === p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={`h-11 shrink-0 rounded-sm border px-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                periodo === p.valor
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        {images && images.length > 0 && (
          <div className="animate-fade-in mb-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              <ImageIcon className="h-3.5 w-3.5" />
              {images.length}
              {hasNextPage ? "+" : ""} {images.length === 1 ? "resultado" : "resultados"}
            </div>
            <div className="flex items-center gap-1.5 rounded-sm border border-border/40 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Atualiza a cada 30s
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-shimmer rounded-sm aspect-[4/3] border border-border/40"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!images || images.length === 0) && (
          <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-sm bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {periodo === "hoje"
                ? "Nenhum resultado hoje"
                : periodo === "ontem"
                  ? "Nenhum resultado ontem"
                  : "Nenhum resultado no período"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Os resultados que o bot do Discord publicar aparecem aqui automaticamente. Troque o
              período acima para ver outros dias.
            </p>
          </div>
        )}

        {/* Carregar mais — botão explícito em vez de scroll infinito: no celular
            o scroll infinito briga com a barra de abas e nunca deixa chegar ao
            fim da página. */}
        {hasNextPage && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="h-12 min-w-[200px] rounded-sm border-border font-bold"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Carregar mais"
              )}
            </Button>
          </div>
        )}

        {/* Barra de ação da seleção */}
        {selecionados.length > 0 && (
          <div
            className="fixed inset-x-0 z-40 px-4 animate-fade-in"
            style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            <div className="mx-auto flex max-w-lg items-center gap-2 rounded-sm border border-primary/30 bg-card/95 p-2 shadow-2xl backdrop-blur-sm">
              <span className="pl-2 text-xs font-bold tabular-nums">
                {selecionados.length} {selecionados.length === 1 ? "selecionado" : "selecionados"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelecionados([])}
                className="ml-auto h-9 text-xs text-muted-foreground"
              >
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={() => usarNoEstudio(selecionados)}
                className="h-9 rounded-sm bg-primary font-bold text-primary-foreground hover:bg-primary/90"
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Usar no estúdio
              </Button>
            </div>
          </div>
        )}

        {/* Image grid */}
        {images && images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <Card
                key={img.id}
                className="animate-stagger-reveal group relative overflow-hidden border-border/60 bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer rounded-sm"
                style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                onClick={() => setLightboxIndex(index)}
              >
                {/* Accent line on hover */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10" />

                {/* Seleção — sempre visível: no toque não existe hover. */}
                <button
                  type="button"
                  aria-label={
                    selecionados.includes(img.id)
                      ? "Remover da seleção"
                      : "Selecionar para usar no estúdio"
                  }
                  aria-pressed={selecionados.includes(img.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    alternarSelecao(img.id);
                  }}
                  className={`absolute left-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-sm border-2 transition-colors ${
                    selecionados.includes(img.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/70 bg-black/35 text-white/90 backdrop-blur-sm hover:bg-black/55"
                  }`}
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </button>

                {/* Atalho para levar só este resultado */}
                <button
                  type="button"
                  aria-label="Usar este resultado no estúdio"
                  onClick={(e) => {
                    e.stopPropagation();
                    usarNoEstudio([img.id]);
                  }}
                  className="absolute right-2 top-2 z-20 flex h-11 items-center gap-1.5 rounded-sm border-2 border-white/70 bg-black/35 px-2.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-colors hover:bg-primary hover:border-primary"
                >
                  <Wand2 className="h-4 w-4" />
                  Usar
                </button>

                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={img.image_url}
                    alt="Resultado"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Info footer */}
                {img.caption && (
                  <p className="px-3 pt-2 text-xs font-semibold leading-snug line-clamp-2">
                    {img.caption}
                  </p>
                )}
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatTimeAgo(img.uploaded_at)}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-mono text-primary/80">
                    <Clock className="w-3 h-3" />
                    {formatCountdown(img.expires_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && images && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-sm bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Navigation */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-sm bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer z-10"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}
          {lightboxIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-sm bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer z-10"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Image */}
          <img
            src={images[lightboxIndex].image_url}
            alt="Resultado ampliado"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Usar no estúdio, direto do lightbox */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              usarNoEstudio([images[lightboxIndex].id]);
            }}
            className="absolute bottom-24 left-1/2 z-10 h-11 -translate-x-1/2 rounded-sm bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Usar no estúdio
          </Button>

          {/* Info bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-2.5 rounded-sm bg-white/10 backdrop-blur-md text-white text-sm font-medium">
            <span>{formatTimeAgo(images[lightboxIndex].uploaded_at)}</span>
            <div className="w-px h-4 bg-white/30" />
            <span className="flex items-center gap-1.5 font-mono text-primary">
              <Clock className="w-3.5 h-3.5" />
              {formatCountdown(images[lightboxIndex].expires_at)}
            </span>
            <div className="w-px h-4 bg-white/30" />
            <span className="text-white/60">
              {lightboxIndex + 1} / {images.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
