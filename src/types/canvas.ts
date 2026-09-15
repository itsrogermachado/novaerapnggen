import type { Lugar } from "@/lib/composicao";

export type Format = "feed" | "story";

export type LibraryItem = {
  id: string;
  name: string;
  image_url: string;
  signed_url?: string;
  signed_at?: number;
};

export type Foreground = {
  id: string;
  url: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  size: number;
};

export type LogoState = {
  url: string;
  signedUrl: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  size: number;
} | null;

export type CanvasState = {
  bgUrl: string | null;
  bgUrlSigned: string | null;
  bgImg: HTMLImageElement | null;
  foregrounds: Foreground[];
  logo: LogoState;

  format: Format;
  // Modelo aberto: lugares reservados para os destaques e o nome do modelo.
  // Entram no histórico para o Ctrl+Z desfazer também a abertura de um modelo.
  lugares?: Lugar[] | null;
  modeloNome?: string | null;
};

export interface ElementLayouts {
  foregrounds: { x: number; y: number; size: number }[];
  logo: { x: number; y: number; size: number } | null;
}
