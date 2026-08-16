import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export interface StatusRede {
  /** Existe uma interface de rede conectada. */
  conectado: boolean;
  /** A rede realmente alcança a internet (pode ser null enquanto é verificado). */
  comInternet: boolean | null;
}

/**
 * Observa a conectividade do aparelho. `comInternet` é o sinal que interessa:
 * no campo é comum haver Wi-Fi de máquina agrícola sem saída para a internet.
 */
export function useNetworkStatus(): StatusRede {
  const [status, setStatus] = useState<StatusRede>({ conectado: true, comInternet: null });

  useEffect(() => {
    const cancelarInscricao = NetInfo.addEventListener((estado) => {
      setStatus({
        conectado: Boolean(estado.isConnected),
        comInternet: estado.isInternetReachable,
      });
    });

    NetInfo.fetch().then((estado) => {
      setStatus({
        conectado: Boolean(estado.isConnected),
        comInternet: estado.isInternetReachable,
      });
    });

    return cancelarInscricao;
  }, []);

  return status;
}

/** true quando vale a pena tentar falar com o servidor. */
export const podeSincronizar = (status: StatusRede): boolean =>
  status.conectado && status.comInternet !== false;
