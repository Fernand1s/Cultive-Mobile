import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { limparDadosLocais, obterBanco } from '../database';
import { usuarioRepo } from '../database/repositories/usuarioRepo';
import type { Usuario } from '../database/types';
import { registrarHandler401 } from '../services/api';
import { authService, type Sessao } from '../services/authService';

interface ValorAuth {
  usuario: Usuario | null;
  token: string | null;
  /** true enquanto o app restaura a sessão salva — mostrar splash. */
  carregando: boolean;
  autenticado: boolean;
  entrar: (email: string, senha: string) => Promise<Sessao>;
  sair: () => Promise<void>;
  /** Devolve um token válido, renovando-o em silêncio se necessário. */
  obterTokenValido: () => Promise<string | null>;
  atualizarUsuarioLocal: (dados: Partial<Usuario>) => Promise<void>;
}

const AuthContext = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Evita várias renovações simultâneas quando telas disparam requisições juntas.
  const renovacaoEmCurso = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        await obterBanco();
        const sessao = await authService.restaurarSessao();
        if (ativo && sessao) {
          setUsuario(sessao.usuario);
          setToken(sessao.token);
        }
      } catch (erro) {
        console.warn('Falha ao restaurar a sessão:', erro);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const sessao = await authService.entrar(email, senha);
    setUsuario(sessao.usuario);
    setToken(sessao.token);
    return sessao;
  }, []);

  const sair = useCallback(async () => {
    await authService.sair();
    await limparDadosLocais();
    setUsuario(null);
    setToken(null);
  }, []);

  const obterTokenValido = useCallback(async () => {
    if (renovacaoEmCurso.current) return renovacaoEmCurso.current;

    renovacaoEmCurso.current = (async () => {
      const novoToken = await authService.renovarToken();
      if (novoToken) setToken(novoToken);
      return novoToken;
    })();

    try {
      return await renovacaoEmCurso.current;
    } finally {
      renovacaoEmCurso.current = null;
    }
  }, []);

  const atualizarUsuarioLocal = useCallback(
    async (dados: Partial<Usuario>) => {
      setUsuario((atual) => {
        if (!atual) return atual;
        const atualizado = { ...atual, ...dados };
        void usuarioRepo.salvar(atualizado);
        return atualizado;
      });
    },
    []
  );

  // Um 401 vindo de qualquer tela dispara uma tentativa de renovação silenciosa.
  useEffect(() => {
    registrarHandler401(() => {
      void obterTokenValido().catch(() => {
        // Credencial inválida no servidor: encerra a sessão local.
        void sair();
      });
    });
    return () => registrarHandler401(null);
  }, [obterTokenValido, sair]);

  const valor = useMemo<ValorAuth>(
    () => ({
      usuario,
      token,
      carregando,
      autenticado: usuario !== null,
      entrar,
      sair,
      obterTokenValido,
      atualizarUsuarioLocal,
    }),
    [usuario, token, carregando, entrar, sair, obterTokenValido, atualizarUsuarioLocal]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorAuth {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.');
  }
  return contexto;
}
