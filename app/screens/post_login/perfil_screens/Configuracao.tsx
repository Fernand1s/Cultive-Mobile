import Constants from 'expo-constants';
import { Database, RefreshCw, Server, Trash2, Wifi, WifiOff } from 'lucide-react-native';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { TelaInterna } from '../../../../components/TelaInterna';
import { Botao, Cartao, Etiqueta, LinhaInfo } from '../../../../components/ui';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSync } from '../../../../contexts/SyncContext';
import { API_URL } from '../../../../config/env';
import { limparDadosLocais } from '../../../../database';
import { outboxRepo } from '../../../../database/repositories/outboxRepo';
import { cores, espacamento, fonte } from '../../../../theme';

/**
 * Preferências e diagnóstico do modo offline — a tela para onde o usuário vai
 * quando "alguma coisa não subiu".
 */
export default function Configuracao() {
  const { online, pendentes, ultimaSync, ultimoErro, sincronizando, sincronizarAgora, atualizarPendentes } =
    useSync();
  const { usuario } = useAuth();

  const versao = Constants.expoConfig?.version ?? '1.0.0';

  const limparCache = () => {
    Alert.alert(
      'Limpar dados baixados',
      pendentes > 0
        ? `Atenção: existem ${pendentes} ${pendentes === 1 ? 'registro' : 'registros'} ainda não enviados. Eles NÃO serão apagados, mas os dados baixados serão removidos até a próxima sincronização.`
        : 'Os dados baixados serão removidos do aparelho e baixados novamente na próxima sincronização.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await limparDadosLocais();
            await atualizarPendentes();
            if (online) void sincronizarAgora();
          },
        },
      ]
    );
  };

  const descartarFila = () => {
    Alert.alert(
      'Descartar envios pendentes',
      'Os registros feitos no campo que ainda não subiram serão perdidos definitivamente. Use apenas se a fila estiver travada por erro.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            await outboxRepo.limpar();
            await atualizarPendentes();
          },
        },
      ]
    );
  };

  return (
    <TelaInterna titulo="Preferências" subtitulo="Sincronização e dados do aparelho.">
      <Cartao style={estilos.bloco}>
        <View style={estilos.cabecalhoBloco}>
          {online ? <Wifi size={18} color={cores.verde} /> : <WifiOff size={18} color={cores.ambar} />}
          <Text style={estilos.tituloBloco}>Sincronização</Text>
          <Etiqueta texto={online ? 'ONLINE' : 'OFFLINE'} tom={online ? 'verde' : 'ambar'} />
        </View>

        <LinhaInfo
          rotulo="Última sincronização"
          valor={ultimaSync ? new Date(ultimaSync).toLocaleString('pt-BR') : 'nunca'}
        />
        <LinhaInfo
          rotulo="Registros pendentes"
          valor={String(pendentes)}
          corValor={pendentes > 0 ? cores.azul : undefined}
        />
        {ultimoErro && <LinhaInfo rotulo="Último erro" valor={ultimoErro} corValor={cores.vermelho} />}

        <Botao
          titulo={sincronizando ? 'Sincronizando…' : 'Sincronizar agora'}
          icone={<RefreshCw size={16} color="#fff" />}
          aoPressionar={() => void sincronizarAgora()}
          desabilitado={!online || sincronizando}
          style={{ marginTop: espacamento.sm }}
        />
      </Cartao>

      <Cartao style={estilos.bloco}>
        <View style={estilos.cabecalhoBloco}>
          <Server size={18} color={cores.textoSuave} />
          <Text style={estilos.tituloBloco}>Conexão</Text>
        </View>
        <LinhaInfo rotulo="Servidor" valor={API_URL} />
        <LinhaInfo rotulo="Usuário" valor={usuario?.email ?? '—'} />
        <LinhaInfo rotulo="Versão do app" valor={versao} />
        <Text style={estilos.explicacao}>
          O endereço do servidor é detectado automaticamente a partir do Metro durante o
          desenvolvimento e pode ser fixado em `expo.extra.apiUrl` no app.json.
        </Text>
      </Cartao>

      <Cartao style={estilos.bloco}>
        <View style={estilos.cabecalhoBloco}>
          <Database size={18} color={cores.textoSuave} />
          <Text style={estilos.tituloBloco}>Dados do aparelho</Text>
        </View>
        <Botao
          titulo="Limpar dados baixados"
          variante="secundario"
          icone={<Trash2 size={16} color={cores.texto} />}
          aoPressionar={limparCache}
        />
        {pendentes > 0 && (
          <Botao
            titulo="Descartar envios pendentes"
            variante="perigo"
            icone={<Trash2 size={16} color="#fff" />}
            aoPressionar={descartarFila}
          />
        )}
      </Cartao>
    </TelaInterna>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: espacamento.sm,
  },
  cabecalhoBloco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    marginBottom: espacamento.xs,
  },
  tituloBloco: {
    flex: 1,
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
  },
  explicacao: {
    fontSize: fonte.minusculo,
    color: cores.textoFraco,
    lineHeight: 17,
    marginTop: espacamento.xs,
  },
});
