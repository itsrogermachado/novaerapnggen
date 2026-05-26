import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Key, Mail, Lock, Loader2, Layers } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Sua conta foi criada! Acesse e aguarde a aprovação do administrador.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/app" });
    } catch (err) {
      toast.error((err as Error).message ?? "Erro de autenticação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden transition-colors duration-200 selection:bg-primary/20 selection:text-foreground">
      {/* Grain Texture */}
      <div className="grain-texture fixed inset-0 pointer-events-none z-[1]" />

      {/* Geometric accent */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-accent to-primary z-50" />

      {/* Decorative geometry */}
      <div className="absolute top-1/4 right-[10%] w-64 h-64 border border-border/15 rounded-sm rotate-12 pointer-events-none" />
      <div className="absolute bottom-1/4 left-[10%] w-40 h-40 border border-primary/10 rounded-sm -rotate-6 pointer-events-none" />

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md p-8 bg-card border-border/80 shadow-2xl relative z-10 transition-colors duration-200 rounded-sm animate-fade-in">
        {/* Accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-accent" />

        {/* Logo */}
        <div className="animate-slide-up flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-black tracking-tight text-lg">
            Nova Era
          </span>
        </div>

        <h1 className="animate-slide-up stagger-2 text-2xl font-black tracking-tight mb-1 text-foreground">
          Estúdio de Resultados
        </h1>
        <p className="animate-slide-up stagger-3 text-sm text-muted-foreground mb-6">
          {mode === "login" ? "Entre para acessar a ferramenta" : "Crie sua conta de membro"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="animate-slide-up stagger-3 space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border text-foreground pl-10 py-5 rounded-sm focus-visible:ring-primary/50 focus-visible:border-primary"
                placeholder="nome@exemplo.com"
              />
            </div>
          </div>

          <div className="animate-slide-up stagger-4 space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-border text-foreground pl-10 py-5 rounded-sm focus-visible:ring-primary/50 focus-visible:border-primary"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="animate-slide-up stagger-5 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-sm shadow-lg shadow-primary/20 transition-all duration-200 cursor-pointer hover:translate-y-[-1px] hover:shadow-xl"
            disabled={busy}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </span>
            ) : mode === "login" ? (
              "Entrar"
            ) : (
              "Cadastrar"
            )}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="animate-slide-up stagger-6 mt-5 text-sm text-primary hover:text-primary/80 transition-colors hover:underline w-full text-center cursor-pointer font-semibold"
        >
          {mode === "login"
            ? "Não tem conta? Cadastre-se"
            : "Já tem uma conta? Entrar"}
        </button>
      </Card>
    </div>
  );
}
