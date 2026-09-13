import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Loader2, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { safeLogError } from "@/lib/log";
import { comprimirImagem, TIPOS_ACEITOS } from "@/lib/image";

/** Mesmo teto que o endpoint do bot aplica, para os dois caminhos combinarem. */
const MAX_ARQUIVOS = 20;

/**
 * Envio manual de resultados pelo painel admin.
 *
 * Existe por dois motivos: enquanto o bot do Discord não existe, é o que
 * alimenta a aba de Resultados com dados reais; e depois que ele existir, continua
 * sendo o plano B para quando cair.
 *
 * Grava direto no bucket e na tabela — o RLS só libera para admin — sem passar
 * pelo endpoint, que é território do bot.
 */
export function EnviarResultado() {
  const [enviando, setEnviando] = useState(false);
  const [legenda, setLegenda] = useState("");
  const [horas, setHoras] = useState(24);
  const [selecionados, setSelecionados] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const escolher = (files: FileList | null) => {
    if (!files) return;
    const validos: File[] = [];
    for (const f of Array.from(files).slice(0, MAX_ARQUIVOS)) {
      if (!TIPOS_ACEITOS.has(f.type)) {
        toast.error(`${f.name}: formato não aceito (use png, jpeg ou webp)`);
        continue;
      }
      validos.push(f);
    }
    setSelecionados(validos);
  };

  const enviar = async () => {
    if (selecionados.length === 0) return;

    setEnviando(true);
    let enviados = 0;
    const falhas: string[] = [];

    for (const file of selecionados) {
      try {
        // Print de celular chega com 3-5MB; subir isso inteiro é desperdício
        // para uma imagem que será vista num cartão.
        const comprimido = await comprimirImagem(file, { maxLado: 1600, qualidade: 0.85 });
        const path = `manual/${Date.now()}-${crypto.randomUUID()}.webp`;

        const { error: upErr } = await supabase.storage
          .from("discord-images")
          .upload(path, comprimido, { contentType: "image/webp", upsert: false });
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from("discord-images").getPublicUrl(path);

        const { error: insErr } = await supabase.from("discord_images").insert({
          image_url: urlData.publicUrl,
          storage_path: path,
          source: "manual",
          caption: legenda.trim() || null,
          expires_at: new Date(Date.now() + horas * 3600_000).toISOString(),
        });

        if (insErr) {
          // Não deixa o arquivo órfão no bucket se a linha não entrou.
          await supabase.storage.from("discord-images").remove([path]);
          throw insErr;
        }

        enviados++;
      } catch (err) {
        safeLogError("Falha ao enviar resultado:", err);
        falhas.push(file.name);
      }
    }

    setEnviando(false);
    setSelecionados([]);
    setLegenda("");
    if (inputRef.current) inputRef.current.value = "";

    if (enviados > 0) {
      toast.success(`${enviados} ${enviados === 1 ? "resultado enviado" : "resultados enviados"}`);
      queryClient.invalidateQueries({ queryKey: ["resultados"] });
    }
    if (falhas.length > 0) {
      toast.error(`Não foi possível enviar: ${falhas.join(", ")}`);
    }
  };

  return (
    <Card className="bg-card border-border shadow-xl relative z-10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="w-4 h-4 text-primary" />
          Enviar resultado manualmente
        </CardTitle>
        <CardDescription>
          Publica direto na aba Resultados, sem passar pelo bot. Some sozinho quando o prazo vence.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label
              htmlFor="resultado-legenda"
              className="text-xs font-bold uppercase tracking-wider"
            >
              Legenda{" "}
              <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="resultado-legenda"
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="Ex.: Green na Bet365"
              maxLength={120}
              className="bg-background border-border rounded-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resultado-horas" className="text-xs font-bold uppercase tracking-wider">
              Validade
            </Label>
            <select
              id="resultado-horas"
              value={horas}
              onChange={(e) => setHoras(Number(e.target.value))}
              className="h-9 w-full sm:w-36 rounded-sm border border-border bg-background px-3 text-sm"
            >
              <option value={1}>1 hora</option>
              <option value={6}>6 horas</option>
              <option value={12}>12 horas</option>
              <option value={24}>24 horas</option>
              <option value={48}>48 horas</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="resultado-arquivos"
            className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {selecionados.length > 0
                ? `${selecionados.length} ${selecionados.length === 1 ? "imagem selecionada" : "imagens selecionadas"}`
                : "Escolher imagens"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              png, jpeg ou webp · até {MAX_ARQUIVOS} por vez
            </span>
            <input
              id="resultado-arquivos"
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              disabled={enviando}
              onChange={(e) => escolher(e.target.files)}
            />
          </label>

          {selecionados.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {selecionados.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1.5 rounded-sm border border-border bg-muted/40 py-1 pl-2 pr-1 text-[11px]"
                >
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${f.name}`}
                    onClick={() => setSelecionados((p) => p.filter((_, j) => j !== i))}
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button
          onClick={enviar}
          disabled={enviando || selecionados.length === 0}
          className="w-full rounded-sm bg-primary font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          {enviando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Publicar na aba Resultados"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
