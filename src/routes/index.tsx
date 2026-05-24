import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sparkles,
  ArrowRight,
  Layers,
  Type,
  Zap,
  Download,
  Lock,
  Menu,
  X,
  ChevronDown,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  ArrowUpRight,
  Smartphone,
  Layout,
  RefreshCw,
} from "lucide-react";
import logoImg from "../../nova_era_logo.png";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features = [
    {
      icon: <Layout className="w-6 h-6 text-primary" />,
      title: "Design 100% Interativo",
      desc: "Arrastar, redimensionar e rotacionar logos, textos e imagens em destaque de forma livre, como no Canva.",
    },
    {
      icon: <Download className="w-6 h-6 text-primary" />,
      title: "Upscale HD & 4K",
      desc: "Exporte suas criações em resoluções profissionais de até 3x (Ultra HD/4K) para garantir máxima definição nas redes.",
    },
    {
      icon: <Type className="w-6 h-6 text-primary" />,
      title: "Biblioteca de Tipografias",
      desc: "Seletor integrado com as melhores fontes do Google Fonts para destacar seus títulos e depoimentos.",
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-primary" />,
      title: "Histórico de Ações",
      desc: "Controle total com histórico completo de alterações (Undo/Redo) com suporte para atalhos de teclado (Ctrl+Z).",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Acesse com seu Convite",
      desc: "Crie sua conta utilizando um token de convite exclusivo gerado por um administrador.",
    },
    {
      num: "02",
      title: "Monte sua Arte",
      desc: "Carregue logos, escolha fundos premium e personalize as camadas com controle dinâmico.",
    },
    {
      num: "03",
      title: "Exporte em Ultra HD",
      desc: "Escolha a escala de exportação ideal (1x, 2x ou 3x) e baixe seu criativo pronto em segundos.",
    },
  ];

  const faqs = [
    {
      q: "O que é o Nova Era - Gerador de Resultados?",
      a: "É uma plataforma web exclusiva para membros da comunidade Nova Era que permite criar artes, criativos de alta conversão, e criativos de depoimento/resultado com acabamento premium e de forma extremamente rápida.",
    },
    {
      q: "Como posso obter um token de convite?",
      a: "O acesso à plataforma é privado. Os tokens de convite são gerados por administradores oficiais e distribuídos exclusivamente para membros ativos do grupo ou clientes premium.",
    },
    {
      q: "Quais as opções de exportação de imagem?",
      a: "Você pode baixar suas imagens no formato Feed (4:5) ou Stories (9:16). Oferecemos também o Upscale dinâmico de 1x (Padrão), 2x (Super HD) e 3x (Ultra HD/4K), que renderiza a imagem final com definição ultra nítida.",
    },
    {
      q: "O editor funciona no celular?",
      a: "Sim! Desenvolvemos o editor com responsividade total e suporte a toque (touch gestures). O preview do Canvas se adapta proporcionalmente à largura do seu aparelho para que você edite perfeitamente de qualquer lugar.",
    },
    {
      q: "Como funciona a biblioteca de fontes?",
      a: "Disponibilizamos famílias tipográficas renomadas como Inter, Montserrat, Poppins, Playfair Display, Bebas Neue, Lora e Cinzel diretamente no editor para que você aplique estilos únicos em cada bloco de texto.",
    },
  ];

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden selection:bg-primary/20 selection:text-foreground">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-20%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <img src={logoImg} alt="Nova Era Logo" className="h-6 w-auto hidden sm:block" />
            <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent sm:hidden">
              Nova Era
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#funcionalidades"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#como-funciona"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Como Funciona
            </a>
            <a
              href="#exclusividade"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Exclusividade
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {loading ? (
              <div className="h-10 w-24 bg-muted rounded-xl animate-pulse" />
            ) : user ? (
              <Button
                onClick={() => navigate({ to: "/app" })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 rounded-xl shadow-lg shadow-primary/10 flex items-center gap-2 cursor-pointer"
              >
                Acessar Editor
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm font-semibold hover:text-primary transition-colors px-4 py-2"
                >
                  Entrar
                </Link>
                <Button
                  onClick={() => navigate({ to: "/auth" })}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 rounded-xl shadow-lg shadow-primary/10 cursor-pointer"
                >
                  Ativar Convite
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-xl bg-muted/50 border border-border/50 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-lg animate-fade-in absolute left-0 right-0 p-6 space-y-4 shadow-xl">
            <nav className="flex flex-col gap-4">
              <a
                href="#funcionalidades"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Funcionalidades
              </a>
              <a
                href="#como-funciona"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Como Funciona
              </a>
              <a
                href="#exclusividade"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Exclusividade
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </a>
            </nav>
            <hr className="border-border/60" />
            <div className="flex flex-col gap-3 pt-2">
              {loading ? (
                <div className="h-12 bg-muted rounded-xl animate-pulse" />
              ) : user ? (
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate({ to: "/app" });
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  Acessar Editor
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate({ to: "/auth" });
                    }}
                    className="w-full border-border hover:bg-accent text-foreground font-semibold py-4 rounded-xl cursor-pointer"
                  >
                    Entrar
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate({ to: "/auth" });
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 rounded-xl shadow-lg cursor-pointer"
                  >
                    Ativar Convite
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EXCLUSIVO PARA MEMBROS NOVA ERA</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] md:leading-[1.15]">
            Crie Criativos de Alta Conversão{" "}
            <span className="bg-gradient-to-r from-primary via-primary/95 to-violet-400 bg-clip-text text-transparent">
              em Segundos
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A ferramenta definitiva para montar, customizar e exportar resultados e criativos
            premium com qualidade de agência. Tudo de forma interativa e com upscale Ultra HD.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <Button
                onClick={() => navigate({ to: "/app" })}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 px-8 rounded-xl shadow-xl shadow-primary/20 text-base transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2"
              >
                Acessar Editor Pro
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate({ to: "/auth" })}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 px-8 rounded-xl shadow-xl shadow-primary/20 text-base transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2"
                >
                  Acessar com Convite
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <a
                  href="#como-funciona"
                  className="w-full sm:w-auto inline-flex items-center justify-center border border-border hover:bg-accent/40 font-semibold py-3.5 px-8 rounded-xl text-base transition-colors"
                >
                  Ver Como Funciona
                </a>
              </>
            )}
          </div>
        </div>

      </section>

      {/* Features Grid */}
      <section
        id="funcionalidades"
        className="py-20 md:py-28 border-t border-border/30 relative bg-muted/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Tudo o que você precisa para criar com excelência
            </h2>
            <p className="text-muted-foreground text-lg">
              Deixamos para trás layouts rígidos para dar total controle de design nas suas mãos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="group p-8 rounded-2xl bg-card border border-border/60 hover:border-primary/40 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-primary/60 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-20 md:py-28 border-t border-border/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Como funciona o Gerador?
            </h2>
            <p className="text-muted-foreground text-lg">
              Em apenas três passos rápidos você tem criativos altamente profissionais para suas
              redes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-1/2 left-4 right-4 h-[1px] bg-border/80 -translate-y-12 z-0" />

            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative z-10 flex flex-col items-center text-center space-y-4 group"
              >
                <div className="w-16 h-16 rounded-full bg-card border-2 border-border group-hover:border-primary flex items-center justify-center font-extrabold text-lg text-muted-foreground group-hover:text-primary shadow-md group-hover:shadow-lg transition-all duration-300">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-foreground pt-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Invites / Exclusivity Section */}
      <section
        id="exclusividade"
        className="py-20 md:py-28 border-t border-border/30 bg-muted/20 relative"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-border/80 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
            {/* Blur behind */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                <Lock className="w-3.5 h-3.5" />
                <span>CONVITES RESTRITOS</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                Acesso Privado e Reservado
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Para manter a performance de renderização em alta velocidade e a estabilidade dos
                servidores, o Gerador de Resultados é reservado exclusivamente para membros com
                convites válidos.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-sm text-foreground font-semibold">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>Sem anúncios</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-foreground font-semibold">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>Upscale Ilimitado</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-foreground font-semibold">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>Editor Multicamadas</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 bg-background/50 border border-border/60 p-6 rounded-2xl space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-foreground">Já possui um token?</h4>
                <p className="text-xs text-muted-foreground">
                  Insira-o na tela de cadastro para liberar seu acesso imediatamente.
                </p>
              </div>
              <Button
                onClick={() => navigate({ to: "/auth" })}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5 rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                Cadastrar agora
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Link
                to="/auth"
                className="text-xs text-center block text-muted-foreground hover:text-primary transition-colors hover:underline"
              >
                Já tenho conta? Entrar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="py-20 md:py-28 border-t border-border/30 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-2">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground text-lg">
            Esclareça suas principais dúvidas sobre o funcionamento do Nova Era.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="border border-border/80 rounded-2xl bg-card overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-6 flex items-center justify-between font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-primary" : ""}`}
                  />
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-60 border-t border-border/40" : "max-h-0"}`}
                >
                  <p className="p-6 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 md:py-24 border-t border-border/30 bg-gradient-to-b from-card to-background text-center px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Pronto para revolucionar seus resultados visuais?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Tenha em mãos o gerador de criativos mais potente e responsivo da internet.
          </p>
          <div>
            <Button
              onClick={() => navigate({ to: "/app" })}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 px-10 rounded-xl shadow-xl shadow-primary/20 text-base transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-2 mx-auto"
            >
              Começar a Criar
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <img src={logoImg} alt="Nova Era Logo" className="h-5 w-auto" />
          </div>

          <p className="text-xs text-muted-foreground text-center md:text-right">
            &copy; {new Date().getFullYear()} Nova Era — Gerador de Resultados. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
