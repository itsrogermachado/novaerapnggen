import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { PaginaNaoEncontrada } from "@/components/PaginaNaoEncontrada";
import { PaginaDeErro } from "@/components/PaginaDeErro";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // viewport-fit=cover é o que habilita env(safe-area-inset-*) no iPhone,
      // usado pela barra de abas fixa no rodapé (AppNav).
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Nova Era — Gerador de Resultados" },
      {
        name: "description",
        content:
          "Crie imagens profissionais para Instagram com fundos personalizados, logos e textos arrastáveis. Ferramenta exclusiva Nova Era.",
      },
      { name: "author", content: "Nova Era" },
      { property: "og:title", content: "Nova Era — Gerador de Resultados" },
      {
        property: "og:description",
        content:
          "Crie imagens profissionais para Instagram com fundos personalizados, logos e textos arrastáveis. Ferramenta exclusiva Nova Era.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@NovaEra" },
      { name: "twitter:title", content: "Nova Era — Gerador de Resultados" },
      {
        name: "twitter:description",
        content:
          "Crie imagens profissionais para Instagram com fundos personalizados, logos e textos arrastáveis. Ferramenta exclusiva Nova Era.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/d61l6PfdYINFTpBHzpQTTB0KdXp1/social-images/social-1779837355669-nova_era_symbol_orange_1_1779837288117.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/d61l6PfdYINFTpBHzpQTTB0KdXp1/social-images/social-1779837355669-nova_era_symbol_orange_1_1779837288117.webp",
      },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      // Só as duas famílias do design system. As sete anteriores (Inter, Montserrat,
      // Poppins, Playfair, Bebas, Lora, Cinzel) serviam ao seletor de fontes que foi
      // removido em maio. Carregadas aqui, e não por @import no CSS, para não
      // serializar o download atrás do stylesheet.
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: PaginaNaoEncontrada,
  errorComponent: PaginaDeErro,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var dark=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        {/* Decide sozinha se aparece: só nas rotas do app logado, e só no mobile. */}
        <AppNav />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
