import { Boxes, Package, Pencil, Plus, Trash2, Warehouse, Wrench } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoTela } from '../../../components/CabecalhoTela';
import { Seletor } from '../../../components/Seletor';
import { CampoBusca, Carregando, EstadoVazio, Etiqueta } from '../../../components/ui';
import { useSync } from '../../../contexts/SyncContext';
import type { ItemEstoque } from '../../../database/types';
import {
  useEstoque,
  useExcluirItemEstoque,
  useFiltrosEstoque,
  useSalvarItemEstoque,
} from '../../../hooks/useDados';
import { cores, espacamento, fonte, raio, sombra } from '../../../theme';
import { ModalItemEstoque } from './estoque_modais/ModalItemEstoque';

const TODAS = '__todas__';

const ROTULO_CATEGORIA: Record<string, string> = {
  INSUMO: 'INSUMO',
  MAQUINARIO: 'MAQUINÁRIO',
  EQUIPAMENTO: 'EQUIPAMENTO',
};

const ROTULO_STATUS: Record<string, string> = {
  ATIVO: 'Ativo',
  ESTOQUE: 'Em Reserva',
  MANUTENCAO: 'Em Manutenção',
  BAIXADO: 'Baixado',
};

const TOM_CATEGORIA = (categoria: string): 'verde' | 'ambar' | 'cinza' =>
  categoria === 'INSUMO' ? 'verde' : categoria === 'MAQUINARIO' ? 'ambar' : 'cinza';

/** Um insumo abaixo do mínimo precisa saltar aos olhos na lista. */
const estoqueBaixo = (item: ItemEstoque): boolean =>
  item.estoqueMinimo !== null &&
  item.quantidadeEstoque !== null &&
  item.quantidadeEstoque <= item.estoqueMinimo;

function IconeCategoria({ categoria }: { categoria: string }) {
  if (categoria === 'MAQUINARIO') return <Wrench size={22} color={cores.textoFraco} />;
  if (categoria === 'EQUIPAMENTO') return <Boxes size={22} color={cores.textoFraco} />;
  return <Package size={22} color={cores.textoFraco} />;
}

function LinhaItem({
  item,
  aoEditar,
  aoExcluir,
}: {
  item: ItemEstoque;
  aoEditar: (item: ItemEstoque) => void;
  aoExcluir: (item: ItemEstoque) => void;
}) {
  const baixo = estoqueBaixo(item);

  return (
    <View style={estilos.linha}>
      <View style={[estilos.barraLateral, { backgroundColor: cores.verde }]} />

      <View style={estilos.miniatura}>
        {item.fotoPreview ? (
          <Image source={{ uri: item.fotoPreview }} style={estilos.foto} resizeMode="cover" />
        ) : (
          <IconeCategoria categoria={item.categoria} />
        )}
      </View>

      <View style={estilos.dados}>
        <Text style={estilos.nome} numberOfLines={1}>
          {item.nome}
        </Text>
        {item.subcategoria && (
          <Text style={estilos.subcategoria} numberOfLines={1}>
            {item.subcategoria}
          </Text>
        )}

        <View style={estilos.metadados}>
          {item.quantidadeEstoque !== null && (
            <Text style={estilos.meta}>
              {item.quantidadeEstoque}
              {item.unidadeMedida ?? ''}
            </Text>
          )}
          {item.valorCompra !== null && (
            <Text style={estilos.meta}>
              R$ {item.valorCompra.toFixed(2).replace('.', ',')}
            </Text>
          )}
          {item.status && (
            <Text style={[estilos.meta, { color: cores.verde }]}>
              {ROTULO_STATUS[item.status] ?? item.status}
            </Text>
          )}
        </View>

        <View style={estilos.etiquetas}>
          <Etiqueta
            texto={ROTULO_CATEGORIA[item.categoria] ?? item.categoria}
            tom={TOM_CATEGORIA(item.categoria)}
          />
          {baixo && <Etiqueta texto="Estoque Baixo" tom="vermelho" />}
          {item.syncStatus === 'pending' && <Etiqueta texto="No aparelho" tom="azul" />}
          {item.syncStatus === 'error' && <Etiqueta texto="Erro no envio" tom="vermelho" />}
        </View>
      </View>

      <View style={estilos.acoes}>
        <Pressable
          style={estilos.botaoIcone}
          onPress={() => aoEditar(item)}
          accessibilityLabel={`Editar ${item.nome}`}
          hitSlop={4}
        >
          <Pencil size={16} color={cores.texto} />
        </Pressable>
        <Pressable
          style={estilos.botaoIcone}
          onPress={() => aoExcluir(item)}
          accessibilityLabel={`Excluir ${item.nome}`}
          hitSlop={4}
        >
          <Trash2 size={16} color={cores.vermelho} />
        </Pressable>
      </View>
    </View>
  );
}

export default function Estoque() {
  const { data: itens, isLoading, refetch } = useEstoque();
  const { data: filtros } = useFiltrosEstoque();
  const { sincronizarAgora, sincronizando } = useSync();
  const salvar = useSalvarItemEstoque();
  const excluir = useExcluirItemEstoque();

  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState(TODAS);
  const [subcategoria, setSubcategoria] = useState(TODAS);
  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ItemEstoque | null>(null);

  const lista = itens ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter((item) => {
      if (categoria !== TODAS && item.categoria !== categoria) return false;
      if (subcategoria !== TODAS && item.subcategoria !== subcategoria) return false;
      if (!termo) return true;
      return (
        item.nome.toLowerCase().includes(termo) ||
        (item.subcategoria ?? '').toLowerCase().includes(termo) ||
        (item.marca ?? '').toLowerCase().includes(termo)
      );
    });
  }, [lista, busca, categoria, subcategoria]);

  const opcoesCategoria = [
    { valor: TODAS, rotulo: 'Todas as Categorias' },
    ...(filtros?.categorias ?? []).map((c) => ({
      valor: c,
      rotulo: ROTULO_CATEGORIA[c] ?? c,
    })),
  ];

  const opcoesSubcategoria = [
    { valor: TODAS, rotulo: 'Todas as Subcategorias' },
    ...(filtros?.subcategorias ?? []).map((s) => ({ valor: s, rotulo: s })),
  ];

  const abrirNovo = () => {
    setEmEdicao(null);
    setModalAberto(true);
  };

  const abrirEdicao = (item: ItemEstoque) => {
    setEmEdicao(item);
    setModalAberto(true);
  };

  const confirmarExclusao = (item: ItemEstoque) => {
    Alert.alert('Excluir item', `Remover "${item.nome}" do estoque?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => void excluir.mutateAsync(item),
      },
    ]);
  };

  const salvarItem = async (item: ItemEstoque) => {
    await salvar.mutateAsync(item);
    setModalAberto(false);
    setEmEdicao(null);
  };

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <CabecalhoTela
        titulo="Centro de Estoque"
        subtitulo="Lance aqui os itens do estoque da fazenda."
        acao={
          <Pressable style={estilos.botaoNovo} onPress={abrirNovo} accessibilityRole="button">
            <Plus size={18} color="#fff" />
            <Text style={estilos.botaoNovoTexto}>Novo Item</Text>
          </Pressable>
        }
      />

      <FlatList
        data={filtrados}
        keyExtractor={(item) => String(item.idEstoque)}
        contentContainerStyle={estilos.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={sincronizando}
            onRefresh={() => {
              void sincronizarAgora();
              void refetch();
            }}
            colors={[cores.verde]}
            tintColor={cores.verde}
          />
        }
        ListHeaderComponent={
          <View style={estilos.filtros}>
            <CampoBusca
              valor={busca}
              aoMudar={setBusca}
              placeholder="Buscar por nome do item…"
            />
            <View style={estilos.seletores}>
              <Seletor
                valor={categoria}
                opcoes={opcoesCategoria}
                aoSelecionar={(v) => {
                  setCategoria(v);
                  setSubcategoria(TODAS);
                }}
                style={{ flex: 1 }}
              />
              <Seletor
                valor={subcategoria}
                opcoes={opcoesSubcategoria}
                aoSelecionar={setSubcategoria}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={estilos.contagem}>
              {filtrados.length} de {lista.length}{' '}
              {lista.length === 1 ? 'item' : 'itens'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <LinhaItem item={item} aoEditar={abrirEdicao} aoExcluir={confirmarExclusao} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacamento.sm }} />}
        ListEmptyComponent={
          isLoading ? (
            <Carregando />
          ) : (
            <EstadoVazio
              icone={<Warehouse size={40} color={cores.textoFraco} />}
              titulo={lista.length === 0 ? 'Estoque vazio' : 'Nenhum item encontrado'}
              descricao={
                lista.length === 0
                  ? 'Toque em "Novo Item" para lançar o primeiro insumo, maquinário ou equipamento.'
                  : 'Tente outro termo de busca ou limpe os filtros.'
              }
            />
          )
        }
      />

      <ModalItemEstoque
        aberto={modalAberto}
        item={emEdicao}
        salvando={salvar.isPending}
        aoFechar={() => {
          setModalAberto(false);
          setEmEdicao(null);
        }}
        aoSalvar={salvarItem}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: espacamento.lg,
    paddingBottom: 110,
  },
  botaoNovo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: cores.verde,
    paddingHorizontal: espacamento.md,
    height: 42,
    borderRadius: raio.md,
    ...sombra.cartao,
  },
  botaoNovoTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fonte.pequeno,
  },
  filtros: {
    gap: espacamento.sm,
    marginBottom: espacamento.md,
  },
  seletores: {
    flexDirection: 'row',
    gap: espacamento.sm,
  },
  contagem: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    textAlign: 'right',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    backgroundColor: cores.cartao,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingRight: espacamento.md,
    paddingVertical: espacamento.md,
    overflow: 'hidden',
    ...sombra.cartao,
  },
  barraLateral: {
    width: 4,
    alignSelf: 'stretch',
  },
  miniatura: {
    width: 54,
    height: 54,
    borderRadius: raio.sm,
    backgroundColor: cores.cartaoAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: espacamento.sm,
  },
  foto: {
    width: '100%',
    height: '100%',
  },
  dados: {
    flex: 1,
    gap: 2,
  },
  nome: {
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
  },
  subcategoria: {
    fontSize: fonte.minusculo,
    color: cores.textoSuave,
  },
  metadados: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.md,
    marginTop: 2,
  },
  meta: {
    fontSize: fonte.minusculo,
    color: cores.textoSuave,
    fontWeight: '600',
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  acoes: {
    gap: espacamento.sm,
  },
  botaoIcone: {
    width: 36,
    height: 36,
    borderRadius: raio.sm,
    borderWidth: 1,
    borderColor: cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.cartao,
  },
});
