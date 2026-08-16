import { agoraISO, obterBanco } from '../index';
import type { ItemEstoque, SyncStatus } from '../types';

interface LinhaEstoque {
  id_estoque: number;
  nome: string;
  sku: string | null;
  categoria: string;
  subcategoria: string | null;
  marca: string | null;
  modelo: string | null;
  fornecedor: string | null;
  codigo_identificador: string | null;
  data_aquisicao: string | null;
  valor_compra: number | null;
  unidade_medida: string | null;
  localizacao: string | null;
  status: string | null;
  foto_preview: string | null;
  validade: string | null;
  principio_ativo: string | null;
  estoque_minimo: number | null;
  quantidade_estoque: number | null;
  horimetro_atual: number | null;
  horas_revisao: string | null;
  tipo_combustivel: string | null;
  placa: string | null;
  capacidade_trabalho: string | null;
  compatibilidade_potencia: string | null;
  sync_status: string;
  atualizado_em: string;
}

const mapear = (linha: LinhaEstoque): ItemEstoque => ({
  idEstoque: linha.id_estoque,
  nome: linha.nome,
  sku: linha.sku,
  categoria: linha.categoria,
  subcategoria: linha.subcategoria,
  marca: linha.marca,
  modelo: linha.modelo,
  fornecedor: linha.fornecedor,
  codigoIdentificador: linha.codigo_identificador,
  dataAquisicao: linha.data_aquisicao,
  valorCompra: linha.valor_compra,
  unidadeMedida: linha.unidade_medida,
  localizacao: linha.localizacao,
  status: linha.status,
  fotoPreview: linha.foto_preview,
  validade: linha.validade,
  principioAtivo: linha.principio_ativo,
  estoqueMinimo: linha.estoque_minimo,
  quantidadeEstoque: linha.quantidade_estoque,
  horimetroAtual: linha.horimetro_atual,
  horasRevisao: linha.horas_revisao,
  tipoCombustivel: linha.tipo_combustivel,
  placa: linha.placa,
  capacidadeTrabalho: linha.capacidade_trabalho,
  compatibilidadePotencia: linha.compatibilidade_potencia,
  syncStatus: linha.sync_status as SyncStatus,
  atualizadoEm: linha.atualizado_em,
});

const COLUNAS = `id_estoque, nome, sku, categoria, subcategoria, marca, modelo, fornecedor,
  codigo_identificador, data_aquisicao, valor_compra, unidade_medida, localizacao, status,
  foto_preview, validade, principio_ativo, estoque_minimo, quantidade_estoque, horimetro_atual,
  horas_revisao, tipo_combustivel, placa, capacidade_trabalho, compatibilidade_potencia,
  sync_status, atualizado_em`;

const valores = (item: ItemEstoque, syncStatus: SyncStatus): (string | number | null)[] => [
  item.idEstoque,
  item.nome,
  item.sku,
  item.categoria,
  item.subcategoria,
  item.marca,
  item.modelo,
  item.fornecedor,
  item.codigoIdentificador,
  item.dataAquisicao,
  item.valorCompra,
  item.unidadeMedida,
  item.localizacao,
  item.status,
  item.fotoPreview,
  item.validade,
  item.principioAtivo,
  item.estoqueMinimo,
  item.quantidadeEstoque,
  item.horimetroAtual,
  item.horasRevisao,
  item.tipoCombustivel,
  item.placa,
  item.capacidadeTrabalho,
  item.compatibilidadePotencia,
  syncStatus,
  agoraISO(),
];

const ATUALIZACAO_CONFLITO = `
  nome = excluded.nome, sku = excluded.sku, categoria = excluded.categoria,
  subcategoria = excluded.subcategoria, marca = excluded.marca, modelo = excluded.modelo,
  fornecedor = excluded.fornecedor, codigo_identificador = excluded.codigo_identificador,
  data_aquisicao = excluded.data_aquisicao, valor_compra = excluded.valor_compra,
  unidade_medida = excluded.unidade_medida, localizacao = excluded.localizacao,
  status = excluded.status, foto_preview = excluded.foto_preview, validade = excluded.validade,
  principio_ativo = excluded.principio_ativo, estoque_minimo = excluded.estoque_minimo,
  quantidade_estoque = excluded.quantidade_estoque, horimetro_atual = excluded.horimetro_atual,
  horas_revisao = excluded.horas_revisao, tipo_combustivel = excluded.tipo_combustivel,
  placa = excluded.placa, capacidade_trabalho = excluded.capacidade_trabalho,
  compatibilidade_potencia = excluded.compatibilidade_potencia,
  sync_status = excluded.sync_status, atualizado_em = excluded.atualizado_em`;

export const estoqueRepo = {
  async salvarDoServidor(item: ItemEstoque): Promise<void> {
    const db = await obterBanco();
    const marcadores = valores(item, 'synced')
      .map(() => '?')
      .join(', ');
    await db.runAsync(
      `INSERT INTO estoque (${COLUNAS}) VALUES (${marcadores})
       ON CONFLICT(id_estoque) DO UPDATE SET ${ATUALIZACAO_CONFLITO}
       WHERE estoque.sync_status = 'synced'`,
      valores(item, 'synced')
    );
  },

  async substituirTudoDoServidor(itens: ItemEstoque[]): Promise<void> {
    const db = await obterBanco();
    await db.withTransactionAsync(async () => {
      const ids = itens.map((i) => i.idEstoque);
      const marcadores = ids.map(() => '?').join(',');
      await db.runAsync(
        ids.length > 0
          ? `DELETE FROM estoque WHERE sync_status = 'synced' AND id_estoque NOT IN (${marcadores})`
          : `DELETE FROM estoque WHERE sync_status = 'synced'`,
        ids
      );
      for (const item of itens) {
        await estoqueRepo.salvarDoServidor(item);
      }
    });
  },

  async listar(): Promise<ItemEstoque[]> {
    const db = await obterBanco();
    const linhas = await db.getAllAsync<LinhaEstoque>(
      'SELECT * FROM estoque ORDER BY nome COLLATE NOCASE ASC'
    );
    return linhas.map(mapear);
  },

  async buscarPorId(idEstoque: number): Promise<ItemEstoque | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<LinhaEstoque>(
      'SELECT * FROM estoque WHERE id_estoque = ?',
      [idEstoque]
    );
    return linha ? mapear(linha) : null;
  },

  /**
   * Cria um item offline usando id temporário negativo — trocado pelo id real
   * assim que o servidor confirma o cadastro.
   */
  async proximoIdTemporario(): Promise<number> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ menor: number | null }>(
      'SELECT MIN(id_estoque) AS menor FROM estoque'
    );
    const menor = linha?.menor ?? 0;
    return menor < 0 ? menor - 1 : -1;
  },

  async salvarLocal(item: ItemEstoque): Promise<void> {
    const db = await obterBanco();
    const marcadores = valores(item, 'pending')
      .map(() => '?')
      .join(', ');
    await db.runAsync(
      `INSERT INTO estoque (${COLUNAS}) VALUES (${marcadores})
       ON CONFLICT(id_estoque) DO UPDATE SET ${ATUALIZACAO_CONFLITO}`,
      valores(item, 'pending')
    );
  },

  async excluirLocal(idEstoque: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync('DELETE FROM estoque WHERE id_estoque = ?', [idEstoque]);
  },

  /** Reconcilia o id temporário com o id definitivo devolvido pelo servidor. */
  async trocarId(idTemporario: number, idReal: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      "UPDATE estoque SET id_estoque = ?, sync_status = 'synced' WHERE id_estoque = ?",
      [idReal, idTemporario]
    );
  },

  async marcarSincronizado(idEstoque: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync("UPDATE estoque SET sync_status = 'synced' WHERE id_estoque = ?", [
      idEstoque,
    ]);
  },

  async marcarErro(idEstoque: number): Promise<void> {
    const db = await obterBanco();
    await db.runAsync("UPDATE estoque SET sync_status = 'error' WHERE id_estoque = ?", [idEstoque]);
  },

  /** Categorias e subcategorias existentes, para alimentar os filtros da tela. */
  async opcoesDeFiltro(): Promise<{ categorias: string[]; subcategorias: string[] }> {
    const db = await obterBanco();
    const cats = await db.getAllAsync<{ valor: string }>(
      'SELECT DISTINCT categoria AS valor FROM estoque WHERE categoria IS NOT NULL ORDER BY valor'
    );
    // Aspas simples são obrigatórias: no SQLite, "" seria um identificador vazio.
    const subs = await db.getAllAsync<{ valor: string }>(
      "SELECT DISTINCT subcategoria AS valor FROM estoque WHERE subcategoria IS NOT NULL AND subcategoria <> '' ORDER BY valor"
    );
    return {
      categorias: cats.map((c) => c.valor),
      subcategorias: subs.map((s) => s.valor),
    };
  },
};
