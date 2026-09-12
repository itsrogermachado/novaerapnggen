import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export type AccessState =
  /** Ainda verificando, ou reverificando depois de uma falha. */
  | "checking"
  /** Perfil lido e liberado: admin, ou aprovado e dentro da validade. */
  | "active"
  /** Perfil lido e negado: pendente, revogado ou expirado. */
  | "denied"
  /** Não deu para ler o perfil — rede, servidor, qualquer coisa. NÃO é negação. */
  | "unknown";

export interface Profile {
  id: string;
  email: string | null;
  is_admin: boolean;
  status: string;
  expires_at: string | null;
  created_at: string;
}

/**
 * Fonte única do perfil do usuário logado.
 *
 * A distinção que importa aqui é entre "não tem acesso" e "não consegui
 * verificar". Antes as duas coisas caíam no mesmo `catch` e ambas levavam o
 * usuário à tela de acesso bloqueado — ou seja, uma oscilação de 4G mostrava
 * "Acesso Pendente, Expirado ou Bloqueado" para quem estava em dia. Agora a
 * falha de leitura vira `unknown`, que a UI trata como problema de conexão.
 */
export function useProfile() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    // O acesso pode expirar enquanto a aba está aberta; meio minuto é curto o
    // bastante para o bloqueio valer e longo o bastante para não pesar.
    staleTime: 30_000,
    retry: 2,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, is_admin, status, expires_at, created_at")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
  });

  const profile = query.data ?? null;

  const isExpired = !!profile?.expires_at && new Date(profile.expires_at) <= new Date();
  const isApproved = profile?.status === "approved" && !isExpired;
  const isAdmin = !!profile?.is_admin;

  let access: AccessState;
  if (authLoading || (!!user && query.isLoading)) {
    access = "checking";
  } else if (query.isError) {
    access = "unknown";
  } else if (!profile) {
    access = "checking";
  } else if (isAdmin || isApproved) {
    access = "active";
  } else {
    access = "denied";
  }

  return {
    profile,
    isAdmin,
    access,
    isExpired,
    expiresAt: profile?.expires_at ? new Date(profile.expires_at) : null,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
