import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Settings,
  Shield,
  UserRound,
} from 'lucide-react-native';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FaixaSync } from '../../../components/CabecalhoTela';
import { useAuth } from '../../../contexts/AuthContext';
import { useSync } from '../../../contexts/SyncContext';
import { ROTULO_FUNCAO } from '../../../database/types';
import { cores, espacamento, fonte, raio, sombra } from '../../../theme';

interface OpcaoPerfil {
  rota: string;
  rotulo: string;
  icone: React.ReactNode;
}

const OPCOES: OpcaoPerfil[] = [
  { rota: 'DadosPessoais', rotulo: 'Dados Pessoais', icone: <UserRound size={22} color={cores.texto} /> },
  { rota: 'Seguranca', rotulo: 'Segurança', icone: <Shield size={22} color={cores.texto} /> },
  { rota: 'Configuracoes', rotulo: 'Preferências', icone: <Settings size={22} color={cores.texto} /> },
  { rota: 'Suporte', rotulo: 'Suporte', icone: <LifeBuoy size={22} color={cores.texto} /> },
];

export default function Perfil() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { usuario, sair } = useAuth();
  const { pendentes } = useSync();

  const confirmarSaida = () => {
    const aviso =
      pendentes > 0
        ? `Existem ${pendentes} ${pendentes === 1 ? 'registro' : 'registros'} ainda não enviados ao sistema. Ao sair, esses dados serão perdidos.`
        : 'Você precisará de conexão com a internet para entrar novamente.';

    Alert.alert('Encerrar sessão', aviso, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: () => void sair() },
    ]);
  };

  const iniciais = (usuario?.nomeUsuario ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <LinearGradient
          colors={[cores.verdeGradienteInicio, cores.verdeGradienteFim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={estilos.cartaoUsuario}
        >
          <View style={estilos.avatar}>
            {usuario?.fotoPerfil ? (
              <Image
                source={{ uri: usuario.fotoPerfil }}
                style={estilos.avatarImagem}
                resizeMode="cover"
              />
            ) : (
              <Text style={estilos.avatarIniciais}>{iniciais}</Text>
            )}
          </View>

          <View style={estilos.infoUsuario}>
            <Text style={estilos.nome} numberOfLines={2}>
              {usuario?.nomeUsuario ?? 'Usuário'}
            </Text>
            {usuario?.funcao && (
              <View style={estilos.cargo}>
                <Text style={estilos.cargoTexto}>
                  {ROTULO_FUNCAO[usuario.funcao].toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={estilos.sino}
            onPress={() => navigation.navigate('Notificacoes')}
            accessibilityLabel="Notificações"
          >
            <Bell size={24} color="#fff" />
            {pendentes > 0 && <View style={estilos.pontoSino} />}
          </Pressable>
        </LinearGradient>

        <View style={estilos.faixa}>
          <FaixaSync />
        </View>

        <View style={estilos.cartaoConfig}>
          <Text style={estilos.tituloConfig}>Configurações</Text>

          {OPCOES.map((opcao) => (
            <Pressable
              key={opcao.rota}
              style={estilos.opcao}
              onPress={() => navigation.navigate(opcao.rota)}
              accessibilityRole="button"
            >
              {opcao.icone}
              <Text style={estilos.opcaoTexto}>{opcao.rotulo}</Text>
              <ChevronRight size={18} color={cores.textoFraco} />
            </Pressable>
          ))}

          <Pressable
            style={[estilos.opcao, estilos.opcaoSair]}
            onPress={confirmarSaida}
            accessibilityRole="button"
          >
            <LogOut size={22} color={cores.vermelho} />
            <Text style={[estilos.opcaoTexto, { color: cores.vermelho }]}>Encerrar Sessão</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: espacamento.lg,
    paddingBottom: 110,
    gap: espacamento.md,
  },
  cartaoUsuario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    borderRadius: raio.lg,
    padding: espacamento.lg,
    ...sombra.destaque,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: raio.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImagem: {
    width: '100%',
    height: '100%',
  },
  avatarIniciais: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  infoUsuario: {
    flex: 1,
    gap: 6,
  },
  nome: {
    fontSize: fonte.titulo - 2,
    fontWeight: '700',
    color: '#fff',
  },
  cargo: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: raio.pill,
    paddingHorizontal: espacamento.md,
    paddingVertical: 3,
  },
  cargoTexto: {
    fontSize: fonte.minusculo - 1,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },
  sino: {
    width: 46,
    height: 46,
    borderRadius: raio.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pontoSino: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: cores.vermelho,
  },
  faixa: {
    marginHorizontal: -espacamento.lg,
  },
  cartaoConfig: {
    backgroundColor: cores.cartao,
    borderRadius: raio.lg,
    padding: espacamento.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    ...sombra.cartao,
  },
  tituloConfig: {
    fontSize: fonte.subtitulo,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: espacamento.sm,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    height: 58,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
  },
  opcaoSair: {
    borderBottomWidth: 0,
  },
  opcaoTexto: {
    flex: 1,
    fontSize: fonte.corpo,
    color: cores.texto,
  },
});
