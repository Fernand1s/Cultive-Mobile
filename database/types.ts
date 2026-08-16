/**
 * Tipos do domínio Cultive+, espelhando as entidades do back-end Spring Boot
 * (`br.com.cultiva.cultivamais.model`) e as tabelas do banco local SQLite.
 */

// ---------------------------------------------------------------------------
// ENUMS (idênticos aos enums Java — os valores trafegam como string no JSON)
// ---------------------------------------------------------------------------

export type FuncaoUsuario =
  | 'ADMINISTRADOR'
  | 'GERENTE_PRODUCAO'
  | 'ENGENHEIRO_AGRONOMO'
  | 'TECNICO_AGRICOLA'
  | 'OPERADOR_MAQUINAS';

export type StatusCultivo = 'EM_PREPARO' | 'ATIVO' | 'EM_PRODUCAO' | 'COLHIDO' | 'CANCELADO';

export type EstadoPlanta = 'SAUDAVEL' | 'PRAGA' | 'ATENCAO' | 'CRITICO';

export type TipoCiclo = 'UNICO' | 'CONTINUO';

export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA';

export type StatusTarefa = 'PENDENTE' | 'EM_OBSERVACAO' | 'CONCLUIDA' | 'CANCELADA';

/** Rótulos em português para exibição na interface. */
export const ROTULO_FUNCAO: Record<FuncaoUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_PRODUCAO: 'Gerente de Produção',
  ENGENHEIRO_AGRONOMO: 'Engenheiro Agrônomo',
  TECNICO_AGRICOLA: 'Técnico Agrícola',
  OPERADOR_MAQUINAS: 'Operador de Máquinas',
};

export const ROTULO_STATUS_CULTIVO: Record<StatusCultivo, string> = {
  EM_PREPARO: 'Em Preparo',
  ATIVO: 'Em Crescimento',
  EM_PRODUCAO: 'Em Produção',
  COLHIDO: 'Encerrado',
  CANCELADO: 'Encerrado',
};

export const ROTULO_ESTADO_PLANTA: Record<EstadoPlanta, string> = {
  SAUDAVEL: 'Saudável',
  PRAGA: 'Com Praga',
  ATENCAO: 'Atenção',
  CRITICO: 'Crítico',
};

export const ROTULO_TIPO_CICLO: Record<TipoCiclo, string> = {
  UNICO: 'Ciclo Único',
  CONTINUO: 'Ciclo Contínuo',
};

// ---------------------------------------------------------------------------
// CONTROLE DE SINCRONIZAÇÃO (colunas presentes em toda tabela espelho)
// ---------------------------------------------------------------------------

/**
 * `synced`  — igual ao servidor.
 * `pending` — alterado no dispositivo, aguardando envio.
 * `error`   — o envio falhou de forma definitiva e exige atenção do usuário.
 */
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface ControleSync {
  syncStatus: SyncStatus;
  atualizadoEm: string;
}

// ---------------------------------------------------------------------------
// ENTIDADES
// ---------------------------------------------------------------------------

export interface Usuario {
  idUsuario: number;
  nomeUsuario: string;
  email: string;
  funcao: FuncaoUsuario;
  ativo: boolean;
  fotoPerfil: string | null;
}

export interface Area {
  idArea: number;
  nomeArea: string;
  localizacaoArea: string | null;
  tamanhoArea: number | null;
  tipoSolo: string | null;
  statusArea: string | null;
}

export interface Planta {
  idPlanta: number;
  nomePopular: string;
  nomeCientifico: string | null;
  tipoPlanta: string | null;
  cicloMedioDias: number | null;
  fotoPlanta: string | null;
}

export interface Cultivo extends ControleSync {
  idCultivo: number;
  idPlanta: number | null;
  nomePlanta: string | null;
  idArea: number | null;
  nomeArea: string | null;
  dataPlantio: string | null;
  previsaoColheita: string | null;
  dataColheitaFinal: string | null;
  estadoPlanta: EstadoPlanta;
  statusCultivo: StatusCultivo;
  tipoCiclo: TipoCiclo;
  unidadeMedida: string | null;
  observacaoCultivo: string | null;
  quantidadePlantada: number;
  quantidadeColhida: number;
}

export type CategoriaEstoque = 'INSUMO' | 'MAQUINARIO' | 'EQUIPAMENTO';

export interface ItemEstoque extends ControleSync {
  idEstoque: number;
  nome: string;
  sku: string | null;
  categoria: string;
  subcategoria: string | null;
  marca: string | null;
  modelo: string | null;
  fornecedor: string | null;
  codigoIdentificador: string | null;
  dataAquisicao: string | null;
  valorCompra: number | null;
  unidadeMedida: string | null;
  localizacao: string | null;
  status: string | null;
  fotoPreview: string | null;
  validade: string | null;
  principioAtivo: string | null;
  estoqueMinimo: number | null;
  quantidadeEstoque: number | null;
  horimetroAtual: number | null;
  horasRevisao: string | null;
  tipoCombustivel: string | null;
  placa: string | null;
  capacidadeTrabalho: string | null;
  compatibilidadePotencia: string | null;
}

export interface InsumoUsado {
  idEstoque: number;
  nome: string;
  quantidade: number;
  unidadeMedida: string | null;
}

export interface Tarefa extends ControleSync {
  id: number;
  titulo: string;
  descricao: string | null;
  prioridade: Prioridade;
  categoria: string | null;
  subcategoria: string | null;
  informacoesExtras: string | null;
  dataPrazo: string | null;
  dataCriacao: string | null;
  dataConclusao: string | null;
  concluida: boolean;
  cancelada: boolean;
  emObservacao: boolean;
  observacaoConclusao: string | null;
  fotoConclusao: string | null;
  insumosUsados: InsumoUsado[];
  idResponsavel: number | null;
  nomeResponsavel: string | null;
  nomeCriador: string | null;
  idArea: number | null;
  nomeArea: string | null;
  idCultivo: number | null;
  nomeCultivo: string | null;
}

/** Deriva o status de exibição a partir das flags booleanas, como o back-end faz. */
export function statusDaTarefa(tarefa: Pick<Tarefa, 'cancelada' | 'concluida' | 'emObservacao'>): StatusTarefa {
  if (tarefa.cancelada) return 'CANCELADA';
  if (tarefa.concluida) return 'CONCLUIDA';
  if (tarefa.emObservacao) return 'EM_OBSERVACAO';
  return 'PENDENTE';
}

/** Uma tarefa pendente cujo prazo já passou é exibida como atrasada. */
export function tarefaEstaAtrasada(tarefa: Tarefa, agora: Date = new Date()): boolean {
  if (statusDaTarefa(tarefa) !== 'PENDENTE' || !tarefa.dataPrazo) return false;
  const prazo = new Date(tarefa.dataPrazo);
  return !Number.isNaN(prazo.getTime()) && prazo.getTime() < agora.getTime();
}

// ---------------------------------------------------------------------------
// FILA DE SINCRONIZAÇÃO (outbox)
// ---------------------------------------------------------------------------

export type EntidadeSincronizavel = 'tarefa' | 'estoque' | 'cultivo';

export type OperacaoSync =
  | 'tarefa.concluir'
  | 'tarefa.observacao'
  | 'estoque.criar'
  | 'estoque.atualizar'
  | 'estoque.excluir'
  | 'cultivo.status';

export interface ItemOutbox {
  id: number;
  entidade: EntidadeSincronizavel;
  entidadeId: number;
  operacao: OperacaoSync;
  payload: string;
  tentativas: number;
  ultimoErro: string | null;
  criadoEm: string;
}
