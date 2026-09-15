import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { FilePlus2, FolderOpen, LayoutTemplate, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { lerModelo, type Modelo } from "@/lib/composicao";
import { BASE_STORAGE } from "@/lib/rascunho";
import { safeLogError } from "@/lib/log";

// ponytail: os tipos do banco (types.ts) são gerados pelo Lovable e ainda não conhecem a
// tabela "modelos". Até ele regerar, as chamadas passam sem checagem de tipo; o que volta
// do banco é conferido por lerModelo antes de ir para a tela.
const bancoSemTipos = supabase as unknown as SupabaseClient;

/** Uma linha da tabela modelos, do jeito que a lista mostra. */
type LinhaModelo = { id: string; nome: string; dados: unknown; atualizado_em: string };

// O mesmo nome com maiúsculas ou espaços diferentes conta como repetido (igual ao banco).
const normalizar = (nome: string) => nome.trim().toLowerCase();

const MAX_NOME = 60;

interface Props {
  /** Há algo na tela que valha salvar (fundo, logo ou destaque)? */
  podeSalvar: boolean;
  /** Monta o modelo da tela atual na hora de salvar. */
  montarModelo: () => Modelo;
  /** Nome do modelo aberto agora, para sugerir no campo ao salvar. */
  modeloAberto: string | null;
  /** Coloca na tela o modelo escolhido. */
  aoAbrir: (modelo: Modelo, nome: string) => void;
  /** Limpa a tela e apaga o rascunho. */
  aoNovaComposicao: () => void;
}

/**
 * Menu "Modelos" do Estúdio: salvar a tela como modelo, abrir um modelo salvo e começar
 * uma composição nova. Modelos ficam na conta (tabela modelos) e abrem em qualquer aparelho.
 */
export function MenuModelos({
  podeSalvar,
  montarModelo,
  modeloAberto,
  aoAbrir,
  aoNovaComposicao,
}: Props) {
  const [salvarAberto, setSalvarAberto] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const [confirmarNova, setConfirmarNova] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [modelos, setModelos] = useState<LinhaModelo[]>([]);
  // Modelo com o mesmo nome, esperando a pessoa confirmar a substituição.
  const [substituir, setSubstituir] = useState<LinhaModelo | null>(null);
  const [apagar, setApagar] = useState<LinhaModelo | null>(null);

  // Busca os modelos da conta, do mais recente para o mais antigo.
  const carregarModelos = async (): Promise<LinhaModelo[]> => {
    setCarregando(true);
    try {
      const { data, error } = await bancoSemTipos
        .from("modelos")
        .select("id, nome, dados, atualizado_em")
        .order("atualizado_em", { ascending: false });
      if (error) throw error;
      const linhas = (data ?? []) as LinhaModelo[];
      setModelos(linhas);
      return linhas;
    } catch (err) {
      safeLogError("Falha ao listar modelos:", err);
      toast.error("Não foi possível carregar seus modelos. Tente de novo.");
      return [];
    } finally {
      setCarregando(false);
    }
  };

  const abrirSalvar = () => {
    setNome(modeloAberto ?? "");
    setSalvarAberto(true);
    // A lista serve para descobrir nome repetido antes de gravar.
    void carregarModelos();
  };

  const abrirLista = () => {
    setListaAberta(true);
    void carregarModelos();
  };

  // Grava o modelo: cria um novo ou, se a pessoa confirmou, substitui o de mesmo nome.
  const gravar = async (existente: LinhaModelo | null) => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;
    setSalvando(true);
    try {
      const dados = montarModelo();
      const { error } = existente
        ? await bancoSemTipos
            .from("modelos")
            .update({ nome: nomeLimpo, dados, atualizado_em: new Date().toISOString() })
            .eq("id", existente.id)
        : await bancoSemTipos.from("modelos").insert({ nome: nomeLimpo, dados });
      if (error) throw error;
      toast.success(existente ? `Modelo "${nomeLimpo}" atualizado` : `Modelo "${nomeLimpo}" salvo`);
      setSalvarAberto(false);
      setSubstituir(null);
    } catch (err) {
      // 23505 = nome repetido criado em outro aparelho entre a lista e a gravação.
      const codigo = (err as { code?: string }).code;
      safeLogError("Falha ao salvar modelo:", err);
      toast.error(
        codigo === "23505"
          ? "Já existe um modelo com esse nome. Escolha outro nome."
          : "Não foi possível salvar o modelo. Tente de novo.",
      );
    } finally {
      setSalvando(false);
    }
  };

  // Ao confirmar o nome: se já existe um modelo igual, pergunta antes de substituir.
  const confirmarSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const lista = modelos.length > 0 ? modelos : await carregarModelos();
    const igual = lista.find((m) => normalizar(m.nome) === normalizar(nome));
    if (!igual) return void gravar(null);
    // Troca um diálogo pelo outro em vez de empilhar: dois diálogos abertos ao mesmo
    // tempo deixavam a tela travada depois de cancelar.
    setSalvarAberto(false);
    setSubstituir(igual);
  };

  // Abre um modelo da lista; dado estragado não vai para a tela.
  const abrirModelo = (linha: LinhaModelo) => {
    const modelo = lerModelo(linha.dados, BASE_STORAGE);
    if (!modelo) {
      toast.error("Esse modelo está com defeito e não pôde ser aberto.");
      return;
    }
    setListaAberta(false);
    aoAbrir(modelo, linha.nome);
  };

  const confirmarApagar = async () => {
    if (!apagar) return;
    const alvo = apagar;
    setApagar(null);
    const { error } = await bancoSemTipos.from("modelos").delete().eq("id", alvo.id);
    if (error) {
      safeLogError("Falha ao apagar modelo:", error);
      toast.error("Não foi possível apagar o modelo.");
      return;
    }
    setModelos((lista) => lista.filter((m) => m.id !== alvo.id));
    toast.success(`Modelo "${alvo.nome}" apagado`);
  };

  const formatoDe = (dados: unknown) =>
    (dados as { formato?: string } | null)?.formato === "story" ? "Stories" : "Feed";

  return (
    <>
      {/* modal={false}: sem isso o diálogo aberto pelo menu fica com a tela travada. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 gap-2 rounded-sm border-border bg-background px-3 text-xs font-bold uppercase tracking-wider"
          >
            <LayoutTemplate className="h-4 w-4 text-primary" />
            Modelos
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60 rounded-sm">
          <DropdownMenuItem
            disabled={!podeSalvar}
            onSelect={abrirSalvar}
            className="min-h-[44px] gap-2 rounded-sm"
          >
            <Save className="h-4 w-4" />
            <span className="flex flex-col">
              Salvar como modelo
              {!podeSalvar && (
                <span className="text-[11px] text-muted-foreground">
                  Coloque um fundo, logo ou destaque antes
                </span>
              )}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={abrirLista} className="min-h-[44px] gap-2 rounded-sm">
            <FolderOpen className="h-4 w-4" />
            Abrir modelo
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setConfirmarNova(true)}
            className="min-h-[44px] gap-2 rounded-sm"
          >
            <FilePlus2 className="h-4 w-4" />
            Nova composição
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Salvar como modelo: só pede o nome. */}
      <Dialog open={salvarAberto} onOpenChange={setSalvarAberto}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle>Salvar como modelo</DialogTitle>
            <DialogDescription>
              Guarda o formato, o fundo, a logo e os lugares dos destaques. Os prints não entram:
              você coloca os do dia quando abrir o modelo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmarSalvar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome-modelo">Nome do modelo</Label>
              <Input
                id="nome-modelo"
                value={nome}
                maxLength={MAX_NOME}
                required
                autoFocus
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Green do dia"
                className="h-11 rounded-sm"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={salvando || !nome.trim()}
                className="h-11 w-full rounded-sm font-bold"
              >
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar modelo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lista para abrir ou apagar modelos. */}
      <Dialog open={listaAberta} onOpenChange={setListaAberta}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle>Abrir modelo</DialogTitle>
            <DialogDescription>
              O layout vai para a tela e os destaques ocupam os lugares do modelo.
            </DialogDescription>
          </DialogHeader>
          {carregando && modelos.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : modelos.length === 0 ? (
            <p className="rounded-sm border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum modelo ainda. Monte uma arte e use “Salvar como modelo” no menu Modelos.
            </p>
          ) : (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
              {modelos.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-sm border border-border bg-background"
                >
                  <button
                    type="button"
                    onClick={() => abrirModelo(m)}
                    className="flex min-h-[52px] min-w-0 flex-1 flex-col items-start justify-center px-3 text-left hover:text-primary rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <span className="w-full truncate text-sm font-bold">{m.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatoDe(m.dados)} · {new Date(m.atualizado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApagar(m)}
                    aria-label={`Apagar modelo ${m.nome}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de substituir modelo com o mesmo nome. */}
      <AlertDialog open={!!substituir} onOpenChange={(v) => !v && setSubstituir(null)}>
        <AlertDialogContent className="max-w-sm rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um modelo chamado “{substituir?.nome}”. Ele será trocado pela tela atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-sm" onClick={() => void gravar(substituir)}>
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de apagar modelo. */}
      <AlertDialog open={!!apagar} onOpenChange={(v) => !v && setApagar(null)}>
        <AlertDialogContent className="max-w-sm rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              “{apagar?.nome}” some da sua conta em todos os aparelhos. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmarApagar()}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de nova composição. */}
      <AlertDialog open={confirmarNova} onOpenChange={setConfirmarNova}>
        <AlertDialogContent className="max-w-sm rounded-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Começar uma composição nova?</AlertDialogTitle>
            <AlertDialogDescription>
              A tela fica vazia. Seus fundos, logos e modelos salvos continuam, e Ctrl+Z traz a tela
              de volta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-sm" onClick={aoNovaComposicao}>
              Limpar a tela
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
