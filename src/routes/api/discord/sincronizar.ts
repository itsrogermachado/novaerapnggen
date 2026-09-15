import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DIAS_IMPORTACAO,
  MAX_BYTES_IMAGEM,
  UM_DIA_MS,
  caminhoNoBucket,
  expiraEm,
  extensaoDoTipo,
  extrairImagens,
  idDaData,
  ordenarDaMaisAntiga,
  segredoConfere,
  type ImagemEncontrada,
  type MensagemDiscord,
} from "@/lib/discord-resultados";

// Bucket onde os prints ficam guardados (o mesmo que a aba Resultados já lê).
const BUCKET = "discord-images";

// Endereço da API do Discord, versão 10.
const DISCORD_API = "https://discord.com/api/v10";

// Limites de cada execução. O agendador chama esta rota a cada minuto; o que não
// couber numa execução fica para a seguinte. Com esses números cada chamada faz
// menos de 50 pedidos para fora, que é o teto do servidor do site por execução.
const MAX_IMAGENS_POR_EXECUCAO = 10;
const TEMPO_MAX_MS = 25_000;
const MAX_VENCIDOS_POR_EXECUCAO = 20;

// O que pode acontecer com cada imagem. "falhou" é erro passageiro (rede, banco):
// a mensagem é tentada de novo no minuto seguinte.
type Desfecho = "salvas" | "repetidas" | "ignoradas" | "falhou";

// ponytail: os tipos gerados (types.ts) ainda não conhecem a tabela discord_bot e esse
// arquivo não se edita à mão. Quando o Lovable regenerar os tipos, usar supabaseAdmin direto.
const bancoSemTipos = supabaseAdmin as unknown as SupabaseClient;

// Monta uma resposta JSON com o código HTTP escolhido.
function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Baixa uma imagem do Discord e guarda no site.
// Baixa na hora porque o link do Discord vence em poucas horas. O nome do arquivo é
// fixo, e o banco recusa a mesma imagem duas vezes (erro 23505), então repetir é seguro.
// Nunca guarda nome de quem postou: author e caption ficam vazios de propósito.
async function salvarImagem(
  msg: MensagemDiscord,
  imagem: ImagemEncontrada,
  canal: string,
): Promise<Desfecho> {
  let download: Response;
  try {
    download = await fetch(imagem.url);
  } catch (erro) {
    console.error("[discord] falha ao baixar imagem", msg.id, erro);
    return "falhou";
  }

  // 404/403: a imagem foi apagada no Discord. Não adianta tentar de novo.
  if (download.status === 404 || download.status === 403) return "ignoradas";
  if (!download.ok) {
    console.error("[discord] download respondeu", download.status, msg.id);
    return "falhou";
  }

  // Confere o tipo e o tamanho reais do arquivo, não só o que a mensagem dizia.
  const tipo = download.headers.get("content-type");
  const extensao = extensaoDoTipo(tipo);
  if (!tipo || !extensao) return "ignoradas";
  const bytes = await download.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES_IMAGEM) return "ignoradas";

  const caminho = caminhoNoBucket(msg.id, imagem.chave, extensao);
  const { error: erroUpload } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(caminho, bytes, { contentType: tipo.split(";")[0].trim(), upsert: true });
  if (erroUpload) {
    console.error("[discord] falha ao subir no bucket", caminho, erroUpload.message);
    return "falhou";
  }

  const { data: publico } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(caminho);
  const { error: erroLinha } = await supabaseAdmin.from("discord_images").insert({
    image_url: publico.publicUrl,
    storage_path: caminho,
    source: "discord",
    status: "novo",
    discord_message_id: msg.id,
    channel_id: canal,
    author: null,
    caption: null,
    // A data do resultado é a do post no Discord, para o filtro "Hoje/Ontem" bater.
    uploaded_at: msg.timestamp,
    expires_at: expiraEm(msg.timestamp),
  });

  if (erroLinha) {
    // 23505 = já existe essa imagem dessa mensagem. Não é erro: é repetição.
    if (erroLinha.code === "23505") return "repetidas";
    console.error("[discord] falha ao gravar linha", caminho, erroLinha.message);
    return "falhou";
  }
  return "salvas";
}

// Apaga do bucket e do banco os resultados que já passaram de 30 dias.
// Primeiro os arquivos; só se der certo apaga as linhas. Assim, se falhar no meio,
// a próxima execução tenta de novo em vez de deixar arquivo órfão no bucket.
async function apagarVencidos(): Promise<number> {
  const { data: vencidos, error } = await supabaseAdmin
    .from("discord_images")
    .select("id, storage_path")
    .lt("expires_at", new Date().toISOString())
    .limit(MAX_VENCIDOS_POR_EXECUCAO);
  if (error) {
    console.error("[discord] falha ao listar vencidos", error.message);
    return 0;
  }
  if (!vencidos || vencidos.length === 0) return 0;

  const { error: erroArquivos } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove(vencidos.map((v) => v.storage_path));
  if (erroArquivos) {
    console.error("[discord] falha ao apagar arquivos vencidos", erroArquivos.message);
    return 0;
  }

  const { error: erroLinhas } = await supabaseAdmin
    .from("discord_images")
    .delete()
    .in(
      "id",
      vencidos.map((v) => v.id),
    );
  if (erroLinhas) {
    console.error("[discord] falha ao apagar linhas vencidas", erroLinhas.message);
    return 0;
  }
  return vencidos.length;
}

// Rota chamada pelo agendador do banco a cada minuto.
// Fluxo: confere a senha → apaga vencidos → pede ao Discord as mensagens depois da
// última lida → salva as imagens → anota até onde leu.
export const Route = createFileRoute("/api/discord/sincronizar")({
  server: {
    handlers: {
      // Abrir o endereço no navegador não faz nada: só o agendador usa, e sempre com POST.
      GET: () => json({ erro: "método não permitido" }, 405),

      POST: async ({ request }) => {
        try {
          // 1) Sem senha nem consulta o banco.
          const recebido = request.headers.get("x-cron-secret");
          if (!recebido) return json({ erro: "não autorizado" }, 401);

          // 2) Estado do bot: senha esperada, canal lido por último e até onde leu.
          const { data: estado, error: erroEstado } = await bancoSemTipos
            .from("discord_bot")
            .select("cron_secret, channel_id, ultimo_id")
            .eq("id", 1)
            .single();
          if (erroEstado || !estado) {
            console.error("[discord] estado do bot não encontrado", erroEstado?.message);
            return json({ erro: "configuração ausente" }, 500);
          }
          if (!segredoConfere(recebido, estado.cron_secret)) {
            return json({ erro: "não autorizado" }, 401);
          }

          // 3) Token e canal vêm do Lovable Cloud → Secrets.
          // Lidos aqui dentro (e não no topo do arquivo) porque no servidor do site
          // os segredos só existem durante a requisição.
          const token = process.env.DISCORD_BOT_TOKEN;
          const canal = process.env.DISCORD_CHANNEL_ID;
          if (!token || !canal) {
            console.error("[discord] faltam DISCORD_BOT_TOKEN ou DISCORD_CHANNEL_ID");
            return json({ erro: "segredos ausentes" }, 500);
          }

          const resumo = {
            mensagens: 0,
            salvas: 0,
            repetidas: 0,
            ignoradas: 0,
            vencidosApagados: 0,
          };

          // 4) Limpeza dos 30 dias, antes de tudo (é rápida).
          resumo.vencidosApagados = await apagarVencidos();

          // 5) Canal diferente do último lido (primeira vez ou troca do teste para o real):
          // começa a ler de 7 dias atrás. Senão, continua de onde parou.
          let ultimoId: string =
            estado.channel_id === canal && estado.ultimo_id
              ? estado.ultimo_id
              : idDaData(Date.now() - DIAS_IMPORTACAO * UM_DIA_MS);

          // 6) Até 100 mensagens depois da última lida, da mais antiga para a mais nova.
          const resposta = await fetch(
            `${DISCORD_API}/channels/${canal}/messages?after=${ultimoId}&limit=100`,
            {
              headers: {
                Authorization: `Bot ${token}`,
                "User-Agent": "DiscordBot (https://novaeragen.lovable.app, 1.0)",
              },
            },
          );
          if (resposta.status === 429) {
            // Limite de pedidos do Discord: tenta no próximo minuto.
            return json({ ...resumo, adiado: "limite do Discord" });
          }
          if (!resposta.ok) {
            // 401 = token errado; 403 = bot sem permissão no canal; 404 = canal não existe.
            console.error("[discord] API respondeu", resposta.status, await resposta.text());
            return json({ ...resumo, erro: `discord respondeu ${resposta.status}` }, 502);
          }
          const mensagens = ordenarDaMaisAntiga((await resposta.json()) as MensagemDiscord[]);

          // 7) Processa mensagem por mensagem. O "até onde leu" só avança depois que
          // todas as imagens da mensagem foram resolvidas; se algo falhar, para e a
          // mesma mensagem é tentada no minuto seguinte.
          const inicio = Date.now();
          let imagensNestaExecucao = 0;
          processamento: for (const msg of mensagens) {
            const imagens = extrairImagens(msg);
            const estourouImagens =
              imagensNestaExecucao > 0 &&
              imagensNestaExecucao + imagens.length > MAX_IMAGENS_POR_EXECUCAO;
            if (estourouImagens || Date.now() - inicio > TEMPO_MAX_MS) break;

            for (const imagem of imagens) {
              const desfecho = await salvarImagem(msg, imagem, canal);
              if (desfecho === "falhou") break processamento;
              resumo[desfecho]++;
              imagensNestaExecucao++;
            }

            resumo.mensagens++;
            ultimoId = msg.id;
          }

          // 8) Anota o canal e até onde leu, mesmo sem mensagens novas
          // (é isso que grava o ponto de partida dos 7 dias na primeira vez).
          const { error: erroSalvarEstado } = await bancoSemTipos
            .from("discord_bot")
            .update({
              channel_id: canal,
              ultimo_id: ultimoId,
              atualizado_em: new Date().toISOString(),
            })
            .eq("id", 1);
          if (erroSalvarEstado) {
            console.error("[discord] falha ao salvar estado", erroSalvarEstado.message);
          }

          return json(resumo);
        } catch (erro) {
          // Qualquer erro inesperado: registra no log e responde 500 sem detalhes para fora.
          console.error("[discord] erro inesperado", erro);
          return json({ erro: "erro interno" }, 500);
        }
      },
    },
  },
});
