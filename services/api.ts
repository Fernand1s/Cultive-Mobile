import { API_TIMEOUT_MS, API_URL } from '../config/env';

/**
 * Cliente HTTP do Cultive+ Mobile.
 *
 * Espelha os serviços de `cultiva-front/src/services/api.js`, mas distingue
 * explicitamente falha de rede (o app segue offline) de erro da API (o servidor
 * respondeu e recusou) — a fila de sincronização depende dessa diferença para
 * decidir entre "tentar de novo depois" e "marcar como erro".
 */

export class ErroRede extends Error {
  constructor(mensagem = 'Sem conexão com o servidor.') {
    super(mensagem);
    this.name = 'ErroRede';
  }
}

export class ErroApi extends Error {
  readonly status: number;

  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
  }
}

/** Erro de rede: vale a pena tentar novamente mais tarde. */
export const ehErroDeRede = (erro: unknown): boolean => erro instanceof ErroRede;

/** Pausa o reenvio quando a API recusa a operação ou o resultado é incerto (5xx). */
export const devePausarReenvio = (erro: unknown): boolean =>
  erro instanceof ErroApi && erro.status >= 400 && erro.status !== 401;

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface OpcoesRequisicao {
  metodo?: Metodo;
  corpo?: unknown;
  token?: string | null;
  timeoutMs?: number;
}

/** Chamado quando o servidor rejeita o token — permite ao AuthContext reagir. */
let aoReceber401: (() => void) | null = null;

export function registrarHandler401(handler: (() => void) | null): void {
  aoReceber401 = handler;
}

export async function requisitar<T>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const { metodo = 'GET', corpo, token, timeoutMs = API_TIMEOUT_MS } = opcoes;

  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controlador.signal,
    });
  } catch {
    // Falha de DNS, recusa de conexão ou estouro de tempo: o app segue offline.
    throw new ErroRede();
  } finally {
    clearTimeout(timer);
  }

  if (resposta.status === 401) {
    aoReceber401?.();
    throw new ErroApi(401, 'Sessão expirada. Entre novamente.');
  }

  if (resposta.status === 403) {
    throw new ErroApi(403, 'Você não tem permissão para realizar esta ação.');
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    let mensagem = 'Erro na comunicação com o servidor.';
    try {
      const json = JSON.parse(detalhe) as { message?: string; erro?: string };
      mensagem = json.message ?? json.erro ?? mensagem;
    } catch {
      if (detalhe) mensagem = detalhe.slice(0, 200);
    }
    throw new ErroApi(resposta.status, mensagem);
  }

  // 204 e corpos vazios (DELETE, PUT sem retorno) viram `true`.
  if (resposta.status === 204) return true as unknown as T;

  const texto = await resposta.text();
  if (!texto) return true as unknown as T;
  return JSON.parse(texto) as T;
}

/** Verifica rapidamente se o back-end está acessível nesta rede. */
export async function servidorAlcancavel(): Promise<boolean> {
  try {
    await requisitar('/usuarios/login', { metodo: 'POST', corpo: {}, timeoutMs: 5000 });
    return true;
  } catch (erro) {
    // Qualquer resposta HTTP (inclusive 401) prova que o servidor respondeu.
    return !ehErroDeRede(erro);
  }
}
