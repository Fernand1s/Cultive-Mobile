import { agoraISO, obterBanco } from '../index';
import type { EntidadeSincronizavel, ItemOutbox, OperacaoSync } from '../types';

interface LinhaOutbox {
  id: number;
  entidade: string;
  entidade_id: number;
  operacao: string;
  payload: string;
  tentativas: number;
  ultimo_erro: string | null;
  criado_em: string;
}

const mapear = (linha: LinhaOutbox): ItemOutbox => ({
  id: linha.id,
  entidade: linha.entidade as EntidadeSincronizavel,
  entidadeId: linha.entidade_id,
  operacao: linha.operacao as OperacaoSync,
  payload: linha.payload,
  tentativas: linha.tentativas,
  ultimoErro: linha.ultimo_erro,
  criadoEm: linha.criado_em,
});

/** Após este número de falhas o item para de ser reenviado automaticamente. */
export const MAX_TENTATIVAS = 5;

export const outboxRepo = {
  /**
   * Enfileira uma mutação feita no dispositivo.
   *
   * Operações idempotentes sobre o mesmo registro (ex.: concluir a mesma tarefa
   * duas vezes) substituem a entrada anterior, evitando fila duplicada.
   */
  async enfileirar(
    entidade: EntidadeSincronizavel,
    entidadeId: number,
    operacao: OperacaoSync,
    payload: unknown
  ): Promise<void> {
    const db = await obterBanco();
    await db.runAsync('DELETE FROM outbox WHERE entidade_id = ? AND operacao = ?', [
      entidadeId,
      operacao,
    ]);
    await db.runAsync(
      `INSERT INTO outbox (entidade, entidade_id, operacao, payload, tentativas, criado_em)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [entidade, entidadeId, operacao, JSON.stringify(payload ?? {}), agoraISO()]
    );
  },

  /** Itens prontos para envio, em ordem de criação (FIFO). */
  async pendentes(): Promise<ItemOutbox[]> {
    const db = await obterBanco();
    const linhas = await db.getAllAsync<LinhaOutbox>(
      'SELECT * FROM outbox WHERE tentativas < ? ORDER BY id ASC',
      [MAX_TENTATIVAS]
    );
    return linhas.map(mapear);
  },

  async contarPendentes(): Promise<number> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM outbox'
    );
    return linha?.total ?? 0;
  },

  async remover(id: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync('DELETE FROM outbox WHERE id = ?', [id]);
  },

  async registrarFalha(id: number, erro: string): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      'UPDATE outbox SET tentativas = tentativas + 1, ultimo_erro = ? WHERE id = ?',
      [erro.slice(0, 500), id]
    );
  },

  /**
   * Troca o id temporário (negativo) pelo id real devolvido pelo servidor,
   * em itens da fila que ainda apontam para o registro recém-criado.
   */
  async reconciliarId(idTemporario: number, idReal: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync('UPDATE outbox SET entidade_id = ? WHERE entidade_id = ?', [
      idReal,
      idTemporario,
    ]);
  },

  async limpar(): Promise<void> {
    const db = await obterBanco();
    await db.execAsync('DELETE FROM outbox');
  },
};
