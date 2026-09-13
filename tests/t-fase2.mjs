import { launch, openApp, PHONE, profileFixture, signalsFixture } from "./harness.mjs";

const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};
const limpos = (e) => e.filter((x) => !x.includes("ERR_CONNECTION_RESET") && !x.includes("404"));

// ---- 1. A aba mostra dados reais (sem endpoint, sem bot) ----
console.log("\n[mobile] /sinais com 6 sinais");
{
  const { ctx, page, erros } = await openApp(b, "/resultados", { viewport: PHONE });
  await page.waitForTimeout(600);
  const cards = page.locator("main img[alt='Resultado']");
  ok((await cards.count()) === 6, `6 cartões renderizados (achei ${await cards.count()})`);
  ok(await page.getByText("6 resultados").isVisible(), "contador de ativos");
  ok(await page.getByText("Green na casa 1").first().isVisible(), "legenda aparece no cartão");
  await page.screenshot({ path: "s2-resultados-cheio.png", fullPage: false });
  ok(
    limpos(erros).length === 0,
    "sem erro de console " + JSON.stringify(limpos(erros).slice(0, 2)),
  );
  await ctx.close();
}

// ---- 2. Badge da aba reflete a contagem ----
console.log("\n[mobile] badge na barra de abas");
{
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE, signals: signalsFixture(3) });
  await page.waitForTimeout(600);
  const badge = page.locator('nav[data-nav="mobile"] span', { hasText: /^3$/ });
  ok((await badge.count()) > 0, "badge mostra 3");
  await ctx.close();
}

// ---- 3. Sinal expirado é descartado no cliente ----
console.log("\n[mobile] sinal vencido não aparece");
{
  const vencidos = signalsFixture(3).map((s, i) =>
    i === 0 ? { ...s, expires_at: new Date(Date.now() - 60_000).toISOString() } : s,
  );
  const { ctx, page } = await openApp(b, "/resultados", { viewport: PHONE, signals: vencidos });
  await page.waitForTimeout(600);
  ok(
    (await page.locator("main img[alt='Resultado']").count()) === 2,
    "o vencido foi filtrado (2 de 3)",
  );
  await ctx.close();
}

// ---- 4. Estado vazio ----
console.log("\n[mobile] nenhum sinal");
{
  const { ctx, page } = await openApp(b, "/resultados", { viewport: PHONE, signals: [] });
  await page.waitForTimeout(400);
  ok(await page.getByText("Nenhum resultado hoje").isVisible(), "estado vazio explicado");
  await ctx.close();
}

// ---- 5. Envio manual só existe para admin ----
console.log("\n[mobile] envio manual no painel");
{
  const { ctx, page } = await openApp(b, "/admin", {
    viewport: PHONE,
    profile: profileFixture({ is_admin: true }),
  });
  await page.waitForTimeout(600);
  ok(
    await page.getByText("Enviar resultado manualmente").isVisible(),
    "card de envio presente para admin",
  );
  ok(await page.getByLabel(/Validade/i).isVisible(), "seletor de validade");
  await page.screenshot({ path: "s2-admin-envio.png" });
  await ctx.close();
}

// ---- 6. Lightbox abre e navega ----
console.log("\n[mobile] lightbox");
{
  const { ctx, page } = await openApp(b, "/resultados", { viewport: PHONE });
  await page.waitForTimeout(600);
  await page.locator("main img[alt='Resultado']").first().click();
  await page.waitForTimeout(300);
  ok(await page.locator("img[alt='Resultado ampliado']").isVisible(), "lightbox abriu");
  ok(await page.getByText("1 / 6").isVisible(), "indicador de posição");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  ok((await page.locator("img[alt='Resultado ampliado']").count()) === 0, "Esc fecha");
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
