import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Trash2,
  Plus,
  Download,
  LogOut,
  Upload,
  ImageIcon,
  Loader2,
  Shuffle,
  Mail,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  Undo2,
  Redo2,
  Palette,
  Layers,
  Type,
  Sparkles,
  Settings,
  ChevronDown,
  MousePointer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/app")({
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
  font?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
};

type LibraryItem = { id: string; name: string; image_url: string; signed_url?: string };
type Foreground = {
  id: string;
  url: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  size: number;
};
type LogoState = {
  url: string;
  signedUrl: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  size: number;
} | null;

type CanvasState = {
  bgUrl: string | null;
  bgUrlSigned: string | null;
  bgImg: HTMLImageElement | null;
  foregrounds: Foreground[];
  logo: LogoState;
  texts: TextItem[];
  format: Format;
};

const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed (4:5)" },
  story: { w: 1080, h: 1920, label: "Stories (9:16)" },
};

const FONTS = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
  { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif" },
  { id: "poppins", name: "Poppins", family: "'Poppins', sans-serif" },
  { id: "playfair", name: "Playfair Display", family: "'Playfair Display', serif" },
  { id: "bebas", name: "Bebas Neue", family: "'Bebas Neue', sans-serif" },
  { id: "lora", name: "Lora", family: "'Lora', serif" },
  { id: "cinzel", name: "Cinzel", family: "'Cinzel', serif" },
];

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

interface ElementLayouts {
  foregrounds: { x: number; y: number; size: number }[];
  logo: { x: number; y: number; size: number } | null;
  texts: { x: number; y: number; size: number }[];
}

function getForegroundSpace(currentTexts: TextItem[], currentLogo: LogoState, isStory: boolean) {
  let fgMinY = isStory ? 0.18 : 0.16;
  let fgMaxY = isStory ? 0.88 : 0.85;

  const hasTopText = currentTexts.some((t) => t.y < 0.35);
  const hasBottomText = currentTexts.some((t) => t.y > 0.65);
  const hasLogo = !!currentLogo;

  if (hasTopText && hasBottomText) {
    const topTexts = currentTexts.filter((t) => t.y < 0.35);
    const bottomTexts = currentTexts.filter((t) => t.y > 0.65);
    const maxTopY = Math.max(...topTexts.map((t) => t.y), hasLogo ? currentLogo.y : 0);
    const minBottomY = Math.min(...bottomTexts.map((t) => t.y));
    fgMinY = maxTopY + 0.12;
    fgMaxY = minBottomY - 0.12;
  } else if (hasTopText) {
    const maxTopY = Math.max(...currentTexts.map((t) => t.y), hasLogo ? currentLogo.y : 0);
    fgMinY = maxTopY + 0.12;
  } else if (hasBottomText) {
    const minBottomY = Math.min(...currentTexts.map((t) => t.y));
    fgMaxY = minBottomY - 0.12;
    if (hasLogo) {
      fgMinY = currentLogo.y + 0.12;
    }
  } else if (hasLogo) {
    fgMinY = currentLogo.y + 0.12;
  }

  if (fgMinY > fgMaxY - 0.15) {
    fgMinY = isStory ? 0.22 : 0.2;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  return { fgMinY, fgMaxY };
}

function getForegroundCoordinates(
  num: number,
  styleType: number,
  fgMinY: number,
  fgMaxY: number,
): { x: number; y: number; size: number }[] {
  const coords: { x: number; y: number; size: number }[] = [];
  const fgCenterY = (fgMinY + fgMaxY) / 2;
  const fgHeightRange = fgMaxY - fgMinY;

  // Betting tickets/coupons are generally vertical with ~1.4 ratio
  const aspectRatio = 1.4;

  if (num === 1) {
    coords.push({
      x: 0.5,
      y: fgCenterY,
      size: Math.min(0.45, fgHeightRange / aspectRatio),
    });
  } else if (num === 2) {
    const style = styleType % 3;
    if (style === 0) {
      // Columns (side-by-side)
      const size = Math.min(0.35, fgHeightRange / aspectRatio);
      coords.push({ x: 0.28, y: fgCenterY, size });
      coords.push({ x: 0.72, y: fgCenterY, size });
    } else if (style === 1) {
      // Diagonal staggered (no overlap)
      const size = Math.min(0.33, (fgHeightRange * 0.8) / aspectRatio);
      const dy = fgHeightRange * 0.16;
      coords.push({ x: 0.28, y: fgCenterY - dy, size });
      coords.push({ x: 0.72, y: fgCenterY + dy, size });
    } else {
      // Stacked vertically (single column, no overlap)
      const size = Math.min(0.35, (fgHeightRange * 0.45) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else if (num === 3) {
    const style = styleType % 4;
    if (style === 0) {
      // 3 Columns (side-by-side)
      const size = Math.min(0.24, fgHeightRange / aspectRatio);
      coords.push({ x: 0.2, y: fgCenterY, size });
      coords.push({ x: 0.5, y: fgCenterY, size });
      coords.push({ x: 0.8, y: fgCenterY, size });
    } else if (style === 1) {
      // Pyramid (1 top, 2 bottom)
      const size = Math.min(0.26, (fgHeightRange * 0.7) / aspectRatio);
      const dy = fgHeightRange * 0.2;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.28, y: fgCenterY + dy, size });
      coords.push({ x: 0.72, y: fgCenterY + dy, size });
    } else if (style === 2) {
      // Staircase diagonal
      const size = Math.min(0.24, (fgHeightRange * 0.6) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.22, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY, size });
      coords.push({ x: 0.78, y: fgCenterY + dy, size });
    } else {
      // Reverse Pyramid (2 top, 1 bottom)
      const size = Math.min(0.26, (fgHeightRange * 0.7) / aspectRatio);
      const dy = fgHeightRange * 0.2;
      coords.push({ x: 0.28, y: fgCenterY - dy, size });
      coords.push({ x: 0.72, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else if (num === 4) {
    const style = styleType % 4;
    if (style === 0) {
      // 2x2 Grid (perfectly spaced, minimal overlap)
      const size = Math.min(0.28, (fgHeightRange * 0.65) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.28, y: fgCenterY - dy, size });
      coords.push({ x: 0.72, y: fgCenterY - dy, size });
      coords.push({ x: 0.28, y: fgCenterY + dy, size });
      coords.push({ x: 0.72, y: fgCenterY + dy, size });
    } else if (style === 1) {
      // Diamond
      const size = Math.min(0.26, (fgHeightRange * 0.65) / aspectRatio);
      const dy = fgHeightRange * 0.24;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.26, y: fgCenterY, size });
      coords.push({ x: 0.74, y: fgCenterY, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    } else if (style === 2) {
      // 1 Top, 3 Bottom
      const size = Math.min(0.22, (fgHeightRange * 0.6) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.2, y: fgCenterY + dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
      coords.push({ x: 0.8, y: fgCenterY + dy, size });
    } else {
      // 3 Top, 1 Bottom
      const size = Math.min(0.22, (fgHeightRange * 0.6) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.2, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.8, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else {
    // Smart Centered Grid for 5 or more elements
    const cols = Math.ceil(Math.sqrt(num));
    const rows = Math.ceil(num / cols);

    const sizeX = 0.75 / cols;
    const sizeY = fgHeightRange / (rows * aspectRatio);
    const size = Math.max(0.12, Math.min(sizeX, sizeY, 0.22));

    const spacingX = cols > 1 ? (0.75 - size) / (cols - 1) : 0;
    const spacingY = rows > 1 ? (fgHeightRange - size * aspectRatio) / (rows - 1) : 0;

    const startY = fgCenterY - ((rows - 1) * spacingY) / 2;

    for (let r = 0; r < rows; r++) {
      const startIndex = r * cols;
      const cardsInRow = Math.min(cols, num - startIndex);
      const rowStartX = 0.5 - ((cardsInRow - 1) * spacingX) / 2;

      for (let c = 0; c < cardsInRow; c++) {
        coords.push({
          x: rowStartX + c * spacingX,
          y: startY + r * spacingY,
          size,
        });
      }
    }
  }

  // Double-check sizes and keep within 0.05-0.95 margins of the canvas width and height
  return coords.map((c) => {
    let size = c.size;
    let x = c.x;
    let y = c.y;

    const halfW = size / 2;
    if (x - halfW < 0.05) {
      x = 0.05 + halfW;
    }
    if (x + halfW > 0.95) {
      x = 0.95 - halfW;
    }

    const halfH = (size * aspectRatio) / 2;
    if (y - halfH < 0.05) {
      y = 0.05 + halfH;
    }
    if (y + halfH > 0.95) {
      y = 0.95 - halfH;
    }

    const maxW = Math.min(x - 0.05, 0.95 - x) * 2;
    const maxH = (Math.min(y - 0.05, 0.95 - y) * 2) / aspectRatio;
    size = Math.min(size, maxW, maxH);

    return { x, y, size };
  });
}

function generateForegroundLayouts(num: number, styleType: number, fgMinY: number, fgMaxY: number) {
  const coords = getForegroundCoordinates(num, styleType, fgMinY, fgMaxY);
  return coords.map((c) => ({
    x: Math.max(0.05, Math.min(0.95, c.x)),
    y: Math.max(0.05, Math.min(0.95, c.y)),
    size: Math.max(0.05, Math.min(0.9, c.size)),
  }));
}

function generateCohesiveLayout(
  format: Format,
  numForegrounds: number,
  numTexts: number,
  logoExists: boolean,
  presetIndex: number,
): ElementLayouts {
  const isStory = format === "story";
  const layout: ElementLayouts = {
    foregrounds: [],
    logo: null,
    texts: [],
  };

  const preset = presetIndex % 3;

  if (logoExists) {
    if (preset === 0) {
      layout.logo = {
        x: 0.5,
        y: isStory ? 0.08 : 0.07,
        size: 0.22,
      };
    } else if (preset === 1) {
      layout.logo = {
        x: 0.5,
        y: isStory ? 0.1 : 0.09,
        size: 0.25,
      };
    } else {
      layout.logo = {
        x: 0.5,
        y: isStory ? 0.08 : 0.07,
        size: 0.22,
      };
    }
  }

  if (numTexts > 0) {
    if (preset === 0) {
      const logoTopCenter = layout.logo && Math.abs(layout.logo.x - 0.5) < 0.05;
      const startY = logoTopCenter ? (isStory ? 0.22 : 0.2) : isStory ? 0.16 : 0.14;
      const spacing = isStory ? 0.07 : 0.06;

      for (let i = 0; i < numTexts; i++) {
        layout.texts.push({
          x: 0.5,
          y: startY + i * spacing,
          size: i === 0 ? (isStory ? 56 : 48) : isStory ? 38 : 32,
        });
      }
    } else if (preset === 1) {
      const startY = isStory ? 0.82 : 0.8;
      const spacing = isStory ? 0.07 : 0.06;
      for (let i = 0; i < numTexts; i++) {
        layout.texts.push({
          x: 0.5,
          y: startY + i * spacing,
          size: i === 0 ? (isStory ? 56 : 48) : isStory ? 38 : 32,
        });
      }
    } else {
      for (let i = 0; i < numTexts; i++) {
        if (i === 0) {
          layout.texts.push({
            x: 0.5,
            y: isStory ? 0.18 : 0.16,
            size: isStory ? 54 : 46,
          });
        } else if (i === 1) {
          layout.texts.push({
            x: 0.5,
            y: isStory ? 0.84 : 0.82,
            size: isStory ? 48 : 40,
          });
        } else {
          layout.texts.push({
            x: 0.5,
            y: 0.88 + (i - 2) * 0.05,
            size: 32,
          });
        }
      }
    }
  }

  let fgMinY = isStory ? 0.18 : 0.16;
  let fgMaxY = isStory ? 0.88 : 0.85;

  if (layout.logo) {
    fgMinY = Math.max(fgMinY, layout.logo.y + 0.12);
  }

  if (numTexts > 0) {
    if (preset === 0) {
      const lastTextY = layout.texts[layout.texts.length - 1].y;
      fgMinY = Math.max(fgMinY, lastTextY + 0.12);
    } else if (preset === 1) {
      const firstTextY = layout.texts[0].y;
      fgMaxY = Math.min(fgMaxY, firstTextY - 0.12);
    } else {
      const topTextY = layout.texts[0].y;
      fgMinY = Math.max(fgMinY, topTextY + 0.12);
      if (layout.texts[1]) {
        fgMaxY = Math.min(fgMaxY, layout.texts[1].y - 0.12);
      }
    }
  }

  if (fgMinY > fgMaxY - 0.15) {
    fgMinY = isStory ? 0.22 : 0.2;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  layout.foregrounds = getForegroundCoordinates(numForegrounds, presetIndex, fgMinY, fgMaxY);

  layout.foregrounds = layout.foregrounds.map((c) => ({
    x: Math.max(0.05, Math.min(0.95, c.x)),
    y: Math.max(0.05, Math.min(0.95, c.y)),
    size: Math.max(0.05, Math.min(0.9, c.size)),
  }));

  if (layout.logo) {
    layout.logo.x = Math.max(0.05, Math.min(0.95, layout.logo.x));
    layout.logo.y = Math.max(0.03, Math.min(0.97, layout.logo.y));
    layout.logo.size = Math.max(0.05, Math.min(0.9, layout.logo.size));
  }

  layout.texts = layout.texts.map((c) => ({
    x: Math.max(0.05, Math.min(0.95, c.x)),
    y: Math.max(0.05, Math.min(0.95, c.y)),
    size: Math.max(16, Math.min(200, c.size)),
  }));

  return layout;
}

function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const HARDCODED_ADMINS = ["rogermachado019@gmail.com", "casadosvloogs@gmail.com"];

  const checkAccess = useCallback(async () => {
    if (!user) return;
    try {
      setCheckingAccess(true);
      const isHardcodedAdmin = HARDCODED_ADMINS.includes(user.email || "");

      const { data: active, error: activeErr } = await supabase.rpc("is_user_active", {
        user_uuid: user.id,
      });

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (isHardcodedAdmin) {
        setIsActive(true);
        setIsAdmin(true);
        if (profile && !profile.is_admin) {
          await supabase.from("profiles").update({ is_admin: true }).eq("id", user.id);
        }
      } else {
        if (activeErr) throw activeErr;
        if (profileErr) throw profileErr;
        setIsActive(!!active);
        setIsAdmin(!!profile?.is_admin);
      }
    } catch (err) {
      console.error("Erro ao verificar acesso:", err);
      if (user.email && HARDCODED_ADMINS.includes(user.email)) {
        setIsActive(true);
        setIsAdmin(true);
      } else {
        setIsActive(false);
        setIsAdmin(false);
      }
    } finally {
      setCheckingAccess(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/auth" });
      } else {
        checkAccess();
      }
    }
  }, [user, loading, navigate, checkAccess]);

  const copyToClipboard = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    toast.success("E-mail copiado!");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const [format, setFormat] = useState<Format>("feed");

  // Background library
  const [bgLib, setBgLib] = useState<LibraryItem[]>([]);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgUrlSigned, setBgUrlSigned] = useState<string | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  // Logo library
  const [logoLib, setLogoLib] = useState<LibraryItem[]>([]);
  const [logo, setLogo] = useState<LogoState>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Foregrounds (draggable, scalable)
  const [foregrounds, setForegrounds] = useState<Foreground[]>([]);

  const [texts, setTexts] = useState<TextItem[]>([
    {
      id: crypto.randomUUID(),
      text: "Seu resultado aqui",
      color: "#ffffff",
      size: 64,
      x: 0.5,
      y: 0.5,
      font: "inter",
      bold: true,
      italic: false,
      underline: false,
      align: "center",
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportScale, setExportScale] = useState<number>(1);
  const [previewWidth, setPreviewWidth] = useState<number>(400);

  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: "text" | "logo" | "foreground";
    id?: string;
    offX: number;
    offY: number;
  } | null>(null);

  // Confirm delete dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "bg" | "logo";
    id: string;
    name: string;
  } | null>(null);

  // History Undo/Redo States
  const [past, setPast] = useState<CanvasState[]>([]);
  const [future, setFuture] = useState<CanvasState[]>([]);

  const [activeTab, setActiveTab] = useState<
    "elementos" | "texto" | "uploads" | "modelos" | "ia" | "ajustes" | null
  >("elementos");
  const [workspaceSize, setWorkspaceSize] = useState({ width: 400, height: 600 });
  const workspaceRef = useRef<HTMLDivElement>(null);

  // ResizeObserver for workspace size
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWorkspaceSize({
          width: entries[0].contentRect.width || 400,
          height: entries[0].contentRect.height || 600,
        });
      }
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setWorkspaceSize({
      width: rect.width || 400,
      height: rect.height || 600,
    });
    return () => observer.disconnect();
  }, [isActive]);

  // ResizeObserver for dynamic text scaling
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setPreviewWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(el);
    setPreviewWidth(el.getBoundingClientRect().width || 400);
    return () => observer.disconnect();
  }, [isActive, format]);

  // Helper for generating state signature
  const getStateSignature = (state: Omit<CanvasState, "bgImg">) => {
    const bg = state.bgUrl || "";
    const fgs = state.foregrounds
      .map((f) => `${f.url}:${f.x.toFixed(3)}:${f.y.toFixed(3)}:${f.size.toFixed(3)}`)
      .join(",");
    const logoPart = state.logo
      ? `${state.logo.url}:${state.logo.x.toFixed(3)}:${state.logo.y.toFixed(3)}:${state.logo.size.toFixed(3)}`
      : "";
    const txts = state.texts
      .map(
        (t) =>
          `${t.id}:${t.text}:${t.color}:${t.size}:${t.x.toFixed(3)}:${t.y.toFixed(3)}:${t.font || "inter"}:${t.bold ? "1" : "0"}:${t.italic ? "1" : "0"}:${t.underline ? "1" : "0"}:${t.align || "center"}`,
      )
      .sort()
      .join("|");
    const fmt = state.format;
    return `${bg}#${fgs}#${logoPart}#${txts}#${fmt}`;
  };

  const getSignedUrlForStorageUrl = async (
    bucket: "backgrounds" | "logos",
    storageUrl: string,
  ): Promise<string> => {
    try {
      const url = new URL(storageUrl);
      const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
      const filePath = pathParts[1] || url.pathname.split(`/${bucket}/`)[1];
      if (!filePath) return storageUrl;

      const decodePath = decodeURIComponent(filePath);
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(decodePath, 7200);
      if (error) {
        console.error("Erro ao assinar URL:", error);
        return storageUrl;
      }
      return data.signedUrl;
    } catch (err) {
      console.error("Erro ao gerar URL assinada:", err);
      return storageUrl;
    }
  };

  const saveToHistory = useCallback(() => {
    const currentState: CanvasState = {
      bgUrl,
      bgUrlSigned,
      bgImg,
      foregrounds,
      logo,
      texts,
      format,
    };

    const currentSig = getStateSignature(currentState);

    setPast((prev) => {
      if (prev.length > 0) {
        const lastSig = getStateSignature(prev[prev.length - 1]);
        if (lastSig === currentSig) {
          return prev;
        }
      }
      const newPast = [...prev, currentState];
      if (newPast.length > 50) {
        newPast.shift();
      }
      return newPast;
    });
    setFuture([]);
  }, [bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    const currentState: CanvasState = {
      bgUrl,
      bgUrlSigned,
      bgImg,
      foregrounds,
      logo,
      texts,
      format,
    };

    setPast(newPast);
    setFuture((prev) => [currentState, ...prev]);

    setBgUrl(previous.bgUrl);
    setBgUrlSigned(previous.bgUrlSigned);
    setBgImg(previous.bgImg);
    setForegrounds(previous.foregrounds);
    setLogo(previous.logo);
    setTexts(previous.texts);
    setFormat(previous.format);
  }, [past, bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    const currentState: CanvasState = {
      bgUrl,
      bgUrlSigned,
      bgImg,
      foregrounds,
      logo,
      texts,
      format,
    };

    setPast((prev) => [...prev, currentState]);
    setFuture(newFuture);

    setBgUrl(next.bgUrl);
    setBgUrlSigned(next.bgUrlSigned);
    setBgImg(next.bgImg);
    setForegrounds(next.foregrounds);
    setLogo(next.logo);
    setTexts(next.texts);
    setFormat(next.format);
  }, [future, bgUrl, bgUrlSigned, bgImg, foregrounds, logo, texts, format]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditingText =
        activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      if (isEditingText) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          undo();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Carregar bibliotecas
  const loadLibraries = useCallback(async () => {
    if (!user) return;
    const [bg, lg] = await Promise.all([
      supabase.from("backgrounds").select("*").order("created_at", { ascending: false }),
      supabase.from("logos").select("*").order("created_at", { ascending: false }),
    ]);

    let bgData = (bg.data || []) as LibraryItem[];
    let lgData = (lg.data || []) as LibraryItem[];

    try {
      const signedBgs = await Promise.all(
        bgData.map(async (item) => {
          const signedUrl = await getSignedUrlForStorageUrl("backgrounds", item.image_url);
          return { ...item, signed_url: signedUrl };
        }),
      );
      bgData = signedBgs;
    } catch (e) {
      console.error("Error signing background URLs:", e);
    }

    try {
      const signedLgs = await Promise.all(
        lgData.map(async (item) => {
          const signedUrl = await getSignedUrlForStorageUrl("logos", item.image_url);
          return { ...item, signed_url: signedUrl };
        }),
      );
      lgData = signedLgs;
    } catch (e) {
      console.error("Error signing logo URLs:", e);
    }

    setBgLib(bgData);
    setLogoLib(lgData);
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

  const handleBgUpload = async (file: File) => {
    try {
      saveToHistory();
      setUploadingBg(true);
      const url = await uploadToBucket("backgrounds", file);
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const { data, error } = await supabase
        .from("backgrounds")
        .insert({ user_id: user!.id, name, image_url: url })
        .select()
        .single();
      if (error) throw error;

      const signedUrl = await getSignedUrlForStorageUrl("backgrounds", url);
      const newItem = { ...(data as LibraryItem), signed_url: signedUrl };

      setBgLib((p) => [newItem, ...p]);
      await selectBackground(newItem);
      toast.success("Fundo adicionado à biblioteca");
    } catch (e) {
      toast.error((e as Error).message || "Erro ao enviar imagem");
    } finally {
      setUploadingBg(false);
    }
  };

  const selectBackground = async (itemOrUrl: LibraryItem | string) => {
    try {
      const url = typeof itemOrUrl === "string" ? itemOrUrl : itemOrUrl.image_url;
      let signedUrl =
        typeof itemOrUrl === "string" ? itemOrUrl : itemOrUrl.signed_url || itemOrUrl.image_url;

      if (typeof itemOrUrl === "string" && url.includes("/storage/v1/object/public/backgrounds/")) {
        signedUrl = await getSignedUrlForStorageUrl("backgrounds", url);
      }

      const img = await loadImage(signedUrl);
      setBgImg(img);
      setBgUrl(url);
      setBgUrlSigned(signedUrl);
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
    saveToHistory();
    const { type, id } = confirmDelete;
    const table = type === "bg" ? "backgrounds" : "logos";
    const bucket = type === "bg" ? "backgrounds" : "logos";

    try {
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
          setBgUrlSigned(null);
          setBgImg(null);
        }
      } else {
        setLogoLib((p) => p.filter((x) => x.id !== id));
        if (logo?.url === row?.image_url) setLogo(null);
      }
      toast.success(type === "bg" ? "Fundo removido" : "Logo removida");
    } catch (e) {
      toast.error((e as Error).message || "Erro ao remover");
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      saveToHistory();
      setUploadingLogo(true);
      const url = await uploadToBucket("logos", file);
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 60);
      const { data, error } = await supabase
        .from("logos")
        .insert({ user_id: user!.id, name, image_url: url })
        .select()
        .single();
      if (error) throw error;

      const signedUrl = await getSignedUrlForStorageUrl("logos", url);
      const newItem = { ...(data as LibraryItem), signed_url: signedUrl };

      setLogoLib((p) => [newItem, ...p]);
      await selectLogo(newItem);
      toast.success("Logo adicionada à biblioteca");
    } catch (e) {
      toast.error((e as Error).message || "Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const selectLogo = async (itemOrUrl: LibraryItem | string) => {
    try {
      const url = typeof itemOrUrl === "string" ? itemOrUrl : itemOrUrl.image_url;
      let signedUrl =
        typeof itemOrUrl === "string" ? itemOrUrl : itemOrUrl.signed_url || itemOrUrl.image_url;

      if (typeof itemOrUrl === "string" && url.includes("/storage/v1/object/public/logos/")) {
        signedUrl = await getSignedUrlForStorageUrl("logos", url);
      }

      const img = await loadImage(signedUrl);
      setLogo({ url, signedUrl, img, x: 0.5, y: 0.08, size: 0.25 });
      setSelectedId("logo");
    } catch {
      toast.error("Não foi possível carregar a logo");
    }
  };

  // Upload custom layers (foregrounds)
  const handleForegroundsUpload = async (files: FileList) => {
    const items: Foreground[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        const newId = crypto.randomUUID();
        items.push({
          id: newId,
          url,
          img,
          x: 0.5,
          y: 0.5,
          size: 0.3,
        });
        setSelectedId(newId);
      } catch {
        console.warn("Falha ao carregar imagem de destaque:", url);
      }
    }
    setForegrounds((p) => [...p, ...items]);
  };

  const updateForeground = (id: string, patch: Partial<Foreground>) => {
    setForegrounds((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeForeground = (id: string) => {
    setForegrounds((p) => p.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Randomizers
  const randomizeBackground = () => {
    if (bgLib.length === 0) {
      toast.error("Adicione fundos à biblioteca primeiro");
      return;
    }

    const currentState: CanvasState = {
      bgUrl,
      bgUrlSigned,
      bgImg,
      foregrounds,
      logo,
      texts,
      format,
    };
    const existingSigs = new Set([
      ...past.map((s) => getStateSignature(s)),
      getStateSignature(currentState),
      ...future.map((s) => getStateSignature(s)),
    ]);

    let attempts = 0;
    let found = false;
    let chosenBg = null;

    while (attempts < 100) {
      const random = bgLib[Math.floor(Math.random() * bgLib.length)];
      const candidate: CanvasState = {
        bgUrl: random.image_url,
        bgUrlSigned: random.signed_url || random.image_url,
        bgImg: null,
        foregrounds,
        logo,
        texts,
        format,
      };

      if (!existingSigs.has(getStateSignature(candidate))) {
        chosenBg = random;
        found = true;
        break;
      }
      attempts++;
    }

    if (!found) {
      toast.warning("Limite de variações de fundo atingido!");
      return;
    }

    saveToHistory();
    selectBackground(chosenBg!);
    toast.success("Fundo randomizado");
  };

  const randomizeForegrounds = () => {
    if (foregrounds.length === 0) {
      toast.info("Adicione pelo menos 1 imagem em destaque para randomizar as posições.");
      return;
    }

    const currentState: CanvasState = {
      bgUrl,
      bgUrlSigned,
      bgImg,
      foregrounds,
      logo,
      texts,
      format,
    };
    const existingSigs = new Set([
      ...past.map((s) => getStateSignature(s)),
      getStateSignature(currentState),
      ...future.map((s) => getStateSignature(s)),
    ]);

    let attempts = 0;
    let found = false;
    let shuffledForegrounds = [...foregrounds];
    const isStory = format === "story";

    while (attempts < 100) {
      const { fgMinY, fgMaxY } = getForegroundSpace(texts, logo, isStory);
      const styleType = Math.floor(Math.random() * 4) + attempts;
      const layouts = generateForegroundLayouts(foregrounds.length, styleType, fgMinY, fgMaxY);

      const candidateFgs = foregrounds.map((fg, idx) => ({
        ...fg,
        x: layouts[idx]?.x ?? fg.x,
        y: layouts[idx]?.y ?? fg.y,
        size: layouts[idx]?.size ?? fg.size,
      }));

      const candidate: CanvasState = {
        bgUrl,
        bgUrlSigned,
        bgImg: null,
        foregrounds: candidateFgs,
        logo,
        texts,
        format,
      };

      if (!existingSigs.has(getStateSignature(candidate))) {
        shuffledForegrounds = candidateFgs;
        found = true;
        break;
      }
      attempts++;
    }

    if (!found) {
      toast.warning("Limite de variações de padrão atingido!");
      return;
    }

    saveToHistory();
    setForegrounds(shuffledForegrounds);
    toast.success("Posições das imagens em destaque randomizadas");
  };

  const randomizeAll = () => {
    const currentState: CanvasState = {
      bgUrl,
      bgUrlSigned,
      bgImg,
      foregrounds,
      logo,
      texts,
      format,
    };
    const existingSigs = new Set([
      ...past.map((s) => getStateSignature(s)),
      getStateSignature(currentState),
      ...future.map((s) => getStateSignature(s)),
    ]);

    let attempts = 0;
    let found = false;

    let candidateBg = bgUrl;
    let candidateBgSigned = bgUrlSigned;
    let candidateFgs = [...foregrounds];
    let candidateLogo = logo;
    let candidateTexts = [...texts];

    while (attempts < 100) {
      let nextBg = bgUrl;
      let nextBgSigned = bgUrlSigned;
      if (bgLib.length > 0) {
        const randomBg = bgLib[Math.floor(Math.random() * bgLib.length)];
        nextBg = randomBg.image_url;
        nextBgSigned = randomBg.signed_url || randomBg.image_url;
      }

      const presetIndex = Math.floor(Math.random() * 3) + attempts;
      const layout = generateCohesiveLayout(
        format,
        foregrounds.length,
        texts.length,
        !!logo,
        presetIndex,
      );

      const nextFgs = foregrounds.map((fg, idx) => ({
        ...fg,
        x: layout.foregrounds[idx]?.x ?? fg.x,
        y: layout.foregrounds[idx]?.y ?? fg.y,
        size: layout.foregrounds[idx]?.size ?? fg.size,
      }));

      let nextLogo = logo;
      if (logo && layout.logo) {
        nextLogo = {
          ...logo,
          x: layout.logo.x,
          y: layout.logo.y,
          size: layout.logo.size,
        };
      }

      const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)].id;
      const highlightColors = [
        "#ffffff",
        "#facc15",
        "#f87171",
        "#60a5fa",
        "#34d399",
        "#a78bfa",
        "#fb923c",
      ];
      const mainColor = highlightColors[Math.floor(Math.random() * highlightColors.length)];
      const subColor =
        mainColor === "#ffffff"
          ? highlightColors[Math.floor(1 + Math.random() * (highlightColors.length - 1))]
          : "#ffffff";

      const nextTexts = texts.map((t, idx) => {
        const layoutText = layout.texts[idx];
        return {
          ...t,
          x: layoutText?.x ?? t.x,
          y: layoutText?.y ?? t.y,
          size: layoutText?.size ?? t.size,
          font: randomFont,
          color: idx === 0 ? mainColor : subColor,
        };
      });

      const candidate: CanvasState = {
        bgUrl: nextBg,
        bgUrlSigned: nextBgSigned,
        bgImg: null,
        foregrounds: nextFgs,
        logo: nextLogo,
        texts: nextTexts,
        format,
      };

      if (!existingSigs.has(getStateSignature(candidate))) {
        candidateBg = nextBg;
        candidateBgSigned = nextBgSigned;
        candidateFgs = nextFgs;
        candidateLogo = nextLogo;
        candidateTexts = nextTexts;
        found = true;
        break;
      }
      attempts++;
    }

    if (!found) {
      toast.warning("Limite de variações atingido para os elementos atuais!");
      return;
    }

    saveToHistory();

    if (candidateBg !== bgUrl) {
      const match = bgLib.find((b) => b.image_url === candidateBg);
      if (match) {
        selectBackground(match);
      } else if (candidateBg) {
        selectBackground(candidateBg);
      }
    }
    setForegrounds(candidateFgs);
    setLogo(candidateLogo);
    setTexts(candidateTexts);
    toast.success("Tudo randomizado");
  };

  // Texts
  const addText = () => {
    const newId = crypto.randomUUID();
    setTexts((t) => [
      ...t,
      {
        id: newId,
        text: "Novo texto",
        color: "#ffffff",
        size: 48,
        x: 0.5,
        y: 0.6,
        font: "inter",
        bold: false,
        italic: false,
        underline: false,
        align: "center",
      },
    ]);
    setSelectedId(newId);
  };

  const updateText = (id: string, patch: Partial<TextItem>) =>
    setTexts((t) => t.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeText = (id: string) => {
    setTexts((t) => t.filter((it) => it.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Drag Pointer Gestures
  const onPointerDown = (
    e: React.PointerEvent,
    kind: "text" | "logo" | "foreground",
    id?: string,
  ) => {
    saveToHistory();
    e.stopPropagation();
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    let cx = 0,
      cy = 0;

    if (kind === "text" && id) {
      const item = texts.find((t) => t.id === id)!;
      cx = item.x * rect.width;
      cy = item.y * rect.height;
      setSelectedId(id);
    } else if (kind === "logo" && logo) {
      cx = logo.x * rect.width;
      cy = logo.y * rect.height;
      setSelectedId("logo");
    } else if (kind === "foreground" && id) {
      const item = foregrounds.find((f) => f.id === id)!;
      cx = item.x * rect.width;
      cy = item.y * rect.height;
      setSelectedId(id);
    }

    dragRef.current = {
      kind,
      id,
      offX: e.clientX - rect.left - cx,
      offY: e.clientY - rect.top - cy,
    };
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
    } else if (dragRef.current.kind === "foreground" && dragRef.current.id) {
      updateForeground(dragRef.current.id, { x: cx, y: cy });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Download & Mathematical Upscale (1x, 2x, 3x)
  const download = async () => {
    if (!bgImg) {
      toast.error("Escolha uma imagem de fundo primeiro");
      return;
    }
    const { w, h } = FORMATS[format];
    const canvas = document.createElement("canvas");
    canvas.width = w * exportScale;
    canvas.height = h * exportScale;
    const ctx = canvas.getContext("2d")!;

    // background: cover
    const ir = bgImg.width / bgImg.height;
    const cr = w / h;
    let sx = 0,
      sy = 0,
      sw = bgImg.width,
      sh = bgImg.height;
    if (ir > cr) {
      sw = bgImg.height * cr;
      sx = (bgImg.width - sw) / 2;
    } else {
      sh = bgImg.width / cr;
      sy = (bgImg.height - sh) / 2;
    }
    ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // highlights (foregrounds)
    foregrounds.forEach((fg) => {
      const fW = canvas.width * fg.size;
      const fH = fW * (fg.img.height / fg.img.width);
      ctx.drawImage(fg.img, fg.x * canvas.width - fW / 2, fg.y * canvas.height - fH / 2, fW, fH);
    });

    // logo
    if (logo) {
      const lw = canvas.width * logo.size;
      const lh = lw * (logo.img.height / logo.img.width);
      ctx.drawImage(
        logo.img,
        logo.x * canvas.width - lw / 2,
        logo.y * canvas.height - lh / 2,
        lw,
        lh,
      );
    }

    // texts with font selection
    texts.forEach((t) => {
      const selectedFont = FONTS.find((f) => f.id === (t.font || "inter")) || FONTS[0];
      ctx.fillStyle = t.color;

      const fontStyle = t.italic ? "italic" : "normal";
      const fontWeight = t.bold ? "bold" : "normal";
      ctx.font = `${fontStyle} ${fontWeight} ${t.size * exportScale}px ${selectedFont.family}`;

      ctx.textAlign = t.align === "justify" ? "center" : t.align || "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8 * exportScale;

      const lines = t.text.split("\n");
      const lineH = t.size * exportScale * 1.15;
      const totalH = lineH * lines.length;
      lines.forEach((line, i) => {
        const textX = t.x * canvas.width;
        const textY = t.y * canvas.height - totalH / 2 + lineH / 2 + i * lineH;
        ctx.fillText(line, textX, textY);

        if (t.underline) {
          const textWidth = ctx.measureText(line).width;
          ctx.strokeStyle = t.color;
          ctx.lineWidth = Math.max(1, (t.size * exportScale) / 15);
          ctx.beginPath();
          let lineStartX = textX;
          if (ctx.textAlign === "center") {
            lineStartX = textX - textWidth / 2;
          } else if (ctx.textAlign === "right") {
            lineStartX = textX - textWidth;
          } else {
            lineStartX = textX;
          }
          const underlineY = textY + (t.size * exportScale) / 2;
          ctx.moveTo(lineStartX, underlineY);
          ctx.lineTo(lineStartX + textWidth, underlineY);
          ctx.stroke();
        }
      });
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gerador-resultados-${format}-hd.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 transition-colors duration-200">
        <div className="w-full max-w-sm p-6 bg-card border border-border/80 rounded-2xl shadow-2xl space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/60 animate-shimmer" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted/60 rounded-md w-3/4 animate-shimmer" />
              <div className="h-3 bg-muted/40 rounded-md w-1/2 animate-shimmer" />
            </div>
          </div>
          <div className="aspect-[4/5] bg-muted/30 rounded-xl border border-border/40 relative overflow-hidden flex items-center justify-center">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent animate-shimmer"
              style={{ backgroundSize: "200% 100%" }}
            />
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          </div>
          <p className="text-center text-xs text-muted-foreground font-semibold tracking-wide animate-pulse">
            Verificando credenciais de acesso...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (isActive === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden animate-fade-in transition-colors duration-200">
          <div className="mx-auto w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner animate-pulse">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-2 bg-gradient-to-r from-destructive to-primary bg-clip-text text-transparent">
            Acesso Expirado ou Bloqueado
          </h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Seu período de teste ou convite expirou. Para reativar seu acesso e continuar gerando
            imagens de alta conversão, entre em contato com nossos administradores:
          </p>

          <div className="space-y-3 mb-8">
            {["rogermachado019@gmail.com", "casadosvloogs@gmail.com"].map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-3.5 bg-background border border-border rounded-xl hover:border-primary/40 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(email)}
                  className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title="Copiar e-mail"
                >
                  {copiedEmail === email ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={checkAccess}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 group cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
              Verificar Novamente
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="w-full border-border hover:bg-accent text-muted-foreground hover:text-foreground py-6 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const aspectClass = format === "feed" ? "aspect-[4/5]" : "aspect-[9/16]";

  const formatSize = FORMATS[format];
  const canvasRatio = formatSize.w / formatSize.h;
  const workspaceRatio = workspaceSize.width / workspaceSize.height;

  let previewDisplayWidth = workspaceSize.width * 0.95;
  let previewDisplayHeight = previewDisplayWidth / canvasRatio;

  if (previewDisplayHeight > workspaceSize.height * 0.82) {
    previewDisplayHeight = workspaceSize.height * 0.82;
    previewDisplayWidth = previewDisplayHeight * canvasRatio;
  }

  const activeTextItem = selectedId ? texts.find((t) => t.id === selectedId) : null;
  const activeFgItem = selectedId ? foregrounds.find((f) => f.id === selectedId) : null;

  return (
    <div className="dark bg-[#06060a] text-foreground min-h-screen font-sans flex flex-col antialiased selection:bg-violet-500/30 select-none overflow-hidden">
      {/* Header Premium */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>Nova Era</span>
              <span className="w-[1px] h-3 bg-white/10" />
              <span className="text-[10px] text-white/40 font-medium">Gerador de Resultados</span>
            </h1>
          </div>
          <div className="h-4 w-[1px] bg-white/10 mx-2 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-white/50">
            <button className="hover:text-white transition">Arquivo</button>
            <button className="hover:text-white transition">Editar</button>
            <button className="relative text-violet-400 font-semibold transition">
              Design
              <span className="absolute bottom-[-19px] left-0 right-0 h-[2px] bg-violet-500 shadow-md shadow-violet-500/50" />
            </button>
            <button className="hover:text-white transition">Publicar</button>
          </div>
        </div>

        {/* Center Search Bar */}
        <div className="relative max-w-xs w-64 hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Buscar imagens ou ferramentas..."
            className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-white/5 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/40 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-full pl-2 pr-3 py-1 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-default">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
              {(user.email || "U").slice(0, 1)}
            </div>
            <span className="truncate max-w-[120px]">{user.email}</span>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/admin" })}
              className="border-violet-500/20 hover:border-violet-500 hover:bg-violet-500/10 text-violet-400 font-semibold transition-all duration-200 cursor-pointer rounded-xl flex items-center gap-1.5 h-8 text-xs bg-transparent"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Button>
          )}

          <Button
            onClick={download}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 h-8 rounded-xl shadow-lg shadow-violet-600/20 transition-all duration-300 cursor-pointer text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            EXPORTAR
          </Button>
        </div>
      </header>

      {/* Main workspace frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Left thin navigation bar */}
        <nav className="w-16 border-r border-white/5 bg-[#0a0a0f] flex flex-col items-center py-4 gap-4 shrink-0 z-40">
          {[
            { id: "elementos", label: "Fundos", icon: ImageIcon },
            { id: "texto", label: "Texto", icon: Type },
            { id: "uploads", label: "Uploads", icon: Upload },
            { id: "modelos", label: "Modelos", icon: Layers },
            { id: "ia", label: "IA", icon: Sparkles },
            { id: "ajustes", label: "Ajustes", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? null : (tab.id as any))}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-violet-600/10 text-violet-400 border border-violet-500/20 shadow-md shadow-violet-500/5"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent"
                }`}
                title={tab.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Column 2: Sliding Contextual Drawer */}
        <div
          style={{ width: activeTab ? "300px" : "0px", opacity: activeTab ? 1 : 0 }}
          className="h-full bg-[#0a0a0f]/95 border-r border-white/5 backdrop-blur-md transition-all duration-300 overflow-hidden flex flex-col shrink-0 z-30"
        >
          {activeTab && (
            <>
              {/* Drawer Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {activeTab === "elementos" && "Biblioteca de Fundos"}
                  {activeTab === "texto" && "Ferramenta de Texto"}
                  {activeTab === "uploads" && "Meus Uploads"}
                  {activeTab === "modelos" && "Proporção do Canvas"}
                  {activeTab === "ia" && "IA Criativa"}
                  {activeTab === "ajustes" && "Configurações"}
                </span>
                <button
                  onClick={() => setActiveTab(null)}
                  className="text-white/40 hover:text-white/80 text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* 1. Elementos / Fundos */}
                {activeTab === "elementos" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/60">Selecionar Fundo</span>
                      <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1.5 border border-white/5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all">
                        {uploadingBg ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-white/60" />
                        )}
                        <span>Upload</span>
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
                      <div className="border border-dashed border-white/5 rounded-2xl p-6 text-center space-y-2 bg-white/[0.01]">
                        <ImageIcon className="w-8 h-8 text-white/20 mx-auto" />
                        <div>
                          <p className="text-xs font-semibold text-white/80">Sem fundos</p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            Faça upload para preencher sua galeria.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {bgLib.map((b) => (
                          <div key={b.id} className="relative group">
                            <button
                              onClick={() => {
                                saveToHistory();
                                selectBackground(b);
                              }}
                              className={`block w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                bgUrl === b.image_url
                                  ? "border-violet-500 scale-[0.98] shadow-md shadow-violet-500/20"
                                  : "border-transparent opacity-80 hover:opacity-100 hover:scale-[1.03]"
                              }`}
                            >
                              <img
                                src={b.signed_url || b.image_url}
                                alt={b.name}
                                className="w-full h-full object-cover"
                              />
                            </button>
                            <button
                              onClick={() => promptDeleteBackground(b.id, b.name)}
                              className="absolute top-1 right-1 bg-red-600/90 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600 cursor-pointer"
                              title="Excluir fundo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Ferramentas de Texto */}
                {activeTab === "texto" && (
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        saveToHistory();
                        addText();
                      }}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Bloco de Texto
                    </Button>

                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-white/50 block">
                        Textos no Canvas
                      </span>
                      {texts.length === 0 ? (
                        <p className="text-[10px] text-white/30 italic">Nenhum texto adicionado</p>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {texts.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => setSelectedId(t.id)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                selectedId === t.id
                                  ? "border-violet-500 bg-violet-600/10"
                                  : "border-white/5 bg-white/[0.01] hover:bg-white/5"
                              }`}
                            >
                              <span className="text-xs font-semibold text-white/80 truncate flex-1">
                                {t.text || "(Texto vazio)"}
                              </span>
                              <div
                                className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                                style={{ backgroundColor: t.color }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Uploads de Logos / Imagens */}
                {activeTab === "uploads" && (
                  <div className="space-y-5">
                    {/* Logos Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/60">Logomarcas</span>
                        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1 border border-white/5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold transition-all">
                          {uploadingLogo ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                          ) : (
                            <Upload className="w-3 h-3 text-white/60" />
                          )}
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingLogo}
                            onChange={(e) =>
                              e.target.files?.[0] && handleLogoUpload(e.target.files[0])
                            }
                          />
                        </label>
                      </div>

                      {logoLib.length === 0 ? (
                        <div className="border border-dashed border-white/5 rounded-xl p-4 text-center bg-white/[0.01]">
                          <p className="text-[10px] text-white/40">Nenhuma logo salva</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {logoLib.map((l) => (
                            <div key={l.id} className="relative group">
                              <button
                                onClick={() => {
                                  saveToHistory();
                                  selectLogo(l);
                                }}
                                className={`block w-full aspect-square rounded-xl overflow-hidden border-2 bg-white/5 p-1 transition-all ${
                                  logo?.url === l.image_url
                                    ? "border-violet-500 scale-[0.98]"
                                    : "border-transparent opacity-80 hover:opacity-100"
                                }`}
                              >
                                <img
                                  src={l.signed_url || l.image_url}
                                  alt={l.name}
                                  className="w-full h-full object-contain"
                                />
                              </button>
                              <button
                                onClick={() => promptDeleteLogo(l.id, l.name)}
                                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600 cursor-pointer"
                                title="Excluir logo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    {/* Highlights Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/60">
                          Destaques (Imagens)
                        </span>
                        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1 border border-white/5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold transition-all">
                          <Plus className="w-3 h-3 text-white/60" />
                          <span>Adicionar</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) {
                                saveToHistory();
                                handleForegroundsUpload(e.target.files);
                              }
                            }}
                          />
                        </label>
                      </div>

                      {foregrounds.length === 0 ? (
                        <div className="border border-dashed border-white/5 rounded-xl p-4 text-center bg-white/[0.01]">
                          <p className="text-[10px] text-white/40 font-semibold">
                            Sem destaques no canvas
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {foregrounds.map((f, index) => (
                            <div key={f.id} className="relative group">
                              <button
                                onClick={() => setSelectedId(f.id)}
                                className={`block w-full aspect-square rounded-xl overflow-hidden bg-white/5 p-1 transition-all border-2 ${
                                  selectedId === f.id
                                    ? "border-violet-500 scale-[0.98]"
                                    : "border-transparent"
                                }`}
                              >
                                <img src={f.url} alt="" className="w-full h-full object-contain" />
                              </button>
                              <button
                                onClick={() => {
                                  saveToHistory();
                                  removeForeground(f.id);
                                }}
                                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition hover:bg-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Modelos / Formatos */}
                {activeTab === "modelos" && (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-white/60 block mb-1">
                      Selecionar Proporção
                    </span>
                    <div className="space-y-2">
                      {[
                        { id: "feed", name: "Feed do Instagram", desc: "4:5 • 1080 x 1350 px" },
                        { id: "story", name: "Instagram Stories", desc: "9:16 • 1080 x 1920 px" },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => {
                            saveToHistory();
                            setFormat(fmt.id as any);
                          }}
                          className={`w-full text-left p-3 rounded-xl border flex flex-col transition-all cursor-pointer ${
                            format === fmt.id
                              ? "border-violet-500 bg-violet-600/10 text-white"
                              : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-white/60"
                          }`}
                        >
                          <span className="text-xs font-bold">{fmt.name}</span>
                          <span className="text-[10px] text-white/40 font-mono mt-0.5">
                            {fmt.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. IA Criativa Randomizer */}
                {activeTab === "ia" && (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-white/60 block mb-1">
                      Lógica Coesiva Nova Era
                    </span>
                    <div className="space-y-2.5">
                      <Button
                        onClick={() => {
                          saveToHistory();
                          randomizeBackground();
                        }}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/5 py-4 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs px-4"
                      >
                        <span className="font-semibold">Randomizar Fundo</span>
                        <Shuffle className="w-3.5 h-3.5 text-violet-400" />
                      </Button>
                      <Button
                        onClick={() => {
                          saveToHistory();
                          randomizeForegrounds();
                        }}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/5 py-4 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs px-4"
                      >
                        <span className="font-semibold">Randomizar Grade</span>
                        <Layers className="w-3.5 h-3.5 text-violet-400" />
                      </Button>
                      <Button
                        onClick={() => {
                          saveToHistory();
                          randomizeAll();
                        }}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-4 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs px-4 shadow-lg shadow-violet-500/20"
                      >
                        <span className="font-bold">Randomizar Tudo</span>
                        <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 6. Ajustes de Sistema */}
                {activeTab === "ajustes" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-white/60 block">
                        Upscale de Exportação
                      </span>
                      <Select
                        value={exportScale.toString()}
                        onValueChange={(v) => setExportScale(Number(v))}
                      >
                        <SelectTrigger className="bg-white/5 border border-white/5 text-white rounded-xl h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0a0f] border border-white/5 text-white rounded-xl">
                          <SelectItem value="1">Padrão (1x - HD)</SelectItem>
                          <SelectItem value="2">Alta Resolução (2x - 2K)</SelectItem>
                          <SelectItem value="3">Ultra HD (3x - 4K)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    <div className="flex flex-col gap-2">
                      {isAdmin && (
                        <Button
                          variant="outline"
                          onClick={() => navigate({ to: "/admin" })}
                          className="w-full border-white/5 hover:border-violet-500/30 hover:bg-violet-600/10 text-violet-400 text-xs py-2 rounded-xl transition-all"
                        >
                          Ir para o Painel Admin
                        </Button>
                      )}
                      <Button
                        onClick={logout}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs py-2 rounded-xl transition-all"
                      >
                        Sair da Conta
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Column 3: Center Canvas Workspace */}
        <main
          className="flex-1 bg-[#06060a] flex flex-col items-center justify-center p-6 relative overflow-hidden"
          ref={workspaceRef}
        >
          <div className="relative flex flex-col items-center justify-center select-none">
            {/* Top horizontal ruler */}
            <div
              className="absolute left-0 right-0 h-5 bg-[#0a0a0f]/80 border border-white/5 rounded-t-lg flex items-center justify-between px-3 text-[10px] text-violet-400 font-mono select-none"
              style={{ top: "-22px", width: previewDisplayWidth }}
            >
              <span>0 px</span>
              <div className="flex-1 mx-2 h-[1px] bg-gradient-to-r from-violet-500/20 via-violet-500 to-violet-500/20 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
              <span>{formatSize.w} px</span>
            </div>

            {/* Left vertical ruler */}
            <div
              className="absolute top-0 bottom-0 w-5 bg-[#0a0a0f]/80 border border-white/5 rounded-l-lg flex flex-col items-center justify-between py-3 text-[10px] text-violet-400 font-mono select-none"
              style={{ left: "-22px", height: previewDisplayHeight }}
            >
              <span>0</span>
              <div className="flex-grow my-2 w-[1px] bg-gradient-to-b from-violet-500/20 via-violet-500 to-violet-500/20 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
              <span>{formatSize.h}</span>
            </div>

            {/* Floating Actions Toolbar (Left of Canvas) */}
            <div
              className="absolute flex flex-col gap-2 bg-[#0a0a0f]/90 border border-white/5 rounded-xl p-1.5 shadow-xl backdrop-blur-md z-30"
              style={{ left: "-56px", top: "50%", transform: "translateY(-50%)" }}
            >
              <button
                onClick={() => setSelectedId(null)}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  !selectedId
                    ? "bg-violet-600 text-white"
                    : "text-white/45 hover:text-white/80 hover:bg-white/5"
                }`}
                title="Seleção"
              >
                <MousePointer className="w-4 h-4" />
              </button>
              <div className="w-full h-[1px] bg-white/5 my-0.5" />
              <button
                onClick={undo}
                disabled={past.length === 0}
                className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={future.length === 0}
                className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                title="Refazer (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-full h-[1px] bg-white/5 my-0.5" />
              <button
                onClick={() => {
                  saveToHistory();
                  randomizeForegrounds();
                }}
                className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                title="Grade de Destaque Inteligente"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  saveToHistory();
                  addText();
                }}
                className="p-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/5 transition-all cursor-pointer"
                title="Novo Bloco de Texto"
              >
                <Plus className="w-4 h-4" />
              </button>
              {selectedId && (
                <>
                  <div className="w-full h-[1px] bg-white/5 my-0.5" />
                  <button
                    onClick={() => {
                      saveToHistory();
                      if (selectedId === "logo") {
                        setLogo(null);
                      } else if (foregrounds.some((f) => f.id === selectedId)) {
                        removeForeground(selectedId);
                      } else {
                        removeText(selectedId);
                      }
                      setSelectedId(null);
                    }}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Excluir Elemento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Floating Text Formatting Toolbar (Above Canvas) */}
            {selectedId && texts.some((t) => t.id === selectedId) && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0a0a0f]/95 border border-white/5 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md z-30">
                {(() => {
                  const activeText = texts.find((t) => t.id === selectedId)!;
                  return (
                    <>
                      {/* Bold Toggle */}
                      <button
                        onClick={() => updateText(selectedId, { bold: !activeText.bold })}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          activeText.bold
                            ? "bg-violet-600 text-white"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                        title="Negrito"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      {/* Italic Toggle */}
                      <button
                        onClick={() => updateText(selectedId, { italic: !activeText.italic })}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          activeText.italic
                            ? "bg-violet-600 text-white"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                        title="Itálico"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      {/* Underline Toggle */}
                      <button
                        onClick={() => updateText(selectedId, { underline: !activeText.underline })}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          activeText.underline
                            ? "bg-violet-600 text-white"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                        title="Sublinhado"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-white/10 mx-1" />

                      {/* Alignment options */}
                      {(["left", "center", "right", "justify"] as const).map((alignOpt) => {
                        const AlignIcon =
                          alignOpt === "left"
                            ? AlignLeft
                            : alignOpt === "center"
                              ? AlignCenter
                              : alignOpt === "right"
                                ? AlignRight
                                : AlignJustify;
                        return (
                          <button
                            key={alignOpt}
                            onClick={() => updateText(selectedId, { align: alignOpt })}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              (activeText.align || "center") === alignOpt
                                ? "bg-violet-600 text-white"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                            }`}
                            title={`Alinhar à ${alignOpt}`}
                          >
                            <AlignIcon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}

                      <div className="w-[1px] h-4 bg-white/10 mx-1" />

                      {/* Text Size Display */}
                      <div className="flex items-center gap-1 text-[11px] text-white/50 font-bold px-1 select-none">
                        <span>{activeText.size}px</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Canvas Preview Container */}
            <div
              ref={previewRef}
              style={{
                width: previewDisplayWidth,
                height: previewDisplayHeight,
              }}
              className="relative bg-[#0d0d12] border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8),0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300 select-none touch-none"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onClick={() => setSelectedId(null)}
            >
              {bgUrlSigned ? (
                <img
                  src={bgUrlSigned}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-xl m-4 animate-pulse">
                  <ImageIcon className="w-10 h-10 text-white/20 mb-3" />
                  <p className="text-sm font-semibold text-white">Visualização do Canvas</p>
                  <p className="text-xs text-white/40 max-w-[200px] mt-1.5 leading-relaxed">
                    Selecione um fundo na biblioteca de fundos para iniciar o design.
                  </p>
                </div>
              )}

              {/* Draggable Highlights */}
              {foregrounds.map((fg) => (
                <img
                  key={fg.id}
                  src={fg.url}
                  alt=""
                  onPointerDown={(e) => onPointerDown(e, "foreground", fg.id)}
                  style={{
                    position: "absolute",
                    left: `${fg.x * 100}%`,
                    top: `${fg.y * 100}%`,
                    width: `${fg.size * 100}%`,
                    transform: "translate(-50%, -50%)",
                    cursor: "grab",
                    touchAction: "none",
                  }}
                  className={`animate-fade-in-scale select-none transition-shadow ${
                    selectedId === fg.id
                      ? "outline-2 outline-solid outline-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)] z-20"
                      : "z-10"
                  }`}
                />
              ))}

              {/* Draggable Logo */}
              {logo && (
                <img
                  src={logo.signedUrl}
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
                  className={`animate-fade-in-scale select-none transition-shadow ${
                    selectedId === "logo"
                      ? "outline-2 outline-solid outline-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)] z-20"
                      : "z-10"
                  }`}
                />
              )}

              {/* Draggable Texts */}
              {texts.map((t) => {
                const selectedFont = FONTS.find((f) => f.id === (t.font || "inter")) || FONTS[0];
                const scaledSize = (t.size * previewDisplayWidth) / 1080;
                return (
                  <div
                    key={t.id}
                    onPointerDown={(e) => onPointerDown(e, "text", t.id)}
                    style={{
                      position: "absolute",
                      left: `${t.x * 100}%`,
                      top: `${t.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      color: t.color,
                      fontSize: `${scaledSize}px`,
                      fontFamily: selectedFont.family,
                      fontWeight: t.bold ? "bold" : "normal",
                      fontStyle: t.italic ? "italic" : "normal",
                      textDecoration: t.underline ? "underline" : "none",
                      textAlign: t.align || "center",
                      whiteSpace: "pre-wrap",
                      textShadow: "0 2px 8px rgba(0,0,0,0.45)",
                      cursor: "grab",
                      lineHeight: 1.15,
                      userSelect: "none",
                      touchAction: "none",
                    }}
                    className={
                      selectedId === t.id
                        ? "outline-2 outline-solid outline-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse z-20"
                        : "z-10"
                    }
                  >
                    {t.text}
                  </div>
                );
              })}
            </div>

            {/* Bottom "Publicar Agora" Action */}
            <div className="mt-4 flex flex-col items-center">
              <Button
                onClick={download}
                className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-5 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-[1.02] transition-all duration-300 cursor-pointer text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                Publicar Agora
              </Button>
            </div>
          </div>
        </main>

        {/* Column 4: Right Sidebar Style / Layers Panel */}
        <aside className="w-72 border-l border-white/5 bg-[#0a0a0f] flex flex-col p-4 gap-5 overflow-y-auto shrink-0 z-10">
          {/* Active Layer Customizer Card */}
          {selectedId && (
            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-4 animate-fade-in shrink-0">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
                <span className="text-violet-400">
                  Ajustes:{" "}
                  {selectedId === "logo"
                    ? "Logomarca"
                    : foregrounds.some((f) => f.id === selectedId)
                      ? "Destaque"
                      : "Texto"}
                </span>
                <button
                  onClick={() => {
                    saveToHistory();
                    if (selectedId === "logo") {
                      setLogo(null);
                    } else if (foregrounds.some((f) => f.id === selectedId)) {
                      removeForeground(selectedId);
                    } else {
                      removeText(selectedId);
                    }
                    setSelectedId(null);
                  }}
                  className="text-red-400 font-semibold hover:underline cursor-pointer"
                >
                  Excluir
                </button>
              </div>

              {selectedId === "logo" && logo && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-white/70">
                    <span>Escala da Logo</span>
                    <span className="font-mono text-[11px]">{Math.round(logo.size * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.01}
                    value={logo.size}
                    onPointerDown={() => saveToHistory()}
                    onChange={(e) => setLogo({ ...logo, size: +e.target.value })}
                    className="w-full accent-violet-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {activeFgItem && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-white/70">
                    <span>Escala do Destaque</span>
                    <span className="font-mono text-[11px]">
                      {Math.round(activeFgItem.size * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.9}
                    step={0.01}
                    value={activeFgItem.size}
                    onPointerDown={() => saveToHistory()}
                    onChange={(e) => updateForeground(selectedId, { size: +e.target.value })}
                    className="w-full accent-violet-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {activeTextItem && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40 block">Texto</span>
                    <textarea
                      className="w-full text-xs font-semibold border border-white/5 rounded-xl p-2.5 bg-[#06060a] text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                      rows={2}
                      value={activeTextItem.text}
                      onFocus={() => saveToHistory()}
                      onChange={(e) => updateText(selectedId, { text: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-white/70">
                      <span>Tamanho da Fonte</span>
                      <span className="font-mono text-[11px]">{activeTextItem.size}px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={200}
                      value={activeTextItem.size}
                      onPointerDown={() => saveToHistory()}
                      onChange={(e) => updateText(selectedId, { size: +e.target.value })}
                      className="w-full accent-violet-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-white/70">Cor Personalizada</span>
                    <input
                      type="color"
                      value={activeTextItem.color}
                      onPointerDown={() => saveToHistory()}
                      onChange={(e) => updateText(selectedId, { color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 p-0.5 bg-[#06060a]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Camadas (Layers List) */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Camadas
              </span>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {logo && (
                <div
                  onClick={() => setSelectedId("logo")}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    selectedId === "logo"
                      ? "border-violet-500 bg-violet-600/10 shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                      : "border-white/5 bg-white/[0.01] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={logo.signedUrl}
                      className="w-6 h-6 object-contain rounded bg-white/5 p-0.5"
                    />
                    <span className="text-xs font-semibold text-white/80 truncate">Logomarca</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveToHistory();
                      setLogo(null);
                      if (selectedId === "logo") setSelectedId(null);
                    }}
                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {foregrounds.map((fg, idx) => (
                <div
                  key={fg.id}
                  onClick={() => setSelectedId(fg.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    selectedId === fg.id
                      ? "border-violet-500 bg-violet-600/10 shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                      : "border-white/5 bg-white/[0.01] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={fg.url} className="w-6 h-6 object-contain rounded bg-white/5 p-0.5" />
                    <span className="text-xs font-semibold text-white/80 truncate">
                      Imagem Destaque {idx + 1}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveToHistory();
                      removeForeground(fg.id);
                    }}
                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {texts.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    selectedId === t.id
                      ? "border-violet-500 bg-violet-600/10 shadow-[0_0_10px_rgba(139,92,246,0.15)]"
                      : "border-white/5 bg-white/[0.01] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-violet-600/10 flex items-center justify-center text-violet-400 font-bold text-xs shrink-0">
                      T
                    </div>
                    <span className="text-xs font-semibold text-white/80 truncate">
                      {t.text || "(Texto vazio)"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveToHistory();
                      removeText(t.id);
                    }}
                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                  bgUrl
                    ? "border-white/5 bg-white/[0.01]"
                    : "border-dashed border-white/5 bg-transparent"
                }`}
              >
                {bgUrlSigned ? (
                  <img src={bgUrlSigned} className="w-6 h-6 object-cover rounded" />
                ) : (
                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-white/30 text-[10px] shrink-0 font-bold">
                    BG
                  </div>
                )}
                <span className="text-xs font-semibold text-white/40 truncate">
                  Camada de Fundo
                </span>
              </div>
            </div>
          </div>

          {/* Design Tools color swatches */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Paletas de Cores
              </span>
            </div>
            <div className="space-y-3 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
              <div>
                <span className="text-[10px] text-white/40 font-semibold block mb-1.5">
                  Matizes Violeta & Indigo
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["#8b5cf6", "#a78bfa", "#c084fc", "#6366f1", "#818cf8"].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        if (selectedId && texts.some((t) => t.id === selectedId)) {
                          saveToHistory();
                          updateText(selectedId, { color: c });
                        }
                      }}
                      className="w-5.5 h-5.5 rounded-full border border-white/10 shadow-sm hover:scale-110 transition-all cursor-pointer"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-white/40 font-semibold block mb-1.5">
                  Destaques Fluorescentes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["#ffffff", "#facc15", "#f87171", "#34d399", "#2dd4bf"].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        if (selectedId && texts.some((t) => t.id === selectedId)) {
                          saveToHistory();
                          updateText(selectedId, { color: c });
                        }
                      }}
                      className="w-5.5 h-5.5 rounded-full border border-white/10 shadow-sm hover:scale-110 transition-all cursor-pointer"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Typography drop accordion style */}
          <div className="space-y-3 shrink-0">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Tipografias Disponíveis
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {FONTS.map((font) => {
                const isSelected =
                  selectedId && texts.find((t) => t.id === selectedId)?.font === font.id;
                return (
                  <button
                    key={font.id}
                    onClick={() => {
                      if (selectedId && texts.some((t) => t.id === selectedId)) {
                        saveToHistory();
                        updateText(selectedId, { font: font.id });
                      }
                    }}
                    style={{ fontFamily: font.family }}
                    className={`text-left px-2 py-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer truncate ${
                      isSelected
                        ? "border-violet-500 bg-violet-600/10 text-white shadow-sm shadow-violet-500/10"
                        : "border-white/5 hover:bg-white/5 text-white/60"
                    }`}
                  >
                    {font.name}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-[#0a0a0f] border border-white/5 text-white rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40 text-xs leading-relaxed">
              Tem certeza que deseja remover "{confirmDelete?.name}" da biblioteca? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel
              onClick={() => setConfirmDelete(null)}
              className="border-white/5 hover:bg-white/5 rounded-xl text-white text-xs font-semibold py-2 px-4 cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 text-white hover:bg-red-500 rounded-xl text-xs font-semibold py-2 px-4 cursor-pointer"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
