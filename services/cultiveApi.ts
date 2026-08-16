import type {
  Area,
  Cultivo,
  EstadoPlanta,
  InsumoUsado,
  ItemEstoque,
  Planta,
  StatusCultivo,
  Tarefa,
  Usuario,
} from '../database/types';
import { requisitar } from './api';

/**
 * Tradução entre o JSON do back-end Spring Boot e os tipos locais do app.
 *
 * O back-end devolve entidades JPA com relacionamentos aninhados (`plantaCultivada`,
 * `areaCultivo`, `responsavel`), enquanto o banco local guarda esses vínculos
 * achatados em id + nome. Toda essa conversão fica concentrada aqui.
 */

const texto = (valor: unknown): string | null =>
  typeof valor === 'string' && valor.length > 0 ? valor : null;

const numero = (valor: unknown): number | null =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null;

// ---------------------------------------------------------------------------
// CULTIVOS
// ---------------------------------------------------------------------------

interface CultivoApi {
  idCultivo: number;
  plantaCultivada?: { idPlanta: number; nomePopular: string } | null;
  areaCultivo?: { idArea: number; nomeArea: string } | null;
  dataPlantio?: string | null;
  previsaoColheita?: string | null;
  dataColheitaFinal?: string | null;
  estadoPlanta?: EstadoPlanta | null;
  statusCultivo?: StatusCultivo | null;
  tipoCiclo?: 'UNICO' | 'CONTINUO' | null;
  unidadeMedida?: string | null;
  observacaoCultivo?: string | null;
  quantidadePlantada?: number | null;
  quantidadeColhida?: number | null;
}

function normalizarCultivo(bruto: CultivoApi): Cultivo {
  return {
    idCultivo: bruto.idCultivo,
    idPlanta: bruto.plantaCultivada?.idPlanta ?? null,
    nomePlanta: bruto.plantaCultivada?.nomePopular ?? null,
    idArea: bruto.areaCultivo?.idArea ?? null,
    nomeArea: bruto.areaCultivo?.nomeArea ?? null,
    dataPlantio: texto(bruto.dataPlantio),
    previsaoColheita: texto(bruto.previsaoColheita),
    dataColheitaFinal: texto(bruto.dataColheitaFinal),
    estadoPlanta: bruto.estadoPlanta ?? 'SAUDAVEL',
    statusCultivo: bruto.statusCultivo ?? 'ATIVO',
    tipoCiclo: bruto.tipoCiclo ?? 'UNICO',
    unidadeMedida: texto(bruto.unidadeMedida),
    observacaoCultivo: texto(bruto.observacaoCultivo),
    quantidadePlantada: numero(bruto.quantidadePlantada) ?? 0,
    quantidadeColhida: numero(bruto.quantidadeColhida) ?? 0,
    syncStatus: 'synced',
    atualizadoEm: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// TAREFAS
// ---------------------------------------------------------------------------

interface TarefaApi {
  id: number;
  titulo: string;
  descricao?: string | null;
  prioridade?: 'ALTA' | 'MEDIA' | 'BAIXA' | null;
  categoria?: string | null;
  subcategoria?: string | null;
  informacoesExtras?: string | null;
  dataPrazo?: string | null;
  dataCriacao?: string | null;
  dataConclusao?: string | null;
  concluida?: boolean;
  isConcluida?: boolean;
  cancelada?: boolean;
  emObservacao?: boolean;
  observacaoConclusao?: string | null;
  fotoConclusao?: string | null;
  insumosUsados?: InsumoUsado[] | null;
  idResponsavel?: number | null;
  responsavel?: { idUsuario: number; nomeUsuario: string } | null;
  criador?: { idUsuario: number; nomeUsuario: string } | null;
  idArea?: number | null;
  nomeArea?: string | null;
  idCultivo?: number | null;
  nomeCultivo?: string | null;
}

function normalizarTarefa(bruto: TarefaApi): Tarefa {
  return {
    id: bruto.id,
    titulo: bruto.titulo,
    descricao: texto(bruto.descricao),
    prioridade: bruto.prioridade ?? 'MEDIA',
    categoria: texto(bruto.categoria),
    subcategoria: texto(bruto.subcategoria),
    informacoesExtras: texto(bruto.informacoesExtras),
    dataPrazo: texto(bruto.dataPrazo),
    dataCriacao: texto(bruto.dataCriacao),
    dataConclusao: texto(bruto.dataConclusao),
    // O DTO serializa o booleano como `isConcluida`; a entidade, como `concluida`.
    concluida: Boolean(bruto.concluida ?? bruto.isConcluida),
    cancelada: Boolean(bruto.cancelada),
    emObservacao: Boolean(bruto.emObservacao),
    observacaoConclusao: texto(bruto.observacaoConclusao),
    fotoConclusao: texto(bruto.fotoConclusao),
    insumosUsados: bruto.insumosUsados ?? [],
    idResponsavel: bruto.idResponsavel ?? bruto.responsavel?.idUsuario ?? null,
    nomeResponsavel: bruto.responsavel?.nomeUsuario ?? null,
    nomeCriador: bruto.criador?.nomeUsuario ?? null,
    idArea: bruto.idArea ?? null,
    nomeArea: texto(bruto.nomeArea),
    idCultivo: bruto.idCultivo ?? null,
    nomeCultivo: texto(bruto.nomeCultivo),
    syncStatus: 'synced',
    atualizadoEm: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// ESTOQUE
// ---------------------------------------------------------------------------

function normalizarEstoque(bruto: Record<string, unknown>): ItemEstoque {
  return {
    idEstoque: bruto.idEstoque as number,
    nome: (bruto.nome as string) ?? '',
    sku: texto(bruto.sku),
    categoria: (bruto.categoria as string) ?? 'INSUMO',
    subcategoria: texto(bruto.subcategoria),
    marca: texto(bruto.marca),
    modelo: texto(bruto.modelo),
    fornecedor: texto(bruto.fornecedor),
    codigoIdentificador: texto(bruto.codigoIdentificador),
    dataAquisicao: texto(bruto.dataAquisicao),
    valorCompra: numero(bruto.valorCompra),
    unidadeMedida: texto(bruto.unidadeMedida),
    localizacao: texto(bruto.localizacao),
    status: texto(bruto.status),
    fotoPreview: texto(bruto.fotoPreview),
    validade: texto(bruto.validade),
    principioAtivo: texto(bruto.principioAtivo),
    estoqueMinimo: numero(bruto.estoqueMinimo),
    quantidadeEstoque: numero(bruto.quantidadeEstoque),
    horimetroAtual: numero(bruto.horimetroAtual),
    horasRevisao: texto(bruto.horasRevisao),
    tipoCombustivel: texto(bruto.tipoCombustivel),
    placa: texto(bruto.placa),
    capacidadeTrabalho: texto(bruto.capacidadeTrabalho),
    compatibilidadePotencia: texto(bruto.compatibilidadePotencia),
    syncStatus: 'synced',
    atualizadoEm: new Date().toISOString(),
  };
}

/** Monta o corpo aceito pelo `EstoqueDTO` do back-end. */
function paraPayloadEstoque(item: ItemEstoque): Record<string, unknown> {
  return {
    nome: item.nome,
    sku: item.sku,
    categoria: item.categoria,
    subcategoria: item.subcategoria,
    marca: item.marca,
    modelo: item.modelo,
    fornecedor: item.fornecedor,
    codigoIdentificador: item.codigoIdentificador,
    dataAquisicao: item.dataAquisicao,
    valorCompra: item.valorCompra,
    unidadeMedida: item.unidadeMedida,
    localizacao: item.localizacao,
    status: item.status,
    fotoPreview: item.fotoPreview,
    validade: item.validade,
    principioAtivo: item.principioAtivo,
    estoqueMinimo: item.estoqueMinimo,
    quantidadeEstoque: item.quantidadeEstoque,
    horimetroAtual: item.horimetroAtual,
    horasRevisao: item.horasRevisao,
    tipoCombustivel: item.tipoCombustivel,
    placa: item.placa,
    capacidadeTrabalho: item.capacidadeTrabalho,
    compatibilidadePotencia: item.compatibilidadePotencia,
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const cultiveApi = {
  async listarCultivos(token: string): Promise<Cultivo[]> {
    const dados = await requisitar<CultivoApi[]>('/cultivos', { token });
    return dados.map(normalizarCultivo);
  },

  /**
   * Atualiza estágio/sanidade de um cultivo.
   *
   * `quantidadePlantada` vai sempre preenchida de propósito: o back-end faz
   * `dto.getQuantidadePlantada() > 0` sem checar nulo, e omitir o campo
   * derrubaria a requisição com NullPointerException.
   */
  async atualizarStatusCultivo(
    token: string,
    idCultivo: number,
    dados: {
      statusCultivo: StatusCultivo;
      estadoPlanta: EstadoPlanta;
      observacaoCultivo: string | null;
      quantidadePlantada: number;
      idPlanta: number | null;
      idArea: number | null;
    }
  ): Promise<Cultivo> {
    const resposta = await requisitar<CultivoApi>(`/cultivos/${idCultivo}`, {
      metodo: 'PUT',
      token,
      corpo: {
        idPlanta: dados.idPlanta,
        idArea: dados.idArea,
        statusCultivo: dados.statusCultivo,
        estadoPlanta: dados.estadoPlanta,
        observacaoCultivo: dados.observacaoCultivo ?? '',
        quantidadePlantada: dados.quantidadePlantada,
      },
    });
    return normalizarCultivo(resposta);
  },

  async listarTarefas(token: string, idUsuario: number, funcao: string): Promise<Tarefa[]> {
    const dados = await requisitar<TarefaApi[]>(
      `/tarefas?idUsuario=${idUsuario}&funcao=${encodeURIComponent(funcao)}`,
      { token }
    );
    return dados.map(normalizarTarefa);
  },

  async concluirTarefa(
    token: string,
    id: number,
    payload: { observacao: string | null; fotoConclusao: string | null; insumosUsados: InsumoUsado[] }
  ): Promise<Tarefa> {
    const resposta = await requisitar<TarefaApi>(`/tarefas/${id}/concluir`, {
      metodo: 'PATCH',
      token,
      corpo: payload,
    });
    return normalizarTarefa(resposta);
  },

  async atualizarObservacaoTarefa(
    token: string,
    id: number,
    payload: { observacao: string | null; fotoConclusao: string | null; insumosUsados: InsumoUsado[] }
  ): Promise<Tarefa> {
    const resposta = await requisitar<TarefaApi>(`/tarefas/${id}/atualizar-observacao`, {
      metodo: 'PATCH',
      token,
      corpo: payload,
    });
    return normalizarTarefa(resposta);
  },

  async listarEstoque(token: string): Promise<ItemEstoque[]> {
    const dados = await requisitar<Record<string, unknown>[]>('/estoque', { token });
    return dados.map(normalizarEstoque);
  },

  async criarItemEstoque(token: string, item: ItemEstoque): Promise<ItemEstoque> {
    const resposta = await requisitar<Record<string, unknown>>('/estoque', {
      metodo: 'POST',
      token,
      corpo: paraPayloadEstoque(item),
    });
    return normalizarEstoque(resposta);
  },

  async atualizarItemEstoque(token: string, item: ItemEstoque): Promise<ItemEstoque> {
    const resposta = await requisitar<Record<string, unknown>>(`/estoque/${item.idEstoque}`, {
      metodo: 'PUT',
      token,
      corpo: paraPayloadEstoque(item),
    });
    return normalizarEstoque(resposta);
  },

  async excluirItemEstoque(token: string, idEstoque: number): Promise<void> {
    await requisitar(`/estoque/${idEstoque}`, { metodo: 'DELETE', token });
  },

  async listarAreas(token: string): Promise<Area[]> {
    const dados = await requisitar<Record<string, unknown>[]>('/areas', { token });
    return dados.map((a) => ({
      idArea: a.idArea as number,
      nomeArea: (a.nomeArea as string) ?? '',
      localizacaoArea: texto(a.localizacaoArea),
      tamanhoArea: numero(a.tamanhoArea),
      tipoSolo: texto(a.tipoSolo),
      statusArea: texto(a.statusArea),
    }));
  },

  async listarPlantas(token: string): Promise<Planta[]> {
    const dados = await requisitar<Record<string, unknown>[]>('/plantas', { token });
    return dados.map((p) => ({
      idPlanta: p.idPlanta as number,
      nomePopular: (p.nomePopular as string) ?? '',
      nomeCientifico: texto(p.nomeCientifico),
      tipoPlanta: texto(p.tipoPlanta),
      cicloMedioDias: numero(p.cicloMedioDias),
      fotoPlanta: texto(p.fotoPlanta),
    }));
  },

  async listarUsuarios(token: string): Promise<Usuario[]> {
    const dados = await requisitar<Record<string, unknown>[]>('/usuarios', { token });
    return dados.map((u) => ({
      idUsuario: u.idUsuario as number,
      nomeUsuario: (u.nomeUsuario as string) ?? '',
      email: (u.email as string) ?? '',
      funcao: u.funcao as Usuario['funcao'],
      ativo: u.ativo !== false,
      fotoPerfil: texto(u.fotoPerfil),
    }));
  },

  /** Relatórios são baixados crus e guardados em cache para leitura offline. */
  async obterRelatorio<T>(token: string, caminho: string): Promise<T> {
    return requisitar<T>(`/relatorios${caminho}`, { token });
  },
};
