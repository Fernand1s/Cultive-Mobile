import { areaRepo, plantaRepo, relatorioCacheRepo } from '../database/repositories/catalogoRepo';
import { cultivoRepo } from '../database/repositories/cultivoRepo';
import { estoqueRepo } from '../database/repositories/estoqueRepo';
import { MAX_TENTATIVAS, outboxRepo } from '../database/repositories/outboxRepo';
import { tarefaRepo } from '../database/repositories/tarefaRepo';
import { syncMetaRepo, usuarioRepo } from '../database/repositories/usuarioRepo';
import type {
  EstadoPlanta,
  InsumoUsado,
  ItemOutbox,
  StatusCultivo,
  Usuario,
} from '../database/types';
import { devePausarReenvio, ehErroDeRede, ErroApi } from '../services/api';
import { cultiveApi } from '../services/cultiveApi';

/**
 * Motor de sincronização offline-first.
 *
 * Ordem obrigatória: primeiro SOBE o que foi feito no campo (outbox), depois
 * BAIXA o estado do servidor. O contrário sobrescreveria o trabalho do operador
 * com dados antigos.
 */

export interface ResultadoSync {
  enviados: number;
  falhas: number;
  baixou: boolean;
  erro: string | null;
}

/** Relatórios trazidos para leitura offline — os 4 tópicos previstos no app. */
const RELATORIOS_OFFLINE: { chave: string; caminho: string }[] = [
  { chave: 'produtividade', caminho: '/produtividade' },
  { chave: 'incidencia-pragas', caminho: '/incidencia-pragas' },
  { chave: 'alertas-estoque', caminho: '/alertas-estoque' },
  { chave: 'ocupacao-areas', caminho: '/ocupacao-areas' },
  { chave: 'rotacao-culturas', caminho: '/rotacao-culturas' },
];

// ---------------------------------------------------------------------------
// UPLOAD — drena a fila de saída
// ---------------------------------------------------------------------------

/** O payload foi serializado por nós ao enfileirar; cada caso conhece seu formato. */
function lerPayload<T>(item: ItemOutbox): T {
  return JSON.parse(item.payload) as T;
}

interface PayloadTarefa {
  observacao: string | null;
  fotoConclusao: string | null;
  insumosUsados: InsumoUsado[];
}

interface PayloadCultivo {
  statusCultivo: StatusCultivo;
  estadoPlanta: EstadoPlanta;
  observacaoCultivo: string | null;
  quantidadePlantada: number;
  idPlanta: number | null;
  idArea: number | null;
  dataPlantio?: string | null;
}

/** Retorna false quando a operação pôde ser descartada sem envio. */
async function enviarItem(token: string, item: ItemOutbox): Promise<boolean> {
  switch (item.operacao) {
    case 'tarefa.concluir': {
      const payload = lerPayload<PayloadTarefa>(item);
      const atualizada = await cultiveApi.concluirTarefa(token, item.entidadeId, payload);
      // Marca como sincronizada ANTES de salvar: só assim o upsert protegido
      // (que só sobrescreve linhas com sync_status = 'synced') aplica os
      // campos que o servidor pode ter recalculado (ex.: foi para observação).
      await tarefaRepo.marcarSincronizada(item.entidadeId);
      await tarefaRepo.salvarDoServidor(atualizada);
      return true;
    }

    case 'tarefa.observacao': {
      const payload = lerPayload<PayloadTarefa>(item);
      const atualizada = await cultiveApi.atualizarObservacaoTarefa(
        token,
        item.entidadeId,
        payload
      );
      await tarefaRepo.marcarSincronizada(item.entidadeId);
      await tarefaRepo.salvarDoServidor(atualizada);
      return true;
    }

    case 'cultivo.status': {
      const payload = lerPayload<PayloadCultivo>(item);
      // Pendências gravadas antes da correção não incluem a data de plantio.
      const local =
        payload.dataPlantio && payload.idPlanta && payload.idArea
          ? null
          : await cultivoRepo.buscarPorId(item.entidadeId);
      const dataPlantio = payload.dataPlantio || local?.dataPlantio;
      const idPlanta = payload.idPlanta ?? local?.idPlanta;
      const idArea = payload.idArea ?? local?.idArea;
      if (!dataPlantio || !idPlanta || !idArea) {
        throw new Error('O cultivo precisa de data de plantio, planta e área para ser enviado.');
      }
      const atualizado = await cultiveApi.atualizarStatusCultivo(token, item.entidadeId, {
        ...payload,
        dataPlantio,
        idPlanta,
        idArea,
      });
      await cultivoRepo.marcarSincronizado(item.entidadeId);
      await cultivoRepo.salvarDoServidor(atualizado);
      return true;
    }

    case 'estoque.criar': {
      const local = await estoqueRepo.buscarPorId(item.entidadeId);
      if (!local || (await outboxRepo.estoqueTemExclusao(item.entidadeId))) return false;
      const criado = await cultiveApi.criarItemEstoque(token, local);
      // Troca o id temporário negativo pelo id real gerado no servidor.
      await estoqueRepo.trocarId(item.entidadeId, criado.idEstoque);
      await outboxRepo.reconciliarId(item.entidadeId, criado.idEstoque);
      await estoqueRepo.salvarDoServidor(criado);
      return true;
    }

    case 'estoque.atualizar': {
      if (await outboxRepo.estoqueTemExclusao(item.entidadeId)) return false;
      const local = await estoqueRepo.buscarPorId(item.entidadeId);
      if (!local) throw new Error('O item de estoque não está disponível no banco local.');
      if (item.entidadeId < 0) throw new Error('A edição aguarda o cadastro do item de estoque.');
      const atualizado = await cultiveApi.atualizarItemEstoque(token, local);
      await estoqueRepo.marcarSincronizado(item.entidadeId);
      await estoqueRepo.salvarDoServidor(atualizado);
      return true;
    }

    case 'estoque.excluir': {
      if (item.entidadeId < 0) {
        await estoqueRepo.excluirLocal(item.entidadeId);
        await outboxRepo.cancelarEnviosEstoque(item.entidadeId);
        return false;
      }
      await cultiveApi.excluirItemEstoque(token, item.entidadeId);
      await estoqueRepo.excluirLocal(item.entidadeId);
      return true;
    }

    default:
      throw new Error(`Operação de sincronização desconhecida: ${item.operacao}`);
  }
}

async function marcarEntidadeComErro(item: ItemOutbox): Promise<void> {
  if (item.entidade === 'tarefa') await tarefaRepo.marcarErro(item.entidadeId);
  if (item.entidade === 'estoque') await estoqueRepo.marcarErro(item.entidadeId);
  if (item.entidade === 'cultivo') await cultivoRepo.marcarErro(item.entidadeId);
}

export async function enviarPendencias(
  token: string
): Promise<Pick<ResultadoSync, 'enviados' | 'falhas' | 'erro'>> {
  const pendentes = await outboxRepo.pendentes();
  let enviados = 0;
  let falhas = 0;
  let ultimoErro: string | null = null;

  for (const pendente of pendentes) {
    // Um cadastro anterior do estoque pode ter substituído o ID temporário.
    const item = await outboxRepo.buscarPorId(pendente.id);
    if (!item) continue;
    try {
      const enviado = await enviarItem(token, item);
      await outboxRepo.remover(item.id);
      if (enviado) enviados += 1;
    } catch (erro) {
      if (ehErroDeRede(erro)) {
        // Conexão caiu no meio: para por aqui e tenta tudo de novo depois.
        ultimoErro = 'Sem conexão com o servidor.';
        break;
      }

      const detalhe = erro instanceof Error ? erro.message : 'Erro desconhecido';
      const mensagem = erro instanceof ErroApi ? `HTTP ${erro.status}: ${detalhe}` : detalhe;
      const pausar = devePausarReenvio(erro);
      await outboxRepo.registrarFalha(item.id, mensagem, pausar);
      ultimoErro = mensagem;
      falhas += 1;

      if (pausar || item.tentativas + 1 >= MAX_TENTATIVAS) {
        await marcarEntidadeComErro(item);
      }
    }
  }

  return { enviados, falhas, erro: ultimoErro };
}

// ---------------------------------------------------------------------------
// DOWNLOAD — reabastece o banco local
// ---------------------------------------------------------------------------

export async function baixarDados(token: string, usuario: Usuario): Promise<void> {
  const [tarefas, cultivos, estoque, areas, plantas] = await Promise.all([
    cultiveApi.listarTarefas(token, usuario.idUsuario, usuario.funcao),
    cultiveApi.listarCultivos(token),
    cultiveApi.listarEstoque(token),
    cultiveApi.listarAreas(token),
    cultiveApi.listarPlantas(token),
  ]);

  await tarefaRepo.substituirTudoDoServidor(tarefas);
  await cultivoRepo.substituirTudoDoServidor(cultivos);
  await estoqueRepo.substituirTudoDoServidor(estoque);
  await areaRepo.substituirTudo(areas);
  await plantaRepo.substituirTudo(plantas);

  await syncMetaRepo.registrar('tarefa', `${tarefas.length} tarefas`);
  await syncMetaRepo.registrar('cultivo', `${cultivos.length} cultivos`);
  await syncMetaRepo.registrar('estoque', `${estoque.length} itens`);

  // A lista de usuários só é acessível a administradores; falha aqui é normal.
  try {
    const usuarios = await cultiveApi.listarUsuarios(token);
    await usuarioRepo.salvarVarios(usuarios);
  } catch {
    await usuarioRepo.salvar(usuario);
  }

  // Uma falha mantém o cache anterior do relatório e não impede os demais.
  const relatorios = await Promise.allSettled(
    RELATORIOS_OFFLINE.map(async ({ chave, caminho }) => {
      const dados = await cultiveApi.obterRelatorio(token, caminho);
      await relatorioCacheRepo.salvar(chave, dados);
    })
  );

  if (relatorios.every((relatorio) => relatorio.status === 'fulfilled')) {
    await syncMetaRepo.registrar('relatorio', 'cache atualizado');
  }
}

// ---------------------------------------------------------------------------
// CICLO COMPLETO
// ---------------------------------------------------------------------------

export async function sincronizar(token: string, usuario: Usuario): Promise<ResultadoSync> {
  const resultado: ResultadoSync = { enviados: 0, falhas: 0, baixou: false, erro: null };

  try {
    const envio = await enviarPendencias(token);
    resultado.enviados = envio.enviados;
    resultado.falhas = envio.falhas;
    resultado.erro = envio.erro;

    await baixarDados(token, usuario);
    resultado.baixou = true;
  } catch (erro) {
    resultado.erro = ehErroDeRede(erro)
      ? 'Sem conexão com o servidor.'
      : erro instanceof Error
        ? erro.message
        : 'Falha ao sincronizar.';
  }

  return resultado;
}
