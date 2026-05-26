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
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/app")({
  component: Index,
});

import { Format, LibraryItem, Foreground, LogoState, CanvasState, ElementLayouts } from "@/types/canvas";
import { FORMATS, FONTS, getForegroundSpace, getForegroundCoordinates, generateForegroundLayouts, generateCohesiveLayout, getStateSignature } from "@/lib/layout-utils";
import { MiniCanvas } from "@/components/canvas/MiniCanvas";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import type { Database } from "@/integrations/supabase/types";
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function Index() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!user) return;
    try {
      setCheckingAccess(true);

      const { data: active, error: activeErr } = await supabase.rpc("is_user_active", {
        user_uuid: user.id,
      });

      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("is_admin, expires_at")
        .eq("id", user.id)
        .single();

      if (activeErr) throw activeErr;
      if (profileErr) throw profileErr;
      
      const profile = profileData as any;
      setIsActive(!!active);
      setIsAdmin(!!profile?.is_admin);
      if (profile?.expires_at) {
        setExpiresAt(new Date(profile.expires_at));
      }
    } catch (err) {
      console.error("Erro ao verificar acesso:", err);
      setIsActive(false);
      setIsAdmin(false);
    } finally {
      setCheckingAccess(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin || !expiresAt) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft("Expirado");
        setIsActive(false);
        return;
      }
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      if (d > 0) setTimeLeft(`${d}d ${h}h`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else if (m > 0) setTimeLeft(`${m}m ${s}s`);
      else setTimeLeft(`${s}s`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isAdmin]);

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
  const [highlightLibrary, setHighlightLibrary] = useState<{ id: string; url: string; img: HTMLImageElement }[]>([]);


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
  const { past, future, setPast, setFuture, saveToHistory, undo, redo, goToHistoryState } = useCanvasHistory({
    currentState: { bgUrl, bgUrlSigned, bgImg, foregrounds, logo, format },
    setters: { setBgUrl, setBgUrlSigned, setBgImg, setForegrounds, setLogo, setFormat, setSelectedId }
  });

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

  // Auto-arrange foregrounds when their count or format changes
  useEffect(() => {
    if (foregrounds.length === 0) return;

    const isStory = format === "story";
    const { fgMinY, fgMaxY } = getForegroundSpace(logo, isStory);
    const coords = getForegroundCoordinates(foregrounds.length, 0, fgMinY, fgMaxY);

    setForegrounds((p) => {
      const hasChanged = p.some((fg, idx) => {
        const c = coords[idx];
        if (!c) return false;
        return (
          Math.abs(fg.x - c.x) > 0.001 ||
          Math.abs(fg.y - c.y) > 0.001 ||
          Math.abs(fg.size - c.size) > 0.001
        );
      });

      if (!hasChanged) return p;

      return p.map((fg, idx) => {
        const c = coords[idx];
        if (!c) return fg;
        return {
          ...fg,
          x: c.x,
          y: c.y,
          size: c.size,
        };
      });
    });
  }, [foregrounds.length, format, !!logo]);

  // Helper for generating state signature

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
      
      if (bgUrl === url) {
        setBgUrl(null);
        setBgUrlSigned(null);
        setBgImg(null);
        return;
      }

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

      if (logo?.url === url) {
        setLogo(null);
        if (selectedId === "logo") setSelectedId(null);
        return;
      }

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
    const items: { id: string; url: string; img: HTMLImageElement }[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        const newId = crypto.randomUUID();
        items.push({ id: newId, url, img });
      } catch {
        console.warn("Falha ao carregar imagem de destaque:", url);
      }
    }
    setHighlightLibrary((p) => [...p, ...items]);
  };

  const toggleForeground = (item: { id: string; url: string; img: HTMLImageElement }) => {
    saveToHistory();
    const exists = foregrounds.find(f => f.id === item.id);
    if (exists) {
      removeForeground(item.id);
    } else {
      setForegrounds(p => [...p, {
        id: item.id,
        url: item.url,
        img: item.img,
        x: 0.5,
        y: 0.5,
        size: 0.3
      }]);
      setSelectedId(item.id);
    }
  };

  const deleteFromHighlightLibrary = (id: string) => {
    const isActive = foregrounds.some(f => f.id === id);
    if (isActive) saveToHistory();
    setHighlightLibrary(p => p.filter(i => i.id !== id));
    removeForeground(id);
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
      logo, format,
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
        logo, format,
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
      logo, format,
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
      const { fgMinY, fgMaxY } = getForegroundSpace(logo, isStory);
      
      // Shuffle copies of the foregrounds to randomize positions
      const tempFgs = [...foregrounds];
      for (let i = tempFgs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tempFgs[i], tempFgs[j]] = [tempFgs[j], tempFgs[i]];
      }

      // Generate the clean layout coordinates (always style 0)
      const layouts = generateForegroundLayouts(foregrounds.length, 0, fgMinY, fgMaxY);

      const candidateFgs = tempFgs.map((fg, idx) => ({
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
        logo, format,
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
      logo, format,
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
        !!logo,
        presetIndex
      );

      // Shuffle copies of the foregrounds to randomize positions
      const tempFgs = [...foregrounds];
      for (let i = tempFgs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tempFgs[i], tempFgs[j]] = [tempFgs[j], tempFgs[i]];
      }

      const nextFgs = tempFgs.map((fg, idx) => ({
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



      const candidate: CanvasState = {
        bgUrl: nextBg,
        bgUrlSigned: nextBgSigned,
        bgImg: null,
        foregrounds: nextFgs,
        logo: nextLogo,
        format,
      };

      if (!existingSigs.has(getStateSignature(candidate))) {
        candidateBg = nextBg;
        candidateBgSigned = nextBgSigned;
        candidateFgs = nextFgs;
        candidateLogo = nextLogo;

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

    toast.success("Tudo randomizado");
  };



  // Drag Pointer Gestures
  const onPointerDown = (
    e: React.PointerEvent,
    kind: "logo" | "foreground",
    id?: string,
  ) => {
    saveToHistory();
    e.stopPropagation();
    const preview = previewRef.current!;
    const rect = preview.getBoundingClientRect();
    let cx = 0,
      cy = 0;

    if (kind === "logo" && logo) {
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
            Acesso Pendente, Expirado ou Bloqueado
          </h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Sua conta está aguardando aprovação de um administrador, ou seu tempo de acesso expirou.
            Por favor, aguarde ou entre em contato com nossos administradores:
          </p>

          <div className="space-y-3 mb-8">
            {[
              { name: "Suporte 1", number: "5521964488285", display: "(21) 96448-8285" },
              { name: "Suporte 2", number: "5521994794590", display: "(21) 99479-4590" }
            ].map((wa) => (
              <a
                key={wa.number}
                href={`https://wa.me/${wa.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 bg-background border border-border rounded-xl hover:border-green-500/40 hover:bg-green-500/5 transition-all duration-300 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-500" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold text-foreground group-hover:text-green-500 transition-colors">
                      {wa.display}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {wa.name}
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-bold group-hover:bg-green-500 group-hover:text-white transition-colors">
                  Conversar
                </div>
              </a>
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
            {!isAdmin && timeLeft && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-primary/10 text-primary border-primary/20 text-xs font-bold shadow-sm transition-colors cursor-default">
                <Clock className="w-3.5 h-3.5" />
                {timeLeft}
              </div>
            )}
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
                      className={`block w-full aspect-square rounded-xl overflow-hidden border transition-all duration-300 relative ${bgUrl === b.image_url ? "border-primary scale-[0.98] ring-2 ring-primary/20" : "border-border/80 hover:scale-[1.03]"}`}
                    >
                      <img
                        src={b.signed_url || b.image_url}
                        alt={b.name}
                        className={`w-full h-full object-cover ${bgUrl === b.image_url ? "opacity-100" : "opacity-85"}`}
                      />
                      {bgUrl === b.image_url && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
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
                      className={`block w-full aspect-square rounded-xl overflow-hidden border transition-all duration-300 bg-muted/40 relative ${logo?.url === l.image_url ? "border-primary scale-[0.98] ring-2 ring-primary/20" : "border-border/80 hover:scale-[1.03]"}`}
                    >
                      <img
                        src={l.signed_url || l.image_url}
                        alt={l.name}
                        className={`w-full h-full object-contain p-1.5 ${logo?.url === l.image_url ? "opacity-100" : "opacity-85"}`}
                      />
                      {logo?.url === l.image_url && (
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
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
                      handleForegroundsUpload(e.target.files);
                      e.target.value = ''; // Reset input to allow re-uploading same file
                    }
                  }}
                />
              </label>
            </div>
            {highlightLibrary.length === 0 ? (
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
                {highlightLibrary.map((f) => {
                  const isActive = foregrounds.some((active) => active.id === f.id);
                  return (
                    <div key={f.id} className="relative group">
                      <button
                        onClick={() => toggleForeground(f)}
                        className={`block w-full aspect-square rounded-xl overflow-hidden bg-muted/50 border transition-all relative ${isActive ? "border-primary scale-[0.98] ring-2 ring-primary/20" : "border-border/80 hover:scale-[1.03]"}`}
                      >
                        <img src={f.url} alt="" className={`w-full h-full object-contain p-1 ${isActive ? "opacity-100" : "opacity-85"}`} />
                        {isActive && (
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => deleteFromHighlightLibrary(f.id)}
                        className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-lg p-1 opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-destructive cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-border/60" />

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

        {/* Canvas & Visual History Wrapper */}
        <div className="grid lg:grid-cols-[1fr_200px] xl:grid-cols-[1fr_240px] gap-6 order-1 lg:order-2 w-full h-full">
          {/* Canvas Preview Area */}
          <div className="flex flex-col items-center gap-4 w-full max-w-sm lg:max-w-md mx-auto relative">
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
              <div
                key={fg.id}
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
                className="select-none"
              >
                <img
                  src={fg.url}
                  alt=""
                  className={`w-full h-auto animate-fade-in-scale select-none pointer-events-none ${selectedId === fg.id ? "outline-2 outline-dashed outline-white ring-2 ring-primary/80" : ""}`}
                />
              </div>
            ))}

            {/* Draggable Logo */}
            {logo && (
              <div
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
                className="select-none"
              >
                <img
                  src={logo.signedUrl}
                  alt=""
                  className={`w-full h-auto animate-fade-in-scale select-none pointer-events-none ${selectedId === "logo" ? "outline-2 outline-dashed outline-white ring-2 ring-primary/80" : ""}`}
                />
              </div>
            )}


          </div>
        </div>

        {/* Visual History Panel */}
        <Card className="p-4 flex flex-col h-[500px] lg:h-full lg:max-h-[85vh] bg-card/60 backdrop-blur-xl border-border/60 shadow-2xl overflow-hidden order-3 lg:order-none relative">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Undo2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-wide">Linha do Tempo</h3>
            </div>
            {(past.length > 0 || future.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPast([]);
                  setFuture([]);
                  toast.success("Histórico limpo!");
                }}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Limpar histórico"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 gap-3 custom-scrollbar content-start">
            {past.length === 0 && future.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6 col-span-2">
                Faça alterações no canvas para vê-las aqui.
              </div>
            )}
            
            {past.map((state, idx) => (
              <MiniCanvas 
                key={`past-${idx}`} 
                state={state} 
                aspectClass={aspectClass} 
                onClick={() => goToHistoryState(state, idx, "past")}
              />
            ))}
            
            {/* Current State Indicator */}
            {(past.length > 0 || future.length > 0) && (
              <div className="relative">
                 <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                 <MiniCanvas 
                   state={{ bgUrl, bgUrlSigned, bgImg, foregrounds, logo, format }} 
                   aspectClass={aspectClass} 
                   isActive={true} 
                   onClick={() => {}}
                 />
              </div>
            )}

            {future.map((state, idx) => (
              <MiniCanvas 
                key={`future-${idx}`} 
                state={state} 
                aspectClass={aspectClass} 
                onClick={() => goToHistoryState(state, idx, "future")}
              />
            ))}
          </div>
        </Card>
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
