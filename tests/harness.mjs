/**
 * Harness de teste em navegador para o Nova Era Gen.
 *
 * Injeta uma sessão falsa do Supabase e intercepta TODAS as chamadas ao
 * Supabase com fixtures locais. Nada sai para a produção — nenhuma conta é
 * criada, nenhuma linha é escrita. O que roda é o app de verdade: SSR,
 * hidratação, router, CSS.
 */
import { chromium } from "playwright";

export const BASE = "http://127.0.0.1:5199";
export const PROJECT_REF = "ejixsmqkyeltkqntvcpp";
const SUPA = `https://${PROJECT_REF}.supabase.co`;

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
    if (table === "backgrounds") return route.fulfill(json(backgrounds));
    if (table === "logos") return route.fulfill(json(logos));
    if (url.pathname.includes("/rpc/is_user_active")) {
      return route.fulfill(json(profile.is_admin || profile.status === "approved"));
    }
    return route.fulfill(json([]));
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
  return chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
}
