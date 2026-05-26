import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Layers,
  ArrowRight,
  Layout,
  Download,
  Type,
  Zap,
  Menu,
  X,
  Crosshair,
  CheckCircle2
} from "lucide-react";
import logoImg from "../../nova_era_logo.png";

export const Route = createFileRoute("/")({
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

  /* Scroll reveal refs */
  const featuresReveal = useScrollReveal();
  const statsReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  const features = [
    {
      icon: <Layout className="w-5 h-5 text-primary" />,
      title: "Geometria Precisa",
      desc: "Controle absoluto sobre o posicionamento. Arraste, alinhe e dimensione vetores com precisão sub-pixel.",
    },
    {
      icon: <Download className="w-5 h-5 text-primary" />,
      title: "Exportação Ultra HD",
      desc: "Motor de upscale integrado. Gere arquivos prontos para qualquer formato sem perda de nitidez.",
    },
    {
      icon: <Type className="w-5 h-5 text-primary" />,
      title: "Tipografia Premium",
      desc: "Acesso direto a bibliotecas tipográficas de alta performance para composição impecável.",
    },
    {
      icon: <Zap className="w-5 h-5 text-primary" />,
      title: "Fluxo de Trabalho",
      desc: "Ferramentas desenhadas para velocidade. Desfaça, refaça e altere instâncias sem atritos.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden selection:bg-primary/20 selection:text-foreground">
      {/* Texture overlay - Minimalist grain only */}
      <div className="grain-texture fixed inset-0 pointer-events-none z-[1]" />

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 w-full bg-background border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-primary flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <img src={logoImg} alt="Nova Era" className="h-4 w-auto hidden sm:block grayscale hover:grayscale-0 transition-all" />
            <span className="font-bold tracking-tight text-sm uppercase sm:hidden">
              Nova Era
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#ferramentas" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              Ferramentas
            </a>
            <a href="#recursos" className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
          </nav>

          {/* Action Area */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-shimmer" />
            ) : user ? (
              <Button
                onClick={() => navigate({ to: "/app" })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8 px-4 text-xs uppercase tracking-wider rounded-none transition-transform hover:-translate-y-[1px]"
              >
                Abrir Estúdio
              </Button>
            ) : (
              <Button
                onClick={() => navigate({ to: "/auth" })}
                className="bg-foreground hover:bg-foreground/90 text-background font-bold h-8 px-4 text-xs uppercase tracking-wider rounded-none"
              >
                Acessar
              </Button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-foreground hover:bg-muted transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background absolute left-0 right-0 p-4 space-y-4 shadow-xl z-40">
            <nav className="flex flex-col gap-4">
              <a href="#ferramentas" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold uppercase tracking-widest text-foreground">Ferramentas</a>
              <a href="#recursos" onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold uppercase tracking-widest text-foreground">Recursos</a>
            </nav>
            <div className="pt-2">
              <Button
                onClick={() => { setMobileMenuOpen(false); navigate({ to: user ? "/app" : "/auth" }); }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 rounded-none uppercase tracking-wider"
              >
                {user ? "Abrir Estúdio" : "Acessar Plataforma"}
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO SECTION (Abstrato & Brutalista) ─── */}
      <section className="relative pt-24 pb-16 md:pt-40 md:pb-24 px-4 max-w-7xl mx-auto border-b border-border/20">
        <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
          
          {/* Esquerda: Tipografia Massiva */}
          <div className="flex-1 w-full text-left">
            <div className="animate-slide-up inline-flex items-center gap-2 mb-6">
              <Crosshair className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Estúdio de Composição Visual</span>
            </div>
            
            <h1 className="animate-slide-up stagger-2 text-5xl sm:text-7xl lg:text-[6rem] font-black tracking-tighter leading-[0.9] text-foreground mb-8">
              CONSTRUA <br/>
              RESULTADOS <br/>
              <span className="text-muted-foreground">PRECISOS.</span>
            </h1>
            
            <p className="animate-slide-up stagger-3 text-sm md:text-base text-muted-foreground max-w-md font-medium leading-relaxed mb-8 border-l-2 border-primary pl-4">
              Interface profissional desenhada para velocidade e escala. Sem jargões mágicos, apenas controle absoluto sobre suas composições gráficas.
            </p>
            
            <div className="animate-slide-up stagger-4 flex flex-col sm:flex-row items-start gap-4">
              <Button
                onClick={() => navigate({ to: user ? "/app" : "/auth" })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 px-8 rounded-none uppercase tracking-widest transition-transform hover:scale-[1.02]"
              >
                Iniciar Projeto <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Direita: Geometria Abstrata (Proporção Áurea ~38%) */}
          <div className="flex-1 w-full animate-fade-in stagger-5 flex justify-center md:justify-end">
            <div className="relative w-full max-w-[400px] aspect-square border border-border/50 bg-card/10 flex items-center justify-center overflow-hidden">
              {/* Abstract Lines */}
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-border/40" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-border/40" />
              <div className="absolute top-4 left-4 w-2 h-2 bg-primary" />
              <div className="absolute bottom-4 right-4 w-2 h-2 bg-accent" />
              {/* Central Box */}
              <div className="w-32 h-32 border border-primary/50 relative group">
                <div className="absolute -inset-2 border border-dashed border-border/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* ─── FEATURES GRID (Bento Minimalista) ─── */}
      <section id="ferramentas" className="py-24 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div 
            ref={featuresReveal.ref}
            className={`transition-all duration-700 transform ${featuresReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-3 mb-12 border-b border-border/40 pb-4">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Ferramentas de Layout</h2>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">v2.0</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-card border border-border/60 p-6 hover:border-primary/50 transition-colors duration-300 group"
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div className="w-10 h-10 border border-border flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-base uppercase tracking-wider mb-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS / SOCIAL PROOF (Sóbrio) ─── */}
      <section id="recursos" className="py-24 px-4 border-t border-border/20">
        <div className="max-w-7xl mx-auto">
          <div 
            ref={statsReveal.ref}
            className={`grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 transition-all duration-700 transform ${statsReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {[
              { label: "Renderização", value: "Sub-segundo" },
              { label: "Resolução Máx", value: "4K UHD" },
              { label: "Disponibilidade", value: "99.9%" }
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center md:items-start border-l border-primary/30 pl-6">
                <span className="text-3xl md:text-5xl font-black text-foreground mb-1 tracking-tighter">{stat.value}</span>
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BOTTOM ─── */}
      <section className="py-24 px-4 bg-card border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <div 
            ref={ctaReveal.ref}
            className={`transition-all duration-700 transform ${ctaReveal.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <Layers className="w-8 h-8 mx-auto text-primary mb-6" />
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
              Pronto para iniciar?
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Acesse o ambiente profissional e construa suas composições hoje.
            </p>
            <Button
              onClick={() => navigate({ to: user ? "/app" : "/auth" })}
              className="bg-foreground hover:bg-foreground/90 text-background font-bold h-14 px-10 rounded-none uppercase tracking-widest"
            >
              Abrir Aplicação
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-foreground flex items-center justify-center">
              <Layers className="w-3 h-3 text-background" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Nova Era</span>
          </div>

          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Estúdio Visual. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
