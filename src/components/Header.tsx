import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles, Clock, ShieldAlert, LogOut } from "lucide-react";

interface HeaderProps {
  isAdmin: boolean;
  timeLeft: string | null;
  userEmail: string | null;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
}

export function Header({
  isAdmin,
  timeLeft,
  userEmail,
  onNavigateToAdmin,
  onLogout,
}: HeaderProps) {
  return (
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
              {(userEmail || "U").slice(0, 1)}
            </div>
            <span className="truncate max-w-[140px]">{userEmail}</span>
          </div>
          <ThemeToggle />
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToAdmin}
              className="border-primary/20 hover:border-primary hover:bg-primary/10 text-primary font-semibold transition-all duration-200 cursor-pointer rounded-xl flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Painel Admin</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="border-border hover:bg-accent cursor-pointer rounded-xl flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
