import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, Download, LogOut, Upload, ImageIcon, Loader2 } from "lucide-react";
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
  x: number;
  y: number;
};

type LibraryItem = { id: string; name: string; image_url: string };
type Foreground = { id: string; url: string; img: HTMLImageElement };
type LogoState = { url: string; img: HTMLImageElement; x: number; y: number; size: number } | null;

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed (4:5)" },
  story: { w: 1080, h: 1920, label: "Stories (9:16)" },
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Auto-layout: distribui N imagens em grid que melhor preenche a área
function computeGrid(n: number, aspectW: number, aspectH: number) {
  let best = { cols: 1, rows: n, score: -Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cellW = 1 / cols;
    const cellH = 1 / rows;
    // priorizar células quadradas dentro do canvas
    const cellRatio = (cellW * aspectW) / (cellH * aspectH);
    const score = -Math.abs(Math.log(cellRatio));
    if (score > best.score) best = { cols, rows, score };
  }
  return best;
}

function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const [format, setFormat] = useState<Format>("feed");

  // Background library
  const [bgLib, setBgLib] = useState<LibraryItem[]>([]);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  // Logo library
  const [logoLib, setLogoLib] = useState<LibraryItem[]>([]);
  const [logo, setLogo] = useState<LogoState>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Foregrounds (em sessão)
  const [foregrounds, setForegrounds] = useState<Foreground[]>([]);

  const [texts, setTexts] = useState<TextItem[]>([
    { id: crypto.randomUUID(), text: "Seu resultado aqui", color: "#ffffff", size: 64, x: 0.5, y: 0.5 },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ kind: "text" | "logo"; id?: string; offX: number; offY: number } | null>(null);

  // Confirm delete dialog
  const [confirmDelete, setConfirmDelete] = useState<{ type: "bg" | "logo"; id: string; name: string } | null>(null);

  // Carregar bibliotecas
  const loadLibraries = useCallback(async () => {
    if (!user) return;
    const [bg, lg] = await Promise.all([
      supabase.from("backgrounds").select("*").order("created_at", { ascending: false }),
      supabase.from("logos").select("*").order("created_at", { ascending: false }),
    ]);
    if (bg.data) setBgLib(bg.data as LibraryItem[]);
    if (lg.data) setLogoLib(lg.data as LibraryItem[]);
  }, [user]);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  const uploadToBucket = async (bucket: "backgrounds" | "logos", file: File) => {
    if (!user) throw new Error("Não autenticado");
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  // Background upload + save library
  const handleBgUpload = async (file: File) => {
    try {
      setUploadingBg(true);
      const url = await uploadToBucket("backgrounds", file);
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const { data, error } = await supabase
        .from("backgrounds")
        .insert({ user_id: user!.id, name, image_url: url })
        .select()
        .single();
      if (error) throw error;
      setBgLib((p) => [data as LibraryItem, ...p]);
      await selectBackground(url);
      toast.success("Fundo adicionado à biblioteca");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar imagem");
    } finally {
      setUploadingBg(false);
    }
  };

  const selectBackground = async (url: string) => {
    try {
      const img = await loadImage(url);
      setBgImg(img);
      setBgUrl(url);
    } catch {
      toast.error("Não foi possível carregar a imagem");
    }
  };

  const promptDeleteBackground = (id: string, name: string) => {
    setConfirmDelete({ type: "bg", id, name });
  };

  const promptDeleteLogo = (id: string, name: string) => {
    setConfirmDelete({ type: "logo", id, name });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    const table = type === "bg" ? "backgrounds" : "logos";
    const bucket = type === "bg" ? "backgrounds" : "logos";

    try {
      // Get image_url to remove from storage
      const { data: row } = await supabase.from(table).select("image_url").eq("id", id).single();
      if (row?.image_url) {
        const url = new URL(row.image_url);
        const pathParts = url.pathname.split(`/${bucket}/`);
        const filePath = pathParts[1];
        if (filePath) {
          await supabase.storage.from(bucket).remove([filePath]);
        }
      }
      await supabase.from(table).delete().eq("id", id);
      if (type === "bg") {
        setBgLib((p) => p.filter((x) => x.id !== id));
        if (bgUrl === row?.image_url) {
          setBgUrl(null);
          setBgImg(null);
        }
      } else {
        setLogoLib((p) => p.filter((x) => x.id !== id));
        if (logo?.url === row?.image_url) setLogo(null);
      }
      toast.success(type === "bg" ? "Fundo removido" : "Logo removida");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover");
    } finally {
      setConfirmDelete(null);
    }
  };

  // Logo upload + save
  const handleLogoUpload = async (file: File) => {
    try {
      setUploadingLogo(true);
      const url = await uploadToBucket("logos", file);
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const { data, error } = await supabase
        .from("logos")
        .insert({ user_id: user!.id, name, image_url: url })
        .select()
        .single();
      if (error) throw error;
      setLogoLib((p) => [data as LibraryItem, ...p]);
      await selectLogo(url);
      toast.success("Logo adicionada à biblioteca");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const selectLogo = async (url: string) => {
    try {
      const img = await loadImage(url);
      setLogo({ url, img, x: 0.5, y: 0.08, size: 0.25 });
    } catch {
      toast.error("Não foi possível carregar a logo");
    }
  };

  const deleteLogo = async (id: string) => {
    await supabase.from("logos").delete().eq("id", id);
    setLogoLib((p) => p.filter((x) => x.id !== id));
  };

  // Foregrounds (local apenas)
  const handleForegroundsUpload = async (files: FileList) => {
    const items: Foreground[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        items.push({ id: crypto.randomUUID(), url, img });
      } catch {}
    }
    setForegrounds((p) => [...p, ...items]);
  };

  const removeForeground = (id: string) => {
    setForegrounds((p) => p.filter((f) => f.id !== id));
  };

  // Randomizers
  const randomizeBackground = () => {
    if (bgLib.length === 0) {
      toast.error("Adicione fundos à biblioteca primeiro");
      return;
    }
    const random = bgLib[Math.floor(Math.random() * bgLib.length)];
    selectBackground(random.image_url);
    toast.success("Fundo randomizado");
  };

  const randomizeForegrounds = () => {
    if (foregrounds.length === 1) {
      toast.info("Adicione pelo menos 2 imagens para randomizar o padrão");
      return;
    }
    if (foregrounds.length === 1) return;
    setForegrounds((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 1; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    toast.success("Padrão das imagens randomizado");
  };

  const randomizeAll = () => {
    if (bgLib.length > 1) randomizeBackground();
    if (foregrounds.length > 1) randomizeForegrounds();
    // Randomize logo position if present
    if (logo) {
      setLogo({
        ...logo,
        x: 0.2 + Math.random() * 0.6,
        y: 1.2 + Math.random() * 0.5,
        size: 0.15 + Math.random() * 0.3,
      });
    }
    // Randomize text positions
    setTexts((prev) =>
      prev.map((t) => ({
        ...t,
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
        size: Math.floor(32 + Math.random() * 80),
        color: ["#ffffff", "#facc15", "#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"][
          Math.floor(Math.random() * 7)
        ],
      }))
    );
    toast.success("Tudo randomizado");
  };

  // Texts
  const addText = () =>
    setTexts((t) => [
      ...t,
      { id: crypto.randomUUID(), text: "Novo texto", color: "#ffffff", size: 48, x: 0.5, y: 0.5 },
    ]);
  const updateText = (id: string, patch: Partial<TextItem>) =>
    setTexts((t) => t.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeText = (id: string) => setTexts((t) => t.filter((it) => it.id !== id));

  // Drag
  const onPointerDown = (e: React.PointerEvent, kind: "text" | "logo", id?: string) => {
    e.stopPropagation();
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    let cx = 0, cy = 0;
    if (kind === "text" && id) {
      const item = texts.find((t) => t.id === id)!;
      cx = item.x * rect.width;
      cy = item.y * rect.height;
      setSelectedId(id);
    } else if (kind === "logo" && logo) {
      cx = logo.x * rect.width;
      cy = logo.y * rect.height;
    }
    dragRef.current = { kind, id, offX: e.clientX - rect.left - cx, offY: e.clientY - rect.top - cy };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    const x = (e.clientX - rect.left - dragRef.current.offX) / rect.width;
    const y = (e.clientY - rect.top - dragRef.current.offY) / rect.height;
    const cx = Math.max(0, Math.min(1, x));
    const cy = Math.max(0, Math.min(1, y));
    if (dragRef.current.kind === "text" && dragRef.current.id) {
      updateText(dragRef.current.id, { x: cx, y: cy });
    } else if (dragRef.current.kind === "logo" && logo) {
      setLogo({ ...logo, x: cx, y: cy });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const download = async () => {
    if (!bgImg) {
      toast.error("Escolha uma imagem de fundo primeiro");
      return;
    }
    const { w, h } = FORMATS[format];
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // background: object-fit cover
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

    // foregrounds em grid (centralizado verticalmente, ocupando 70% da altura)
    if (foregrounds.length > 0) {
      const areaW = w * 0.9;
      const areaH = h * 0.7;
      const areaX = (w - areaW) / 2;
      const areaY = (h - areaH) / 2;
      const { cols, rows } = computeGrid(foregrounds.length, areaW, areaH);
      const cellW = areaW / cols;
      const cellH = areaH / rows;
      const pad = Math.min(cellW, cellH) * 0.05;
      foregrounds.forEach((fg, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const cx = areaX + c * cellW + pad;
        const cy = areaY + r * cellH + pad;
        const cw = cellW - pad * 2;
        const ch = cellH - pad * 2;
        // fit contain
        const ir2 = fg.img.width / fg.img.height;
        const cr2 = cw / ch;
        let dw = cw, dh = ch;
        if (ir2 > cr2) {
          dh = cw / ir2;
        } else {
          dw = ch * ir2;
        }
        const dx = cx + (cw - dw) / 2;
        const dy = cy + (ch - dh) / 2;
        ctx.drawImage(fg.img, dx, dy, dw, dh);
      });
    }

    // logo
    if (logo) {
      const lw = w * logo.size;
      const lh = lw * (logo.img.height / logo.img.width);
      ctx.drawImage(logo.img, logo.x * w - lw / 2, logo.y * h - lh / 2, lw, lh);
    }

    // texts
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

  // Preview foreground layout (mesma lógica do canvas, em %)
  const fgGrid = foregrounds.length > 0
    ? (() => {
        const aspectW = format === "feed" ? 4 : 9;
        const aspectH = format === "feed" ? 5 : 16;
        const areaW = 0.9, areaH = 0.7;
        const { cols, rows } = computeGrid(foregrounds.length, areaW * aspectW, areaH * aspectH);
        return { cols, rows, areaW, areaH };
      })()
    : null;

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
        {/* Preview */}
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
                Escolha um fundo da biblioteca ou faça upload
              </div>
            )}

            {/* Foregrounds grid */}
            {fgGrid && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${((1 - fgGrid.areaW) / 2) * 100}%`,
                  top: `${((1 - fgGrid.areaH) / 2) * 100}%`,
                  width: `${fgGrid.areaW * 100}%`,
                  height: `${fgGrid.areaH * 100}%`,
                  display: "grid",
                  gridTemplateColumns: `repeat(${fgGrid.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${fgGrid.rows}, 1fr)`,
                  gap: "2%",
                }}
              >
                {foregrounds.map((fg) => (
                  <div key={fg.id} className="w-full h-full flex items-center justify-center">
                    <img src={fg.url} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                ))}
              </div>
            )}

            {/* Logo */}
            {logo && (
              <img
                src={logo.url}
                alt=""
                onPointerDown={(e) => onPointerDown(e, "logo")}
                style={{
                  position: "absolute",
                  left: `${logo.x * 100}%`,
                  top: `${logo.y * 100}%`,
                  width: `${logo.size * 100}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "grab",
                  touchAction: "none",
                }}
              />
            )}

            {/* Texts */}
            {texts.map((t) => (
              <div
                key={t.id}
                onPointerDown={(e) => onPointerDown(e, "text", t.id)}
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
            <Label>Formato</Label>
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

          {/* Background library */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Biblioteca de Fundos</Label>
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer px-2 py-1 border rounded hover:bg-muted">
                {uploadingBg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Adicionar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingBg}
                  onChange={(e) => e.target.files?.[0] && handleBgUpload(e.target.files[0])}
                />
              </label>
            </div>
            {bgLib.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum fundo salvo. Adicione um para começar.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {bgLib.map((b) => (
                  <div key={b.id} className="relative group">
                    <button
                      onClick={() => selectBackground(b.image_url)}
                      className={`block w-full aspect-square rounded overflow-hidden border-2 ${bgUrl === b.image_url ? "border-primary" : "border-transparent"}`}
                    >
                      <img src={b.image_url} alt={b.name} className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => promptDeleteBackground(b.id, b.name)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logo library */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Biblioteca de Logos</Label>
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer px-2 py-1 border rounded hover:bg-muted">
                {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Adicionar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
              </label>
            </div>
            {logoLib.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma logo salva.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {logoLib.map((l) => (
                  <div key={l.id} className="relative group">
                    <button
                      onClick={() => selectLogo(l.image_url)}
                      className={`block w-full aspect-square rounded overflow-hidden border-2 bg-muted ${logo?.url === l.image_url ? "border-primary" : "border-transparent"}`}
                    >
                      <img src={l.image_url} alt={l.name} className="w-full h-full object-contain" />
                    </button>
                    <button
                      onClick={() => promptDeleteLogo(l.id, l.name)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {logo && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tamanho da logo</span>
                  <button onClick={() => setLogo(null)} className="text-destructive">Remover</button>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.6}
                  step={0.01}
                  value={logo.size}
                  onChange={(e) => setLogo({ ...logo, size: +e.target.value })}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Foreground images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Imagens em Destaque</Label>
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer px-2 py-1 border rounded hover:bg-muted">
                <ImageIcon className="w-3 h-3" /> Adicionar
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleForegroundsUpload(e.target.files)}
                />
              </label>
            </div>
            {foregrounds.length === 0 ? (
              <p className="text-xs text-muted-foreground">Faça upload de uma ou mais imagens. Elas são organizadas automaticamente.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {foregrounds.map((f) => (
                  <div key={f.id} className="relative group">
                    <div className="aspect-square rounded overflow-hidden bg-muted">
                      <img src={f.url} alt="" className="w-full h-full object-contain" />
                    </div>
                    <button
                      onClick={() => removeForeground(f.id)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Texts */}
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
      </main>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{confirmDelete?.name}" da biblioteca? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
