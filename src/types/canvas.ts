export type Format = "feed" | "story";



export type LibraryItem = {
  id: string;
  name: string;
  image_url: string;
  signed_url?: string;
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
};

export interface ElementLayouts {
  foregrounds: { x: number; y: number; size: number }[];
  logo: { x: number; y: number; size: number } | null;

}
