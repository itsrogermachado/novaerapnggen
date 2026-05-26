import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Shuffle } from "lucide-react";

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
          onClick={onRandomizeBackground}
          className="bg-background border border-border text-foreground hover:bg-accent rounded-xl cursor-pointer hover:border-primary/20 shadow-sm font-semibold transition-all text-xs"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1" /> Fundo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRandomizeForegrounds}
          className="bg-background border border-border text-foreground hover:bg-accent rounded-xl cursor-pointer hover:border-primary/20 shadow-sm font-semibold transition-all text-xs"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1" /> Posição
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRandomizeAll}
          className="bg-background border border-border text-foreground hover:bg-accent rounded-xl cursor-pointer hover:border-primary/20 shadow-sm font-semibold transition-all text-xs"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1" /> Tudo
        </Button>
      </div>
    </div>
  );
}
