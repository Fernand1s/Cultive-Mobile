import { Search, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { cores, espacamento, fonte, raio, sombra } from '../theme';

/** Paleta semântica reutilizada por etiquetas e destaques. */
export type Tom = 'verde' | 'vermelho' | 'ambar' | 'azul' | 'cinza';

const TONS: Record<Tom, { fundo: string; texto: string }> = {
  verde: { fundo: cores.verdeFundo, texto: '#15803D' },
  vermelho: { fundo: cores.vermelhoFundo, texto: cores.vermelho },
  ambar: { fundo: cores.ambarFundo, texto: '#B45309' },
  azul: { fundo: cores.azulFundo, texto: cores.azul },
  cinza: { fundo: cores.cinzaFundo, texto: cores.textoSuave },
};

export function Etiqueta({
  texto,
  tom = 'cinza',
  icone,
}: {
  texto: string;
  tom?: Tom;
  icone?: React.ReactNode;
}) {
  const paleta = TONS[tom];
  return (
    <View style={[estilos.etiqueta, { backgroundColor: paleta.fundo }]}>
      {icone}
      <Text style={[estilos.etiquetaTexto, { color: paleta.texto }]} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

export function Cartao({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function EstadoVazio({
  icone,
  titulo,
  descricao,
}: {
  icone?: React.ReactNode;
  titulo: string;
  descricao?: string;
}) {
  return (
    <View style={estilos.vazio}>
      {icone}
      <Text style={estilos.vazioTitulo}>{titulo}</Text>
      {descricao && <Text style={estilos.vazioDescricao}>{descricao}</Text>}
    </View>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <View style={estilos.vazio}>
      <ActivityIndicator size="large" color={cores.verde} />
      <Text style={estilos.vazioDescricao}>{texto}</Text>
    </View>
  );
}

export function CampoBusca({
  valor,
  aoMudar,
  placeholder = 'Buscar…',
}: {
  valor: string;
  aoMudar: (texto: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={estilos.busca}>
      <Search size={18} color={cores.textoFraco} />
      <TextInput
        style={estilos.buscaInput}
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor={cores.textoFraco}
        autoCorrect={false}
        returnKeyType="search"
      />
      {valor.length > 0 && (
        <Pressable onPress={() => aoMudar('')} hitSlop={8} accessibilityLabel="Limpar busca">
          <X size={18} color={cores.textoFraco} />
        </Pressable>
      )}
    </View>
  );
}

/**
 * Régua de filtros por abas roláveis — usada nos estágios de cultivo e nas
 * categorias de relatório, seguindo o desenho do Figma.
 */
export function Abas<T extends string>({
  opcoes,
  ativa,
  aoSelecionar,
}: {
  opcoes: { valor: T; rotulo: string; contagem?: number; icone?: React.ReactNode }[];
  ativa: T;
  aoSelecionar: (valor: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={estilos.abas}
    >
      {opcoes.map((opcao) => {
        const selecionada = opcao.valor === ativa;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => aoSelecionar(opcao.valor)}
            style={[estilos.aba, selecionada && estilos.abaAtiva]}
            accessibilityRole="tab"
            accessibilityState={{ selected: selecionada }}
          >
            {opcao.icone}
            <Text style={[estilos.abaTexto, selecionada && estilos.abaTextoAtivo]}>
              {opcao.rotulo}
            </Text>
            {opcao.contagem !== undefined && (
              <Text style={[estilos.abaContagem, selecionada && estilos.abaTextoAtivo]}>
                {opcao.contagem}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Linha rótulo → valor, o padrão de leitura dos cartões de cultivo. */
export function LinhaInfo({
  icone,
  rotulo,
  valor,
  corValor,
}: {
  icone?: React.ReactNode;
  rotulo: string;
  valor: string;
  corValor?: string;
}) {
  return (
    <View style={estilos.linhaInfo}>
      <View style={estilos.linhaInfoEsquerda}>
        {icone}
        <Text style={estilos.linhaInfoRotulo}>{rotulo}</Text>
      </View>
      <Text style={[estilos.linhaInfoValor, corValor ? { color: corValor } : null]} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

export function Botao({
  titulo,
  aoPressionar,
  variante = 'primario',
  icone,
  desabilitado,
  style,
}: {
  titulo: string;
  aoPressionar: () => void;
  variante?: 'primario' | 'secundario' | 'perigo';
  icone?: React.ReactNode;
  desabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const estiloVariante =
    variante === 'primario'
      ? estilos.botaoPrimario
      : variante === 'perigo'
        ? estilos.botaoPerigo
        : estilos.botaoSecundario;

  const corTexto =
    variante === 'secundario' ? cores.texto : cores.textoInverso;

  return (
    <Pressable
      onPress={aoPressionar}
      disabled={desabilitado}
      style={({ pressed }) => [
        estilos.botao,
        estiloVariante,
        pressed && { opacity: 0.85 },
        desabilitado && { opacity: 0.5 },
        style,
      ]}
      accessibilityRole="button"
    >
      {icone}
      <Text style={[estilos.botaoTexto, { color: corTexto }]}>{titulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: raio.pill,
    alignSelf: 'flex-start',
  },
  etiquetaTexto: {
    fontSize: fonte.minusculo,
    fontWeight: '700',
  },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: raio.lg,
    padding: espacamento.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    ...sombra.cartao,
  },
  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: espacamento.md,
  },
  vazioTitulo: {
    fontSize: fonte.subtitulo,
    fontWeight: '600',
    color: cores.texto,
    textAlign: 'center',
  },
  vazioDescricao: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    textAlign: 'center',
    paddingHorizontal: espacamento.xl,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.sm,
    backgroundColor: cores.cartao,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    paddingHorizontal: espacamento.md,
    height: 46,
  },
  buscaInput: {
    flex: 1,
    fontSize: fonte.corpo,
    color: cores.texto,
    paddingVertical: 0,
  },
  abas: {
    gap: espacamento.sm,
    paddingVertical: espacamento.xs,
  },
  aba: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.sm + 2,
    borderRadius: raio.md,
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  abaAtiva: {
    backgroundColor: cores.verde,
    borderColor: cores.verde,
  },
  abaTexto: {
    fontSize: fonte.pequeno,
    fontWeight: '600',
    color: cores.textoSuave,
  },
  abaTextoAtivo: {
    color: cores.textoInverso,
  },
  abaContagem: {
    fontSize: fonte.pequeno,
    fontWeight: '700',
    color: cores.textoFraco,
  },
  linhaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
    paddingVertical: 5,
  },
  linhaInfoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  linhaInfoRotulo: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
  },
  linhaInfoValor: {
    fontSize: fonte.pequeno,
    fontWeight: '600',
    color: cores.texto,
    flexShrink: 1,
    textAlign: 'right',
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: espacamento.lg,
    borderRadius: raio.md,
  },
  botaoPrimario: {
    backgroundColor: cores.verde,
  },
  botaoSecundario: {
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.bordaForte,
  },
  botaoPerigo: {
    backgroundColor: cores.vermelho,
  },
  botaoTexto: {
    fontSize: fonte.corpo,
    fontWeight: '600',
  },
});
