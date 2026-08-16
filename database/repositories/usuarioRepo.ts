import { agoraISO, obterBanco, paraBool, paraInt } from '../index';
import type { FuncaoUsuario, Usuario } from '../types';

interface LinhaUsuario {
  id_usuario: number;
  nome_usuario: string;
  email: string;
  funcao: string;
  ativo: number;
  foto_perfil: string | null;
}

const mapear = (linha: LinhaUsuario): Usuario => ({
  idUsuario: linha.id_usuario,
  nomeUsuario: linha.nome_usuario,
  email: linha.email,
  funcao: linha.funcao as FuncaoUsuario,
  ativo: paraBool(linha.ativo),
  fotoPerfil: linha.foto_perfil,
});

export const usuarioRepo = {
  async salvar(usuario: Usuario): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      `INSERT INTO usuario (id_usuario, nome_usuario, email, funcao, ativo, foto_perfil)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id_usuario) DO UPDATE SET
         nome_usuario = excluded.nome_usuario,
         email        = excluded.email,
         funcao       = excluded.funcao,
         ativo        = excluded.ativo,
         foto_perfil  = excluded.foto_perfil`,
      [
        usuario.idUsuario,
        usuario.nomeUsuario,
        usuario.email,
        usuario.funcao,
        paraInt(usuario.ativo),
        usuario.fotoPerfil,
      ]
    );
  },

  async salvarVarios(usuarios: Usuario[]): Promise<void> {
    if (usuarios.length === 0) return;
    const db = await obterBanco();
    await db.withTransactionAsync(async () => {
      for (const usuario of usuarios) {
        await usuarioRepo.salvar(usuario);
      }
    });
  },

  async buscarPorId(idUsuario: number): Promise<Usuario | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<LinhaUsuario>(
      'SELECT * FROM usuario WHERE id_usuario = ?',
      [idUsuario]
    );
    return linha ? mapear(linha) : null;
  },

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<LinhaUsuario>(
      'SELECT * FROM usuario WHERE lower(email) = lower(?)',
      [email]
    );
    return linha ? mapear(linha) : null;
  },

  /** Atualiza apenas a foto de perfil no cache local (usado ao trocar o avatar). */
  async atualizarFoto(idUsuario: number, fotoPerfil: string | null): Promise<void> {
    const db = await obterBanco();
    await db.runAsync('UPDATE usuario SET foto_perfil = ? WHERE id_usuario = ?', [
      fotoPerfil,
      idUsuario,
    ]);
  },
};

export const syncMetaRepo = {
  async registrar(entidade: string, resultado: string): Promise<void> {
    const db = await obterBanco();
    await db.runAsync(
      `INSERT INTO sync_meta (entidade, ultima_sync, ultimo_resultado)
       VALUES (?, ?, ?)
       ON CONFLICT(entidade) DO UPDATE SET
         ultima_sync      = excluded.ultima_sync,
         ultimo_resultado = excluded.ultimo_resultado`,
      [entidade, agoraISO(), resultado]
    );
  },

  async ultimaSync(entidade: string): Promise<string | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ ultima_sync: string | null }>(
      'SELECT ultima_sync FROM sync_meta WHERE entidade = ?',
      [entidade]
    );
    return linha?.ultima_sync ?? null;
  },

  /** Data da sincronização mais recente entre todas as entidades. */
  async ultimaSyncGeral(): Promise<string | null> {
    const db = await obterBanco();
    const linha = await db.getFirstAsync<{ ultima: string | null }>(
      'SELECT MAX(ultima_sync) AS ultima FROM sync_meta'
    );
    return linha?.ultima ?? null;
  },
};
