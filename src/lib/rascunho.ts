// Guarda o rascunho do Estúdio no próprio navegador (IndexedDB), para a pessoa voltar
// de onde parou depois de recarregar ou fechar a aba.
//
// IndexedDB é o "banco de dados" que todo navegador já traz: aceita guardar arquivos
// de imagem inteiros, coisa que o localStorage não faz. Nada disso sai do aparelho.
// Cada conta tem a sua gaveta (a chave é o id do usuário), então duas pessoas no mesmo
// computador não misturam rascunhos.
//
// Se o navegador não deixar gravar (aba anônima, espaço cheio), o Estúdio continua
// funcionando normalmente: só deixa de lembrar da tela.
import { safeLogError } from "@/lib/log";

/**
 * Começo dos endereços de imagem do armazenamento público do projeto. Rascunho e modelo
 * só aceitam imagem que comece assim (ver lerRascunho e lerModelo em composicao.ts).
 */
export const BASE_STORAGE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/`;

const BANCO = "nova-era-estudio";
const GAVETA = "rascunhos";

/** O que fica guardado: o rascunho (conferido depois por lerRascunho) e as imagens do computador. */
export type RascunhoGuardado = { rascunho: unknown; arquivos: Record<string, Blob> };

/** Abre (e cria na primeira vez) o banco do navegador. */
function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("sem IndexedDB"));
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(GAVETA);
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

/** Faz uma operação na gaveta e espera ela terminar. */
async function naGaveta<T>(
  modo: IDBTransactionMode,
  operacao: (gaveta: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const banco = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transacao = banco.transaction(GAVETA, modo);
      const pedido = operacao(transacao.objectStore(GAVETA));
      transacao.oncomplete = () => resolve(pedido.result as T);
      transacao.onerror = () => reject(transacao.error);
      transacao.onabort = () => reject(transacao.error);
    });
  } finally {
    banco.close();
  }
}

/** Lê o rascunho da conta. Sem rascunho ou com erro, devolve null. */
export async function lerRascunhoSalvo(userId: string): Promise<RascunhoGuardado | null> {
  try {
    const salvo = await naGaveta<RascunhoGuardado | undefined>("readonly", (g) => g.get(userId));
    return salvo ?? null;
  } catch (err) {
    safeLogError("Não foi possível ler o rascunho:", err);
    return null;
  }
}

/** Grava o rascunho da conta por cima do anterior. */
export async function gravarRascunho(userId: string, dados: RascunhoGuardado): Promise<void> {
  try {
    await naGaveta("readwrite", (g) => g.put(dados, userId));
  } catch (err) {
    safeLogError("Não foi possível gravar o rascunho:", err);
  }
}

/** Apaga o rascunho da conta (usado por "Nova composição"). */
export async function apagarRascunho(userId: string): Promise<void> {
  try {
    await naGaveta("readwrite", (g) => g.delete(userId));
  } catch (err) {
    safeLogError("Não foi possível apagar o rascunho:", err);
  }
}
