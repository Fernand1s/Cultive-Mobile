import { agoraISO, obterBanco } from '../index';
import type { Cultivo, EstadoPlanta, StatusCultivo, SyncStatus, TipoCiclo } from '../types';

interface LinhaCultivo {
  id_cultivo: number;
  id_planta: number | null;
  nome_planta: string | null;
  id_area: number | null;
  nome_area: string | null;
  data_plantio: string | null;
  previsao_colheita: string | null;
  data_colheita_final: string | null;
  estado_planta: string;
  status_cultivo: string;
  tipo_ciclo: string;
  unidade_medida: string | null;
  observacao_cultivo: string | null;
  quantidade_plantada: number;
  quantidade_colhida: number;
  sync_status: string;
  atualizado_em: string;
}

const mapear = (linha: LinhaCultivo): Cultivo => ({
  idCultivo: linha.id_cultivo,
  idPlanta: linha.id_planta,
  nomePlanta: linha.nome_planta,
  idArea: linha.id_area,
  nomeArea: linha.nome_area,
  dataPlantio: linha.data_plantio,
  previsaoColheita: linha.previsao_colheita,
  dataColheitaFinal: linha.data_colheita_final,
  estadoPlanta: linha.estado_planta as EstadoPlanta,
  statusCultivo: linha.status_cultivo as StatusCultivo,
  tipoCiclo: linha.tipo_ciclo as TipoCiclo,
  unidadeMedida: linha.unidade_medida,
  observacaoCultivo: linha.observacao_cultivo,
  quantidadePlantada: linha.quantidade_plantada,
  quantidadeColhida: linha.quantidade_colhida,
  syncStatus: linha.sync_status as SyncStatus,
  atualizadoEm: linha.atualizado_em,
});

export const cultivoRepo = {
  async salvarDoServidor(cultivo: Cultivo): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      `INSERT INTO cultivo (
         id_cultivo, id_planta, nome_planta, id_area, nome_area, data_plantio,
         previsao_colheita, data_colheita_final, estado_planta, status_cultivo, tipo_ciclo,
         unidade_medida, observacao_cultivo, quantidade_plantada, quantidade_colhida,
         sync_status, atualizado_em
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
       ON CONFLICT(id_cultivo) DO UPDATE SET
         id_planta           = excluded.id_planta,
         nome_planta         = excluded.nome_planta,
         id_area             = excluded.id_area,
         nome_area           = excluded.nome_area,
         data_plantio        = excluded.data_plantio,
         previsao_colheita   = excluded.previsao_colheita,
         data_colheita_final = excluded.data_colheita_final,
         estado_planta       = excluded.estado_planta,
         status_cultivo      = excluded.status_cultivo,
         tipo_ciclo          = excluded.tipo_ciclo,
         unidade_medida      = excluded.unidade_medida,
         observacao_cultivo  = excluded.observacao_cultivo,
         quantidade_plantada = excluded.quantidade_plantada,
         quantidade_colhida  = excluded.quantidade_colhida,
         sync_status         = 'synced',
         atualizado_em       = excluded.atualizado_em
       WHERE cultivo.sync_status = 'synced'`,
      [
        cultivo.idCultivo,
        cultivo.idPlanta,
        cultivo.nomePlanta,
        cultivo.idArea,
        cultivo.nomeArea,
        cultivo.dataPlantio,
        cultivo.previsaoColheita,
        cultivo.dataColheitaFinal,
        cultivo.estadoPlanta,
        cultivo.statusCultivo,
        cultivo.tipoCiclo,
        cultivo.unidadeMedida,
        cultivo.observacaoCultivo,
        cultivo.quantidadePlantada,
        cultivo.quantidadeColhida,
        agoraISO(),
      ]
    );
  },

  async substituirTudoDoServidor(cultivos: Cultivo[]): Promise<void> {
    const db = await obterBanco();
    await db.withTransactionAsync(async () => {
      const ids = cultivos.map((c) => c.idCultivo);
      const marcadores = ids.map(() => '?').join(',');
      await db.runAsync(
        ids.length > 0
          ? `DELETE FROM cultivo WHERE sync_status = 'synced' AND id_cultivo NOT IN (${marcadores})`
          : `DELETE FROM cultivo WHERE sync_status = 'synced'`,
        ids
      );
      for (const cultivo of cultivos) {
        await cultivoRepo.salvarDoServidor(cultivo);
      }
    });
  },

  async listar(): Promise<Cultivo[]> {
    const db = await obterBanco();
    const linhas = await db.getAllAsync<LinhaCultivo>(
      'SELECT * FROM cultivo ORDER BY data_plantio DESC'
    );
    return linhas.map(mapear);
  },

  async buscarPorId(idCultivo: number): Promise<Cultivo | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<LinhaCultivo>(
      'SELECT * FROM cultivo WHERE id_cultivo = ?',
      [idCultivo]
    );
    return linha ? mapear(linha) : null;
  },

  /**
   * O app de campo não cadastra cultivos: apenas acompanha e muda o estágio
   * (status) e a sanidade (estado da planta) do que já existe.
   */
  async aplicarStatusLocal(
    idCultivo: number,
    dados: { statusCultivo: StatusCultivo; estadoPlanta: EstadoPlanta; observacao: string | null }
  ): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      `UPDATE cultivo SET
         status_cultivo     = ?,
         estado_planta      = ?,
         observacao_cultivo = ?,
         sync_status        = 'pending',
         atualizado_em      = ?
       WHERE id_cultivo = ?`,
      [dados.statusCultivo, dados.estadoPlanta, dados.observacao, agoraISO(), idCultivo]
    );
  },

  async marcarSincronizado(idCultivo: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync("UPDATE cultivo SET sync_status = 'synced' WHERE id_cultivo = ?", [
      idCultivo,
    ]);
  },

  async marcarErro(idCultivo: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync("UPDATE cultivo SET sync_status = 'error' WHERE id_cultivo = ?", [idCultivo]);
  },
};
