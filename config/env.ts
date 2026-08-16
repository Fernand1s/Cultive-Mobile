import Constants from 'expo-constants';

/**
 * URL base da API do Cultive+ (back-end Spring Boot compartilhado com a versão web).
 *
 * Em desenvolvimento o celular/tablet NÃO enxerga o `localhost` da máquina que roda
 * o back-end: é preciso apontar para o IP da máquina na rede local (ex.: 192.168.0.100).
 * O valor vem de `expo.extra.apiUrl` no app.json e pode ser sobrescrito sem recompilar.
 *
 * Quando o app roda no Expo Go, tentamos deduzir o IP do próprio servidor de
 * desenvolvimento do Metro — assim, na maioria das redes, funciona sem configuração.
 */
function inferirHostDoMetro(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;

  if (!hostUri) return null;

  const host = hostUri.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;

  return host;
}

function resolverApiUrl(): string {
  const configurada = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  const hostMetro = inferirHostDoMetro();
  if (hostMetro) {
    return `http://${hostMetro}:${API_PORT}/api`;
  }

  return configurada ?? `http://localhost:${API_PORT}/api`;
}

export const API_PORT = 8090;

export const API_URL = resolverApiUrl();

/** Tempo máximo de espera por resposta antes de considerar o dispositivo offline. */
export const API_TIMEOUT_MS = 12000;

/** Nome do arquivo do banco local (SQLite) no dispositivo. */
export const DATABASE_NAME = 'cultive.db';
