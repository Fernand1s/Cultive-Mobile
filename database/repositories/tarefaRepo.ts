import { agoraISO, obterBanco, paraBool, paraInt } from '../index';
import type { InsumoUsado, Prioridade, SyncStatus, Tarefa } from '../types';

interface LinhaTarefa {
  id: number;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  categoria: string | null;
  subcategoria: string | null;
  informacoes_extras: string | null;
  data_prazo: string | null;
  data_criacao: string | null;
  data_conclusao: string | null;
  concluida: number;
  cancelada: number;
  em_observacao: number;
  observacao_conclusao: string | null;
  foto_conclusao: string | null;
  insumos_usados: string;
  id_responsavel: number | null;
  nome_responsavel: string | null;
  nome_criador: string | null;
  id_area: number | null;
  nome_area: string | null;
  id_cultivo: number | null;
  nome_cultivo: string | null;
  sync_status: string;
  atualizado_em: string;
}

function lerInsumos(bruto: string): InsumoUsado[] {
  try {
    const valor = JSON.parse(bruto);
    return Array.isArray(valor) ? (valor as InsumoUsado[]) : [];
  } catch {
    return [];
  }
}

const mapear = (linha: LinhaTarefa): Tarefa => ({
  id: linha.id,
  titulo: linha.titulo,
  descricao: linha.descricao,
  prioridade: linha.prioridade as Prioridade,
  categoria: linha.categoria,
  subcategoria: linha.subcategoria,
  informacoesExtras: linha.informacoes_extras,
  dataPrazo: linha.data_prazo,
  dataCriacao: linha.data_criacao,
  dataConclusao: linha.data_conclusao,
  concluida: paraBool(linha.concluida),
  cancelada: paraBool(linha.cancelada),
  emObservacao: paraBool(linha.em_observacao),
  observacaoConclusao: linha.observacao_conclusao,
  fotoConclusao: linha.foto_conclusao,
  insumosUsados: lerInsumos(linha.insumos_usados),
  idResponsavel: linha.id_responsavel,
  nomeResponsavel: linha.nome_responsavel,
  nomeCriador: linha.nome_criador,
  idArea: linha.id_area,
  nomeArea: linha.nome_area,
  idCultivo: linha.id_cultivo,
  nomeCultivo: linha.nome_cultivo,
  syncStatus: linha.sync_status as SyncStatus,
  atualizadoEm: linha.atualizado_em,
});

export const tarefaRepo = {
  /** Grava uma tarefa vinda do servidor sem sobrescrever alterações locais pendentes. */
  async salvarDoServidor(tarefa: Tarefa): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      `INSERT INTO tarefa (
         id, titulo, descricao, prioridade, categoria, subcategoria, informacoes_extras,
         data_prazo, data_criacao, data_conclusao, concluida, cancelada, em_observacao,
         observacao_conclusao, foto_conclusao, insumos_usados, id_responsavel,
         nome_responsavel, nome_criador, id_area, nome_area, id_cultivo, nome_cultivo,
         sync_status, atualizado_em
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
       ON CONFLICT(id) DO UPDATE SET
         titulo               = excluded.titulo,
         descricao            = excluded.descricao,
         prioridade           = excluded.prioridade,
         categoria            = excluded.categoria,
         subcategoria         = excluded.subcategoria,
         informacoes_extras   = excluded.informacoes_extras,
         data_prazo           = excluded.data_prazo,
         data_criacao         = excluded.data_criacao,
         data_conclusao       = excluded.data_conclusao,
         concluida            = excluded.concluida,
         cancelada            = excluded.cancelada,
         em_observacao        = excluded.em_observacao,
         observacao_conclusao = excluded.observacao_conclusao,
         foto_conclusao       = excluded.foto_conclusao,
         insumos_usados       = excluded.insumos_usados,
         id_responsavel       = excluded.id_responsavel,
         nome_responsavel     = excluded.nome_responsavel,
         nome_criador         = excluded.nome_criador,
         id_area              = excluded.id_area,
         nome_area            = excluded.nome_area,
         id_cultivo           = excluded.id_cultivo,
         nome_cultivo         = excluded.nome_cultivo,
         sync_status          = 'synced',
         atualizado_em        = excluded.atualizado_em
       WHERE tarefa.sync_status = 'synced'`,
      [
        tarefa.id,
        tarefa.titulo,
        tarefa.descricao,
        tarefa.prioridade,
        tarefa.categoria,
        tarefa.subcategoria,
        tarefa.informacoesExtras,
        tarefa.dataPrazo,
        tarefa.dataCriacao,
        tarefa.dataConclusao,
        paraInt(tarefa.concluida),
        paraInt(tarefa.cancelada),
        paraInt(tarefa.emObservacao),
        tarefa.observacaoConclusao,
        tarefa.fotoConclusao,
        JSON.stringify(tarefa.insumosUsados ?? []),
        tarefa.idResponsavel,
        tarefa.nomeResponsavel,
        tarefa.nomeCriador,
        tarefa.idArea,
        tarefa.nomeArea,
        tarefa.idCultivo,
        tarefa.nomeCultivo,
        agoraISO(),
      ]
    );
  },

  async substituirTudoDoServidor(tarefas: Tarefa[]): Promise<void> {
    const db = await obterBanco();
    await db.withTransactionAsync(async () => {
      // Remove apenas o que está sincronizado: pendências locais são preservadas.
      const ids = tarefas.map((t) => t.id);
      const marcadores = ids.map(() => '?').join(',');
      await db.runAsync(
        ids.length > 0
          ? `DELETE FROM tarefa WHERE sync_status = 'synced' AND id NOT IN (${marcadores})`
          : `DELETE FROM tarefa WHERE sync_status = 'synced'`,
        ids
      );
      for (const tarefa of tarefas) {
        await tarefaRepo.salvarDoServidor(tarefa);
      }
    });
  },

  async listar(idResponsavel?: number): Promise<Tarefa[]> {
    const db = await obterBanco();
    const linhas = idResponsavel
      ? await db.getAllAsync<LinhaTarefa>(
          'SELECT * FROM tarefa WHERE id_responsavel = ? ORDER BY data_prazo IS NULL, data_prazo ASC',
          [idResponsavel]
        )
      : await db.getAllAsync<LinhaTarefa>(
          'SELECT * FROM tarefa ORDER BY data_prazo IS NULL, data_prazo ASC'
        );
    return linhas.map(mapear);
  },

  async buscarPorId(id: number): Promise<Tarefa | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<LinhaTarefa>('SELECT * FROM tarefa WHERE id = ?', [id]);
    return linha ? mapear(linha) : null;
  },

  /**
   * Aplica a conclusão (ou observação) localmente e marca a tarefa como pendente
   * de envio. A tela reflete a mudança na hora, mesmo sem sinal.
   */
  async aplicarConclusaoLocal(
    id: number,
    dados: {
      concluida: boolean;
      emObservacao: boolean;
      observacao: string | null;
      fotoConclusao: string | null;
      insumosUsados: InsumoUsado[];
    }
  ): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      `UPDATE tarefa SET
         concluida            = ?,
         em_observacao        = ?,
         observacao_conclusao = ?,
         foto_conclusao       = ?,
         insumos_usados       = ?,
         data_conclusao       = ?,
         sync_status          = 'pending',
         atualizado_em        = ?
       WHERE id = ?`,
      [
        paraInt(dados.concluida),
        paraInt(dados.emObservacao),
        dados.observacao,
        dados.fotoConclusao,
        JSON.stringify(dados.insumosUsados ?? []),
        dados.concluida ? agoraISO() : null,
        agoraISO(),
        id,
      ]
    );
  },

  async marcarSincronizada(id: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync("UPDATE tarefa SET sync_status = 'synced' WHERE id = ?", [id]);
  },

  async marcarErro(id: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync("UPDATE tarefa SET sync_status = 'error' WHERE id = ?", [id]);
  },

  async contarPendentes(): Promise<number> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ total: number }>(
      "SELECT COUNT(*) AS total FROM tarefa WHERE sync_status = 'pending'"
    );
    return linha?.total ?? 0;
  },
};
