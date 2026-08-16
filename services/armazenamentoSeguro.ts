import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Armazenamento de credenciais por plataforma.
 *
 * No Android/iOS usa o SecureStore (Keystore / Keychain, criptografado pelo
 * sistema) — é o alvo real do app. No Expo Web o módulo não existe: o pacote
 * resolve para um shim vazio e qualquer chamada estoura
 * "ExpoSecureStore.default.getValueWithKeyAsync is not a function". Por isso o
 * navegador cai no localStorage, que NÃO é criptografado e serve apenas ao
 * teste rápido durante o desenvolvimento.
 */

const ehWeb = Platform.OS === 'web';

function armazenamentoWeb(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    // Navegador com armazenamento bloqueado (modo privado, cookies negados).
    return null;
  }
}

export const armazenamentoSeguro = {
  /** true quando as credenciais ficam de fato criptografadas pelo sistema. */
  criptografado: !ehWeb,

  async ler(chave: string): Promise<string | null> {
    if (ehWeb) return armazenamentoWeb()?.getItem(chave) ?? null;
    return SecureStore.getItemAsync(chave);
  },

  async gravar(chave: string, valor: string): Promise<void> {
    if (ehWeb) {
      armazenamentoWeb()?.setItem(chave, valor);
      return;
    }
    await SecureStore.setItemAsync(chave, valor);
  },

  async apagar(chave: string): Promise<void> {
    if (ehWeb) {
      armazenamentoWeb()?.removeItem(chave);
      return;
    }
    await SecureStore.deleteItemAsync(chave);
  },
};
