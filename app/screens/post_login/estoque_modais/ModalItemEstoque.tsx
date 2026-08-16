import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Trash2, X } from 'lucide-react-native';
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

import { Botao } from '../../../../components/ui';
import { Seletor } from '../../../../components/Seletor';
import type { ItemEstoque } from '../../../../database/types';
import { cores, espacamento, fonte, raio } from '../../../../theme';

/**
 * Cadastro e edição de itens do estoque — o app tem as mesmas capacidades da
 * versão web nesta tela, já que o lançamento costuma acontecer no galpão.
 *
 * Os campos são condicionais à categoria, seguindo o modelo `Estoque` do
 * back-end (insumo tem validade e princípio ativo; maquinário tem horímetro
 * e placa; equipamento tem capacidade de trabalho).
 */

const CATEGORIAS = [
  { valor: 'INSUMO', rotulo: 'Insumo' },
  { valor: 'MAQUINARIO', rotulo: 'Maquinário' },
  { valor: 'EQUIPAMENTO', rotulo: 'Equipamento' },
];

const STATUS = [
  { valor: 'ATIVO', rotulo: 'Ativo' },
  { valor: 'ESTOQUE', rotulo: 'Em Reserva' },
  { valor: 'MANUTENCAO', rotulo: 'Em Manutenção' },
  { valor: 'BAIXADO', rotulo: 'Baixado' },
];

const SUBCATEGORIAS: Record<string, string[]> = {
  INSUMO: ['FERTILIZANTE/ADUBO', 'DEFENSIVO', 'SEMENTE/MUDA', 'CORRETIVO', 'OUTROS'],
  MAQUINARIO: ['TRATOR', 'COLHEITADEIRA', 'PULVERIZADOR', 'VEÍCULO', 'OUTROS'],
  EQUIPAMENTO: ['ARADO/GRADE', 'PLANTADEIRA', 'IMPLEMENTO', 'FERRAMENTA', 'OUTROS'],
};

function itemVazio(): ItemEstoque {
  return {
    idEstoque: 0,
    nome: '',
    sku: null,
    categoria: 'INSUMO',
    subcategoria: null,
    marca: null,
    modelo: null,
    fornecedor: null,
    codigoIdentificador: null,
    dataAquisicao: null,
    valorCompra: null,
    unidadeMedida: null,
    localizacao: null,
    status: 'ATIVO',
    fotoPreview: null,
    validade: null,
    principioAtivo: null,
    estoqueMinimo: null,
    quantidadeEstoque: null,
    horimetroAtual: null,
    horasRevisao: null,
    tipoCombustivel: null,
    placa: null,
    capacidadeTrabalho: null,
    compatibilidadePotencia: null,
    syncStatus: 'pending',
    atualizadoEm: new Date().toISOString(),
  };
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  numerico,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (texto: string) => void;
  placeholder?: string;
  numerico?: boolean;
}) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        style={estilos.input}
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor={cores.textoFraco}
        keyboardType={numerico ? 'decimal-pad' : 'default'}
      />
    </View>
  );
}

export function ModalItemEstoque({
  aberto,
  item,
  salvando,
  aoFechar,
  aoSalvar,
}: {
  aberto: boolean;
  item: ItemEstoque | null;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (item: ItemEstoque) => void | Promise<void>;
}) {
  const [rascunho, setRascunho] = useState<ItemEstoque>(itemVazio());
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setRascunho(item ? { ...item } : itemVazio());
    setErro(null);
  }, [aberto, item]);

  if (!aberto) return null;

  const alterar = <C extends keyof ItemEstoque>(campo: C, valor: ItemEstoque[C]) =>
    setRascunho((atual) => ({ ...atual, [campo]: valor }));

  const numeroOuNulo = (texto: string): number | null => {
    const limpo = texto.replace(',', '.').trim();
    if (!limpo) return null;
    const n = Number(limpo);
    return Number.isFinite(n) ? n : null;
  };

  const escolherFoto = async (origem: 'camera' | 'galeria') => {
    const permissao =
      origem === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Libere o acesso para adicionar a foto do item.');
      return;
    }

    const opcoes: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.35,
      base64: true,
    };

    const resultado =
      origem === 'camera'
        ? await ImagePicker.launchCameraAsync(opcoes)
        : await ImagePicker.launchImageLibraryAsync(opcoes);

    if (resultado.canceled || !resultado.assets?.length) return;
    const asset = resultado.assets[0];
    if (asset.base64) alterar('fotoPreview', `data:image/jpeg;base64,${asset.base64}`);
  };

  const confirmar = () => {
    if (!rascunho.nome.trim()) {
      setErro('Informe o nome do item.');
      return;
    }
    if (!rascunho.categoria) {
      setErro('Selecione a categoria.');
      return;
    }
    setErro(null);
    void aoSalvar({ ...rascunho, nome: rascunho.nome.trim() });
  };

  const ehInsumo = rascunho.categoria === 'INSUMO';
  const ehMaquinario = rascunho.categoria === 'MAQUINARIO';
  const ehEquipamento = rascunho.categoria === 'EQUIPAMENTO';

  const subcategorias = (SUBCATEGORIAS[rascunho.categoria] ?? []).map((s) => ({
    valor: s,
    rotulo: s,
  }));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoFechar}>
      <KeyboardAvoidingView
        style={estilos.fundo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={estilos.painel}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>
              {item ? 'Editar item' : 'Novo item no estoque'}
            </Text>
            <Pressable onPress={aoFechar} hitSlop={8} accessibilityLabel="Fechar">
              <X size={22} color={cores.textoSuave} />
            </Pressable>
          </View>

          <ScrollView
            style={estilos.corpo}
            contentContainerStyle={estilos.corpoConteudo}
            keyboardShouldPersistTaps="handled"
          >
            {rascunho.fotoPreview ? (
              <View style={estilos.previaFoto}>
                <Image
                  source={{ uri: rascunho.fotoPreview }}
                  style={estilos.foto}
                  resizeMode="cover"
                />
                <Pressable
                  style={estilos.removerFoto}
                  onPress={() => alterar('fotoPreview', null)}
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
                  aoPressionar={() => void escolherFoto('camera')}
                  style={{ flex: 1 }}
                />
                <Botao
                  titulo="Galeria"
                  variante="secundario"
                  icone={<ImageIcon size={18} color={cores.texto} />}
                  aoPressionar={() => void escolherFoto('galeria')}
                  style={{ flex: 1 }}
                />
              </View>
            )}

            <Campo
              rotulo="Nome do item *"
              valor={rascunho.nome}
              aoMudar={(t) => alterar('nome', t)}
              placeholder="Ex.: Fertilizante Revitalizador"
            />

            <View style={estilos.campo}>
              <Text style={estilos.rotulo}>Categoria *</Text>
              <Seletor
                valor={rascunho.categoria}
                opcoes={CATEGORIAS}
                aoSelecionar={(v) => {
                  alterar('categoria', v);
                  alterar('subcategoria', null);
                }}
              />
            </View>

            <View style={estilos.campo}>
              <Text style={estilos.rotulo}>Subcategoria</Text>
              <Seletor
                valor={rascunho.subcategoria}
                opcoes={subcategorias}
                aoSelecionar={(v) => alterar('subcategoria', v)}
                placeholder="Selecione a subcategoria"
              />
            </View>

            <View style={estilos.linha}>
              <View style={{ flex: 1 }}>
                <Campo
                  rotulo="Quantidade"
                  valor={rascunho.quantidadeEstoque?.toString() ?? ''}
                  aoMudar={(t) => alterar('quantidadeEstoque', numeroOuNulo(t))}
                  numerico
                />
              </View>
              <View style={{ flex: 1 }}>
                <Campo
                  rotulo="Unidade"
                  valor={rascunho.unidadeMedida ?? ''}
                  aoMudar={(t) => alterar('unidadeMedida', t || null)}
                  placeholder="KG, UN, L…"
                />
              </View>
            </View>

            <View style={estilos.linha}>
              <View style={{ flex: 1 }}>
                <Campo
                  rotulo="Valor de compra (R$)"
                  valor={rascunho.valorCompra?.toString() ?? ''}
                  aoMudar={(t) => alterar('valorCompra', numeroOuNulo(t))}
                  numerico
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={estilos.campo}>
                  <Text style={estilos.rotulo}>Status</Text>
                  <Seletor
                    valor={rascunho.status}
                    opcoes={STATUS}
                    aoSelecionar={(v) => alterar('status', v)}
                  />
                </View>
              </View>
            </View>

            {ehInsumo && (
              <>
                <View style={estilos.linha}>
                  <View style={{ flex: 1 }}>
                    <Campo
                      rotulo="Estoque mínimo"
                      valor={rascunho.estoqueMinimo?.toString() ?? ''}
                      aoMudar={(t) => alterar('estoqueMinimo', numeroOuNulo(t))}
                      numerico
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Campo
                      rotulo="Validade"
                      valor={rascunho.validade ?? ''}
                      aoMudar={(t) => alterar('validade', t || null)}
                      placeholder="AAAA-MM-DD"
                    />
                  </View>
                </View>
                <Campo
                  rotulo="Princípio ativo"
                  valor={rascunho.principioAtivo ?? ''}
                  aoMudar={(t) => alterar('principioAtivo', t || null)}
                />
              </>
            )}

            {ehMaquinario && (
              <>
                <View style={estilos.linha}>
                  <View style={{ flex: 1 }}>
                    <Campo
                      rotulo="Horímetro atual"
                      valor={rascunho.horimetroAtual?.toString() ?? ''}
                      aoMudar={(t) => alterar('horimetroAtual', numeroOuNulo(t))}
                      numerico
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Campo
                      rotulo="Placa"
                      valor={rascunho.placa ?? ''}
                      aoMudar={(t) => alterar('placa', t || null)}
                    />
                  </View>
                </View>
                <Campo
                  rotulo="Tipo de combustível"
                  valor={rascunho.tipoCombustivel ?? ''}
                  aoMudar={(t) => alterar('tipoCombustivel', t || null)}
                />
              </>
            )}

            {ehEquipamento && (
              <>
                <Campo
                  rotulo="Capacidade de trabalho"
                  valor={rascunho.capacidadeTrabalho ?? ''}
                  aoMudar={(t) => alterar('capacidadeTrabalho', t || null)}
                />
                <Campo
                  rotulo="Compatibilidade de potência"
                  valor={rascunho.compatibilidadePotencia ?? ''}
                  aoMudar={(t) => alterar('compatibilidadePotencia', t || null)}
                />
              </>
            )}

            <Campo
              rotulo="Marca"
              valor={rascunho.marca ?? ''}
              aoMudar={(t) => alterar('marca', t || null)}
            />
            <Campo
              rotulo="Localização"
              valor={rascunho.localizacao ?? ''}
              aoMudar={(t) => alterar('localizacao', t || null)}
              placeholder="Galpão, depósito…"
            />

            {erro && <Text style={estilos.erro}>{erro}</Text>}
          </ScrollView>

          <View style={estilos.rodape}>
            <Botao
              titulo="Cancelar"
              variante="secundario"
              aoPressionar={aoFechar}
              style={{ flex: 1 }}
            />
            <Botao
              titulo={salvando ? 'Salvando…' : 'Salvar item'}
              aoPressionar={confirmar}
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
  painel: {
    backgroundColor: cores.cartao,
    borderTopLeftRadius: raio.xl,
    borderTopRightRadius: raio.xl,
    paddingHorizontal: espacamento.lg,
    paddingTop: espacamento.lg,
    paddingBottom: espacamento.xl,
    maxHeight: '92%',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
  },
  titulo: {
    flex: 1,
    fontSize: fonte.subtitulo + 1,
    fontWeight: '700',
    color: cores.texto,
  },
  corpo: {
    marginTop: espacamento.md,
  },
  corpoConteudo: {
    gap: espacamento.sm,
    paddingBottom: espacamento.md,
  },
  campo: {
    gap: 4,
  },
  rotulo: {
    fontSize: fonte.pequeno,
    fontWeight: '600',
    color: cores.textoSuave,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.md,
    paddingHorizontal: espacamento.md,
    fontSize: fonte.corpo,
    color: cores.texto,
    backgroundColor: cores.cartaoAlt,
  },
  linha: {
    flexDirection: 'row',
    gap: espacamento.sm,
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
    height: 160,
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
  erro: {
    fontSize: fonte.pequeno,
    color: cores.vermelho,
  },
  rodape: {
    flexDirection: 'row',
    gap: espacamento.sm,
    marginTop: espacamento.md,
  },
});
