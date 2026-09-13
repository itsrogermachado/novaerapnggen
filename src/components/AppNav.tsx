import { Link, useRouterState } from "@tanstack/react-router";
import { Layers, Radio, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/useProfile";
import { useContagemHoje } from "@/hooks/useResultados";

/** Rotas que fazem parte do app logado — a barra só aparece nelas. */
const APP_ROUTES = ["/app", "/resultados", "/admin"] as const;

/**
 * Altura da barra no mobile, em px. Exportada porque o espaçador precisa bater
 * exatamente com ela.
 */
const BAR_HEIGHT = 56;

interface TabDef {
  to: (typeof APP_ROUTES)[number];
  label: string;
  icon: typeof Layers;
  adminOnly?: boolean;
}

const TABS: TabDef[] = [
  { to: "/app", label: "Estúdio", icon: Layers },
  { to: "/resultados", label: "Resultados", icon: Radio },
  { to: "/admin", label: "Admin", icon: ShieldAlert, adminOnly: true },
];

/**
 * Navegação principal do app.
 *
 * No celular é uma barra fixa no rodapé, ao alcance do polegar; no desktop some,
 * porque lá o lugar da navegação é o header (veja <AppNavInline />).
 *
 * Fica montada em __root.tsx e decide sozinha se aparece, para não precisar ser
 * repetida em cada página.
 */
export function AppNav() {
  const { user } = useAuth();
  const { isAdmin } = useProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const onAppRoute = APP_ROUTES.some((r) => pathname.startsWith(r));
  if (!user || !onAppRoute) return null;

  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <>
      {/* Espaçador: a barra é fixed, então sem isto ela cobre o fim da página —
          entre outras coisas, o botão Baixar Imagem. */}
      <div
        aria-hidden="true"
        className="md:hidden"
        style={{ height: `calc(${BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }}
      />

      <nav
        aria-label="Navegação principal"
        data-nav="mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch">
          {tabs.map((tab) => (
            <NavTab key={tab.to} tab={tab} active={pathname.startsWith(tab.to)} />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavTab({ tab, active }: { tab: TabDef; active: boolean }) {
  const Icon = tab.icon;

  return (
    <Link
      to={tab.to}
      aria-current={active ? "page" : undefined}
      // min-h-[56px] mantém o alvo de toque acima dos 44px recomendados.
      className={`relative flex flex-1 min-h-[56px] flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && <span aria-hidden="true" className="absolute top-0 h-[2px] w-10 bg-primary" />}
      <span className="relative">
        <Icon className="h-5 w-5" />
        {tab.to === "/resultados" && <ResultadoBadge />}
      </span>
      {tab.label}
    </Link>
  );
}

/** Quantos resultados saíram hoje. Silencioso quando não houve nenhum. */
function ResultadoBadge() {
  const count = useContagemHoje();
  if (count === 0) return null;

  return (
    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * Mesma navegação para o header do desktop, onde a barra de rodapé não aparece.
 */
export function AppNavInline() {
  const { isAdmin } = useProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <nav
      aria-label="Navegação principal"
      data-nav="desktop"
      className="hidden md:flex items-center gap-1"
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.to);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.to === "/resultados" && <ContagemInline />}
          </Link>
        );
      })}
    </nav>
  );
}

function ContagemInline() {
  const count = useContagemHoje();
  if (count === 0) return null;

  return (
    <span className="ml-0.5 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground tabular-nums">
      {count}
    </span>
  );
}
