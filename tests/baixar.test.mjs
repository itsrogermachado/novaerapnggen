// Testes das regras de nome de arquivo (src/lib/baixar.ts). Só lógica pura:
// a parte que fala com o navegador (compartilhar, <a download>) fica no teste de
// navegador tests/t-baixar.mjs.
// Rodar com: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apelido,
  criarNomeador,
  dataCurta,
  extensaoDe,
  nomeDoResultado,
  nomeDoZip,
  nomesUnicos,
  sanitizarNome,
} from "../src/lib/baixar.ts";

const BASE = "https://exemplo.supabase.co/storage/v1/object/public/discord-images/";

test("extensaoDe prefere o endereço e cai no tipo do arquivo", () => {
  assert.equal(extensaoDe(`${BASE}bot/1/print.png`), "png");
  assert.equal(extensaoDe(`${BASE}bot/1/print.WEBP`), "webp");
  // .jpeg e .jpg são o mesmo formato; um nome só evita duplicata boba.
  assert.equal(extensaoDe(`${BASE}bot/1/print.jpeg`), "jpg");
  // Query e âncora não fazem parte do nome.
  assert.equal(extensaoDe(`${BASE}bot/1/print.png?token=abc`), "png");
  // Sem extensão no endereço, decide o tipo do blob.
  assert.equal(extensaoDe(`${BASE}bot/1/print`, "image/webp"), "webp");
  assert.equal(extensaoDe(`${BASE}bot/1/print`, "image/jpeg; charset=binary"), "jpg");
  // Em data:/blob: o endereço não diz nada — o que vale é o tipo.
  assert.equal(extensaoDe("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", "image/svg+xml"), "svg");
  // Nada conhecido: png, que é o que o bot publica.
  assert.equal(extensaoDe(`${BASE}bot/1/print`, null), "png");
  // Extensão que não é de imagem não sequestra o nome.
  assert.equal(extensaoDe(`${BASE}bot/1/print.exe`, "image/png"), "png");
});

test("sanitizarNome tira o que algum sistema recusa", () => {
  assert.equal(sanitizarNome("res: 14:32 <novo>?.png"), "res- 14-32 -novo--.png");
  assert.equal(sanitizarNome("pasta/sub\\arq.png"), "pasta-sub-arq.png");
  // Ponto e espaço no fim: o Windows apaga em silêncio e o nome muda sozinho.
  assert.equal(sanitizarNome("resultado . .png"), "resultado.png");
  assert.equal(sanitizarNome("resultado..."), "resultado");
  // Nome que só tinha caractere proibido não pode virar nome vazio.
  assert.equal(sanitizarNome("   "), "arquivo");
  // Corta pelo tamanho, mas mantém a extensão.
  const longo = sanitizarNome("a".repeat(400) + ".png", 40);
  assert.ok(longo.endsWith(".png"));
  assert.ok(longo.length <= 40, `ficou com ${longo.length}`);
});

test("nomesUnicos não deixa um arquivo apagar o outro", () => {
  assert.deepEqual(nomesUnicos(["a.png", "b.png"]), ["a.png", "b.png"]);
  assert.deepEqual(nomesUnicos(["a.png", "a.png", "a.png"]), ["a.png", "a-2.png", "a-3.png"]);
  // No Windows e no macOS A.png e a.png são o mesmo arquivo.
  assert.deepEqual(nomesUnicos(["A.png", "a.png"]), ["A.png", "a-2.png"]);
  // O nome que já existia com sufixo não é atropelado.
  assert.deepEqual(nomesUnicos(["a.png", "a-2.png", "a.png"]), ["a.png", "a-2.png", "a-3.png"]);
  assert.deepEqual(nomesUnicos(["sem-ponto", "sem-ponto"]), ["sem-ponto", "sem-ponto-2"]);
});

test("criarNomeador mantém a conta entre uma parte e a seguinte", () => {
  // É isto que impede o lote em vários .zip de repetir nome entre as partes.
  const nomear = criarNomeador();
  assert.equal(nomear("x.png"), "x.png");
  assert.equal(nomear("x.png"), "x-2.png");
  const outro = criarNomeador();
  assert.equal(outro("x.png"), "x.png", "cada lote começa do zero");
});

test("apelido transforma legenda em pedaço de nome de arquivo", () => {
  assert.equal(apelido("Green na casa 3!"), "green-na-casa-3");
  assert.equal(apelido("Ação — 100% de acerto"), "acao-100-de-acerto");
  assert.equal(apelido("🔥🔥🔥"), "");
  assert.equal(apelido(null), "");
  assert.equal(apelido(undefined), "");
  assert.equal(apelido(""), "");
  // Não termina em traço nem passa do limite.
  const cortado = apelido("palavra ".repeat(20), 20);
  assert.ok(cortado.length <= 20);
  assert.ok(!cortado.endsWith("-"), cortado);
});

test("nomeDoResultado põe data, hora e legenda no nome", () => {
  const quando = new Date(2026, 8, 17, 14, 32, 5); // hora local, como o usuário vê
  const nome = nomeDoResultado(
    { id: "1", image_url: `${BASE}a.png`, uploaded_at: quando.toISOString(), caption: "Green!" },
    "png",
  );
  assert.equal(nome, "nova-era_2026-09-17_14h32_green.png");

  // Sem legenda o nome continua útil.
  assert.equal(
    nomeDoResultado(
      { id: "2", image_url: `${BASE}b.webp`, uploaded_at: quando.toISOString() },
      "webp",
    ),
    "nova-era_2026-09-17_14h32.webp",
  );

  // Data inválida não pode gerar "NaN" no nome.
  const semData = nomeDoResultado(
    { id: "3", image_url: `${BASE}c.png`, uploaded_at: "não é data", caption: null },
    "png",
  );
  assert.equal(semData, "nova-era_sem-data.png");
});

test("nomeDoZip numera as partes e nunca some com o período", () => {
  const hoje = dataCurta(new Date());
  assert.equal(nomeDoZip("Hoje"), `nova-era_hoje_${hoje}.zip`);
  assert.equal(
    nomeDoZip("Últimos 7 dias", 2, 3),
    `nova-era_ultimos-7-dias_${hoje}_parte-2-de-3.zip`,
  );
  // Rótulo que vira vazio depois de limpo ainda dá um nome utilizável.
  assert.equal(nomeDoZip("🔥"), `nova-era_resultados_${hoje}.zip`);
});

test("dataCurta usa o fuso do aparelho, não o UTC", () => {
  const d = new Date(2026, 0, 5, 23, 59);
  assert.equal(dataCurta(d), "2026-01-05");
});
