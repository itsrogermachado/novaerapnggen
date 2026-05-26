import { Format, LogoState, ElementLayouts, CanvasState } from "@/types/canvas";

export const FORMATS: Record<Format, { w: number; h: number; label: string }> = {
  feed: { w: 1080, h: 1350, label: "Feed (4:5)" },
  story: { w: 1080, h: 1920, label: "Stories (9:16)" },
};

export const FONTS = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
  { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif" },
  { id: "poppins", name: "Poppins", family: "'Poppins', sans-serif" },
  { id: "playfair", name: "Playfair Display", family: "'Playfair Display', serif" },
  { id: "bebas", name: "Bebas Neue", family: "'Bebas Neue', sans-serif" },
  { id: "lora", name: "Lora", family: "'Lora', serif" },
  { id: "cinzel", name: "Cinzel", family: "'Cinzel', serif" },
];

export function getForegroundSpace(
  currentLogo: LogoState,
  isStory: boolean
) {
  let fgMinY = isStory ? 0.18 : 0.16;
  let fgMaxY = isStory ? 0.88 : 0.85;

  const hasLogo = !!currentLogo;

  if (hasLogo) {
    fgMinY = currentLogo.y + 0.12;
  }

  if (fgMinY > fgMaxY - 0.15) {
    fgMinY = isStory ? 0.22 : 0.20;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  return { fgMinY, fgMaxY };
}

export function getForegroundCoordinates(
  num: number,
  styleType: number,
  fgMinY: number,
  fgMaxY: number,
): { x: number; y: number; size: number }[] {
  const coords: { x: number; y: number; size: number }[] = [];
  const fgCenterY = (fgMinY + fgMaxY) / 2;
  const fgHeightRange = fgMaxY - fgMinY;

  const aspectRatio = 1.4;
  const layoutAspectRatio = 1.05;

  if (num === 1) {
    coords.push({
      x: 0.5,
      y: fgCenterY,
      size: Math.min(0.48, fgHeightRange / layoutAspectRatio),
    });
  } else if (num === 2) {
    const style = styleType % 3;
    if (style === 0) {
      const size = Math.min(0.42, fgHeightRange / layoutAspectRatio);
      coords.push({ x: 0.28, y: fgCenterY, size });
      coords.push({ x: 0.72, y: fgCenterY, size });
    } else if (style === 1) {
      const size = Math.min(0.38, (fgHeightRange * 0.85) / layoutAspectRatio);
      const dy = fgHeightRange * 0.16;
      coords.push({ x: 0.28, y: fgCenterY - dy, size });
      coords.push({ x: 0.72, y: fgCenterY + dy, size });
    } else {
      const size = Math.min(0.42, (fgHeightRange * 0.5) / layoutAspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else if (num === 3) {
    const style = styleType % 4;
    if (style === 0) {
      const size = Math.min(0.28, fgHeightRange / layoutAspectRatio);
      coords.push({ x: 0.2, y: fgCenterY, size });
      coords.push({ x: 0.5, y: fgCenterY, size });
      coords.push({ x: 0.8, y: fgCenterY, size });
    } else if (style === 1) {
      const size = Math.min(0.32, (fgHeightRange * 0.75) / layoutAspectRatio);
      const dy = fgHeightRange * 0.2;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.28, y: fgCenterY + dy, size });
      coords.push({ x: 0.72, y: fgCenterY + dy, size });
    } else if (style === 2) {
      const size = Math.min(0.28, (fgHeightRange * 0.65) / layoutAspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.22, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY, size });
      coords.push({ x: 0.78, y: fgCenterY + dy, size });
    } else {
      const size = Math.min(0.32, (fgHeightRange * 0.75) / layoutAspectRatio);
      const dy = fgHeightRange * 0.2;
      coords.push({ x: 0.28, y: fgCenterY - dy, size });
      coords.push({ x: 0.72, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else if (num === 4) {
    const style = styleType % 4;
    if (style === 0) {
      const size = Math.min(0.34, (fgHeightRange * 0.7) / layoutAspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.28, y: fgCenterY - dy, size });
      coords.push({ x: 0.72, y: fgCenterY - dy, size });
      coords.push({ x: 0.28, y: fgCenterY + dy, size });
      coords.push({ x: 0.72, y: fgCenterY + dy, size });
    } else if (style === 1) {
      const size = Math.min(0.30, (fgHeightRange * 0.7) / layoutAspectRatio);
      const dy = fgHeightRange * 0.24;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.26, y: fgCenterY, size });
      coords.push({ x: 0.74, y: fgCenterY, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    } else if (style === 2) {
      const size = Math.min(0.26, (fgHeightRange * 0.65) / layoutAspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.2, y: fgCenterY + dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
      coords.push({ x: 0.8, y: fgCenterY + dy, size });
    } else {
      const size = Math.min(0.26, (fgHeightRange * 0.65) / layoutAspectRatio);
      const dy = fgHeightRange * 0.22;
      coords.push({ x: 0.2, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY - dy, size });
      coords.push({ x: 0.8, y: fgCenterY - dy, size });
      coords.push({ x: 0.5, y: fgCenterY + dy, size });
    }
  } else {
    const cols = Math.ceil(Math.sqrt(num));
    const rows = Math.ceil(num / cols);

    const layoutGridWidth = 0.88;

    const sizeX = layoutGridWidth / cols;
    const sizeY = fgHeightRange / (rows * layoutAspectRatio);
    const size = Math.max(0.12, Math.min(sizeX, sizeY, 0.28));

    const spacingX = cols > 1 ? (layoutGridWidth - size) / (cols - 1) : 0;
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

export function generateForegroundLayouts(num: number, styleType: number, fgMinY: number, fgMaxY: number) {
  const coords = getForegroundCoordinates(num, styleType, fgMinY, fgMaxY);
  return coords.map((c) => ({
    x: Math.max(0.05, Math.min(0.95, c.x)),
    y: Math.max(0.05, Math.min(0.95, c.y)),
    size: Math.max(0.05, Math.min(0.9, c.size)),
  }));
}

export function generateCohesiveLayout(
  format: Format,
  numForegrounds: number,
  logoExists: boolean,
  presetIndex: number,
): ElementLayouts {
  const isStory = format === "story";
  const layout: ElementLayouts = {
    foregrounds: [],
    logo: null,
  };

  const preset = presetIndex % 3;

  if (logoExists) {
    if (preset === 0) {
      layout.logo = { x: 0.5, y: isStory ? 0.08 : 0.07, size: 0.22 };
    } else if (preset === 1) {
      layout.logo = { x: 0.5, y: isStory ? 0.1 : 0.09, size: 0.25 };
    } else {
      layout.logo = { x: 0.5, y: isStory ? 0.08 : 0.07, size: 0.22 };
    }
  }

  let fgMinY = isStory ? 0.18 : 0.16;
  let fgMaxY = isStory ? 0.88 : 0.85;

  if (layout.logo) {
    fgMinY = Math.max(fgMinY, layout.logo.y + 0.12);
  }

  if (fgMinY > fgMaxY - 0.15) {
    fgMinY = isStory ? 0.22 : 0.2;
    fgMaxY = isStory ? 0.82 : 0.78;
  }

  layout.foregrounds = getForegroundCoordinates(numForegrounds, 0, fgMinY, fgMaxY);

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

  return layout;
}

export function getStateSignature(state: Omit<CanvasState, "bgImg">) {
  const bg = state.bgUrl || "";
  const fgs = state.foregrounds
    .map((f) => `${f.url}:${f.x.toFixed(3)}:${f.y.toFixed(3)}:${f.size.toFixed(3)}`)
    .join(",");
  const logoPart = state.logo
    ? `${state.logo.url}:${state.logo.x.toFixed(3)}:${state.logo.y.toFixed(3)}:${state.logo.size.toFixed(3)}`
    : "";
  const fmt = state.format;
  return `${bg}#${fgs}#${logoPart}#${fmt}`;
}
