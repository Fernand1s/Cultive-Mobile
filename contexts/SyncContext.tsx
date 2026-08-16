import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { outboxRepo } from '../database/repositories/outboxRepo';
import { syncMetaRepo } from '../database/repositories/usuarioRepo';
import { podeSincronizar, useNetworkStatus } from '../hooks/useNetworkStatus';
import { sincronizar, type ResultadoSync } from '../sync/engine';
import { useAuth } from './AuthContext';

interface ValorSync {
  online: boolean;
  sincronizando: boolean;
  /** Quantidade de alterações feitas no campo ainda não enviadas. */
  pendentes: number;
  ultimaSync: string | null;
  ultimoErro: string | null;
  sincronizarAgora: () => Promise<ResultadoSync | null>;
  atualizarPendentes: () => Promise<void>;
}

const SyncContext = createContext<ValorSync | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { usuario, autenticado, obterTokenValido } = useAuth();
  const rede = useNetworkStatus();
  const queryClient = useQueryClient();
  const online = podeSincronizar(rede);

  const [sincronizando, setSincronizando] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);

  const emExecucao = useRef(false);

  const atualizarPendentes = useCallback(async () => {
    try {
      setPendentes(await outboxRepo.contarPendentes());
      setUltimaSync(await syncMetaRepo.ultimaSyncGeral());
    } catch {
      // Banco ainda não inicializado: ignora.
    }
  }, []);

  const sincronizarAgora = useCallback(async () => {
    if (!autenticado || !usuario || emExecucao.current) return null;

    emExecucao.current = true;
    setSincronizando(true);
    try {
      const token = await obterTokenValido();
      if (!token) {
        setUltimoErro('Sem conexão com o servidor.');
        return null;
      }

      const resultado = await sincronizar(token, usuario);
      setUltimoErro(resultado.erro);

      // Faz as telas relerem o SQLite já atualizado.
      await queryClient.invalidateQueries();
      await atualizarPendentes();

      return resultado;
    } catch (erro) {
      setUltimoErro(erro instanceof Error ? erro.message : 'Falha ao sincronizar.');
      return null;
    } finally {
      emExecucao.current = false;
      setSincronizando(false);
    }
  }, [autenticado, usuario, obterTokenValido, queryClient, atualizarPendentes]);

  // Sincroniza ao entrar e sempre que a conexão voltar.
  useEffect(() => {
    if (!autenticado) return;
    void atualizarPendentes();
    if (online) void sincronizarAgora();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado, online]);

  const valor = useMemo<ValorSync>(
    () => ({
      online,
      sincronizando,
      pendentes,
      ultimaSync,
      ultimoErro,
      sincronizarAgora,
      atualizarPendentes,
    }),
    [online, sincronizando, pendentes, ultimaSync, ultimoErro, sincronizarAgora, atualizarPendentes]
  );

  return <SyncContext.Provider value={valor}>{children}</SyncContext.Provider>;
}

export function useSync(): ValorSync {
  const contexto = useContext(SyncContext);
  if (!contexto) {
    throw new Error('useSync precisa ser usado dentro de <SyncProvider>.');
  }
  return contexto;
}
