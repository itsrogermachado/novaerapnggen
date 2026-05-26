import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sparkles,
  ArrowRight,
  Type,
  Download,
  Lock,
  Menu,
  X,
  ChevronDown,
  CheckCircle,
  HelpCircle,
  Smartphone,
  Layout,
  RefreshCw,
} from "lucide-react";
import logoImg from "../../nova_era_logo.png";

export const Route = createFileRoute("/")(
  {
  component: LandingPage,
});

/* ─── Intersection Observer hook for scroll-triggered reveals ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  /* Scroll reveal refs for each section */
  const featuresReveal = useScrollReveal();
  const stepsReveal = useScrollReveal();
  const exclusivityReveal = useScrollReveal();
  const faqReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  const features = [
    {
      icon: <Layout className="w-5 h-5" />,
      title: "Design Interativo",
      desc: "Arrastar, redimensionar e rotacionar logos e imagens de forma livre, como em um editor profissional.",
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "Upscale HD & 4K",
      desc: "Exporte em resoluções de até 3x Ultra HD para garantir máxima definição nas redes sociais.",
    },
    {
      icon: <Type className="w-5 h-5" />,
      title: "Tipografias Premium",
      desc: "Seletor integrado com as melhores fontes do Google Fonts para destacar seus títulos.",
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Histórico Completo",
      desc: "Controle total com Undo/Redo e suporte a atalhos de teclado como Ctrl+Z.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Acesse com seu Convite",
      desc: "Crie sua conta com um token de convite exclusivo gerado por um administrador.",
    },
    {
      num: "02",
      title: "Monte sua Arte",
      desc: "Carregue logos, escolha fundos premium e personalize as camadas com controle dinâmico.",
    },
    {
      num: "03",
      title: "Exporte em Ultra HD",
      desc: "Escolha a escala de exportação ideal e baixe seu criativo pronto em segundos.",
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
      a: "Sim! Desenvolvemos o editor com responsividade total e suporte a toque. O Canvas se adapta à largura do seu aparelho para que você edite de qualquer lugar.",
    },
    {
      q: "Como funciona a biblioteca de fontes?",
      a: "Disponibilizamos famílias tipográficas renomadas como Inter, Montserrat, Poppins, Playfair Display, Bebas Neue, Lora e Cinzel diretamente no editor para que você aplique estilos únicos.",
    },
  ];

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary/20 selection:text-foreground">
      {/* Grain Texture Overlay */}
      <div className="grain-texture fixed inset-0 pointer-events-none z-[1]" />

      {/* Geometric accent lines */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-accent to-primary z-50 opacity-80" />

      {/* ─── HEADER ─── */}
      <header className="sticky top-[2px] z-40 w-full border-b border-border/60 bg-background/90 backdrop-blur-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <img src={logoImg} alt="Nova Era Logo" className="h-5 w-auto hidden sm:block" />
            <span className="font-extrabold tracking-tight text-lg sm:hidden">
              Nova Era
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { href: "#funcionalidades", label: "Funcionalidades" },
              { href: "#como-funciona", label: "Como Funciona" },
              { href: "#exclusividade", label: "Exclusividade" },
              { href: "#faq", label: "FAQ" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {loading ? (
              <div className="h-9 w-24 bg-muted rounded-sm animate-shimmer" />
            ) : user ? (
              <Button
                onClick={() => navigate({ to: "/app" })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 rounded-sm shadow-lg shadow-primary/15 flex items-center gap-2 cursor-pointer transition-all hover:translate-y-[-1px]"
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 rounded-sm shadow-lg shadow-primary/15 cursor-pointer transition-all hover:translate-y-[-1px]"
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
              className="p-2 text-muted-foreground hover:text-foreground rounded-sm bg-muted/50 border border-border/50 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-md animate-fade-in absolute left-0 right-0 p-6 space-y-4 shadow-xl z-40">
            <nav className="flex flex-col gap-4">
              {["Funcionalidades", "Como Funciona", "Exclusividade", "FAQ"].map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase().replace(/ /g, "-")}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>
            <hr className="border-border/60" />
            <div className="flex flex-col gap-3 pt-2">
              {loading ? (
                <div className="h-12 bg-muted rounded-sm animate-shimmer" />
              ) : user ? (
                <Button
                  onClick={() => { setMobileMenuOpen(false); navigate({ to: "/app" }); }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  Acessar Editor <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { setMobileMenuOpen(false); navigate({ to: "/auth" }); }}
                    className="w-full border-border hover:bg-accent/20 text-foreground font-bold py-4 rounded-sm cursor-pointer"
                  >
                    Entrar
                  </Button>
                  <Button
                    onClick={() => { setMobileMenuOpen(false); navigate({ to: "/auth" }); }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-sm shadow-lg cursor-pointer"
                  >
                    Ativar Convite
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-16 pb-24 md:pt-28 md:pb-36 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Badge */}
          <div className="animate-slide-up inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-primary/10 border border-primary/25 text-xs font-bold text-primary uppercase tracking-widest mb-8">
            <Sparkles className="w-3 h-3" />
            <span>Exclusivo para membros</span>
          </div>

          {/* Massive Headline */}
          <h1 className="animate-slide-up stagger-2 text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black tracking-tighter text-foreground leading-[0.95] mb-6">
            Crie Criativos
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              em Segundos
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-slide-up stagger-3 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
            A ferramenta definitiva para montar, customizar e exportar resultados
            premium com qualidade de agência. Interativo e com upscale Ultra HD.
          </p>

          {/* CTAs */}
          <div className="animate-slide-up stagger-4 flex flex-col sm:flex-row items-start gap-4">
            {user ? (
              <Button
                onClick={() => navigate({ to: "/app" })}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 px-10 rounded-sm shadow-xl shadow-primary/20 text-base transition-all hover:translate-y-[-2px] hover:shadow-2xl cursor-pointer flex items-center gap-2 animate-pulse-glow"
              >
                Acessar Editor Pro
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate({ to: "/auth" })}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 px-10 rounded-sm shadow-xl shadow-primary/20 text-base transition-all hover:translate-y-[-2px] hover:shadow-2xl cursor-pointer flex items-center gap-2 animate-pulse-glow"
                >
                  Acessar com Convite
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <a
                  href="#como-funciona"
                  className="w-full sm:w-auto inline-flex items-center justify-center border border-border hover:border-primary/40 hover:text-primary font-semibold py-3.5 px-8 rounded-sm text-base transition-all"
                >
                  Ver Como Funciona
                </a>
              </>
            )}
          </div>
        </div>

        {/* Decorative geometric elements */}
        <div className="hidden lg:block absolute top-20 right-0 w-80 h-80 border border-border/20 rounded-sm rotate-12 opacity-40" />
        <div className="hidden lg:block absolute bottom-10 right-20 w-48 h-48 border border-primary/10 rounded-sm -rotate-6 opacity-30" />
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section
        id="funcionalidades"
        className="py-24 md:py-32 border-t border-border/40 relative"
        ref={featuresReveal.ref}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto mb-16 space-y-4 ${featuresReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"}`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Funcionalidades
            </p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Tudo para criar com excelência
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Total controle de design nas suas mãos. Sem limitações.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className={`group p-7 rounded-sm bg-card border border-border/60 hover:border-primary/50 transition-all duration-300 hover:translate-y-[-4px] relative overflow-hidden accent-line cursor-default ${
                  featuresReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"
                } stagger-${idx + 2}`}
              >
                <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center mb-5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        id="como-funciona"
        className="py-24 md:py-32 border-t border-border/40 relative bg-muted/30"
        ref={stepsReveal.ref}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-3xl mx-auto mb-20 space-y-4 ${stepsReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"}`}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Como Funciona
            </p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
              Três passos rápidos
            </h2>
            <p className="text-muted-foreground text-lg">
              Criativos altamente profissionais para suas redes em segundos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-14 left-[16.66%] right-[16.66%] h-[1px] bg-gradient-to-r from-transparent via-border to-transparent z-0" />

            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`relative z-10 flex flex-col items-center text-center space-y-5 group ${
                  stepsReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"
                } stagger-${idx + 2}`}
              >
                {/* Giant number */}
                <div className="relative">
                  <span className="absolute -top-4 -left-4 text-[120px] font-black text-primary/[0.06] leading-none select-none pointer-events-none">
                    {step.num}
                  </span>
                  <div className="w-14 h-14 rounded-sm bg-card border-2 border-border group-hover:border-primary flex items-center justify-center font-black text-lg text-muted-foreground group-hover:text-primary transition-all duration-300 relative z-10">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EXCLUSIVITY ─── */}
      <section
        id="exclusividade"
        className="py-24 md:py-32 border-t border-border/40 relative"
        ref={exclusivityReveal.ref}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`bg-card border border-border/80 rounded-sm p-8 md:p-16 relative overflow-hidden flex flex-col md:flex-row items-center gap-10 ${
              exclusivityReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"
            }`}
          >
            {/* Accent line top */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                <span>Convites Restritos</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                Acesso Privado
                <br />
                e Reservado
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Para manter a performance de renderização em alta velocidade e a estabilidade dos
                servidores, o Gerador de Resultados é reservado exclusivamente para membros com
                convites válidos.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {["Sem anúncios", "Upscale Ilimitado", "Editor Multicamadas"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-sm text-foreground font-semibold">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-72 bg-background/60 border border-border/60 p-6 rounded-sm space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-foreground">Já possui um token?</h4>
                <p className="text-xs text-muted-foreground">
                  Insira-o na tela de cadastro para liberar seu acesso.
                </p>
              </div>
              <Button
                onClick={() => navigate({ to: "/auth" })}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5 rounded-sm shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px]"
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

      {/* ─── FAQ ─── */}
      <section
        id="faq"
        className="py-24 md:py-32 border-t border-border/40 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
        ref={faqReveal.ref}
      >
        <div className={`text-center space-y-4 mb-16 ${faqReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"}`}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Suporte
          </p>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground text-lg">
            Tudo o que você precisa saber sobre o Nova Era.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className={`border-b border-border/60 transition-all duration-300 ${
                  faqReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"
                } stagger-${Math.min(idx + 1, 6)}`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left py-5 flex items-center justify-between font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="pr-4 text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-primary" : ""}`}
                  />
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-60 pb-5" : "max-h-0"}`}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section
        className="py-20 md:py-28 border-t border-border/40 text-center px-4 relative"
        ref={ctaReveal.ref}
      >
        <div className={`max-w-3xl mx-auto space-y-8 ${ctaReveal.isVisible ? "animate-stagger-reveal" : "opacity-0"}`}>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Pronto para revolucionar
            <br />
            seus resultados?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            O gerador de criativos mais potente e responsivo da internet.
          </p>
          <div>
            <Button
              onClick={() => navigate({ to: "/app" })}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 px-10 rounded-sm shadow-xl shadow-primary/20 text-base transition-all hover:translate-y-[-2px] hover:shadow-2xl cursor-pointer flex items-center gap-2 mx-auto"
            >
              Começar a Criar
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 bg-card py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-sm bg-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <img src={logoImg} alt="Nova Era Logo" className="h-4 w-auto" />
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
