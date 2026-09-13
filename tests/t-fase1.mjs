import { launch, openApp, PHONE, DESKTOP, profileFixture } from "./harness.mjs";

const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

// ---- 1. A aba existe no mobile e leva a /sinais mesmo sem sinal nenhum ----
console.log("\n[mobile 390x844] /app com ZERO resultados");
{
  const { ctx, page, erros } = await openApp(b, "/app", { viewport: PHONE, signals: [] });
  const nav = page.locator('nav[data-nav="mobile"]');
  ok(await nav.isVisible(), "barra de abas visível");
  ok(
    (await page.getByRole("link", { name: /Resultados/i }).count()) > 0,
    "aba Resultados presente sem dados",
  );

  const box = await page
    .getByRole("link", { name: /Resultados/i })
    .first()
    .boundingBox();
  ok(box && box.height >= 44, `alvo de toque ${box ? Math.round(box.height) : "?"}px (>= 44)`);

  await page
    .getByRole("link", { name: /Resultados/i })
    .first()
    .click();
  await page.waitForURL("**/resultados", { timeout: 5000 }).catch(() => {});
  ok(page.url().includes("/resultados"), "navegou para /resultados");
  await page.screenshot({ path: "s1-resultados-vazio.png" });
  ok(
    erros.filter((e) => !e.includes("404") && !e.includes("ERR_CONNECTION_RESET")).length === 0,
    "sem erro de console: " +
      JSON.stringify(
        erros.filter((e) => !e.includes("404") && !e.includes("ERR_CONNECTION_RESET")).slice(0, 2),
      ),
  );
  await ctx.close();
}

// ---- 2. Aba Admin só aparece para admin ----
console.log("\n[mobile] visibilidade da aba Admin");
{
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE });
  ok(
    (await page.getByRole("link", { name: /^Admin$/i }).count()) === 0,
    "membro comum NÃO vê Admin",
  );
  await ctx.close();
}
{
  const { ctx, page } = await openApp(b, "/app", {
    viewport: PHONE,
    profile: profileFixture({ is_admin: true }),
  });
  ok((await page.getByRole("link", { name: /^Admin$/i }).count()) > 0, "admin vê a aba Admin");
  await page.screenshot({ path: "s1-app-admin.png" });
  await ctx.close();
}

// ---- 3. A barra NÃO cobre o botão Baixar ----
console.log("\n[mobile] a barra não cobre o conteúdo");
{
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  // Com o espaçador da AppNav, o último conteúdo da página tem que terminar
  // acima da barra fixa — senão ela cobre o fim.
  const nb = await page.locator('nav[data-nav="mobile"]').boundingBox();
  const fim = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main ? main.getBoundingClientRect().bottom : -1;
  });
  ok(
    nb && fim <= nb.y + 1,
    `fim do conteúdo (${Math.round(fim)}) acima da barra (${Math.round(nb.y)})`,
  );
  await page.screenshot({ path: "s1-app-fim.png" });
  await ctx.close();
}

// ---- 4. Desktop: nav inline, sem barra de rodapé ----
console.log("\n[desktop 1440x900]");
{
  const { ctx, page } = await openApp(b, "/app", {
    viewport: DESKTOP,
    profile: profileFixture({ is_admin: true }),
  });
  const bottom = page.locator('nav[data-nav="mobile"]').first();
  ok(
    !(await bottom.isVisible()) || (await bottom.boundingBox())?.y < 800,
    "sem barra fixa no rodapé do desktop",
  );
  ok((await page.getByRole("link", { name: /Estúdio/i }).count()) > 0, "nav inline no header");
  await page.screenshot({ path: "s1-desktop.png" });
  await ctx.close();
}

// ---- 5. A barra não aparece fora do app ----
console.log("\n[mobile] landing e login");
for (const p of ["/", "/auth"]) {
  const { ctx, page } = await openApp(b, p, { viewport: PHONE, loggedIn: false });
  ok((await page.locator("nav[data-nav]").count()) === 0, `sem barra em ${p}`);
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
