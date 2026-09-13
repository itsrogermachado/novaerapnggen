import { Link } from "@tanstack/react-router";
import { useResultados } from "@/hooks/useResultados";
import { Card } from "@/components/ui/card";
import { ImageIcon, Clock, ArrowRight, Loader2 } from "lucide-react";
import { formatTimeAgo, formatCountdown } from "@/lib/time";

export function UltimosResultados() {
  // O carrossel mostra só os de hoje — é o que interessa a quem está montando
  // arte agora. O histórico completo fica na aba Resultados.
  const { resultados: images, isLoading } = useResultados("hoje");

  // Sem resultados e sem estar carregando, a seção inteira some.
  if (!isLoading && images.length === 0) {
    return null;
  }

  const displayImages = images.slice(0, 6);

  return (
    <div className="animate-fade-in">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-primary/15 flex items-center justify-center">
            <ImageIcon className="w-3 h-3 text-primary" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Últimos Resultados
          </h3>
          {images.length > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">
              {images.length}
            </span>
          )}
        </div>
        <Link
          to="/resultados"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Ver todos
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
        </div>
      )}

      {/* Horizontal scroll carousel */}
      {!isLoading && displayImages.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {displayImages.map((img) => (
            <Link key={img.id} to="/resultados" className="group shrink-0 w-[120px] cursor-pointer">
              <Card className="overflow-hidden border-border/60 bg-card hover:border-primary/30 transition-all duration-200 rounded-sm relative">
                {/* Accent line on hover */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10" />

                <div className="aspect-square overflow-hidden bg-muted">
                  <img
                    src={img.image_url}
                    alt="Resultado"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                <div className="px-1.5 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {formatTimeAgo(img.uploaded_at, true)}
                  </span>
                  <span className="text-[10px] font-mono text-primary/70 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatCountdown(img.expires_at, true)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
