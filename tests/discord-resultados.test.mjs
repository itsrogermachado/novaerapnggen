// Testes das regras do bot do Discord. Só lógica pura: nada de rede nem banco.
// Rodar com: npm run test:unit  (o Node 24 lê o arquivo .ts direto)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BYTES_IMAGEM,
  caminhoNoBucket,
  expiraEm,
  extensaoDoTipo,
  extrairImagens,
  idDaData,
  ordenarDaMaisAntiga,
  segredoConfere,
} from "../src/lib/discord-resultados.ts";

test("idDaData gera um ID do Discord com a data certa dentro", () => {
  // Exemplo da documentação do Discord: este ID é de 2016-04-30T11:18:25.796Z.
  const idDaDoc = 175928847299117063n;
  const gerado = BigInt(idDaData(Date.parse("2016-04-30T11:18:25.796Z")));
  // Os 22 bits de baixo não são data (são contador interno), por isso comparamos só o resto.
  assert.equal(gerado >> 22n, idDaDoc >> 22n);
});

test("ordenarDaMaisAntiga compara como número e não mexe na lista original", () => {
  const original = [{ id: "100" }, { id: "99" }, { id: "1000" }];
  assert.deepEqual(
    ordenarDaMaisAntiga(original).map((m) => m.id),
    ["99", "100", "1000"],
  );
  assert.deepEqual(
    original.map((m) => m.id),
    ["100", "99", "1000"],
  );
});

test("extrairImagens aceita anexo png/jpeg/webp e recusa o resto", () => {
  const imagens = extrairImagens({
    id: "1",
    timestamp: "2026-09-15T12:00:00.000Z",
    attachments: [
      { id: "a1", content_type: "image/png", size: 1000, url: "https://cdn.discordapp.com/a1.png" },
      {
        id: "a2",
        content_type: "application/pdf",
        size: 1000,
        url: "https://cdn.discordapp.com/a2.pdf",
      },
      {
        id: "a3",
        content_type: "image/jpeg",
        size: MAX_BYTES_IMAGEM + 1,
        url: "https://cdn.discordapp.com/a3.jpg",
      },
      { id: "a4", size: 1000, url: "https://cdn.discordapp.com/a4" },
      {
        id: "a5",
        content_type: "image/webp",
        size: 1000,
        url: "https://cdn.discordapp.com/a5.webp",
      },
    ],
  });
  assert.deepEqual(imagens, [
    { chave: "a1", url: "https://cdn.discordapp.com/a1.png" },
    { chave: "a5", url: "https://cdn.discordapp.com/a5.webp" },
  ]);
});

test("extrairImagens pega imagem de embed só do Discord e ignora miniatura", () => {
  const imagens = extrairImagens({
    id: "1",
    timestamp: "2026-09-15T12:00:00.000Z",
    embeds: [
      {
        image: { url: "https://media.discordapp.net/attachments/x/print.png" },
        thumbnail: { url: "https://cdn.discordapp.com/avatars/u/avatar.png" },
      },
      { image: { url: "https://site-qualquer.com/print.png" } },
      { image: { url: "http://cdn.discordapp.com/sem-https.png" } },
      { image: { url: "isto não é url" } },
      { image: { url: "https://cdn.discordapp.com/attachments/y/outro.jpg" } },
    ],
  });
  assert.deepEqual(imagens, [
    { chave: "embed0", url: "https://media.discordapp.net/attachments/x/print.png" },
    { chave: "embed4", url: "https://cdn.discordapp.com/attachments/y/outro.jpg" },
  ]);
});

test("extrairImagens devolve lista vazia para mensagem só de texto", () => {
  assert.deepEqual(extrairImagens({ id: "1", timestamp: "2026-09-15T12:00:00.000Z" }), []);
});

test("extensaoDoTipo só conhece png, jpeg e webp", () => {
  assert.equal(extensaoDoTipo("image/png"), "png");
  assert.equal(extensaoDoTipo("image/jpeg"), "jpg");
  assert.equal(extensaoDoTipo("image/webp; charset=binary"), "webp");
  assert.equal(extensaoDoTipo("IMAGE/PNG"), "png");
  assert.equal(extensaoDoTipo("image/gif"), null);
  assert.equal(extensaoDoTipo(null), null);
});

test("caminhoNoBucket é fixo para a mesma imagem", () => {
  assert.equal(caminhoNoBucket("123", "a1", "png"), "bot/123/a1.png");
  assert.equal(caminhoNoBucket("123", "a1", "png"), caminhoNoBucket("123", "a1", "png"));
});

test("expiraEm soma 30 dias à data da mensagem", () => {
  assert.equal(expiraEm("2026-09-01T10:00:00.000Z"), "2026-10-01T10:00:00.000Z");
});

test("segredoConfere só aceita a senha exata", () => {
  assert.equal(segredoConfere("abc123", "abc123"), true);
  assert.equal(segredoConfere("abc124", "abc123"), false);
  assert.equal(segredoConfere("abc12", "abc123"), false);
  assert.equal(segredoConfere(null, "abc123"), false);
  assert.equal(segredoConfere("", ""), false);
});
