// Testes das regras de salvar e reabrir composições (src/lib/composicao.ts).
// Rodam direto no Node, sem navegador: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIMITE_IMAGENS_RASCUNHO,
  LIMITE_BYTES_RASCUNHO,
  montarRascunho,
  lerRascunho,
  montarModelo,
  lerModelo,
  posicoesDosDestaques,
  cabeNoLimite,
} from "../src/lib/composicao.ts";

const BASE = "https://exemplo.supabase.co/storage/v1/object/public/";
const FUNDO = `${BASE}backgrounds/u/fundo.webp`;
const LOGO = `${BASE}logos/u/logo.png`;
const PRINT = `${BASE}discord-images/bot/1/embed0.png`;

// Uma tela com fundo, logo e dois destaques: um do computador e um da aba Resultados.
const tela = {
  formato: "feed",
  fundo: FUNDO,
  logo: { url: LOGO, x: 0.5, y: 0.08, size: 0.25 },
  biblioteca: [
    { id: "a1", origem: "arquivo" },
    { id: "r1", origem: "url", url: PRINT },
  ],
  destaques: [
    { id: "a1", x: 0.28, y: 0.5, size: 0.4, proporcao: 1.5 },
    { id: "r1", x: 0.72, y: 0.5, size: 0.4, proporcao: 2 },
  ],
  lugares: null,
  modeloNome: null,
};

test("rascunho: vai e volta sem perder nada", () => {
  const salvo = JSON.parse(JSON.stringify(montarRascunho(tela)));
  const lido = lerRascunho(salvo, BASE);
  assert.equal(lido.versao, 1);
  assert.equal(lido.formato, "feed");
  assert.equal(lido.fundo, FUNDO);
  assert.deepEqual(lido.logo, tela.logo);
  assert.deepEqual(lido.biblioteca, tela.biblioteca);
  assert.deepEqual(
    lido.destaques,
    tela.destaques.map(({ id, x, y, size }) => ({ id, x, y, size })),
  );
  assert.equal(lido.lugares, null);
});

test("rascunho: guarda o modelo aberto e os lugares", () => {
  const comModelo = {
    ...tela,
    lugares: [{ x: 0.3, y: 0.4, size: 0.3, proporcao: 1.4 }],
    modeloNome: "Green do dia",
  };
  const lido = lerRascunho(JSON.parse(JSON.stringify(montarRascunho(comModelo))), BASE);
  assert.equal(lido.modeloNome, "Green do dia");
  assert.deepEqual(lido.lugares, comModelo.lugares);
});

test("rascunho: dado quebrado ou de outra versão vira null", () => {
  assert.equal(lerRascunho(null, BASE), null);
  assert.equal(lerRascunho("texto", BASE), null);
  assert.equal(lerRascunho({ ...montarRascunho(tela), versao: 2 }, BASE), null);
  assert.equal(lerRascunho({ ...montarRascunho(tela), formato: "quadrado" }, BASE), null);
  assert.equal(lerRascunho({ ...montarRascunho(tela), destaques: "x" }, BASE), null);
});

test("rascunho: número que não é número vira null; fora do limite é preso", () => {
  const ruim = montarRascunho(tela);
  ruim.destaques[0].x = "0.5";
  assert.equal(lerRascunho(ruim, BASE), null);

  const fora = montarRascunho(tela);
  fora.destaques[0].x = 7;
  fora.destaques[0].size = 0;
  const lido = lerRascunho(fora, BASE);
  assert.equal(lido.destaques[0].x, 1);
  assert.equal(lido.destaques[0].size, 0.02);
});

test("rascunho: endereço fora do armazenamento do projeto é descartado", () => {
  const estranho = montarRascunho({
    ...tela,
    fundo: "https://site-estranho.com/f.png",
    logo: { ...tela.logo, url: "javascript:alert(1)" },
    biblioteca: [{ id: "r9", origem: "url", url: "https://site-estranho.com/p.png" }],
    destaques: [{ id: "r9", x: 0.5, y: 0.5, size: 0.3, proporcao: 1 }],
  });
  const lido = lerRascunho(estranho, BASE);
  assert.equal(lido.fundo, null);
  assert.equal(lido.logo, null);
  assert.deepEqual(lido.biblioteca, []);
  assert.deepEqual(lido.destaques, []);
});

test("modelo: guarda os lugares dos destaques, sem as imagens", () => {
  const modelo = montarModelo(tela);
  assert.deepEqual(Object.keys(modelo).sort(), ["formato", "fundo", "logo", "lugares", "versao"]);
  assert.deepEqual(modelo.lugares, [
    { x: 0.28, y: 0.5, size: 0.4, proporcao: 1.5 },
    { x: 0.72, y: 0.5, size: 0.4, proporcao: 2 },
  ]);
  assert.ok(!JSON.stringify(modelo).includes("discord-images"));
});

test("modelo: lugares vazios de um modelo aberto continuam no modelo salvo", () => {
  const aberto = {
    ...tela,
    destaques: [tela.destaques[0]],
    lugares: [
      { x: 0.1, y: 0.1, size: 0.2, proporcao: 1 },
      { x: 0.2, y: 0.2, size: 0.2, proporcao: 1 },
      { x: 0.3, y: 0.3, size: 0.2, proporcao: 1 },
    ],
  };
  const modelo = montarModelo(aberto);
  assert.equal(modelo.lugares.length, 3);
  assert.deepEqual(modelo.lugares[0], { x: 0.28, y: 0.5, size: 0.4, proporcao: 1.5 });
  assert.deepEqual(modelo.lugares[2], aberto.lugares[2]);
});

test("modelo: vai e volta, e no máximo 20 lugares", () => {
  const muitos = {
    ...tela,
    formato: "story",
    destaques: Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      x: 0.5,
      y: 0.5,
      size: 0.1,
      proporcao: 1,
    })),
  };
  const lido = lerModelo(JSON.parse(JSON.stringify(montarModelo(muitos))), BASE);
  assert.equal(lido.formato, "story");
  assert.equal(lido.lugares.length, 20);
  assert.equal(lido.fundo, FUNDO);
});

test("modelo: dado quebrado vira null; proporção absurda é presa", () => {
  assert.equal(lerModelo({}, BASE), null);
  assert.equal(lerModelo({ ...montarModelo(tela), lugares: [{ x: 1 }] }, BASE), null);
  const m = montarModelo(tela);
  m.lugares[0].proporcao = 999;
  assert.equal(lerModelo(m, BASE).lugares[0].proporcao, 10);
});

test("posições: sem modelo usa a organização automática", () => {
  const auto = [{ x: 0.5, y: 0.5, size: 0.4 }];
  assert.deepEqual(posicoesDosDestaques(1, null, auto), { coords: auto, reorganizou: false });
});

test("posições: menos ou tantos destaques quanto lugares ocupam os lugares em ordem", () => {
  const lugares = [
    { x: 0.2, y: 0.3, size: 0.3, proporcao: 1 },
    { x: 0.8, y: 0.3, size: 0.3, proporcao: 1 },
    { x: 0.5, y: 0.7, size: 0.3, proporcao: 1 },
  ];
  const r = posicoesDosDestaques(2, lugares, []);
  assert.equal(r.reorganizou, false);
  assert.deepEqual(r.coords, [
    { x: 0.2, y: 0.3, size: 0.3 },
    { x: 0.8, y: 0.3, size: 0.3 },
  ]);
  assert.equal(posicoesDosDestaques(3, lugares, []).coords.length, 3);
});

test("posições: mais destaques que lugares volta para a organização automática", () => {
  const lugares = [{ x: 0.2, y: 0.3, size: 0.3, proporcao: 1 }];
  const auto = [
    { x: 0.3, y: 0.5, size: 0.3 },
    { x: 0.7, y: 0.5, size: 0.3 },
  ];
  assert.deepEqual(posicoesDosDestaques(2, lugares, auto), { coords: auto, reorganizou: true });
});

test("limite do rascunho: no máximo 20 imagens e 50 MB, na ordem recebida", () => {
  const vinteCinco = Array.from({ length: 25 }, (_, i) => ({ id: `i${i}`, tamanho: 1000 }));
  assert.equal(cabeNoLimite(vinteCinco).length, LIMITE_IMAGENS_RASCUNHO);

  const pesadas = [
    { id: "a", tamanho: 30 * 1024 * 1024 },
    { id: "b", tamanho: 30 * 1024 * 1024 },
    { id: "c", tamanho: 10 * 1024 * 1024 },
  ];
  assert.deepEqual(cabeNoLimite(pesadas), ["a", "c"]);
  assert.equal(LIMITE_BYTES_RASCUNHO, 50 * 1024 * 1024);
  assert.deepEqual(cabeNoLimite([]), []);
});
