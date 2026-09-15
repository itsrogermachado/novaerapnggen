import "./lib/error-capture";

// SSR polyfill: Supabase client touches localStorage at module init,
// which doesn't exist in the workerd runtime and would crash SSR.
if (typeof (globalThis as unknown as Record<string, unknown>).localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as unknown as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// Cabeçalhos de proteção colocados em todas as respostas do site.
// - frame-ancestors: só o próprio site e o editor do Lovable podem exibir o site dentro de
//   um quadro (iframe). Isso bloqueia o golpe de "clique escondido", em que outro site
//   mostra o nosso por baixo de botões falsos, sem quebrar a prévia do editor.
// - Permissions-Policy: o site não usa câmera, microfone nem localização, então nenhum
//   script consegue pedir esses acessos em nome dele.
const CABECALHOS_DE_SEGURANCA: Record<string, string> = {
  "Content-Security-Policy":
    "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// Devolve a mesma resposta com os cabeçalhos de proteção.
// Copia para uma resposta nova porque algumas respostas chegam com cabeçalhos travados.
function comCabecalhosDeSeguranca(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [nome, valor] of Object.entries(CABECALHOS_DE_SEGURANCA)) {
    headers.set(nome, valor);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return comCabecalhosDeSeguranca(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return comCabecalhosDeSeguranca(brandedErrorResponse());
    }
  },
};
