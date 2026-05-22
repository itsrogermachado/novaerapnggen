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

function getForegroundSpace(
  currentTexts: TextItem[],
  currentLogo: LogoState,
  isStory: boolean
) {
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
    fgMinY = isStory ? 0.22 : 0.20;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  return { fgMinY, fgMaxY };
}

function getForegroundCoordinates(
  num: number,
  styleType: number,
  fgMinY: number,
  fgMaxY: number
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
      size: Math.min(0.42, fgHeightRange / aspectRatio),
    });
  } else if (num === 2) {
    const style = styleType % 3;
    if (style === 0) {
      // Columns (side-by-side)
      const size = Math.min(0.38, fgHeightRange / aspectRatio);
      coords.push({ x: 0.26, y: fgCenterY, size });
      coords.push({ x: 0.74, y: fgCenterY, size });
    } else if (style === 1) {
      // Diagonal staggered (no overlap)
      const size = Math.min(0.35, (fgHeightRange * 0.8) / aspectRatio);
      const dy = fgHeightRange * 0.16;
      coords.push({ x: 0.3, y: fgCenterY - dy, size });
      coords.push({ x: 0.7, y: fgCenterY + dy, size });
    } else {
      // Stacked vertically (single column, no overlap)
      const size = Math.min(0.38, (fgHeightRange * 0.45) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else if (num === 3) {
    const style = styleType % 4;
    if (style === 0) {
      // 3 Columns (side-by-side)
      const size = Math.min(0.26, fgHeightRange / aspectRatio);
      coords.push({ x: 0.18, y: fgCenterY, size });
      coords.push({ x: 0.5, y: fgCenterY, size });
      coords.push({ x: 0.82, y: fgCenterY, size });
    } else if (style === 1) {
      // Pyramid (1 top, 2 bottom)
      const size = Math.min(0.28, (fgHeightRange * 0.7) / aspectRatio);
      const dy = fgHeightRange * 0.2;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.26, y: fgCenterY + dy, size });
      coords.push({ x: 0.74, y: fgCenterY + dy, size });
    } else if (style === 2) {
      // Staircase diagonal
      const size = Math.min(0.25, (fgHeightRange * 0.6) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.22, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY, size });
      coords.push({ x: 0.78, y: fgCenterY + dy, size });
    } else {
      // Reverse Pyramid (2 top, 1 bottom)
      const size = Math.min(0.28, (fgHeightRange * 0.7) / aspectRatio);
      const dy = fgHeightRange * 0.2;
      coords.push({ x: 0.26, y: fgCenterY - dy, size });
      coords.push({ x: 0.74, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else if (num === 4) {
    const style = styleType % 4;
    if (style === 0) {
      // 2x2 Grid (perfectly spaced, minimal overlap)
      const size = Math.min(0.28, (fgHeightRange * 0.65) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.26, y: fgCenterY - dy, size });
      coords.push({ x: 0.74, y: fgCenterY - dy, size });
      coords.push({ x: 0.26, y: fgCenterY + dy, size });
      coords.push({ x: 0.74, y: fgCenterY + dy, size });
    } else if (style === 1) {
      // Diamond
      const size = Math.min(0.26, (fgHeightRange * 0.65) / aspectRatio);
      const dy = fgHeightRange * 0.24;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.24, y: fgCenterY, size });
      coords.push({ x: 0.76, y: fgCenterY, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    } else if (style === 2) {
      // 1 Top, 3 Bottom
      const size = Math.min(0.24, (fgHeightRange * 0.6) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.18, y: fgCenterY + dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
      coords.push({ x: 0.82, y: fgCenterY + dy, size });
    } else {
      // 3 Top, 1 Bottom
      const size = Math.min(0.24, (fgHeightRange * 0.6) / aspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.18, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.82, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else {
    // Smart Centered Grid for 5 or more elements
    const cols = Math.ceil(Math.sqrt(num));
    const rows = Math.ceil(num / cols);

    const sizeX = 0.8 / cols;
    const sizeY = fgHeightRange / (rows * aspectRatio);
    const size = Math.max(0.12, Math.min(sizeX, sizeY, 0.24));

    const spacingX = cols > 1 ? (0.8 - size) / (cols - 1) : 0;
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

  return coords;
}

function generateForegroundLayouts(
  num: number,
  styleType: number,
  fgMinY: number,
  fgMaxY: number
) {
  const coords = getForegroundCoordinates(num, styleType, fgMinY, fgMaxY);
  return coords.map((c) => ({
    x: Math.max(0.05, Math.min(0.95, c.x + (Math.random() - 0.5) * 0.015)),
    y: Math.max(0.05, Math.min(0.95, c.y + (Math.random() - 0.5) * 0.015)),
    size: Math.max(0.05, Math.min(0.9, c.size + (Math.random() - 0.5) * 0.01)),
  }));
}

function generateCohesiveLayout(
  format: Format,
  numForegrounds: number,
  numTexts: number,
  logoExists: boolean,
  presetIndex: number
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
        x: Math.random() > 0.5 ? 0.5 : 0.15,
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
        x: Math.random() > 0.5 ? 0.85 : 0.5,
        y: isStory ? 0.08 : 0.07,
        size: 0.22,
      };
    }
  }

  if (numTexts > 0) {
    if (preset === 0) {
      const logoTopCenter = layout.logo && Math.abs(layout.logo.x - 0.5) < 0.05;
      const startY = logoTopCenter ? (isStory ? 0.22 : 0.20) : (isStory ? 0.16 : 0.14);
      const spacing = isStory ? 0.07 : 0.06;

      for (let i = 0; i < numTexts; i++) {
        layout.texts.push({
          x: 0.5,
          y: startY + i * spacing,
          size: i === 0 ? (isStory ? 56 : 48) : (isStory ? 38 : 32),
        });
      }
    } else if (preset === 1) {
      const startY = isStory ? 0.82 : 0.80;
      const spacing = isStory ? 0.07 : 0.06;
      for (let i = 0; i < numTexts; i++) {
        layout.texts.push({
          x: 0.5,
          y: startY + i * spacing,
          size: i === 0 ? (isStory ? 56 : 48) : (isStory ? 38 : 32),
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
    fgMinY = isStory ? 0.22 : 0.20;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  const fgCenterY = (fgMinY + fgMaxY) / 2;
  const fgHeightRange = fgMaxY - fgMinY;

  layout.foregrounds = getForegroundCoordinates(numForegrounds, presetIndex, fgMinY, fgMaxY);

  layout.foregrounds = layout.foregrounds.map((c) => ({
    x: Math.max(0.05, Math.min(0.95, c.x + (Math.random() - 0.5) * 0.015)),
    y: Math.max(0.05, Math.min(0.95, c.y + (Math.random() - 0.5) * 0.015)),
    size: Math.max(0.05, Math.min(0.9, c.size + (Math.random() - 0.5) * 0.01)),
  }));

  if (layout.logo) {
    layout.logo.x = Math.max(0.05, Math.min(0.95, layout.logo.x + (Math.random() - 0.5) * 0.015));
    layout.logo.y = Math.max(0.03, Math.min(0.97, layout.logo.y + (Math.random() - 0.5) * 0.015));
    layout.logo.size = Math.max(0.05, Math.min(0.9, layout.logo.size + (Math.random() - 0.5) * 0.01));
  }

  layout.texts = layout.texts.map((c) => ({
    x: Math.max(0.05, Math.min(0.95, c.x + (Math.random() - 0.5) * 0.015)),
    y: Math.max(0.05, Math.min(0.95, c.y + (Math.random() - 0.5) * 0.015)),
    size: Math.max(16, Math.min(200, c.size + Math.floor((Math.random() - 0.5) * 4))),
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
          `${t.id}:${t.text}:${t.color}:${t.size}:${t.x.toFixed(3)}:${t.y.toFixed(3)}:${t.font || "inter"}`,
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
        presetIndex
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
      const highlightColors = ["#ffffff", "#facc15", "#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fb923c"];
      const mainColor = highlightColors[Math.floor(Math.random() * highlightColors.length)];
      const subColor = mainColor === "#ffffff" ? highlightColors[Math.floor(1 + Math.random() * (highlightColors.length - 1))] : "#ffffff";

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
      { id: newId, text: "Novo texto", color: "#ffffff", size: 48, x: 0.5, y: 0.6, font: "inter" },
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
      ctx.font = `700 ${t.size * exportScale}px ${selectedFont.family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 8 * exportScale;

      const lines = t.text.split("\n");
      const lineH = t.size * exportScale * 1.15;
      const totalH = lineH * lines.length;
      lines.forEach((line, i) => {
        ctx.fillText(
          line,
          t.x * canvas.width,
          t.y * canvas.height - totalH / 2 + lineH / 2 + i * lineH,
        );
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

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 font-sans">
      <header className="border-b border-border/80 bg-card/75 backdrop-blur-md sticky top-0 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/95 to-primary bg-clip-text text-transparent">
                Nova Era
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">
                Gerador de Resultados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-muted/50 border border-border/40 rounded-full pl-2 pr-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hidden md:flex hover:text-foreground hover:bg-muted/80 transition-all cursor-default">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                {(user.email || "U").slice(0, 1)}
              </div>
              <span className="truncate max-w-[140px]">{user.email}</span>
            </div>
            <ThemeToggle />
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: "/admin" })}
                className="border-primary/20 hover:border-primary hover:bg-primary/10 text-primary font-semibold transition-all duration-200 cursor-pointer rounded-xl flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Painel Admin</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-border hover:bg-accent cursor-pointer rounded-xl flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Controls Panel */}
        <Card className="p-5 space-y-6 h-fit order-2 lg:order-1 bg-card border-border/90 shadow-lg transition-all duration-200 animate-slide-in-left rounded-2xl">
          {/* Active Layer Editor */}
          {selectedId && (
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="text-primary font-bold">
                  Elemento Selecionado:{" "}
                  {selectedId === "logo"
                    ? "Logomarca"
                    : foregrounds.some((f) => f.id === selectedId)
                      ? "Imagem Destaque"
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
                  className="text-destructive font-semibold hover:underline cursor-pointer"
                >
                  Excluir
                </button>
              </div>

              {selectedId === "logo" && logo && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-foreground">
                    <span>Tamanho da Logo</span>
                    <span>{Math.round(logo.size * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.01}
                    value={logo.size}
                    onPointerDown={() => saveToHistory()}
                    onChange={(e) => setLogo({ ...logo, size: +e.target.value })}
                    className="w-full accent-primary h-1.5 bg-background rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {foregrounds.find((f) => f.id === selectedId) && (
                <div className="space-y-2">
                  {(() => {
                    const fgItem = foregrounds.find((f) => f.id === selectedId)!;
                    return (
                      <>
                        <div className="flex justify-between text-xs font-medium text-foreground">
                          <span>Tamanho do Destaque</span>
                          <span>{Math.round(fgItem.size * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0.05}
                          max={0.9}
                          step={0.01}
                          value={fgItem.size}
                          onPointerDown={() => saveToHistory()}
                          onChange={(e) => updateForeground(selectedId, { size: +e.target.value })}
                          className="w-full accent-primary h-1.5 bg-background rounded-lg cursor-pointer"
                        />
                      </>
                    );
                  })()}
                </div>
              )}

              {texts.find((t) => t.id === selectedId) && (
                <div className="space-y-3">
                  {(() => {
                    const txtItem = texts.find((t) => t.id === selectedId)!;
                    return (
                      <>
                        <textarea
                          className="w-full text-xs font-medium border border-border/80 rounded-xl p-2.5 bg-background text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-transparent focus-visible:outline-none transition-all"
                          rows={2}
                          value={txtItem.text}
                          onFocus={() => saveToHistory()}
                          onChange={(e) => updateText(selectedId, { text: e.target.value })}
                        />
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            value={txtItem.color}
                            onPointerDown={() => saveToHistory()}
                            onChange={(e) => updateText(selectedId, { color: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-border/80 p-0.5 bg-background"
                          />
                          <div className="flex-1">
                            <Select
                              value={txtItem.font || "inter"}
                              onValueChange={(val) => {
                                saveToHistory();
                                updateText(selectedId, { font: val });
                              }}
                            >
                              <SelectTrigger className="bg-background border-border text-xs rounded-xl h-8">
                                <SelectValue placeholder="Fonte" />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border text-foreground">
                                {FONTS.map((f) => (
                                  <SelectItem
                                    key={f.id}
                                    value={f.id}
                                    style={{ fontFamily: f.family }}
                                  >
                                    {f.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <input
                            type="range"
                            min={16}
                            max={200}
                            value={txtItem.size}
                            onPointerDown={() => saveToHistory()}
                            onChange={(e) => updateText(selectedId, { size: +e.target.value })}
                            className="w-full accent-primary h-1.5 bg-background rounded-lg cursor-pointer"
                          />
                          <div className="text-[10px] text-muted-foreground font-bold">
                            Tamanho: {txtItem.size}px
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Formato */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Formato
              </Label>
            </div>
            <Select
              value={format}
              onValueChange={(v) => {
                saveToHistory();
                setFormat(v as Format);
              }}
            >
              <SelectTrigger className="bg-background border-border hover:border-primary/40 text-foreground rounded-xl transition-all duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground rounded-xl shadow-xl">
                <SelectItem value="feed" className="rounded-lg">
                  {FORMATS.feed.label}
                </SelectItem>
                <SelectItem value="story" className="rounded-lg">
                  {FORMATS.story.label}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <hr className="border-border/60" />

          {/* Background library */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Biblioteca de Fundos
                </Label>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1.5 border border-border rounded-xl bg-background hover:bg-accent text-foreground hover:border-primary/30 transition-all duration-200 font-semibold shadow-sm">
                {uploadingBg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span>Adicionar</span>
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
              <div className="border border-dashed border-border/80 rounded-2xl p-6 text-center space-y-2 bg-muted/10">
                <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Nenhum fundo salvo</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Faça upload de imagens de fundo para começar.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto p-0.5">
                {bgLib.map((b) => (
                  <div key={b.id} className="relative group">
                    <button
                      onClick={() => {
                        saveToHistory();
                        selectBackground(b);
                      }}
                      className={`block w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${bgUrl === b.image_url ? "border-primary scale-[0.98] shadow-md shadow-primary/20" : "border-transparent opacity-85 hover:opacity-100 hover:scale-[1.03] shadow-sm"}`}
                    >
                      <img
                        src={b.signed_url || b.image_url}
                        alt={b.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <button
                      onClick={() => promptDeleteBackground(b.id, b.name)}
                      className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-destructive cursor-pointer"
                      title="Excluir fundo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Logo library */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Biblioteca de Logos
                </Label>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1.5 border border-border rounded-xl bg-background hover:bg-accent text-foreground hover:border-primary/30 transition-all duration-200 font-semibold shadow-sm">
                {uploadingLogo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span>Adicionar</span>
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
              <div className="border border-dashed border-border/80 rounded-2xl p-6 text-center space-y-2 bg-muted/10">
                <Layers className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Nenhuma logo salva</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Faça upload de suas logos corporativas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto p-0.5">
                {logoLib.map((l) => (
                  <div key={l.id} className="relative group">
                    <button
                      onClick={() => {
                        saveToHistory();
                        selectLogo(l);
                      }}
                      className={`block w-full aspect-square rounded-xl overflow-hidden border-2 bg-muted/40 transition-all duration-300 ${logo?.url === l.image_url ? "border-primary scale-[0.98] shadow-md shadow-primary/20" : "border-transparent opacity-85 hover:opacity-100 hover:scale-[1.03] shadow-sm"}`}
                    >
                      <img
                        src={l.signed_url || l.image_url}
                        alt={l.name}
                        className="w-full h-full object-contain p-1.5"
                      />
                    </button>
                    <button
                      onClick={() => promptDeleteLogo(l.id, l.name)}
                      className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-destructive cursor-pointer"
                      title="Excluir logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Foreground images */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Imagens em Destaque
                </Label>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1.5 border border-border rounded-xl bg-background hover:bg-accent text-foreground hover:border-primary/30 transition-all duration-200 font-semibold shadow-sm">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
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
              <div className="border border-dashed border-border/80 rounded-2xl p-6 text-center space-y-2 bg-muted/10">
                <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Sem imagens em destaque</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Adicione imagens para arrastar e redimensionar livremente no canvas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto p-0.5">
                {foregrounds.map((f) => (
                  <div key={f.id} className="relative group">
                    <button
                      onClick={() => setSelectedId(f.id)}
                      className={`block w-full aspect-square rounded-xl overflow-hidden bg-muted/50 border transition-all ${selectedId === f.id ? "border-primary scale-[0.98]" : "border-border/80 hover:scale-[1.03]"}`}
                    >
                      <img src={f.url} alt="" className="w-full h-full object-contain p-1" />
                    </button>
                    <button
                      onClick={() => {
                        saveToHistory();
                        removeForeground(f.id);
                      }}
                      className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-lg p-1 opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-destructive cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Texts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Textos
                </Label>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  saveToHistory();
                  addText();
                }}
                className="border-border hover:border-primary/30 hover:bg-accent rounded-xl font-semibold shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            {texts.length === 0 ? (
              <div className="border border-dashed border-border/80 rounded-2xl p-4 text-center bg-muted/10">
                <p className="text-[11px] text-muted-foreground">
                  Nenhum texto no canvas. Adicione um acima.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {texts.map((t) => (
                  <div
                    key={t.id}
                    className={`border rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-all bg-background/40 hover:bg-background/60 shadow-sm cursor-pointer ${selectedId === t.id ? "ring-2 ring-primary border-transparent" : "border-border/85"}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <span className="text-xs font-semibold truncate flex-1 pr-2">
                      {t.text || "(Texto vazio)"}
                    </span>
                    <span
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: t.color }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Randomizers */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/50">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Randomização
              </Label>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={randomizeBackground}
                className="bg-background border border-border text-foreground hover:bg-accent rounded-xl cursor-pointer hover:border-primary/20 shadow-sm font-semibold transition-all text-xs"
              >
                <Shuffle className="w-3.5 h-3.5 mr-1" /> Fundo
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={randomizeForegrounds}
                className="bg-background border border-border text-foreground hover:bg-accent rounded-xl cursor-pointer hover:border-primary/20 shadow-sm font-semibold transition-all text-xs"
              >
                <Shuffle className="w-3.5 h-3.5 mr-1" /> Posição
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={randomizeAll}
                className="bg-background border border-border text-foreground hover:bg-accent rounded-xl cursor-pointer hover:border-primary/20 shadow-sm font-semibold transition-all text-xs"
              >
                <Shuffle className="w-3.5 h-3.5 mr-1" /> Tudo
              </Button>
            </div>
          </div>

          {/* Export upscale scale option */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Qualidade de Exportação
            </Label>
            <Select value={exportScale.toString()} onValueChange={(v) => setExportScale(Number(v))}>
              <SelectTrigger className="bg-background border border-border text-foreground rounded-xl transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border text-foreground rounded-xl shadow-lg">
                <SelectItem value="1" className="rounded-lg">
                  Padrão (1x - HD)
                </SelectItem>
                <SelectItem value="2" className="rounded-lg">
                  Alta Resolução (2x - 2K)
                </SelectItem>
                <SelectItem value="3" className="rounded-lg">
                  Ultra HD (3x - 4K)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={download}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary text-primary-foreground font-bold py-6 rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 cursor-pointer hover:scale-[1.01]"
            size="lg"
          >
            <Download className="w-4 h-4 mr-2" /> Baixar Imagem
          </Button>
        </Card>

        {/* Canvas Preview Area */}
        <div className="flex flex-col items-center gap-4 order-1 lg:order-2 w-full max-w-sm lg:max-w-md mx-auto">
          {/* Undo/Redo Floating Bar */}
          <div className="flex items-center gap-2.5 bg-card/90 border border-border/80 rounded-full px-4 py-2 shadow-lg backdrop-blur-md animate-fade-in-scale">
            <Button
              variant="ghost"
              size="icon"
              disabled={past.length === 0}
              onClick={undo}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40 rounded-full hover:bg-accent transition cursor-pointer"
              title="Desfazer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <div className="w-px h-4 bg-border/80" />
            <Button
              variant="ghost"
              size="icon"
              disabled={future.length === 0}
              onClick={redo}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40 rounded-full hover:bg-accent transition cursor-pointer"
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            {past.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-bold border-l border-border/80 pl-2.5 font-sans">
                {past.length} {past.length === 1 ? "alteração" : "alterações"}
              </span>
            )}
          </div>

          <div
            ref={previewRef}
            className={`relative ${aspectClass} w-full bg-muted/45 border border-border/90 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 select-none touch-none`}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-muted/30 border-2 border-dashed border-border/60 rounded-2xl m-3.5 animate-pulse">
                <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-foreground">Visualização do Canvas</p>
                <p className="text-xs text-muted-foreground max-w-[220px] mt-1.5 leading-relaxed">
                  Selecione um fundo na biblioteca ou faça upload para começar a sua arte.
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
                className={`animate-fade-in-scale select-none ${selectedId === fg.id ? "outline-2 outline-dashed outline-white ring-2 ring-primary/80" : ""}`}
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
                className={`animate-fade-in-scale select-none ${selectedId === "logo" ? "outline-2 outline-dashed outline-white ring-2 ring-primary/80" : ""}`}
              />
            )}

            {/* Draggable Texts with observer scaled font size */}
            {texts.map((t) => {
              const selectedFont = FONTS.find((f) => f.id === (t.font || "inter")) || FONTS[0];
              const scaledSize = (t.size * previewWidth) / 1080;
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
                    fontWeight: 700,
                    textAlign: "center",
                    whiteSpace: "pre-wrap",
                    textShadow: "0 2px 8px rgba(0,0,0,0.45)",
                    cursor: "grab",
                    lineHeight: 1.15,
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  className={
                    selectedId === t.id
                      ? "outline-2 outline-dashed outline-white ring-2 ring-primary/80 animate-pulse duration-[1500ms]"
                      : ""
                  }
                >
                  {t.text}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Tem certeza que deseja remover "{confirmDelete?.name}" da biblioteca? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel
              onClick={() => setConfirmDelete(null)}
              className="border-border hover:bg-accent rounded-xl text-foreground text-xs font-semibold py-2 px-4 cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold py-2 px-4 cursor-pointer"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
