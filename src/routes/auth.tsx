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
import { Key, Mail, Lock, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{
    checked: boolean;
    valid: boolean;
    expiresAt?: string;
    description?: string;
    error?: string;
  }>({ checked: false, valid: false });

  const HARDCODED_ADMINS = ["rogermachado019@gmail.com", "casadosvloogs@gmail.com"];

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get("token");
      if (tokenParam) {
        setInviteToken(tokenParam);
        setMode("signup");
        checkToken(tokenParam);
      }
    }
  }, []);

  const checkToken = async (val: string) => {
    if (!val) {
      setTokenStatus({ checked: false, valid: false });
      return;
    }
    try {
      const { data, error } = await supabase.rpc("check_invite_token", { token_val: val.trim() });
      if (error) throw error;

      const res = data?.[0];
      if (res && res.is_valid) {
        setTokenStatus({
          checked: true,
          valid: true,
          expiresAt: res.expires_at,
          description: res.description ?? undefined,
        });
      } else {
        setTokenStatus({
          checked: true,
          valid: false,
          error: "Token inválido, expirado ou já utilizado.",
        });
      }
    } catch {
      setTokenStatus({
        checked: true,
        valid: false,
        error: "Erro ao validar o token.",
      });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (mode === "signup") {
        const isAdminEmail = HARDCODED_ADMINS.includes(trimmedEmail);

        if (!isAdminEmail && !inviteToken) {
          toast.error("O token de convite é obrigatório.");
          setBusy(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              invite_token: isAdminEmail ? undefined : inviteToken.trim(),
            },
          },
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso! Verifique seu acesso.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message ?? "Erro de autenticação");
    } finally {
      setBusy(false);
    }
  };

  const isCurrentEmailAdmin = HARDCODED_ADMINS.includes(email.trim().toLowerCase());

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden transition-colors duration-200 selection:bg-primary/20 selection:text-foreground font-sans">
      {/* Dynamic Glows */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse duration-[10000ms]" />

      {/* Floating Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md p-8 bg-card border-border/80 shadow-2xl relative z-10 transition-colors duration-200 rounded-2xl animate-fade-in">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-sm shadow-primary/20">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            Nova Era
          </span>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight mb-1 text-foreground">
          Gerador de Resultados
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login" ? "Entre para acessar a ferramenta" : "Crie sua conta de membro"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                className="bg-background border-border text-foreground pl-10 py-5 rounded-xl focus-visible:ring-primary/50"
                placeholder="nome@exemplo.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
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
                className="bg-background border-border text-foreground pl-10 py-5 rounded-xl focus-visible:ring-primary/50"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          {mode === "signup" && (
            <div className="space-y-1 animate-fade-in">
              <div className="flex justify-between items-center mb-1">
                <Label
                  htmlFor="token"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Token de Convite
                </Label>
                {isCurrentEmailAdmin && (
                  <span className="text-[10px] text-primary font-medium animate-pulse">
                    Opcional para Admin
                  </span>
                )}
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="token"
                  type="text"
                  placeholder="NE-XXXXXXXXXXXX"
                  required={!isCurrentEmailAdmin}
                  value={inviteToken}
                  onChange={(e) => {
                    setInviteToken(e.target.value);
                    checkToken(e.target.value);
                  }}
                  onBlur={() => checkToken(inviteToken)}
                  className="bg-background border-border text-foreground pl-10 py-5 rounded-xl focus-visible:ring-primary/50 font-mono"
                />
              </div>
              {inviteToken && tokenStatus.checked && (
                <div className="mt-1 text-xs">
                  {tokenStatus.valid ? (
                    <span className="text-primary font-medium">
                      ✓ Convite válido{" "}
                      {tokenStatus.description ? `(${tokenStatus.description})` : ""}
                    </span>
                  ) : (
                    <span className="text-destructive font-medium">✗ {tokenStatus.error}</span>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 cursor-pointer"
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
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setTokenStatus({ checked: false, valid: false });
            setInviteToken("");
          }}
          className="mt-5 text-sm text-primary hover:text-primary/80 transition-colors hover:underline w-full text-center cursor-pointer font-medium"
        >
          {mode === "login"
            ? "Não tem conta? Cadastre-se com um convite"
            : "Já tem uma conta? Entrar"}
        </button>
      </Card>
    </div>
  );
}
