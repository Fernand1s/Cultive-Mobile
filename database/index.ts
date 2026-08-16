import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from '../config/env';
import { DATABASE_VERSION, MIGRACOES } from './schema';

let instancia: SQLite.SQLiteDatabase | null = null;
let inicializando: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Aplica as migrações pendentes usando `PRAGMA user_version` como controle,
 * conforme o padrão recomendado pelo expo-sqlite.
 */
export async function migrarBanco(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const resultado = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const versaoAtual = resultado?.user_version ?? 0;

  if (versaoAtual >= DATABASE_VERSION) return;

  for (let versao = versaoAtual; versao < MIGRACOES.length; versao += 1) {
    await db.execAsync(MIGRACOES[versao]);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

/**
 * Abre (uma única vez) a conexão com o banco local e garante o schema aplicado.
 * Chamadas concorrentes compartilham a mesma promessa de inicialização.
 */
export async function obterBanco(): Promise<SQLite.SQLiteDatabase> {
  if (instancia) return instancia;

  if (!inicializando) {
    inicializando = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await migrarBanco(db);
      instancia = db;
      return db;
    })();
  }

  try {
    return await inicializando;
  } catch (erro) {
    inicializando = null;
    throw erro;
  }
}

/**
 * Apaga os dados sincronizados do dispositivo, preservando a fila de envio
 * (`outbox`) — usado ao encerrar sessão para não vazar dados entre usuários.
 */
export async function limparDadosLocais(): Promise<void> {
  const db = await obterBanco();
  await db.execAsync(`
    DELETE FROM tarefa;
    DELETE FROM cultivo;
    DELETE FROM estoque;
    DELETE FROM area;
    DELETE FROM planta;
    DELETE FROM usuario;
    DELETE FROM relatorio_cache;
    DELETE FROM sync_meta;
  `);
}

/** Converte `0 | 1` do SQLite para boolean. */
export const paraBool = (valor: number | null | undefined): boolean => valor === 1;

/** Converte boolean para `0 | 1` do SQLite. */
export const paraInt = (valor: boolean | null | undefined): number => (valor ? 1 : 0);

/** Carimbo ISO usado em todas as colunas `atualizado_em`. */
export const agoraISO = (): string => new Date().toISOString();
