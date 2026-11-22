import { areaRepo, plantaRepo, relatorioCacheRepo } from '../database/repositories/catalogoRepo';
import { cultivoRepo } from '../database/repositories/cultivoRepo';
import { estoqueRepo } from '../database/repositories/estoqueRepo';
import { outboxRepo } from '../database/repositories/outboxRepo';
import { tarefaRepo } from '../database/repositories/tarefaRepo';
import { syncMetaRepo, usuarioRepo } from '../database/repositories/usuarioRepo';
import type {
  EstadoPlanta,
  InsumoUsado,
  ItemOutbox,
  StatusCultivo,
  Usuario,
} from '../database/types';
import { ehErroDeRede, ehErroPermanente } from '../services/api';
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
}

async function enviarItem(token: string, item: ItemOutbox): Promise<void> {
  switch (item.operacao) {
    case 'tarefa.concluir': {
      const payload = lerPayload<PayloadTarefa>(item);
      const atualizada = await cultiveApi.concluirTarefa(token, item.entidadeId, payload);
      // Marca como sincronizada ANTES de salvar: só assim o upsert protegido
      // (que só sobrescreve linhas com sync_status = 'synced') aplica os
      // campos que o servidor pode ter recalculado (ex.: foi para observação).
      await tarefaRepo.marcarSincronizada(item.entidadeId);
      await tarefaRepo.salvarDoServidor(atualizada);
      return;
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
      return;
    }

    case 'cultivo.status': {
      const payload = lerPayload<PayloadCultivo>(item);
      const atualizado = await cultiveApi.atualizarStatusCultivo(token, item.entidadeId, payload);
      await cultivoRepo.marcarSincronizado(item.entidadeId);
      await cultivoRepo.salvarDoServidor(atualizado);
      return;
    }

    case 'estoque.criar': {
      const local = await estoqueRepo.buscarPorId(item.entidadeId);
      if (!local) return;
      const criado = await cultiveApi.criarItemEstoque(token, local);
      // Troca o id temporário negativo pelo id real gerado no servidor.
      await estoqueRepo.trocarId(item.entidadeId, criado.idEstoque);
      await outboxRepo.reconciliarId(item.entidadeId, criado.idEstoque);
      await estoqueRepo.salvarDoServidor(criado);
      return;
    }

    case 'estoque.atualizar': {
      const local = await estoqueRepo.buscarPorId(item.entidadeId);
      if (!local) return;
      const atualizado = await cultiveApi.atualizarItemEstoque(token, local);
      await estoqueRepo.marcarSincronizado(item.entidadeId);
      await estoqueRepo.salvarDoServidor(atualizado);
      return;
    }

    case 'estoque.excluir': {
      await cultiveApi.excluirItemEstoque(token, item.entidadeId);
      await estoqueRepo.excluirLocal(item.entidadeId);
      return;
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

export async function enviarPendencias(token: string): Promise<{ enviados: number; falhas: number }> {
  const pendentes = await outboxRepo.pendentes();
  let enviados = 0;
  let falhas = 0;

  for (const item of pendentes) {
    try {
      await enviarItem(token, item);
      await outboxRepo.remover(item.id);
      enviados += 1;
    } catch (erro) {
      if (ehErroDeRede(erro)) {
        // Conexão caiu no meio: para por aqui e tenta tudo de novo depois.
        break;
      }

      const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido';
      await outboxRepo.registrarFalha(item.id, mensagem);
      falhas += 1;

      if (ehErroPermanente(erro)) {
        // O servidor recusou de forma definitiva: sinaliza na tela e segue.
        await marcarEntidadeComErro(item);
        await outboxRepo.remover(item.id);
      }
    }
  }

  return { enviados, falhas };
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

  // Relatórios: cada um é independente, uma falha não derruba os demais.
  await Promise.all(
    RELATORIOS_OFFLINE.map(async ({ chave, caminho }) => {
      try {
        const dados = await cultiveApi.obterRelatorio(token, caminho);
        await relatorioCacheRepo.salvar(chave, dados);
      } catch {
        // Mantém o cache anterior deste relatório.
      }
    })
  );

  await syncMetaRepo.registrar('relatorio', 'cache atualizado');
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