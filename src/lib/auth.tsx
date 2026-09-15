import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s);
      setLoading(false);
      // Reforço para o link de "Esqueci minha senha": se o Supabase avisar que a pessoa
      // voltou para trocar a senha e ela caiu em outra página, leva para o formulário.
      // (O caminho normal é o próprio link já apontar para /auth?novaSenha=1.)
      if (evento === "PASSWORD_RECOVERY" && !window.location.search.includes("novaSenha=1")) {
        window.location.assign("/auth?novaSenha=1");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

/**
 * Existe sessão guardada neste navegador?
 *
 * Serve para o `beforeLoad` das rotas protegidas decidir na hora, sem esperar o
 * AuthProvider montar. Só olha se HÁ token, nunca se ele é válido — quem valida
 * é o servidor, via RLS. É um atalho de navegação, não uma trava de segurança.
 */
export function temSessaoLocal(): boolean {
  if (typeof window === "undefined") return true; // no servidor, deixa passar
  try {
    const ref = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const bruto = window.localStorage.getItem(`sb-${ref}-auth-token`);
    if (!bruto) return false;
    const sessao = JSON.parse(bruto);
    return !!sessao?.access_token;
  } catch {
    // localStorage bloqueado (aba anônima, cookies desligados): não dá para
    // afirmar que não há sessão, então deixa a página decidir.
    return true;
  }
}
