import { CloudOff, RefreshCw, UploadCloud } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSync } from '../contexts/SyncContext';
import { cores, espacamento, fonte, raio } from '../theme';

/**
 * Cabeçalho padrão das telas do app: título, subtítulo, ação opcional e a
 * faixa de estado da sincronização — o operador precisa saber o tempo todo se
 * o que ele registrou já subiu para o sistema web.
 */
export function CabecalhoTela({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: React.ReactNode;
}) {
  return (
    <View style={estilos.container}>
      <View style={estilos.linhaTopo}>
        <View style={estilos.textos}>
          <Text style={estilos.titulo}>{titulo}</Text>
          {subtitulo && <Text style={estilos.subtitulo}>{subtitulo}</Text>}
        </View>
        {acao}
      </View>
      <FaixaSync />
    </View>
  );
}

export function FaixaSync() {
  const { online, sincronizando, pendentes, sincronizarAgora } = useSync();

  if (online && pendentes === 0 && !sincronizando) return null;

  const offline = !online;
  const tom = offline ? estilos.faixaOffline : estilos.faixaPendente;

  return (
    <Pressable
      style={[estilos.faixa, tom]}
      onPress={() => void sincronizarAgora()}
      disabled={offline || sincronizando}
      accessibilityRole="button"
    >
      {sincronizando ? (
        <ActivityIndicator size="small" color={offline ? '#B45309' : cores.azul} />
      ) : offline ? (
        <CloudOff size={16} color="#B45309" />
      ) : (
        <UploadCloud size={16} color={cores.azul} />
      )}

      <Text style={[estilos.faixaTexto, { color: offline ? '#B45309' : cores.azul }]}>
        {sincronizando
          ? 'Sincronizando com o sistema…'
          : offline
            ? pendentes > 0
              ? `Sem conexão — ${pendentes} ${pendentes === 1 ? 'registro guardado' : 'registros guardados'} no aparelho`
              : 'Sem conexão — trabalhando com os dados salvos'
            : `${pendentes} ${pendentes === 1 ? 'registro pendente' : 'registros pendentes'} • toque para enviar`}
      </Text>

      {!offline && !sincronizando && <RefreshCw size={14} color={cores.azul} />}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  container: {
    paddingHorizontal: espacamento.lg,
    paddingTop: espacamento.sm,
    paddingBottom: espacamento.md,
    gap: espacamento.sm,
    backgroundColor: cores.fundo,
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.md,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontSize: fonte.titulo,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    marginTop: 2,
  },
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    borderRadius: raio.md,
    borderWidth: 1,
  },
  faixaOffline: {
    backgroundColor: cores.ambarFundo,
    borderColor: '#FDE68A',
  },
  faixaPendente: {
    backgroundColor: cores.azulFundo,
    borderColor: '#BFDBFE',
  },
  faixaTexto: {
    flex: 1,
    fontSize: fonte.minusculo,
    fontWeight: '600',
  },
});
