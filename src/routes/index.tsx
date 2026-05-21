import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Download, LogOut, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

type Format = "feed" | "story";

type TextItem = {
  id: string;
  text: string;
  color: string;
  size: number;
  // position as ratios 0..1 of canvas
  x: number;
  y: number;
};

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed do Instagram (4:5)" },
  story: { w: 1080, h: 1920, label: "Instagram Stories (9:16)" },
};

function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const [format, setFormat] = useState<Format>("feed");
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [texts, setTexts] = useState<TextItem[]>([
    { id: crypto.randomUUID(), text: "Seu resultado aqui", color: "#ffffff", size: 64, x: 0.5, y: 0.5 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number } | null>(null);

  const handleBgUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setBgImg(img);
      setBgUrl(url);
    };
    img.src = url;
  };

  const addText = () => {
    setTexts((t) => [
      ...t,
      { id: crypto.randomUUID(), text: "Novo texto", color: "#ffffff", size: 48, x: 0.5, y: 0.5 },
    ]);
  };

  const updateText = (id: string, patch: Partial<TextItem>) => {
    setTexts((t) => t.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeText = (id: string) => {
    setTexts((t) => t.filter((it) => it.id !== id));
  };

  // Drag handling on the preview
  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    const item = texts.find((t) => t.id === id)!;
    const cx = item.x * rect.width;
    const cy = item.y * rect.height;
    dragRef.current = {
      id,
      offX: e.clientX - rect.left - cx,
      offY: e.clientY - rect.top - cy,
    };
    setSelectedId(id);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    const x = (e.clientX - rect.left - dragRef.current.offX) / rect.width;
    const y = (e.clientY - rect.top - dragRef.current.offY) / rect.height;
    updateText(dragRef.current.id, {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const download = async () => {
    if (!bgImg) {
      toast.error("Faça upload de uma imagem de fundo primeiro");
      return;
    }
    const { w, h } = FORMATS[format];
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // object-fit: cover
    const ir = bgImg.width / bgImg.height;
    const cr = w / h;
    let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
    if (ir > cr) {
      sw = bgImg.height * cr;
      sx = (bgImg.width - sw) / 2;
    } else {
      sh = bgImg.width / cr;
      sy = (bgImg.height - sh) / 2;
    }
    ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, w, h);

    // The text size shown in the preview is in CSS px relative to preview width.
    // We scale by canvas width / preview width.
    const preview = previewRef.current!;
    const previewW = preview.getBoundingClientRect().width;
    const scale = w / previewW;

    texts.forEach((t) => {
      ctx.fillStyle = t.color;
      ctx.font = `700 ${t.size * scale}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8 * scale;
      // multi-line support
      const lines = t.text.split("\n");
      const lineH = t.size * scale * 1.15;
      const totalH = lineH * lines.length;
      lines.forEach((line, i) => {
        ctx.fillText(line, t.x * w, t.y * h - totalH / 2 + lineH / 2 + i * lineH);
      });
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gerador-resultados-${format}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  const aspectClass = format === "feed" ? "aspect-[4/5]" : "aspect-[9/16]";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-lg font-bold truncate">Gerador de Resultados</h1>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline truncate max-w-[180px]">{user.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-4 grid lg:grid-cols-[380px_1fr] gap-4 sm:gap-6">
        {/* Preview (mobile: shown first) */}
        <div className="flex justify-center order-1 lg:order-2">
          <div
            ref={previewRef}
            className={`relative ${aspectClass} w-full max-w-sm lg:max-w-md bg-neutral-900 rounded-lg overflow-hidden shadow-xl select-none touch-none`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => setSelectedId(null)}
          >
            {bgUrl ? (
              <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm p-4 text-center">
                Faça upload de uma imagem de fundo
              </div>
            )}
            {texts.map((t) => (
              <div
                key={t.id}
                onPointerDown={(e) => onPointerDown(e, t.id)}
                style={{
                  position: "absolute",
                  left: `${t.x * 100}%`,
                  top: `${t.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  color: t.color,
                  fontSize: `${t.size * 0.5}px`,
                  fontWeight: 700,
                  textAlign: "center",
                  whiteSpace: "pre-wrap",
                  textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  cursor: "grab",
                  lineHeight: 1.15,
                  userSelect: "none",
                  touchAction: "none",
                }}
                className={selectedId === t.id ? "outline-2 outline-dashed outline-white/70" : ""}
              >
                {t.text}
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <Card className="p-4 sm:p-5 space-y-5 h-fit order-2 lg:order-1">
          <div>
            <Label>Imagem de Fundo</Label>
            <label className="mt-2 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50">
              <Upload className="w-4 h-4" />
              <span className="text-sm">{bgUrl ? "Trocar imagem" : "Selecionar imagem"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleBgUpload(e.target.files[0])}
              />
            </label>
          </div>

          <div>
            <Label>Formato da Imagem</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feed">{FORMATS.feed.label}</SelectItem>
                <SelectItem value="story">{FORMATS.story.label}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Textos</Label>
              <Button size="sm" variant="outline" onClick={addText}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {texts.map((t) => (
                <div
                  key={t.id}
                  className={`border rounded-lg p-3 space-y-2 ${selectedId === t.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <textarea
                    className="w-full text-sm border rounded p-2 bg-background"
                    rows={2}
                    value={t.text}
                    onChange={(e) => updateText(t.id, { text: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => updateText(t.id, { color: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border"
                    />
                    <div className="flex-1">
                      <input
                        type="range"
                        min={16}
                        max={200}
                        value={t.size}
                        onChange={(e) => updateText(t.id, { size: +e.target.value })}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground">{t.size}px</div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeText(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={download} className="w-full" size="lg">
            <Download className="w-4 h-4 mr-2" /> Baixar Imagem
          </Button>
        </Card>

        {/* Preview */}
        <div className="flex justify-center">
          <div
            ref={previewRef}
            className={`relative ${aspectClass} w-full max-w-md bg-neutral-900 rounded-lg overflow-hidden shadow-xl select-none touch-none`}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={() => setSelectedId(null)}
          >
            {bgUrl ? (
              <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
                Faça upload de uma imagem de fundo
              </div>
            )}
            {texts.map((t) => (
              <div
                key={t.id}
                onPointerDown={(e) => onPointerDown(e, t.id)}
                style={{
                  position: "absolute",
                  left: `${t.x * 100}%`,
                  top: `${t.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  color: t.color,
                  fontSize: `${t.size}px`,
                  fontWeight: 700,
                  textAlign: "center",
                  whiteSpace: "pre-wrap",
                  textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  cursor: "grab",
                  lineHeight: 1.15,
                  userSelect: "none",
                }}
                className={selectedId === t.id ? "outline-2 outline-dashed outline-white/70" : ""}
              >
                {t.text}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
