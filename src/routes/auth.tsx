import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

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
          description: res.description ?? undefined
        });
      } else {
        setTokenStatus({
          checked: true,
          valid: false,
          error: "Token inválido, expirado ou já utilizado."
        });
      }
    } catch (err: any) {
      setTokenStatus({
        checked: true,
        valid: false,
        error: "Erro ao validar o token."
      });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const trimmedEmail = email.trim().toLowerCase();
        const isAdminEmail = ["rogermachado019@gmail.com", "casadosvloogs@gmail.com"].includes(trimmedEmail);
        
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
              invite_token: isAdminEmail ? undefined : inviteToken.trim()
            }
          },
        });
        if (error) throw error;
        toast.success("Conta criada com sucesso!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro de autenticação");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-1">Gerador de Resultados</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login" ? "Entre para acessar a ferramenta" : "Crie sua conta"}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {mode === "signup" && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="token">Token de Convite</Label>
                {["rogermachado019@gmail.com", "casadosvloogs@gmail.com"].includes(email.trim().toLowerCase()) && (
                  <span className="text-xs text-emerald-500 font-medium animate-pulse">Opcional para Admin</span>
                )}
              </div>
              <Input
                id="token"
                type="text"
                placeholder="Insira o seu token de convite"
                required={!["rogermachado019@gmail.com", "casadosvloogs@gmail.com"].includes(email.trim().toLowerCase())}
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  checkToken(e.target.value);
                }}
                onBlur={() => checkToken(inviteToken)}
              />
              {inviteToken && tokenStatus.checked && (
                <div className="mt-1 text-xs">
                  {tokenStatus.valid ? (
                    <span className="text-emerald-500 font-medium">
                      ✓ Token válido {tokenStatus.description ? `(Destinado a: ${tokenStatus.description})` : ""}
                    </span>
                  ) : (
                    <span className="text-destructive font-medium">✗ {tokenStatus.error}</span>
                  )}
                </div>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 text-sm text-primary hover:underline w-full text-center"
        >
          {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </Card>
    </div>
  );
}
