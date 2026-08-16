import { AtSign, BadgeCheck, Briefcase, IdCard, UserRound } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { TelaInterna } from '../../../../components/TelaInterna';
import { Cartao, Etiqueta, LinhaInfo } from '../../../../components/ui';
import { useAuth } from '../../../../contexts/AuthContext';
import { ROTULO_FUNCAO } from '../../../../database/types';
import { cores, espacamento, fonte } from '../../../../theme';

/**
 * Os dados cadastrais são somente leitura: quem administra usuários é o
 * sistema web. Aqui o operador apenas confere sob qual conta está trabalhando.
 */
export default function Dados_Pessoais() {
  const { usuario } = useAuth();

  if (!usuario) {
    return (
      <TelaInterna titulo="Dados Pessoais">
        <Text style={estilos.aviso}>Nenhuma sessão ativa.</Text>
      </TelaInterna>
    );
  }

  return (
    <TelaInterna titulo="Dados Pessoais" subtitulo="Informações da sua conta no Cultive+.">
      <Cartao style={estilos.bloco}>
        <LinhaInfo
          icone={<UserRound size={16} color={cores.textoSuave} />}
          rotulo="Nome"
          valor={usuario.nomeUsuario}
        />
        <LinhaInfo
          icone={<AtSign size={16} color={cores.textoSuave} />}
          rotulo="E-mail"
          valor={usuario.email}
        />
        <LinhaInfo
          icone={<Briefcase size={16} color={cores.textoSuave} />}
          rotulo="Função"
          valor={ROTULO_FUNCAO[usuario.funcao]}
        />
        <LinhaInfo
          icone={<IdCard size={16} color={cores.textoSuave} />}
          rotulo="Matrícula"
          valor={`#${usuario.idUsuario}`}
        />
      </Cartao>

      <Cartao style={estilos.bloco}>
        <View style={estilos.linhaStatus}>
          <BadgeCheck size={18} color={usuario.ativo ? cores.verde : cores.vermelho} />
          <Text style={estilos.rotuloStatus}>Situação da conta</Text>
          <Etiqueta
            texto={usuario.ativo ? 'ATIVA' : 'BLOQUEADA'}
            tom={usuario.ativo ? 'verde' : 'vermelho'}
          />
        </View>
        <Text style={estilos.observacao}>
          Alterações de nome, e-mail e função são feitas pelo administrador no sistema web do
          Cultive+.
        </Text>
      </Cartao>
    </TelaInterna>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: espacamento.xs,
  },
  linhaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
  rotuloStatus: {
    flex: 1,
    fontSize: fonte.corpo,
    fontWeight: '600',
    color: cores.texto,
  },
  observacao: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    marginTop: espacamento.sm,
    lineHeight: 19,
  },
  aviso: {
    fontSize: fonte.corpo,
    color: cores.textoSuave,
  },
});
