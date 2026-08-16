/**
 * Schema do banco local (SQLite) do Cultive+ Mobile.
 *
 * O banco é a FONTE DA VERDADE do app: toda tela lê daqui, nunca direto da rede.
 * A sincronização apenas alimenta estas tabelas (download) e drena a `outbox` (upload).
 *
 * Convenções:
 *  - colunas em snake_case; os repositórios convertem para camelCase;
 *  - toda tabela espelho carrega `sync_status` e `atualizado_em`;
 *  - registros criados offline recebem id negativo temporário, reconciliado no upload.
 */

export const DATABASE_VERSION = 1;

/** Versão 1 — estrutura inicial. */
const MIGRACAO_001 = `
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario   INTEGER PRIMARY KEY NOT NULL,
  nome_usuario TEXT NOT NULL,
  email        TEXT NOT NULL,
  funcao       TEXT NOT NULL,
  ativo        INTEGER NOT NULL DEFAULT 1,
  foto_perfil  TEXT
);

CREATE TABLE IF NOT EXISTS area (
  id_area          INTEGER PRIMARY KEY NOT NULL,
  nome_area        TEXT NOT NULL,
  localizacao_area TEXT,
  tamanho_area     REAL,
  tipo_solo        TEXT,
  status_area      TEXT
);

CREATE TABLE IF NOT EXISTS planta (
  id_planta        INTEGER PRIMARY KEY NOT NULL,
  nome_popular     TEXT NOT NULL,
  nome_cientifico  TEXT,
  tipo_planta      TEXT,
  ciclo_medio_dias INTEGER,
  foto_planta      TEXT
);

CREATE TABLE IF NOT EXISTS cultivo (
  id_cultivo          INTEGER PRIMARY KEY NOT NULL,
  id_planta           INTEGER,
  nome_planta         TEXT,
  id_area             INTEGER,
  nome_area           TEXT,
  data_plantio        TEXT,
  previsao_colheita   TEXT,
  data_colheita_final TEXT,
  estado_planta       TEXT NOT NULL DEFAULT 'SAUDAVEL',
  status_cultivo      TEXT NOT NULL DEFAULT 'ATIVO',
  tipo_ciclo          TEXT NOT NULL DEFAULT 'UNICO',
  unidade_medida      TEXT,
  observacao_cultivo  TEXT,
  quantidade_plantada REAL NOT NULL DEFAULT 0,
  quantidade_colhida  REAL NOT NULL DEFAULT 0,
  sync_status         TEXT NOT NULL DEFAULT 'synced',
  atualizado_em       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cultivo_status ON cultivo (status_cultivo);
CREATE INDEX IF NOT EXISTS idx_cultivo_sync   ON cultivo (sync_status);

CREATE TABLE IF NOT EXISTS estoque (
  id_estoque               INTEGER PRIMARY KEY NOT NULL,
  nome                     TEXT NOT NULL,
  sku                      TEXT,
  categoria                TEXT NOT NULL,
  subcategoria             TEXT,
  marca                    TEXT,
  modelo                   TEXT,
  fornecedor               TEXT,
  codigo_identificador     TEXT,
  data_aquisicao           TEXT,
  valor_compra             REAL,
  unidade_medida           TEXT,
  localizacao              TEXT,
  status                   TEXT,
  foto_preview             TEXT,
  validade                 TEXT,
  principio_ativo          TEXT,
  estoque_minimo           INTEGER,
  quantidade_estoque       INTEGER,
  horimetro_atual          REAL,
  horas_revisao            TEXT,
  tipo_combustivel         TEXT,
  placa                    TEXT,
  capacidade_trabalho      TEXT,
  compatibilidade_potencia TEXT,
  sync_status              TEXT NOT NULL DEFAULT 'synced',
  atualizado_em            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estoque_categoria ON estoque (categoria);
CREATE INDEX IF NOT EXISTS idx_estoque_sync      ON estoque (sync_status);

CREATE TABLE IF NOT EXISTS tarefa (
  id                   INTEGER PRIMARY KEY NOT NULL,
  titulo               TEXT NOT NULL,
  descricao            TEXT,
  prioridade           TEXT NOT NULL DEFAULT 'MEDIA',
  categoria            TEXT,
  subcategoria         TEXT,
  informacoes_extras   TEXT,
  data_prazo           TEXT,
  data_criacao         TEXT,
  data_conclusao       TEXT,
  concluida            INTEGER NOT NULL DEFAULT 0,
  cancelada            INTEGER NOT NULL DEFAULT 0,
  em_observacao        INTEGER NOT NULL DEFAULT 0,
  observacao_conclusao TEXT,
  foto_conclusao       TEXT,
  insumos_usados       TEXT NOT NULL DEFAULT '[]',
  id_responsavel       INTEGER,
  nome_responsavel     TEXT,
  nome_criador         TEXT,
  id_area              INTEGER,
  nome_area            TEXT,
  id_cultivo           INTEGER,
  nome_cultivo         TEXT,
  sync_status          TEXT NOT NULL DEFAULT 'synced',
  atualizado_em        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tarefa_responsavel ON tarefa (id_responsavel);
CREATE INDEX IF NOT EXISTS idx_tarefa_prazo       ON tarefa (data_prazo);
CREATE INDEX IF NOT EXISTS idx_tarefa_sync        ON tarefa (sync_status);

-- Fila de saída: mutações feitas offline aguardando envio ao servidor.
CREATE TABLE IF NOT EXISTS outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entidade    TEXT NOT NULL,
  entidade_id INTEGER NOT NULL,
  operacao    TEXT NOT NULL,
  payload     TEXT NOT NULL,
  tentativas  INTEGER NOT NULL DEFAULT 0,
  ultimo_erro TEXT,
  criado_em   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_ordem ON outbox (id);

-- Carimbo da última sincronização bem-sucedida por entidade.
CREATE TABLE IF NOT EXISTS sync_meta (
  entidade        TEXT PRIMARY KEY NOT NULL,
  ultima_sync     TEXT,
  ultimo_resultado TEXT
);

-- Cache dos relatórios (JSON cru), para consulta no campo sem internet.
CREATE TABLE IF NOT EXISTS relatorio_cache (
  chave         TEXT PRIMARY KEY NOT NULL,
  conteudo      TEXT NOT NULL,
  atualizado_em TEXT NOT NULL
);

-- Cache do React Query persistido entre aberturas do app.
CREATE TABLE IF NOT EXISTS query_cache (
  chave    TEXT PRIMARY KEY NOT NULL,
  conteudo TEXT NOT NULL
);
`;

/**
 * Migrações aplicadas em ordem. Para evoluir o schema, acrescente um novo item
 * ao array e incremente DATABASE_VERSION — nunca edite uma migração já publicada.
 */
export const MIGRACOES: string[] = [MIGRACAO_001];
