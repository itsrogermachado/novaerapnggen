import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  Users,
  Search,
  Check,
  ArrowLeft,
  Shield,
  ShieldAlert,
  Clock,
  Ban,
  UserCheck,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type TokenDuration = "1m" | "24h" | "7d" | "30d";

interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean;
  status: string;
  expires_at: string | null;
  created_at: string;
}

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Search & Filter
  const [userSearch, setUserSearch] = useState("");

  // Approval Modal State
  const [approveUser, setApproveUser] = useState<Profile | null>(null);
  const [approveDuration, setApproveDuration] = useState<TokenDuration>("7d");
  const [approving, setApproving] = useState(false);

  // Admin Change Confirmation Dialog State
  const [adminChangeTarget, setAdminChangeTarget] = useState<{
    profile: Profile;
    targetRole: boolean;
  } | null>(null);
  const [changingAdmin, setChangingAdmin] = useState(false);

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

      setUsers((profilesData as any) || []);
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
              navigate({ to: "/app" });
            }
          } catch {
            if (user.email && HARDCODED_ADMINS.includes(user.email)) {
              setIsAdmin(true);
              loadData();
            } else {
              setIsAdmin(false);
              navigate({ to: "/app" });
            }
          }
        };
        verifyAdmin();
      }
    }
  }, [user, loading, navigate, loadData]);

  const getExpiresAtDate = (duration: TokenDuration): Date => {
    const d = new Date();
    if (duration === "1m") {
      d.setMinutes(d.getMinutes() + 1);
    } else if (duration === "24h") {
      d.setHours(d.getHours() + 24);
    } else if (duration === "7d") {
      d.setDate(d.getDate() + 7);
    } else if (duration === "30d") {
      d.setDate(d.getDate() + 30);
    }
    return d;
  };

  const handleApproveAccess = async () => {
    if (!approveUser) return;
    try {
      setApproving(true);
      const expiresAt = getExpiresAtDate(approveDuration);

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "approved",
          expires_at: expiresAt.toISOString(),
        } as any)
        .eq("id", approveUser.id);
      if (error) throw error;

      toast.success(`Acesso do usuário ${approveUser.email} aprovado por ${approveDuration}!`);
      setApproveUser(null);
      loadData();
    } catch (err) {
      toast.error((err as Error).message || "Erro ao aprovar acesso.");
    } finally {
      setApproving(false);
    }
  };

  const handleRevokeAccess = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "revoked" } as any)
        .eq("id", profileId);
      if (error) throw error;

      toast.success("Acesso revogado!");
      loadData();
    } catch (err) {
      toast.error((err as Error).message || "Erro ao revogar acesso.");
    }
  };

  const handleToggleAdmin = async () => {
    if (!adminChangeTarget) return;
    const { profile, targetRole } = adminChangeTarget;

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

  const getUserStatus = (p: Profile) => {
    if (p.is_admin) {
      return {
        label: "Ativo (Admin)",
        badgeClass: "bg-primary/15 text-primary border-primary/20",
      };
    }

    if (p.status === "revoked") {
      return {
        label: "Bloqueado",
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
    }

    if (p.status === "approved") {
      if (p.expires_at && new Date(p.expires_at) < new Date()) {
        return {
          label: "Expirado",
          badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
        };
      }
      return {
        label: "Ativo",
        badgeClass: "bg-primary/10 text-primary border-primary/20",
      };
    }

    return {
      label: "Pendente",
      badgeClass: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />

      <header className="border-b border-border bg-card/85 backdrop-blur-xl sticky top-0 z-20 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/app" })}
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
                Controle de acesso e aprovação de usuários
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
              onClick={() => navigate({ to: "/app" })}
              className="border-border hover:bg-accent text-foreground transition-all duration-200"
            >
              Acessar Gerador
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Usuários Registrados</h2>
          </div>
          <div className="text-xs text-muted-foreground font-medium z-10">
            Última atualização: {new Date().toLocaleTimeString()}
          </div>
        </div>

        <Card className="bg-card border-border shadow-xl transition-colors duration-200 z-10 relative">
          <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardDescription className="text-muted-foreground">
                Acompanhe todos os usuários, verifique quem precisa de aprovação e gerencie acessos.
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
                        Status
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
                            {u.email || "Sem E-mail"}
                          </TableCell>
                          <TableCell className="py-4">
                            {u.is_admin ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Admin
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Users className="w-3.5 h-3.5" />
                                Membro
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.badgeClass}`}
                            >
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs py-4">
                            {u.is_admin ? "Vitalício" : formatDate(u.expires_at)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs py-4">
                            {formatDate(u.created_at)}
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!u.is_admin && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setApproveUser(u)}
                                    className="h-8 px-2 text-primary hover:bg-primary/10 hover:text-primary cursor-pointer border border-transparent hover:border-primary/20"
                                    title="Aprovar/Renovar Acesso"
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Aprovar
                                  </Button>
                                  {u.status !== "revoked" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRevokeAccess(u.id)}
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                      title="Revogar Acesso"
                                    >
                                      <Ban className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setAdminChangeTarget({ profile: u, targetRole: !u.is_admin })
                                }
                                className={`h-8 w-8 p-0 cursor-pointer ${
                                  u.is_admin
                                    ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                                title={
                                  u.is_admin ? "Remover de Administrador" : "Tornar Administrador"
                                }
                              >
                                <Shield className="w-4 h-4" />
                              </Button>
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
      </main>

      {/* Approve User Modal */}
      <Dialog open={!!approveUser} onOpenChange={(open) => !open && setApproveUser(null)}>
        <DialogContent className="bg-card border-border sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              Aprovar Acesso
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escolha por quanto tempo <strong>{approveUser?.email}</strong> terá acesso ao gerador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duração da Aprovação
              </Label>
              <Select
                value={approveDuration}
                onValueChange={(v) => setApproveDuration(v as TokenDuration)}
              >
                <SelectTrigger className="w-full bg-background border-border py-6 rounded-xl">
                  <SelectValue placeholder="Selecione o tempo..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="1m">1 Minuto (Teste)</SelectItem>
                  <SelectItem value="24h">24 Horas</SelectItem>
                  <SelectItem value="7d">7 Dias</SelectItem>
                  <SelectItem value="30d">30 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                Após este período, o acesso do usuário vai expirar e ele não poderá mais acessar o gerador.
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApproveUser(null)}
              className="border-border hover:bg-accent w-full sm:w-auto rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApproveAccess}
              disabled={approving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full sm:w-auto rounded-xl shadow-lg shadow-primary/20"
            >
              {approving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Aprovar Acesso"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Admin Changes */}
      <AlertDialog
        open={!!adminChangeTarget}
        onOpenChange={(open) => !open && setAdminChangeTarget(null)}
      >
        <AlertDialogContent className="bg-card border-border rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Você está prestes a tornar <strong>{adminChangeTarget?.profile.email}</strong>{" "}
              {adminChangeTarget?.targetRole ? (
                <span className="text-primary font-bold">Administrador</span>
              ) : (
                <span className="text-destructive font-bold">Membro Comum</span>
              )}
              . Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              onClick={() => setAdminChangeTarget(null)}
              className="border-border hover:bg-accent rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleAdmin}
              disabled={changingAdmin}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
            >
              {changingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
