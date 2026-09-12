/**
 * Formatação de tempo dos sinais. Existia duplicada em LatestSignals.tsx e
 * sinais.tsx com textos que divergiam ("5min" vs "há 5min", "Exp." vs "Expirado"),
 * então a mesma imagem aparecia rotulada de dois jeitos na mesma tela.
 *
 * `compact` serve o carrossel estreito do editor; o padrão serve a galeria.
 */

export function formatTimeAgo(dateStr: string, compact = false): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 1) return "agora";

  const prefix = compact ? "" : "há ";
  if (mins < 60) return `${prefix}${mins}min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${prefix}${hours}h`;

  return `${prefix}${Math.floor(hours / 24)}d`;
}

export function formatCountdown(expiresAt: string, compact = false): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return compact ? "Exp." : "Expirado";

  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;

  // Abaixo de uma hora os segundos passam a importar para quem está decidindo
  // se ainda dá tempo de usar o sinal.
  const s = Math.floor((diff % 60_000) / 1_000);
  return compact ? `${m}m` : `${m}m ${s}s`;
}

/** true quando o sinal ainda está dentro da validade. */
export function isLive(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() > Date.now();
}
