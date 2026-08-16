import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Minus, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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

import { Botao, Etiqueta } from '../../../../components/ui';
import type { InsumoUsado, ItemEstoque, Tarefa } from '../../../../database/types';
import type { DadosConclusao } from '../../../../hooks/useDados';
import { cores, espacamento, fonte, raio } from '../../../../theme';

/**
 * Execução de uma tarefa no campo: observação, foto do serviço e insumos gastos.
 *
 * A foto vai como base64 porque é assim que o back-end guarda `fotoConclusao`
 * (coluna TEXT) — a mesma convenção usada pelo sistema web. A qualidade é
 * reduzida de propósito: a imagem viaja dentro do JSON e fica guardada no
 * aparelho até haver conexão.
 */

const QUALIDADE_FOTO = 0.35;

export function ModalConcluirTarefa({
  tarefa,
  itensEstoque,
  salvando,
  aoFechar,
  aoConfirmar,
}: {
  tarefa: Tarefa | null;
  itensEstoque: ItemEstoque[];
  salvando: boolean;
  aoFechar: () => void;
  aoConfirmar: (dados: DadosConclusao, emObservacao: boolean) => void | Promise<void>;
}) {
  const [observacao, setObservacao] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [insumos, setInsumos] = useState<InsumoUsado[]>([]);
  const [buscaInsumo, setBuscaInsumo] = useState('');

  useEffect(() => {
    if (!tarefa) return;
    setObservacao(tarefa.observacaoConclusao ?? '');
    setFoto(tarefa.fotoConclusao ?? null);
    setInsumos(tarefa.insumosUsados ?? []);
    setBuscaInsumo('');
  }, [tarefa]);

  if (!tarefa) return null;

  const capturar = async (origem: 'camera' | 'galeria') => {
    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Permissão necessária',
        origem === 'camera'
          ? 'Libere o acesso à câmera para registrar a foto da tarefa.'
          : 'Libere o acesso às fotos para anexar uma imagem.'
      );
      return;
    }

    const opcoes: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: QUALIDADE_FOTO,
      base64: true,
    };

    const resultado =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);

    if (resultado.canceled || !resultado.assets?.length) return;

    const asset = resultado.assets[0];
    if (asset.base64) {
      setFoto(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const alternarInsumo = (item: ItemEstoque) => {
    setInsumos((atuais) => {
      const existente = atuais.find((i) => i.idEstoque === item.idEstoque);
      if (existente) return atuais.filter((i) => i.idEstoque !== item.idEstoque);
      return [
        ...atuais,
        {
          idEstoque: item.idEstoque,
          nome: item.nome,
          quantidade: 1,
          unidadeMedida: item.unidadeMedida,
        },
      ];
    });
  };

  const mudarQuantidade = (idEstoque: number, delta: number) => {
    setInsumos((atuais) =>
      atuais.map((i) =>
        i.idEstoque === idEstoque ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i
      )
    );
  };

  const dados = (): DadosConclusao => ({
    observacao: observacao.trim() ? observacao.trim() : null,
    fotoConclusao: foto,
    insumosUsados: insumos,
  });

  // Só insumos fazem sentido aqui — máquinas e equipamentos não são consumidos.
  const consumiveis = itensEstoque.filter((i) => i.categoria === 'INSUMO');
  const filtrados = buscaInsumo.trim()
    ? consumiveis.filter((i) => i.nome.toLowerCase().includes(buscaInsumo.trim().toLowerCase()))
    : consumiveis.slice(0, 6);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoFechar}>
      <KeyboardAvoidingView
        style={estilos.fundo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={estilos.areaFechar} onPress={aoFechar} />

        <View style={estilos.painel}>
          <View style={estilos.puxador} />

          <View style={estilos.cabecalho}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.titulo}>{tarefa.titulo}</Text>
              {tarefa.descricao && <Text style={estilos.subtitulo}>{tarefa.descricao}</Text>}
            </View>
            <Pressable onPress={aoFechar} hitSlop={8} accessibilityLabel="Fechar">
              <X size={22} color={cores.textoSuave} />
            </Pressable>
          </View>

          <ScrollView
            style={estilos.corpo}
            contentContainerStyle={estilos.corpoConteudo}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={estilos.rotulo}>Como foi a execução?</Text>
            <TextInput
              style={estilos.textarea}
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Descreva o que foi feito, o que encontrou no campo…"
              placeholderTextColor={cores.textoFraco}
              multiline
              textAlignVertical="top"
            />

            <Text style={estilos.rotulo}>Registro fotográfico</Text>
            {foto ? (
              <View style={estilos.previaFoto}>
                <Image source={{ uri: foto }} style={estilos.foto} resizeMode="cover" />
                <Pressable
                  style={estilos.removerFoto}
                  onPress={() => setFoto(null)}
                  accessibilityLabel="Remover foto"
                >
                  <Trash2 size={16} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={estilos.acoesFoto}>
                <Botao
                  titulo="Câmera"
                  variante="secundario"
                  icone={<Camera size={18} color={cores.texto} />}
                  aoPressionar={() => void capturar('camera')}
                  style={{ flex: 1 }}
                />
                <Botao
                  titulo="Galeria"
                  variante="secundario"
                  icone={<ImageIcon size={18} color={cores.texto} />}
                  aoPressionar={() => void capturar('galeria')}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            <Text style={estilos.rotulo}>Insumos utilizados</Text>
            {insumos.length > 0 && (
              <View style={estilos.listaInsumos}>
                {insumos.map((insumo) => (
                  <View key={insumo.idEstoque} style={estilos.insumoSelecionado}>
                    <Text style={estilos.insumoNome} numberOfLines={1}>
                      {insumo.nome}
                    </Text>
                    <View style={estilos.contador}>
                      <Pressable
                        onPress={() => mudarQuantidade(insumo.idEstoque, -1)}
                        style={estilos.botaoContador}
                        hitSlop={6}
                      >
                        <Minus size={14} color={cores.texto} />
                      </Pressable>
                      <Text style={estilos.quantidade}>
                        {insumo.quantidade} {insumo.unidadeMedida ?? ''}
                      </Text>
                      <Pressable
                        onPress={() => mudarQuantidade(insumo.idEstoque, 1)}
                        style={estilos.botaoContador}
                        hitSlop={6}
                      >
                        <Plus size={14} color={cores.texto} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={estilos.input}
              value={buscaInsumo}
              onChangeText={setBuscaInsumo}
              placeholder="Buscar insumo no estoque…"
              placeholderTextColor={cores.textoFraco}
            />

            <View style={estilos.chipsInsumos}>
              {filtrados.map((item) => {
                const marcado = insumos.some((i) => i.idEstoque === item.idEstoque);
                return (
                  <Pressable key={item.idEstoque} onPress={() => alternarInsumo(item)}>
                    <Etiqueta texto={item.nome} tom={marcado ? 'verde' : 'cinza'} />
                  </Pressable>
                );
              })}
              {consumiveis.length === 0 && (
                <Text style={estilos.aviso}>Nenhum insumo disponível no estoque local.</Text>
              )}
            </View>
          </ScrollView>

          <View style={estilos.rodape}>
            <Botao
              titulo="Em observação"
              variante="secundario"
              aoPressionar={() => void aoConfirmar(dados(), true)}
              desabilitado={salvando}
              style={{ flex: 1 }}
            />
            <Botao
              titulo={salvando ? 'Salvando…' : 'Concluir tarefa'}
              aoPressionar={() => void aoConfirmar(dados(), false)}
              desabilitado={salvando}
              style={{ flex: 1.2 }}
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
    maxHeight: '90%',
  },
  puxador: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: cores.bordaForte,
    alignSelf: 'center',
    marginBottom: espacamento.md,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacamento.sm,
  },
  titulo: {
    fontSize: fonte.subtitulo + 1,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    marginTop: 2,
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
  textarea: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    padding: espacamento.md,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.cartaoAlt,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espacamento.md,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.cartaoAlt,
  },
  acoesFoto: {
    flexDirection: 'row',
    gap: espacamento.sm,
  },
  previaFoto: {
    position: 'relative',
  },
  foto: {
    width: '100%',
    height: 180,
    borderRadius: raio.md,
    backgroundColor: cores.cartaoAlt,
  },
  removerFoto: {
    position: 'absolute',
    top: espacamento.sm,
    right: espacamento.sm,
    backgroundColor: cores.vermelho,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listaInsumos: {
    gap: espacamento.sm,
  },
  insumoSelecionado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
    backgroundColor: cores.verdeFundo,
    borderRadius: raio.md,
    paddingHorizontal: espacamento.md,
    paddingVertical: espacamento.sm,
  },
  insumoNome: {
    flex: 1,
    fontSize: fonte.pequeno,
    fontWeight: '600',
    color: cores.texto,
  },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
  },
  botaoContador: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: cores.cartao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantidade: {
    fontSize: fonte.pequeno,
    fontWeight: '700',
    color: cores.texto,
    minWidth: 44,
    textAlign: 'center',
  },
  chipsInsumos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.sm,
  },
  aviso: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
  },
  rodape: {
    flexDirection: 'row',
    gap: espacamento.sm,
    marginTop: espacamento.md,
  },
});
