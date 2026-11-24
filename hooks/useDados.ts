import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { relatorioCacheRepo } from '../database/repositories/catalogoRepo';
import { cultivoRepo } from '../database/repositories/cultivoRepo';
import { estoqueRepo } from '../database/repositories/estoqueRepo';
import { outboxRepo } from '../database/repositories/outboxRepo';
import { tarefaRepo } from '../database/repositories/tarefaRepo';
import type {
  Cultivo,
  EstadoPlanta,
  InsumoUsado,
  ItemEstoque,
  StatusCultivo,
  Tarefa,
} from '../database/types';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';

/**
 * Hooks de dados do app.
 *
 * Toda leitura vem do SQLite e toda escrita é aplicada localmente + enfileirada
 * na outbox. Nenhuma tela depende de rede para funcionar; a sincronização apenas
 * reconcilia depois.
 */

export const chaves = {
  tarefas: ['tarefas'] as const,
  cultivos: ['cultivos'] as const,
  estoque: ['estoque'] as const,
  filtrosEstoque: ['estoque', 'filtros'] as const,
  relatorio: (chave: string) => ['relatorio', chave] as const,
};

// ---------------------------------------------------------------------------
// TAREFAS
// ---------------------------------------------------------------------------

export function useTarefas() {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: [...chaves.tarefas, usuario?.idUsuario],
    queryFn: async () => {
      // Administradores e gerentes enxergam tudo; demais funções, só o que é seu.
      const verTudo =
        usuario?.funcao === 'ADMINISTRADOR' || usuario?.funcao === 'GERENTE_PRODUCAO';
      return tarefaRepo.listar(verTudo ? undefined : usuario?.idUsuario);
    },
    enabled: Boolean(usuario),
  });
}

export interface DadosConclusao {
  observacao: string | null;
  fotoConclusao: string | null;
  insumosUsados: InsumoUsado[];
}

/**
 * Conclui a tarefa (definitivamente) ou a coloca em observação.
 * O efeito na tela é imediato; o envio acontece quando houver conexão.
 */
export function useConcluirTarefa() {
  const queryClient = useQueryClient();
  const { atualizarPendentes, sincronizarAgora, online } = useSync();

  return useMutation({
    mutationFn: async ({
      tarefa,
      dados,
      emObservacao,
    }: {
      tarefa: Tarefa;
      dados: DadosConclusao;
      emObservacao: boolean;
    }) => {
      await tarefaRepo.aplicarConclusaoLocal(tarefa.id, {
        concluida: !emObservacao,
        emObservacao,
        observacao: dados.observacao,
        fotoConclusao: dados.fotoConclusao,
        insumosUsados: dados.insumosUsados,
      });

      await outboxRepo.enfileirar(
        'tarefa',
        tarefa.id,
        emObservacao ? 'tarefa.observacao' : 'tarefa.concluir',
        dados
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chaves.tarefas });
      await atualizarPendentes();
      if (online) void sincronizarAgora();
    },
  });
}

// ---------------------------------------------------------------------------
// CULTIVOS
// ---------------------------------------------------------------------------

export function useCultivos() {
  return useQuery({
    queryKey: chaves.cultivos,
    queryFn: () => cultivoRepo.listar(),
  });
}

export function useAtualizarStatusCultivo() {
  const queryClient = useQueryClient();
  const { atualizarPendentes, sincronizarAgora, online } = useSync();

  return useMutation({
    mutationFn: async ({
      cultivo,
      statusCultivo,
      estadoPlanta,
      observacao,
    }: {
      cultivo: Cultivo;
      statusCultivo: StatusCultivo;
      estadoPlanta: EstadoPlanta;
      observacao: string | null;
    }) => {
      await cultivoRepo.aplicarStatusLocal(cultivo.idCultivo, {
        statusCultivo,
        estadoPlanta,
        observacao,
      });

      await outboxRepo.enfileirar('cultivo', cultivo.idCultivo, 'cultivo.status', {
        statusCultivo,
        estadoPlanta,
        observacaoCultivo: observacao,
        quantidadePlantada: cultivo.quantidadePlantada,
        idPlanta: cultivo.idPlanta,
        idArea: cultivo.idArea,
        dataPlantio: cultivo.dataPlantio,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chaves.cultivos });
      await atualizarPendentes();
      if (online) void sincronizarAgora();
    },
  });
}

// ---------------------------------------------------------------------------
// ESTOQUE
// ---------------------------------------------------------------------------

export function useEstoque() {
  return useQuery({
    queryKey: chaves.estoque,
    queryFn: () => estoqueRepo.listar(),
  });
}

export function useFiltrosEstoque() {
  return useQuery({
    queryKey: chaves.filtrosEstoque,
    queryFn: () => estoqueRepo.opcoesDeFiltro(),
  });
}

export function useSalvarItemEstoque() {
  const queryClient = useQueryClient();
  const { atualizarPendentes, sincronizarAgora, online } = useSync();

  return useMutation({
    mutationFn: async (item: ItemEstoque) => {
      const ehNovo = !item.idEstoque || item.idEstoque === 0;
      const id = ehNovo ? await estoqueRepo.proximoIdTemporario() : item.idEstoque;

      await estoqueRepo.salvarLocal({ ...item, idEstoque: id });
      await outboxRepo.enfileirar(
        'estoque',
        id,
        ehNovo ? 'estoque.criar' : 'estoque.atualizar',
        {}
      );
      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chaves.estoque });
      await queryClient.invalidateQueries({ queryKey: chaves.filtrosEstoque });
      await atualizarPendentes();
      if (online) void sincronizarAgora();
    },
  });
}

export function useExcluirItemEstoque() {
  const queryClient = useQueryClient();
  const { atualizarPendentes, sincronizarAgora, online } = useSync();

  return useMutation({
    mutationFn: async (item: ItemEstoque) => {
      // Mantém o ID temporário reservado até a fila processar o cancelamento.
      if (item.idEstoque < 0) {
        await outboxRepo.enfileirar('estoque', item.idEstoque, 'estoque.excluir', {});
        return;
      }
      await estoqueRepo.excluirLocal(item.idEstoque);
      await outboxRepo.enfileirar('estoque', item.idEstoque, 'estoque.excluir', {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chaves.estoque });
      await atualizarPendentes();
      if (online) void sincronizarAgora();
    },
  });
}

// ---------------------------------------------------------------------------
// RELATÓRIOS (lidos do cache local)
// ---------------------------------------------------------------------------

export function useRelatorio<T>(chave: string) {
  return useQuery({
    queryKey: chaves.relatorio(chave),
    queryFn: () => relatorioCacheRepo.ler<T>(chave),
  });
}
