import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Layers, Shuffle } from "lucide-react";

interface RandomizerPanelProps {
  onRandomizeBackground: () => void;
  onRandomizeForegrounds: () => void;
  onRandomizeAll: () => void;
}

export function RandomizerPanel({
  onRandomizeBackground,
  onRandomizeForegrounds,
  onRandomizeAll,
}: RandomizerPanelProps) {
  return (
    <div className="space-y-3 bg-muted/30 p-4 rounded-sm border border-border/50 relative overflow-hidden">
      {/* Accent line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/60 to-accent/40" />

      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Composição Rápida
        </Label>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={onRandomizeBackground}
          className="bg-background border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary rounded-sm cursor-pointer font-bold transition-all text-xs group"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1 group-hover:rotate-180 transition-transform duration-300" /> Fundo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRandomizeForegrounds}
          className="bg-background border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary rounded-sm cursor-pointer font-bold transition-all text-xs group"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1 group-hover:rotate-180 transition-transform duration-300" /> Posição
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRandomizeAll}
          className="bg-background border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary rounded-sm cursor-pointer font-bold transition-all text-xs group"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1 group-hover:rotate-180 transition-transform duration-300" /> Tudo
        </Button>
      </div>
    </div>
  );
}
