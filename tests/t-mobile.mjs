import { launch, openApp, PHONE, DESKTOP, profileFixture } from "./harness.mjs";
const b = await launch();
let falhas = 0;
const ok = (c, m) => {
  console.log((c ? "  ✓ " : "  ✗ ") + m);
  if (!c) falhas++;
};

const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="#1f2937"/></svg>`;
const BG = [
  {
    id: "bg-1",
    user_id: "u",
    name: "Fundo teste",
    image_url: `data:image/svg+xml;base64,${Buffer.from(bgSvg).toString("base64")}`,
    created_at: new Date().toISOString(),
  },
];
const LG = [
  {
    id: "lg-1",
    user_id: "u",
    name: "Logo teste",
    image_url: `data:image/svg+xml;base64,${Buffer.from(bgSvg).toString("base64")}`,
    created_at: new Date().toISOString(),
  },
];

console.log("\n[mobile 390x844] ordem de empilhamento");
{
  const { ctx, page, erros } = await openApp(b, "/app", {
    viewport: PHONE,
    backgrounds: BG,
    logos: LG,
  });
  await page.waitForTimeout(1200);

  const y = async (sel) => (await page.locator(sel).first().boundingBox())?.y ?? -1;
  const yCanvas = await y('[data-canvas="preview"]');
  const yControles = await y('main > div:has-text("Biblioteca de Fundos")');
  const yTimeline = (await page.getByText("Linha do Tempo").first().boundingBox())?.y ?? -1;

  ok(
    yCanvas < yTimeline,
    `canvas (${Math.round(yCanvas)}) antes da timeline (${Math.round(yTimeline)})`,
  );
  const yFundos = (await page.getByText("Biblioteca de Fundos").first().boundingBox())?.y ?? -1;
  ok(
    yFundos < yTimeline,
    `controles (${Math.round(yFundos)}) ANTES da timeline (${Math.round(yTimeline)}) — era o bug principal`,
  );

  await page.screenshot({ path: "s35-app-topo.png" });
  const reais = erros.filter((e) => !e.includes("ERR_CONNECTION_RESET") && !e.includes("404"));
  ok(reais.length === 0, "sem erro de console " + JSON.stringify(reais.slice(0, 2)));
  await ctx.close();
}

console.log("\n[mobile] o botão Baixar é alcançável sem maratona de scroll");
{
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE, backgrounds: BG });
  await page.waitForTimeout(1200);
  const alturaTotal = await page.evaluate(() => document.body.scrollHeight);
  const yBaixar =
    (await page.getByRole("button", { name: /Baixar Imagem/i }).boundingBox())?.y ?? -1;
  ok(
    yBaixar > 0 && yBaixar < alturaTotal * 0.75,
    `Baixar em y=${Math.round(yBaixar)} de ${alturaTotal}px totais (antes ficava depois da timeline)`,
  );
  await page.screenshot({ path: "s35-app-rolado.png" });
  await ctx.close();
}

console.log("\n[mobile] excluir visível no toque");
{
  const { ctx, page } = await openApp(b, "/app", {
    viewport: PHONE,
    backgrounds: BG,
    logos: LG,
    // simula aparelho sem hover
  });
  await page.waitForTimeout(1200);
  const btn = page.getByTitle("Excluir fundo").first();
  ok((await btn.count()) > 0, "botão de excluir existe no DOM");

  // Com o modo desligado, ele não pode interceptar toque na miniatura: tocar no
  // meio de um fundo tem que SELECIONAR, nunca apagar.
  const opDesligado = await btn.evaluate((el) => getComputedStyle(el).pointerEvents);
  ok(
    opDesligado === "none",
    `sem modo gerenciar, não recebe toque (pointer-events=${opDesligado})`,
  );
  await page.locator('img[alt="Fundo teste"]').first().click();
  await page.waitForTimeout(500);
  ok((await page.getByTitle("Excluir fundo").count()) > 0, "tocar na miniatura não apagou o fundo");

  // Ligando o modo, o botão passa a valer.
  await page.getByRole("button", { name: "Gerenciar" }).first().click();
  await page.waitForTimeout(300);
  const op = await btn.evaluate((el) => getComputedStyle(el).opacity);
  const bb = await btn.boundingBox();
  ok(op === "1", `com modo gerenciar, fica visível (opacity=${op})`);
  ok(bb && bb.height >= 40, `alvo ${bb ? Math.round(bb.height) : "?"}px`);
  await ctx.close();
}

console.log("\n[mobile] sliders com alvo de 44px");
{
  const { ctx, page } = await openApp(b, "/app", { viewport: PHONE, logos: LG });
  await page.waitForTimeout(1200);
  // A biblioteca de logos vive na aba Logos desde que o painel virou abas.
  await page.getByRole("tab", { name: "Logos" }).click();
  await page.waitForTimeout(400);
  await page.locator('img[alt="Logo teste"]').first().click();
  await page.waitForTimeout(800);
  const sl = page.locator('input[type="range"]').first();
  if (await sl.count()) {
    const bb = await sl.boundingBox();
    ok(bb && bb.height >= 44, `slider ${bb ? Math.round(bb.height) : "?"}px`);
  } else ok(false, "slider não apareceu");
  await ctx.close();
}

console.log("\n[desktop] layout de 3 colunas preservado");
{
  const { ctx, page } = await openApp(b, "/app", {
    viewport: DESKTOP,
    backgrounds: BG,
    profile: profileFixture({ is_admin: true }),
  });
  await page.waitForTimeout(1200);
  const c = await page.locator('[data-canvas="preview"]').boundingBox();
  const t = await page.getByText("Linha do Tempo").first().boundingBox();
  ok(c && t && Math.abs(c.y - t.y) < 260, "canvas e timeline lado a lado no desktop");
  await page.screenshot({ path: "s35-desktop.png" });
  await ctx.close();
}

await b.close();
console.log(falhas === 0 ? "\n=== TODOS OS TESTES PASSARAM ===" : `\n=== ${falhas} FALHA(S) ===`);
process.exit(falhas ? 1 : 0);
