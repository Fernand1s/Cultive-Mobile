import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

import { obterBanco } from '../database';

/**
 * Estado de servidor do app.
 *
 * Como o SQLite já é a fonte da verdade, as queries leem do banco local e a
 * rede apenas o reabastece. Por isso `networkMode: 'always'`: sem isso o React
 * Query pausaria as queries quando o aparelho está sem sinal, e o app ficaria
 * em branco justamente na situação para a qual ele foi feito.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      retry: 1,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: 'always',
      retry: 0,
    },
  },
});

const CHAVE_CACHE = 'cultive.react-query';

/**
 * Persiste o cache do React Query no próprio SQLite — evita depender de
 * AsyncStorage e mantém tudo do app num único arquivo de banco.
 */
export const sqlitePersister: Persister = {
  async persistClient(cliente: PersistedClient) {
    const db = await obterBanco();
    await db.runAsync(
      `INSERT INTO query_cache (chave, conteudo) VALUES (?, ?)
       ON CONFLICT(chave) DO UPDATE SET conteudo = excluded.conteudo`,
      [CHAVE_CACHE, JSON.stringify(cliente)]
    );
  },

  async restoreClient() {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ conteudo: string }>(
      'SELECT conteudo FROM query_cache WHERE chave = ?',
      [CHAVE_CACHE]
    );
    if (!linha) return undefined;
    try {
      return JSON.parse(linha.conteudo) as PersistedClient;
    } catch {
      return undefined;
    }
  },

  async removeClient() {
    const db = await obterBanco();
    await db.runAsync('DELETE FROM query_cache WHERE chave = ?', [CHAVE_CACHE]);
  },
};
