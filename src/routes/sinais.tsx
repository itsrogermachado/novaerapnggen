import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useDiscordImages } from "@/hooks/useDiscordImages";
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
} from "lucide-react";

export const Route = createFileRoute("/sinais")({
  component: SinaisPage,
  head: () => ({
    meta: [{ title: "Nova Era — Sinais" }],
  }),
});

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((diff % 60_000) / 1_000);
  return `${m}m ${s}s`;
}

function SinaisPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: images, isLoading, refetch, isRefetching } = useDiscordImages();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
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
                <h1 className="text-sm sm:text-base font-black tracking-tight">
                  Sinais
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block uppercase tracking-wider">
                  Últimas 24 horas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-border hover:bg-muted cursor-pointer rounded-sm flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Stats bar */}
        {images && images.length > 0 && (
          <div className="animate-fade-in flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border bg-primary/10 text-primary border-primary/20 text-xs font-bold">
              <ImageIcon className="w-3.5 h-3.5" />
              {images.length} {images.length === 1 ? "sinal" : "sinais"} ativos
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border bg-muted/50 border-border/40 text-muted-foreground text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              Atualização automática a cada 30s
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
              Nenhum sinal no momento
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Os sinais enviados pelo bot do Discord aparecerão aqui automaticamente
              e ficam disponíveis por 24 horas.
            </p>
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

                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={img.image_url}
                    alt="Sinal"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Info footer */}
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
            alt="Sinal ampliado"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

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
