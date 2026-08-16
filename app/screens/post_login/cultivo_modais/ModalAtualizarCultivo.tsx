import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Botao } from '../../../../components/ui';
import {
  ROTULO_ESTADO_PLANTA,
  ROTULO_STATUS_CULTIVO,
  type Cultivo,
  type EstadoPlanta,
  type StatusCultivo,
} from '../../../../database/types';
import { cores, espacamento, fonte, raio } from '../../../../theme';

/**
 * Atualização de estágio e sanidade de um cultivo.
 *
 * O app de campo não cadastra cultivos — só acompanha o que o sistema web criou
 * e registra o que mudou na lavoura.
 */

const ESTAGIOS: StatusCultivo[] = ['EM_PREPARO', 'ATIVO', 'EM_PRODUCAO', 'COLHIDO'];
const SANIDADES: EstadoPlanta[] = ['SAUDAVEL', 'ATENCAO', 'PRAGA', 'CRITICO'];

/** Próximo estágio na sequência natural da safra. */
function avancarEstagio(atual: StatusCultivo): StatusCultivo {
  const indice = ESTAGIOS.indexOf(atual);
  if (indice < 0 || indice === ESTAGIOS.length - 1) return atual;
  return ESTAGIOS[indice + 1];
}

export function ModalAtualizarCultivo({
  cultivo,
  atalho,
  salvando,
  aoFechar,
  aoConfirmar,
}: {
  cultivo: Cultivo | null;
  atalho?: 'praga' | 'colheita' | 'avancar' | 'encerrar';
  salvando: boolean;
  aoFechar: () => void;
  aoConfirmar: (
    status: StatusCultivo,
    estado: EstadoPlanta,
    observacao: string
  ) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<StatusCultivo>('ATIVO');
  const [estado, setEstado] = useState<EstadoPlanta>('SAUDAVEL');
  const [observacao, setObservacao] = useState('');

  // Cada abertura parte do estado atual do cultivo, já com o atalho aplicado.
  useEffect(() => {
    if (!cultivo) return;

    let statusInicial = cultivo.statusCultivo;
    let estadoInicial = cultivo.estadoPlanta;

    if (atalho === 'praga') {
      estadoInicial = cultivo.estadoPlanta === 'SAUDAVEL' ? 'PRAGA' : 'SAUDAVEL';
    } else if (atalho === 'colheita') {
      statusInicial = 'EM_PRODUCAO';
    } else if (atalho === 'avancar') {
      statusInicial = avancarEstagio(cultivo.statusCultivo);
    } else if (atalho === 'encerrar') {
      statusInicial = 'COLHIDO';
    }

    setStatus(statusInicial);
    setEstado(estadoInicial);
    setObservacao(cultivo.observacaoCultivo ?? '');
  }, [cultivo, atalho]);

  if (!cultivo) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoFechar}>
      <KeyboardAvoidingView
        style={estilos.fundo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={estilos.areaFechar} onPress={aoFechar} />

        <View style={estilos.painel}>
          <View style={estilos.puxador} />
          <Text style={estilos.titulo}>{cultivo.nomePlanta ?? 'Cultivo'}</Text>
          <Text style={estilos.subtitulo}>
            {cultivo.nomeArea ?? 'Sem área'} · {cultivo.quantidadePlantada}{' '}
            {cultivo.unidadeMedida ?? 'un'}
          </Text>

          <ScrollView
            style={estilos.corpo}
            contentContainerStyle={estilos.corpoConteudo}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={estilos.rotulo}>Estágio da safra</Text>
            <View style={estilos.opcoes}>
              {ESTAGIOS.map((opcao) => (
                <Pressable
                  key={opcao}
                  onPress={() => setStatus(opcao)}
                  style={[estilos.opcao, status === opcao && estilos.opcaoAtiva]}
                >
                  <Text
                    style={[estilos.opcaoTexto, status === opcao && estilos.opcaoTextoAtivo]}
                  >
                    {ROTULO_STATUS_CULTIVO[opcao]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={estilos.rotulo}>Saúde do cultivo</Text>
            <View style={estilos.opcoes}>
              {SANIDADES.map((opcao) => (
                <Pressable
                  key={opcao}
                  onPress={() => setEstado(opcao)}
                  style={[estilos.opcao, estado === opcao && estilos.opcaoAtiva]}
                >
                  <Text
                    style={[estilos.opcaoTexto, estado === opcao && estilos.opcaoTextoAtivo]}
                  >
                    {ROTULO_ESTADO_PLANTA[opcao]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={estilos.rotulo}>Observação de campo</Text>
            <TextInput
              style={estilos.textarea}
              value={observacao}
              onChangeText={setObservacao}
              placeholder="O que você observou na lavoura?"
              placeholderTextColor={cores.textoFraco}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={estilos.rodape}>
            <Botao
              titulo="Cancelar"
              variante="secundario"
              aoPressionar={aoFechar}
              style={{ flex: 1 }}
            />
            <Botao
              titulo={salvando ? 'Salvando…' : 'Salvar'}
              aoPressionar={() => void aoConfirmar(status, estado, observacao)}
              desabilitado={salvando}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  areaFechar: {
    flex: 1,
  },
  painel: {
    backgroundColor: cores.cartao,
    borderTopLeftRadius: raio.xl,
    borderTopRightRadius: raio.xl,
    paddingHorizontal: espacamento.lg,
    paddingTop: espacamento.md,
    paddingBottom: espacamento.xl,
    maxHeight: '88%',
    gap: 2,
  },
  puxador: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: cores.bordaForte,
    alignSelf: 'center',
    marginBottom: espacamento.md,
  },
  titulo: {
    fontSize: fonte.subtitulo + 2,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
  },
  corpo: {
    marginTop: espacamento.md,
  },
  corpoConteudo: {
    gap: espacamento.sm,
    paddingBottom: espacamento.md,
  },
  rotulo: {
    fontSize: fonte.pequeno,
    fontWeight: '700',
    color: cores.texto,
    marginTop: espacamento.sm,
  },
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.sm,
  },
  opcao: {
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartaoAlt,
  },
  opcaoAtiva: {
    backgroundColor: cores.verde,
    borderColor: cores.verde,
  },
  opcaoTexto: {
    fontSize: fonte.pequeno,
    fontWeight: '600',
    color: cores.textoSuave,
  },
  opcaoTextoAtivo: {
    color: cores.textoInverso,
  },
  textarea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    padding: espacamento.md,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.cartaoAlt,
  },
  rodape: {
    flexDirection: 'row',
    gap: espacamento.sm,
    marginTop: espacamento.md,
  },
});
