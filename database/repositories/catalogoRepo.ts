import { agoraISO, obterBanco } from '../index';
import type { Area, Planta } from '../types';

/**
 * Dados de apoio (áreas, plantas) e cache dos relatórios.
 * O app não cadastra nenhum dos dois — apenas espelha o que vem do sistema web.
 */

interface LinhaArea {
  id_area: number;
  nome_area: string;
  localizacao_area: string | null;
  tamanho_area: number | null;
  tipo_solo: string | null;
  status_area: string | null;
}

interface LinhaPlanta {
  id_planta: number;
  nome_popular: string;
  nome_cientifico: string | null;
  tipo_planta: string | null;
  ciclo_medio_dias: number | null;
  foto_planta: string | null;
}

export const areaRepo = {
  async substituirTudo(areas: Area[]): Promise<void> {
    const db = await obterBanco();
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM area');
      for (const area of areas) {
        await db.runAsync(
          `INSERT INTO area (id_area, nome_area, localizacao_area, tamanho_area, tipo_solo, status_area)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            area.idArea,
            area.nomeArea,
            area.localizacaoArea,
            area.tamanhoArea,
            area.tipoSolo,
            area.statusArea,
          ]
        );
      }
    });
  },

  async listar(): Promise<Area[]> {
    const db = await obterBanco();
    const linhas = await db.getAllAsync<LinhaArea>('SELECT * FROM area ORDER BY nome_area ASC');
    return linhas.map((l) => ({
      idArea: l.id_area,
      nomeArea: l.nome_area,
      localizacaoArea: l.localizacao_area,
      tamanhoArea: l.tamanho_area,
      tipoSolo: l.tipo_solo,
      statusArea: l.status_area,
    }));
  },
};

export const plantaRepo = {
  async substituirTudo(plantas: Planta[]): Promise<void> {
    const db = await obterBanco();
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM planta');
      for (const planta of plantas) {
        await db.runAsync(
          `INSERT INTO planta (id_planta, nome_popular, nome_cientifico, tipo_planta, ciclo_medio_dias, foto_planta)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            planta.idPlanta,
            planta.nomePopular,
            planta.nomeCientifico,
            planta.tipoPlanta,
            planta.cicloMedioDias,
            planta.fotoPlanta,
          ]
        );
      }
    });
  },

  async listar(): Promise<Planta[]> {
    const db = await obterBanco();
    const linhas = await db.getAllAsync<LinhaPlanta>(
      'SELECT * FROM planta ORDER BY nome_popular ASC'
    );
    return linhas.map((l) => ({
      idPlanta: l.id_planta,
      nomePopular: l.nome_popular,
      nomeCientifico: l.nome_cientifico,
      tipoPlanta: l.tipo_planta,
      cicloMedioDias: l.ciclo_medio_dias,
      fotoPlanta: l.foto_planta,
    }));
  },
};

export const relatorioCacheRepo = {
  async salvar(chave: string, conteudo: unknown): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      `INSERT INTO relatorio_cache (chave, conteudo, atualizado_em) VALUES (?, ?, ?)
       ON CONFLICT(chave) DO UPDATE SET
         conteudo = excluded.conteudo,
         atualizado_em = excluded.atualizado_em`,
      [chave, JSON.stringify(conteudo), agoraISO()]
    );
  },

  async ler<T>(chave: string): Promise<{ dados: T; atualizadoEm: string } | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ conteudo: string; atualizado_em: string }>(
      'SELECT conteudo, atualizado_em FROM relatorio_cache WHERE chave = ?',
      [chave]
    );
    if (!linha) return null;
    try {
      return { dados: JSON.parse(linha.conteudo) as T, atualizadoEm: linha.atualizado_em };
    } catch {
      return null;
    }
  },
};
