/**
 * Harness de teste em navegador para o Nova Era Gen.
 *
 * Injeta uma sessão falsa do Supabase e intercepta TODAS as chamadas ao
 * Supabase com fixtures locais. Nada sai para a produção — nenhuma conta é
 * criada, nenhuma linha é escrita. O que roda é o app de verdade: SSR,
 * hidratação, router, CSS.
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright";

export const BASE = "http://127.0.0.1:5199";
export const PROJECT_REF = "ejixsmqkyeltkqntvcpp";
const SUPA = `https://${PROJECT_REF}.supabase.co`;
/** Começo dos endereços de imagem do armazenamento público (o app só aceita estes). */
export const STORAGE = `${SUPA}/storage/v1/object/public/`;

export const PHONE = { width: 390, height: 844 }; // iPhone 14/15
export const DESKTOP = { width: 1440, height: 900 };

const USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "teste@novaera.local",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

function session() {
  return {
    access_token: "fake-access-token",
    refresh_token: "fake-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: USER,
  };
}

export function profileFixture(over = {}) {
  return {
    id: USER.id,
    email: USER.email,
    is_admin: false,
    status: "approved",
    expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

/** Sinais falsos, em SVG data-URI para não depender de rede. */
export function signalsFixture(n = 6) {
  const cores = ["16a34a", "0ea5e9", "f97316", "a855f7", "ef4444", "eab308"];
  return Array.from({ length: n }, (_, i) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#${cores[i % cores.length]}"/><text x="200" y="160" font-family="sans-serif" font-size="42" fill="white" text-anchor="middle">SINAL ${i + 1}</text></svg>`;
    return {
      id: `sig-${i + 1}`,
      image_url: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      storage_path: `bot/sig-${i + 1}.png`,
      uploaded_at: new Date(Date.now() - i * 37 * 60_000).toISOString(),
      // Retenção de 30 dias a partir da publicação.
      expires_at: new Date(Date.now() - i * 37 * 60_000 + 30 * 864e5).toISOString(),
      caption: i % 2 === 0 ? `Green na casa ${i + 1}` : null,
      author: null,
      source: "discord",
      status: "novo",
    };
  });
}

/**
 * @param {object} opts
 * @param {boolean} opts.loggedIn
 * @param {object}  opts.profile   override do perfil
 * @param {array}   opts.signals   linhas de discord_images
 * @param {boolean} opts.profileFails  simula queda de rede na leitura do perfil
 */
export async function openApp(browser, path, opts = {}) {
  const {
    viewport = PHONE,
    loggedIn = true,
    profile = profileFixture(),
    signals = signalsFixture(),
    profileFails = false,
    backgrounds = [],
    logos = [],
    // Modelos salvos (tabela modelos). A lista é a mesma durante todo o contexto, então
    // sobrevive a recarregar a página, como no banco de verdade.
    modelos = [],
    // Endereços do armazenamento que devem responder 404 (imagem apagada ou vencida).
    imagensSumidas = [],
    // Atraso das imagens do armazenamento, para testar o que termina antes de quê.
    atrasoStorageMs = 0,
    // Simula um celular que sabe salvar na galeria (Web Share com arquivos).
    // O Chromium de teste não tem navigator.share, então sem isto o app acha
    // que está num aparelho que só sabe baixar .zip.
    comGaleria = false,
    // Faz o menu de compartilhar recusar, como o iOS faz quando o toque do
    // usuário já expirou enquanto as imagens baixavam.
    galeriaRecusa = false,
    // Quantos arquivos o aparelho aceita por envio. null = sem limite.
    limiteDaGaleria = null,
  } = opts;

  // isMobile/hasTouch fazem o Chromium reportar hover:none e pointer:coarse,
  // que é o que decide a visibilidade dos botões de excluir.
  const ehCelular = viewport.width < 768;
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: ehCelular,
    hasTouch: ehCelular,
  });

  const json = (body, status = 200) => ({
    status,
    contentType: "application/json",
    headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify(body),
  });

  // --- Supabase REST ---
  await ctx.route(`${SUPA}/rest/v1/**`, async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split("/rest/v1/")[1]?.split("?")[0];

    if (route.request().method() === "OPTIONS") return route.fulfill(json({}));

    if (table === "profiles") {
      if (profileFails) return route.abort("failed");
      // .single() manda Accept: application/vnd.pgrst.object+json e espera UM
      // objeto; .select() sem single espera uma lista. O painel admin usa a
      // segunda forma, então devolver sempre objeto quebrava o users.filter().
      const single = (route.request().headers()["accept"] || "").includes("pgrst.object");
      return route.fulfill(json(single ? profile : [profile]));
    }
    if (table === "discord_images") {
      // Contagem para o badge: select=id + Prefer: count=exact, sem corpo útil.
      if ((route.request().headers()["prefer"] || "").includes("count=exact")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "*",
            "content-range": `*/${signals.length}`,
            "access-control-expose-headers": "content-range",
          },
          body: "[]",
        });
      }
      // Paginação: o supabase-js manda offset/limit na query string.
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? signals.length);
      // e o filtro de expiração vai como expires_at=gt.<iso>
      const gt = url.searchParams.get("expires_at");
      let lista = signals;
      if (gt?.startsWith("gt.")) {
        const corte = new Date(gt.slice(3)).getTime();
        lista = lista.filter((s) => new Date(s.expires_at).getTime() > corte);
      }
      return route.fulfill(json(lista.slice(offset, offset + limit)));
    }
    if (table === "modelos") {
      const req = route.request();
      const metodo = req.method();
      const idAlvo = url.searchParams.get("id")?.replace(/^eq\./, "");
      const single = (req.headers()["accept"] || "").includes("pgrst.object");
      if (metodo === "GET") {
        const ordenados = [...modelos].sort((a, b) =>
          b.atualizado_em.localeCompare(a.atualizado_em),
        );
        return route.fulfill(json(ordenados));
      }
      if (metodo === "POST") {
        const corpo = JSON.parse(req.postData() || "{}");
        const linhas = (Array.isArray(corpo) ? corpo : [corpo]).map((c) => ({
          id: `mod-${modelos.length + 1}-${Date.now()}`,
          user_id: USER.id,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
          ...c,
        }));
        // Mesma regra do índice único do banco: nome repetido na conta é recusado.
        const repetido = linhas.some((l) =>
          modelos.some((m) => m.nome.trim().toLowerCase() === l.nome.trim().toLowerCase()),
        );
        if (repetido) return route.fulfill(json({ code: "23505", message: "duplicate" }, 409));
        modelos.push(...linhas);
        return route.fulfill(json(single ? linhas[0] : linhas, 201));
      }
      if (metodo === "PATCH") {
        const corpo = JSON.parse(req.postData() || "{}");
        const alvo = modelos.find((m) => m.id === idAlvo);
        if (alvo) Object.assign(alvo, corpo);
        return route.fulfill(json(alvo ? [alvo] : []));
      }
      if (metodo === "DELETE") {
        const i = modelos.findIndex((m) => m.id === idAlvo);
        if (i >= 0) modelos.splice(i, 1);
        return route.fulfill(json([]));
      }
    }
    if (table === "backgrounds") return route.fulfill(json(backgrounds));
    if (table === "logos") return route.fulfill(json(logos));
    if (url.pathname.includes("/rpc/is_user_active")) {
      return route.fulfill(json(profile.is_admin || profile.status === "approved"));
    }
    return route.fulfill(json([]));
  });

  // --- Supabase Storage (imagens públicas): um SVG colorido por endereço ---
  await ctx.route(`${SUPA}/storage/v1/object/public/**`, async (route) => {
    const endereco = route.request().url();
    if (atrasoStorageMs) await new Promise((r) => setTimeout(r, atrasoStorageMs));
    if (imagensSumidas.includes(endereco)) {
      return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
    }
    // Cor tirada do próprio endereço, para imagens diferentes parecerem diferentes.
    let soma = 0;
    for (const c of endereco) soma = (soma * 31 + c.charCodeAt(0)) >>> 0;
    const cor = (soma & 0xffffff).toString(16).padStart(6, "0");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#${cor}"/></svg>`;
    return route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      headers: { "access-control-allow-origin": "*" },
      body: svg,
    });
  });

  // --- Supabase Auth ---
  await ctx.route(`${SUPA}/auth/v1/**`, async (route) => {
    const u = route.request().url();
    if (u.includes("/user")) return route.fulfill(json(USER));
    if (u.includes("/token")) return route.fulfill(json(session()));
    if (u.includes("/logout")) return route.fulfill(json({}));
    return route.fulfill(json({}));
  });

  // --- Endpoint do bot: hoje responde 404 de verdade (não está no route tree) ---
  await ctx.route("**/api/discord-images*", (route) =>
    route.fulfill({ status: 404, contentType: "text/html", body: "Not Found" }),
  );

  if (comGaleria) {
    await ctx.addInitScript(
      ([recusa, limite]) => {
        // Registra o que foi compartilhado para o teste conferir depois.
        window.__compartilhados = [];
        const cabe = (dados) =>
          Array.isArray(dados?.files) &&
          dados.files.length > 0 &&
          (limite === null || dados.files.length <= limite);
        navigator.canShare = cabe;
        navigator.share = async (dados) => {
          if (recusa || !cabe(dados)) {
            const erro = new Error(recusa ? "gesto expirado" : "arquivos demais");
            erro.name = "NotAllowedError";
            throw erro;
          }
          window.__compartilhados.push((dados.files || []).map((f) => f.name));
        };
      },
      [galeriaRecusa, limiteDaGaleria],
    );
  }

  if (loggedIn) {
    await ctx.addInitScript(
      ([ref, s]) => {
        localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
      },
      [PROJECT_REF, session()],
    );
  }

  const page = await ctx.newPage();
  const erros = [];
  page.on("console", (m) => {
    if (m.type() === "error") erros.push(m.text());
  });
  page.on("pageerror", (e) => erros.push("PAGEERROR: " + e.message));

  await page.goto(BASE + path, { waitUntil: "networkidle" });
  return { ctx, page, erros };
}

export async function launch() {
  // O Chromium fixo abaixo é o da máquina Linux onde a suíte foi criada. Em outra
  // máquina (Windows, por exemplo) esse caminho não existe, então usa o Chromium que
  // o próprio Playwright instala (npx playwright install chromium).
  const chromiumLinux = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  return chromium.launch(existsSync(chromiumLinux) ? { executablePath: chromiumLinux } : {});
}
