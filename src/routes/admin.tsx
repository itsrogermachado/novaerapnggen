import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Key,
  Users,
  Plus,
  Search,
  Copy,
  Check,
  Calendar,
  ArrowLeft,
  Shield,
  ShieldAlert,
  Clock,
  Ban,
  UserCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type TokenDuration = "24h" | "7d" | "30d";

interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

interface InviteToken {
  id: string;
  token: string;
  description: string | null;
  created_by: string;
  used_by: string | null;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
}

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tokens, setTokens] = useState<InviteToken[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search & Filter
  const [tokenSearch, setTokenSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Token Form State
  const [tokenDesc, setTokenDesc] = useState("");
  const [tokenDuration, setTokenDuration] = useState<TokenDuration>("7d");
  const [generatingToken, setGeneratingToken] = useState(false);

  // Direct Activation / Renewal Modal State
  const [renewUser, setRenewUser] = useState<Profile | null>(null);
  const [renewDuration, setRenewDuration] = useState<TokenDuration>("7d");
  const [renewing, setRenewing] = useState(false);

  // Admin Change Confirmation Dialog State
  const [adminChangeTarget, setAdminChangeTarget] = useState<{
    profile: Profile;
    targetRole: boolean;
  } | null>(null);
  const [changingAdmin, setChangingAdmin] = useState(false);

  // Copying helper state
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Hardcoded admins who cannot be demoted
  const HARDCODED_ADMINS = ["rogermachado019@gmail.com", "casadosvloogs@gmail.com"];

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      // Fetch profiles
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profilesErr) throw profilesErr;

      // Fetch invite tokens
      const { data: tokensData, error: tokensErr } = await supabase
        .from("invite_tokens")
        .select("*")
        .order("created_at", { ascending: false });
      if (tokensErr) throw tokensErr;

      setUsers(profilesData || []);
      setTokens(tokensData || []);
    } catch (err) {
      console.error("Erro ao carregar dados do painel:", err);
      toast.error("Erro ao carregar dados administrativos.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate({ to: "/auth" });
      } else {
        // verify admin status with safety net fallback
        const verifyAdmin = async () => {
          try {
            const isHardcodedAdmin = HARDCODED_ADMINS.includes(user.email || "");

            if (isHardcodedAdmin) {
              setIsAdmin(true);
              loadData();
              return;
            }

            const { data } = await supabase
              .from("profiles")
              .select("is_admin")
              .eq("id", user.id)
              .single();

            if (data?.is_admin) {
              setIsAdmin(true);
              loadData();
            } else {
              setIsAdmin(false);
              toast.error("Acesso negado. Apenas administradores.");
              navigate({ to: "/" });
            }
          } catch {
            if (user.email && HARDCODED_ADMINS.includes(user.email)) {
              setIsAdmin(true);
              loadData();
            } else {
              setIsAdmin(false);
              navigate({ to: "/" });
            }
          }
        };
        verifyAdmin();
      }
    }
  }, [user, loading, navigate, loadData]);

  const getExpiresAtDate = (duration: TokenDuration): Date => {
    const d = new Date();
    if (duration === "24h") {
      d.setHours(d.getHours() + 24);
    } else if (duration === "7d") {
      d.setDate(d.getDate() + 7);
    } else if (duration === "30d") {
      d.setDate(d.getDate() + 30);
    }
    return d;
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setGeneratingToken(true);
      const uniqueToken = `NE-${crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase()}`;
      const expiresAt = getExpiresAtDate(tokenDuration);

      const { error } = await supabase.from("invite_tokens").insert({
        token: uniqueToken,
        description: tokenDesc.trim() || null,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_revoked: false,
      });

      if (error) throw error;

      toast.success("Token de convite gerado com sucesso!");
      setTokenDesc("");
      loadData();
    } catch (err) {
      toast.error((err as Error).message || "Erro ao criar token.");
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from("invite_tokens")
        .update({ is_revoked: true })
        .eq("id", tokenId);
      if (error) throw error;

      toast.success("Token revogado!");
      loadData();
    } catch (err) {
      toast.error((err as Error).message || "Erro ao revogar token.");
    }
  };

  const handleDirectActivation = async () => {
    if (!renewUser || !user) return;
    try {
      setRenewing(true);
      const expiresAt = getExpiresAtDate(renewDuration);

      // Check if user already has an invite token linked
      const existingToken = tokens.find((t) => t.used_by === renewUser.id);

      if (existingToken) {
        // Update existing token in place
        const { error } = await supabase
          .from("invite_tokens")
          .update({
            expires_at: expiresAt.toISOString(),
            is_revoked: false,
            description: `Renovado diretamente por admin (${renewDuration})`,
          })
          .eq("id", existingToken.id);
        if (error) throw error;
      } else {
        // Insert new token and link immediately
        const uniqueToken = `NE-REF-${crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase()}`;
        const { error } = await supabase.from("invite_tokens").insert({
          token: uniqueToken,
          description: `Ativado diretamente por admin`,
          created_by: user.id,
          used_by: renewUser.id,
          expires_at: expiresAt.toISOString(),
          is_revoked: false,
        });
        if (error) throw error;
      }

      toast.success(`Acesso do usuário ${renewUser.email} ativado/renovado por ${renewDuration}!`);
      setRenewUser(null);
      loadData();
    } catch (err) {
      toast.error((err as Error).message || "Erro ao renovar acesso.");
    } finally {
      setRenewing(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!adminChangeTarget) return;
    const { profile, targetRole } = adminChangeTarget;

    // Safety checks
    if (profile.id === user?.id) {
      toast.error("Você não pode remover seus próprios privilégios de administrador.");
      setAdminChangeTarget(null);
      return;
    }
    if (profile.email && HARDCODED_ADMINS.includes(profile.email)) {
      toast.error("Este e-mail é um administrador permanente fixado e não pode ser removido.");
      setAdminChangeTarget(null);
      return;
    }

    try {
      setChangingAdmin(true);
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: targetRole })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success(
        `Usuário ${profile.email} agora é ${targetRole ? "Administrador" : "Membro Comum"}.`,
      );
      setAdminChangeTarget(null);
      loadData();
    } catch (err) {
      toast.error((err as Error).message || "Erro ao alterar privilégios.");
    } finally {
      setChangingAdmin(false);
    }
  };

  const copyInviteLink = (tokenVal: string, tokenId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/auth?token=${tokenVal}`;
    navigator.clipboard.writeText(link);
    setCopiedTokenId(tokenId);
    toast.success("Link de convite copiado!");
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const getEmailFromId = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u?.email || "Desconhecido";
  };

  const getTokenStatus = (t: InviteToken) => {
    if (t.is_revoked)
      return {
        label: "Revogado",
        colorClass: "bg-muted text-muted-foreground border-border",
      };
    if (new Date(t.expires_at) < new Date())
      return {
        label: "Expirado",
        colorClass: "bg-destructive/10 text-destructive border-destructive/20",
      };
    if (t.used_by)
      return {
        label: "Usado",
        colorClass: "bg-secondary text-secondary-foreground border-border",
      };
    return {
      label: "Ativo",
      colorClass: "bg-primary/10 text-primary border-primary/20",
    };
  };

  const getUserStatus = (p: Profile) => {
    if (p.is_admin) {
      return {
        label: "Ativo (Admin)",
        isWebActive: true,
        badgeClass: "bg-primary/15 text-primary border-primary/20",
      };
    }

    // Find token
    const token = tokens.find((t) => t.used_by === p.id);
    if (!token) {
      return {
        label: "Sem Acesso",
        isWebActive: false,
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
    }
    if (token.is_revoked) {
      return {
        label: "Bloqueado",
        isWebActive: false,
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
    }
    if (new Date(token.expires_at) < new Date()) {
      return {
        label: "Expirado",
        isWebActive: false,
        badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
        expiresAt: token.expires_at,
      };
    }

    return {
      label: "Ativo",
      isWebActive: true,
      badgeClass: "bg-primary/10 text-primary border-primary/20",
      expiresAt: token.expires_at,
    };
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter lists
  const filteredTokens = tokens.filter((t) => {
    const q = tokenSearch.toLowerCase();
    const tokenMatch = t.token.toLowerCase().includes(q);
    const descMatch = t.description?.toLowerCase().includes(q) || false;
    const usedByEmail = t.used_by ? getEmailFromId(t.used_by).toLowerCase().includes(q) : false;
    return tokenMatch || descMatch || usedByEmail;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return u.email?.toLowerCase().includes(q) || false;
  });

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground font-medium tracking-wide">
          Autenticando painel de controle...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-200">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border bg-card/85 backdrop-blur-xl sticky top-0 z-20 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/" })}
              className="p-2 hover:bg-accent hover:text-accent-foreground rounded-xl text-muted-foreground transition-all duration-200"
              title="Voltar ao Gerador"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Painel Administrativo
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Controle de tokens, convites e acesso de usuários
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium hidden md:inline-block px-3 py-1.5 bg-muted border border-border rounded-lg">
              Logado como: <span className="text-primary font-semibold">{user?.email}</span>
            </span>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="border-border hover:bg-accent text-foreground transition-all duration-200"
            >
              Acessar Gerador
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Tabs defaultValue="tokens" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
            <TabsList className="bg-muted border border-border p-1 rounded-xl">
              <TabsTrigger
                value="tokens"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 text-muted-foreground font-medium px-4 py-2 flex items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                Gerenciar Convites
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/10 text-muted-foreground font-medium px-4 py-2 flex items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Usuários Registrados
              </TabsTrigger>
            </TabsList>

            <div className="text-xs text-muted-foreground font-medium">
              Última atualização: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Tokens Tab */}
          <TabsContent value="tokens" className="space-y-6 outline-none">
            <div className="grid lg:grid-cols-[380px_1fr] gap-6">
              {/* Token Generator Card */}
              <Card className="bg-card border-border h-fit shadow-xl relative overflow-hidden transition-colors duration-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Plus className="w-5 h-5 text-primary" />
                    Gerar Novo Convite
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Crie um token único de uso único para cadastrar novos usuários.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateToken} className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="tokenDesc"
                        className="text-foreground text-xs font-semibold uppercase tracking-wider"
                      >
                        Identificação / Notas
                      </Label>
                      <Input
                        id="tokenDesc"
                        placeholder="Ex: Roger Cliente Gold ou Nome do Usuário"
                        value={tokenDesc}
                        onChange={(e) => setTokenDesc(e.target.value)}
                        className="bg-background border-border text-foreground rounded-xl focus-visible:ring-primary/50 py-5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="tokenDuration"
                        className="text-foreground text-xs font-semibold uppercase tracking-wider"
                      >
                        Tempo de Validade
                      </Label>
                      <Select
                        value={tokenDuration}
                        onValueChange={(v) => setTokenDuration(v as TokenDuration)}
                      >
                        <SelectTrigger className="bg-background border-border text-foreground rounded-xl focus:ring-primary/50 py-5 h-auto">
                          <SelectValue placeholder="Selecione o tempo de validade" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                          <SelectItem
                            value="24h"
                            className="focus:bg-primary focus:text-primary-foreground"
                          >
                            24 Horas
                          </SelectItem>
                          <SelectItem
                            value="7d"
                            className="focus:bg-primary focus:text-primary-foreground"
                          >
                            7 Dias
                          </SelectItem>
                          <SelectItem
                            value="30d"
                            className="focus:bg-primary focus:text-primary-foreground"
                          >
                            30 Dias
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-muted-foreground block">
                        O usuário terá este período de acesso liberado após ativar a conta.
                      </span>
                    </div>

                    <Button
                      type="submit"
                      disabled={generatingToken}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 cursor-pointer"
                    >
                      {generatingToken ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Gerar Convite
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Tokens Table List */}
              <Card className="bg-card border-border shadow-xl transition-colors duration-200">
                <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Key className="w-5 h-5 text-primary" />
                      Lista de Convites Gerados
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Visualize os tokens que foram gerados, seu status e quem os usou.
                    </CardDescription>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar token, notas ou email..."
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      className="bg-background border-border text-foreground rounded-xl pl-10 focus-visible:ring-primary/50"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <span className="text-sm text-muted-foreground">Carregando tokens...</span>
                    </div>
                  ) : filteredTokens.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground">
                      Nenhum token encontrado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border bg-background/50">
                      <Table>
                        <TableHeader className="bg-background border-b border-border">
                          <TableRow>
                            <TableHead className="text-muted-foreground font-semibold py-4">
                              Notas / Identificação
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold py-4">
                              Token
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold py-4">
                              Status
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold py-4">
                              Expiração
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold py-4">
                              Utilizado Por
                            </TableHead>
                            <TableHead className="text-muted-foreground font-semibold py-4 text-right">
                              Ações
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTokens.map((t) => {
                            const status = getTokenStatus(t);
                            return (
                              <TableRow
                                key={t.id}
                                className="border-b border-border hover:bg-muted/50 transition-colors"
                              >
                                <TableCell className="font-medium text-foreground py-4 max-w-[200px] truncate">
                                  {t.description || (
                                    <span className="text-muted-foreground/60 italic text-xs">
                                      Nenhuma nota
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm py-4">
                                  <span className="text-primary font-semibold">{t.token}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.colorClass}`}
                                  >
                                    {status.label}
                                  </span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs py-4">
                                  {formatDate(t.expires_at)}
                                </TableCell>
                                <TableCell className="py-4 text-xs font-medium text-foreground">
                                  {t.used_by ? (
                                    <span className="bg-muted border border-border px-2 py-1 rounded text-muted-foreground">
                                      {getEmailFromId(t.used_by)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/60 italic text-xs">
                                      Pendente
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="py-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyInviteLink(t.token, t.id)}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                      title="Copiar link de cadastro"
                                    >
                                      {copiedTokenId === t.id ? (
                                        <Check className="w-4 h-4 text-primary" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                    {!t.is_revoked && new Date(t.expires_at) > new Date() && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleRevokeToken(t.id)}
                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                        title="Revogar token"
                                      >
                                        <Ban className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="outline-none">
            <Card className="bg-card border-border shadow-xl transition-colors duration-200">
              <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Lista de Usuários Registrados
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Acompanhe todos os usuários, verifique se possuem acesso ativo e realize
                    renovações diretas.
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar usuário por e-mail..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-background border-border text-foreground rounded-xl pl-10 focus-visible:ring-primary/50"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Carregando usuários...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border bg-background/50">
                    <Table>
                      <TableHeader className="bg-background border-b border-border">
                        <TableRow>
                          <TableHead className="text-muted-foreground font-semibold py-4">
                            E-mail
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold py-4">
                            Tipo
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold py-4">
                            Acesso Site
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold py-4">
                            Expiração do Acesso
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold py-4">
                            Registrado Em
                          </TableHead>
                          <TableHead className="text-muted-foreground font-semibold py-4 text-right">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u) => {
                          const status = getUserStatus(u);
                          return (
                            <TableRow
                              key={u.id}
                              className="border-b border-border hover:bg-muted/50 transition-colors"
                            >
                              <TableCell className="font-medium text-foreground py-4">
                                <span className="text-sm font-semibold">{u.email}</span>
                                {u.id === user?.id && (
                                  <Badge className="ml-2 bg-primary hover:bg-primary/90 text-primary-foreground scale-90 border-transparent">
                                    Você
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="flex items-center gap-1 text-xs text-foreground">
                                  {u.is_admin ? (
                                    <>
                                      <Shield className="w-3.5 h-3.5 text-primary animate-pulse" />
                                      Administrador
                                    </>
                                  ) : (
                                    <>
                                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                      Membro Comum
                                    </>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.badgeClass}`}
                                >
                                  {status.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs py-4">
                                {u.is_admin ? (
                                  <span className="text-muted-foreground/60 italic text-xs">
                                    Sem limite (Permanente)
                                  </span>
                                ) : status.expiresAt ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    {formatDate(status.expiresAt)}
                                  </span>
                                ) : (
                                  <span className="text-destructive font-medium text-xs">
                                    Bloqueado / Expirado
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs py-4">
                                {formatDate(u.created_at)}
                              </TableCell>
                              <TableCell className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Activating / Renewing Button */}
                                  {!u.is_admin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRenewUser(u)}
                                      className="border-primary/20 hover:border-primary text-primary hover:bg-primary/10 gap-1 rounded-lg cursor-pointer"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      {status.isWebActive ? "Renovar" : "Ativar"}
                                    </Button>
                                  )}

                                  {/* Promotion / Demotion Action */}
                                  {u.id !== user?.id &&
                                    u.email &&
                                    !HARDCODED_ADMINS.includes(u.email) && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setAdminChangeTarget({
                                            profile: u,
                                            targetRole: !u.is_admin,
                                          })
                                        }
                                        className={`gap-1 rounded-lg text-xs cursor-pointer ${u.is_admin ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" : "text-primary hover:bg-primary/10 hover:text-primary"}`}
                                      >
                                        <Shield className="w-3.5 h-3.5" />
                                        {u.is_admin ? "Remover Admin" : "Tornar Admin"}
                                      </Button>
                                    )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Renewal Dialog Modal */}
      <Dialog open={!!renewUser} onOpenChange={() => setRenewUser(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-2xl max-w-sm transition-colors duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UserCheck className="w-5 h-5 text-primary" />
              Ativar / Renovar Acesso
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escolha a nova validade de acesso para o usuário comum:
              <span className="block mt-1 text-primary font-semibold break-all">
                {renewUser?.email}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label
              htmlFor="renewDuration"
              className="text-foreground text-xs font-semibold uppercase tracking-wider block mb-2"
            >
              Selecione o Tempo
            </Label>
            <Select
              value={renewDuration}
              onValueChange={(v) => setRenewDuration(v as TokenDuration)}
            >
              <SelectTrigger className="bg-background border-border text-foreground rounded-xl focus:ring-primary/50 py-5 h-auto">
                <SelectValue placeholder="Selecione o tempo de validade" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="24h" className="focus:bg-primary focus:text-primary-foreground">
                  24 Horas
                </SelectItem>
                <SelectItem value="7d" className="focus:bg-primary focus:text-primary-foreground">
                  7 Dias
                </SelectItem>
                <SelectItem value="30d" className="focus:bg-primary focus:text-primary-foreground">
                  30 Dias
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground block mt-2 leading-tight">
              Isso atualizará ou criará o token vinculado a este usuário diretamente, concedendo
              acesso imediato à plataforma.
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRenewUser(null)}
              className="border-border hover:bg-accent text-foreground rounded-xl cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDirectActivation}
              disabled={renewing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl cursor-pointer"
            >
              {renewing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Confirmar Acesso"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Change Confirmation Alert Dialog */}
      <AlertDialog open={!!adminChangeTarget} onOpenChange={() => setAdminChangeTarget(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl max-w-sm transition-colors duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-5 h-5 text-destructive animate-pulse" />
              Confirmar Alteração de Função
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Você tem certeza que deseja alterar os privilégios de administrador do usuário:
              <span className="block mt-1 text-primary font-semibold break-all">
                {adminChangeTarget?.profile.email}
              </span>
              <span className="block mt-2 font-medium">
                Novo papel:{" "}
                <span className="text-foreground font-bold">
                  {adminChangeTarget?.targetRole ? "Administrador" : "Membro Comum"}
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setAdminChangeTarget(null)}
              className="border-border hover:bg-accent text-foreground rounded-xl cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleAdmin}
              disabled={changingAdmin}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl cursor-pointer"
            >
              {changingAdmin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Sim, Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
