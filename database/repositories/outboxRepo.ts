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
   * A operação mais recente do mesmo tipo substitui a entrada anterior do registro.
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

  async listar(): Promise<ItemOutbox[]> {
    const db = await obterBanco();
    const linhas = await db.getAllAsync<LinhaOutbox>('SELECT * FROM outbox ORDER BY id ASC');
    return linhas.map(mapear);
  },

  async buscarPorId(id: number): Promise<ItemOutbox | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<LinhaOutbox>('SELECT * FROM outbox WHERE id = ?', [id]);
    return linha ? mapear(linha) : null;
  },

  async estoqueTemExclusao(idEstoque: number): Promise<boolean> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM outbox WHERE entidade = 'estoque' AND entidade_id = ? AND operacao = 'estoque.excluir' LIMIT 1",
      [idEstoque]
    );
    return linha !== null;
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

  async registrarFalha(id: number, erro: string, pausar: boolean): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      'UPDATE outbox SET tentativas = MAX(tentativas + 1, ?), ultimo_erro = ? WHERE id = ?',
      [pausar ? MAX_TENTATIVAS : 0, erro.slice(0, 500), id]
    );
  },

  /**
   * Troca o id temporário (negativo) pelo id real devolvido pelo servidor,
   * em itens da fila que ainda apontam para o registro recém-criado.
   */
  async reconciliarId(idTemporario: number, idReal: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      "UPDATE outbox SET entidade_id = ? WHERE entidade = 'estoque' AND entidade_id = ?",
      [idReal, idTemporario]
    );
  },

  async cancelarEnviosEstoque(idEstoque: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync("DELETE FROM outbox WHERE entidade = 'estoque' AND entidade_id = ?", [
      idEstoque,
    ]);
  },

  async limpar(): Promise<void> {
    const db = await obterBanco();
    await db.execAsync('DELETE FROM outbox');
  },
};
