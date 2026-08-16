import * as Crypto from 'expo-crypto';

import { armazenamentoSeguro } from './armazenamentoSeguro';
import { usuarioRepo } from '../database/repositories/usuarioRepo';
import type { FuncaoUsuario, Usuario } from '../database/types';
import { ErroApi, ErroRede, ehErroDeRede, requisitar } from './api';

/**
 * Autenticação offline-first.
 *
 * Com internet: autentica no back-end, guarda o JWT e espelha o perfil no SQLite.
 * Sem internet: valida as credenciais contra o hash da última sessão bem-sucedida
 * no próprio aparelho — o operador no campo consegue abrir o app e trabalhar.
 *
 * Sobre guardar a credencial: o JWT emitido pelo back-end expira em 24 h, e o
 * app precisa continuar autenticado por dias sem sinal. Por isso a senha é
 * mantida no armazenamento seguro do aparelho (Android Keystore / iOS Keychain,
 * criptografado pelo sistema — ver `armazenamentoSeguro`) exclusivamente para
 * (a) revalidar o login offline e (b) renovar o token em silêncio assim que a
 * conexão voltar. Ela nunca é gravada no SQLite,
 * nunca sai do aparelho a não ser no próprio endpoint de login, e é apagada por
 * completo ao encerrar a sessão.
 */

const CHAVE_TOKEN = 'cultive.token';
const CHAVE_CREDENCIAL = 'cultive.credencial';
const CHAVE_ID_USUARIO = 'cultive.idUsuario';

interface RespostaLogin {
  token: string;
  idUsuario: number;
  nomeUsuario: string;
  funcao: FuncaoUsuario;
  email: string;
  ativo: boolean;
  fotoPerfil: string | null;
}

interface CredencialGuardada {
  email: string;
  senha: string;
  salt: string;
  hash: string;
}

export interface Sessao {
  token: string | null;
  usuario: Usuario;
  /** true quando a sessão foi restaurada/validada sem contato com o servidor. */
  offline: boolean;
}

export class ErroCredenciais extends Error {
  constructor(mensagem = 'E-mail ou senha incorretos.') {
    super(mensagem);
    this.name = 'ErroCredenciais';
  }
}

export class ErroPrimeiroLoginOffline extends Error {
  constructor() {
    super(
      'É necessário conectar-se à internet no primeiro acesso deste usuário no aparelho.'
    );
    this.name = 'ErroPrimeiroLoginOffline';
  }
}

async function derivarHash(senha: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${senha}`);
}

function gerarSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function guardarCredencial(email: string, senha: string): Promise<void> {
  const salt = gerarSalt();
  const hash = await derivarHash(senha, salt);
  const credencial: CredencialGuardada = { email: email.toLowerCase(), senha, salt, hash };
  await armazenamentoSeguro.gravar(CHAVE_CREDENCIAL, JSON.stringify(credencial));
}

async function lerCredencial(): Promise<CredencialGuardada | null> {
  const bruto = await armazenamentoSeguro.ler(CHAVE_CREDENCIAL);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as CredencialGuardada;
  } catch {
    return null;
  }
}

async function persistirSessao(resposta: RespostaLogin): Promise<Usuario> {
  const usuario: Usuario = {
    idUsuario: resposta.idUsuario,
    nomeUsuario: resposta.nomeUsuario,
    email: resposta.email,
    funcao: resposta.funcao,
    ativo: resposta.ativo ?? true,
    fotoPerfil: resposta.fotoPerfil ?? null,
  };

  await usuarioRepo.salvar(usuario);
  await armazenamentoSeguro.gravar(CHAVE_TOKEN, resposta.token);
  await armazenamentoSeguro.gravar(CHAVE_ID_USUARIO, String(resposta.idUsuario));

  return usuario;
}

export const authService = {
  /**
   * Autentica o usuário. Tenta o servidor primeiro; se não houver rede, cai
   * para a validação local contra a última credencial usada neste aparelho.
   */
  async entrar(email: string, senha: string): Promise<Sessao> {
    const emailNormalizado = email.trim();

    try {
      const resposta = await requisitar<RespostaLogin>('/usuarios/login', {
        metodo: 'POST',
        corpo: { email: emailNormalizado, senha },
      });

      const usuario = await persistirSessao(resposta);
      await guardarCredencial(emailNormalizado, senha);

      return { token: resposta.token, usuario, offline: false };
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 401) {
        throw new ErroCredenciais();
      }
      if (!ehErroDeRede(erro)) throw erro;

      return authService.entrarOffline(emailNormalizado, senha);
    }
  },

  /** Valida as credenciais sem rede, usando o hash da última sessão local. */
  async entrarOffline(email: string, senha: string): Promise<Sessao> {
    const credencial = await lerCredencial();
    if (!credencial || credencial.email !== email.toLowerCase()) {
      throw new ErroPrimeiroLoginOffline();
    }

    const hash = await derivarHash(senha, credencial.salt);
    if (hash !== credencial.hash) {
      throw new ErroCredenciais();
    }

    const usuario = await usuarioRepo.buscarPorEmail(email);
    if (!usuario) throw new ErroPrimeiroLoginOffline();

    const token = await armazenamentoSeguro.ler(CHAVE_TOKEN);
    return { token, usuario, offline: true };
  },

  /** Restaura a sessão salva ao abrir o app, sem exigir conexão. */
  async restaurarSessao(): Promise<Sessao | null> {
    const idBruto = await armazenamentoSeguro.ler(CHAVE_ID_USUARIO);
    if (!idBruto) return null;

    const usuario = await usuarioRepo.buscarPorId(Number(idBruto));
    if (!usuario) return null;

    const token = await armazenamentoSeguro.ler(CHAVE_TOKEN);
    return { token, usuario, offline: true };
  },

  /**
   * Obtém um token válido. Se o atual expirou (o back-end usa 24 h), refaz o
   * login em silêncio com a credencial guardada. Retorna null quando offline.
   */
  async renovarToken(): Promise<string | null> {
    const credencial = await lerCredencial();
    if (!credencial) return null;

    try {
      const resposta = await requisitar<RespostaLogin>('/usuarios/login', {
        metodo: 'POST',
        corpo: { email: credencial.email, senha: credencial.senha },
      });
      await persistirSessao(resposta);
      return resposta.token;
    } catch (erro) {
      if (ehErroDeRede(erro)) return null;
      // Credencial revogada ou alterada no sistema web: força novo login.
      throw new ErroCredenciais('Suas credenciais mudaram. Entre novamente.');
    }
  },

  async obterToken(): Promise<string | null> {
    return armazenamentoSeguro.ler(CHAVE_TOKEN);
  },

  /** Atualiza a senha guardada após o usuário trocá-la dentro do app. */
  async atualizarSenhaGuardada(email: string, novaSenha: string): Promise<void> {
    await guardarCredencial(email, novaSenha);
  },

  async sair(): Promise<void> {
    await armazenamentoSeguro.apagar(CHAVE_TOKEN);
    await armazenamentoSeguro.apagar(CHAVE_CREDENCIAL);
    await armazenamentoSeguro.apagar(CHAVE_ID_USUARIO);
  },
};

export { ErroRede };
